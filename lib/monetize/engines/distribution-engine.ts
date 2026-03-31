import type { Grade, IntentType, Keyword, DistributionPreviewItem } from '@/types/monetize'
import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { INTENT_PRIORITY, INTENT_BLOG_FIT } from '../constants'
import { getIntentFitScore, isIntentFit, calculateIntentPriority } from '../utils'

export interface BlogInfo {
  id: string
  name: string
  grade: Grade
  category?: string
  language?: string
  isWarned?: boolean
  dailyLimit?: number
  postsScheduledToday?: number
  monthlyPostCount?: number
}

/**
 * Pre-fetched scheduling context for the distribution run.
 * Key is blogId, value is a list of HH:MM strings already scheduled on the target date.
 */
interface BlogScheduleContext {
  monthlyPostCounts: Map<string, number>
  dailyPostCounts: Map<string, number>
  scheduledTimes: Map<string, string[]>
}

export interface DistributionOptions {
  userId: string
  keywords: Keyword[]
  blogs: BlogInfo[]
  category?: string
  excludeWarnedBlogs?: boolean
  preview?: boolean
  /** Optional pre-authenticated supabase client (e.g. service-role client from cron context) */
  supabaseClient?: SupabaseClient
}

export interface DistributionAssignment {
  keywordId: string
  keyword: string
  keywordGrade: Grade
  intentType: IntentType
  blogId: string
  blogName: string
  blogGrade: Grade
  scheduledDate: string
  scheduledTime: string
  intentFitScore: number
  reason: string
}

/**
 * Run distribution engine with optional preview mode
 * Returns preview items for confirmation or creates assignments
 */
export async function distributeKeywords(
  options: DistributionOptions
): Promise<DistributionPreviewItem[] | DistributionAssignment[]> {
  const { userId, keywords, blogs, category, excludeWarnedBlogs = true, preview = false, supabaseClient } = options

  // STEP 0: Sort by Intent priority (KeywordGrade × IPS)
  const sortedKeywords = sortByIntentPriority(keywords)

  // STEP 1: Category filter
  const filteredBlogs = category
    ? blogs.filter(b => b.category === category)
    : blogs

  // STEP 2: Exclude warned blogs
  const availableBlogs = excludeWarnedBlogs
    ? filteredBlogs.filter(b => !b.isWarned)
    : filteredBlogs

  if (availableBlogs.length === 0) {
    throw new Error('배정할 블로그가 없습니다')
  }

  const now = new Date()
  const blogIds = availableBlogs.map(b => b.id)

  // PRE-FETCH: gather scheduling context before the main loop
  const scheduleContext = await fetchScheduleContext(blogIds, now, supabaseClient)

  const assignments: DistributionAssignment[] = []

  for (const keyword of sortedKeywords) {
    const intentType = keyword.intentType || 'INFO'

    for (const blog of availableBlogs) {
      // STEP 3: Grade matrix filter (1st pass)
      if (!gradeMatrixFilter(keyword.keywordGrade, blog.grade)) {
        continue
      }

      // STEP 4: Quota check (uses pre-fetched monthly count)
      if (!quotaCheck(blog, scheduleContext)) {
        continue
      }

      // STEP 5: Intent fitness filter (2nd pass)
      if (!isIntentFit(intentType, blog.grade)) {
        continue
      }

      const fitScore = getIntentFitScore(intentType, blog.grade)

      // STEP 6: Internal competition prevention (same keyword not to same blog twice in 7 days)
      const canAssign = await checkCompetitionPrevention(userId, keyword.id, blog.id, supabaseClient)
      if (!canAssign) {
        continue
      }

      // STEP 7: Daily limit check (uses pre-fetched daily count)
      if (!dailyLimitCheck(blog, scheduleContext)) {
        continue
      }

      // Calculate scheduled date and time (uses pre-fetched times list)
      const { date, time } = calculateScheduleTime(now, blog, scheduleContext)

      // Register the new time so subsequent keywords on the same blog/date are offset correctly
      const existingTimes = scheduleContext.scheduledTimes.get(blog.id) ?? []
      existingTimes.push(time)
      scheduleContext.scheduledTimes.set(blog.id, existingTimes)

      // Also increment the in-memory daily count so the limit is respected within this run
      const currentDaily = scheduleContext.dailyPostCounts.get(blog.id) ?? 0
      scheduleContext.dailyPostCounts.set(blog.id, currentDaily + 1)

      // Increment monthly count as well
      const currentMonthly = scheduleContext.monthlyPostCounts.get(blog.id) ?? 0
      scheduleContext.monthlyPostCounts.set(blog.id, currentMonthly + 1)

      // STEP 8: Final selection (by fit score then blog score)
      const reason = `Intent: ${intentType}, Fit Score: ${fitScore}, Blog Grade: ${blog.grade}`

      assignments.push({
        keywordId: keyword.id,
        keyword: keyword.keyword,
        keywordGrade: keyword.keywordGrade,
        intentType,
        blogId: blog.id,
        blogName: blog.name,
        blogGrade: blog.grade,
        scheduledDate: date,
        scheduledTime: time,
        intentFitScore: fitScore,
        reason,
      })

      // One keyword per blog
      break
    }
  }

  // STEP 9: Multi-language expansion — additive, does not replace primary assignments
  const multiLangAssignments = await expandMultiLanguageAssignments(
    assignments,
    availableBlogs,
    userId,
    scheduleContext,
    now,
    supabaseClient
  )

  const allAssignments = [...assignments, ...multiLangAssignments]

  // STEP 10: Create assignment records
  if (preview) {
    return allAssignments.map(a => ({
      keywordId: a.keywordId,
      keyword: a.keyword,
      keywordGrade: a.keywordGrade,
      intentType: a.intentType,
      blogId: a.blogId,
      blogName: a.blogName,
      blogGrade: a.blogGrade,
      scheduledDate: a.scheduledDate,
      scheduledTime: a.scheduledTime,
      intentFitScore: a.intentFitScore,
      reason: a.reason,
    }))
  }

  // Save to database
  const supabase = supabaseClient ?? createClient()

  // Create scheduled_posts
  const scheduledPostInserts = allAssignments.map(a => ({
    blog_id: a.blogId,
    keyword_id: a.keywordId,
    scheduled_date: a.scheduledDate,
    scheduled_time: a.scheduledTime,
    status: 'pending' as const,
    writing_mode: 'auto' as const,
    intent_type: a.intentType,
    intent_fit_score: a.intentFitScore,
  }))

  const { data: postsData, error: postsError } = await supabase
    .from('scheduled_posts')
    .insert(scheduledPostInserts)
    .select('id')

  if (postsError) throw new Error(`스케줄 저장 실패: ${postsError.message}`)

  // Create blog_keyword_assignments
  const assignmentInserts = allAssignments.map(a => ({
    blog_id: a.blogId,
    keyword_id: a.keywordId,
    assigned_date: now.toISOString().split('T')[0],
    assigned_time: now.toISOString().split('T')[1].slice(0, 5),
    assignment_reason: a.reason,
    is_confirmed: true,
    intent_type: a.intentType,
    intent_fit_score: a.intentFitScore,
  }))

  const { error: assignError } = await supabase
    .from('blog_keyword_assignments')
    .insert(assignmentInserts)

  if (assignError) throw new Error(`배정 저장 실패: ${assignError.message}`)

  return allAssignments
}

/**
 * Sort keywords by Intent priority score
 */
function sortByIntentPriority(keywords: Keyword[]): Keyword[] {
  return [...keywords].sort((a, b) => {
    const intentA = a.intentType || 'INFO'
    const intentB = b.intentType || 'INFO'

    const priorityA = calculateIntentPriority(a.keywordGrade, intentA)
    const priorityB = calculateIntentPriority(b.keywordGrade, intentB)

    return priorityB - priorityA
  })
}

/**
 * Grade matrix filter (1st pass)
 * Ensures keyword grade is appropriate for blog grade
 */
function gradeMatrixFilter(keywordGrade: Grade, blogGrade: Grade): boolean {
  // Simple rule: keyword grade should match or be higher than blog grade
  const gradeRank: Record<Grade, number> = { S: 5, A: 4, B: 3, C: 2, D: 1 }
  // Allow keyword if grade matches or is slightly higher
  return gradeRank[keywordGrade] >= gradeRank[blogGrade] - 1
}

/**
 * Pre-fetch all scheduling context needed for the distribution run.
 * Queries are executed in parallel to minimise latency.
 *
 * @param blogIds   IDs of blogs participating in this distribution run
 * @param baseDate  The date from which we derive the target scheduling date (tomorrow)
 */
async function fetchScheduleContext(
  blogIds: string[],
  baseDate: Date,
  supabaseClient?: SupabaseClient
): Promise<BlogScheduleContext> {
  const supabase = supabaseClient ?? createClient()

  // Target date = tomorrow (the default scheduling date)
  const targetDate = new Date(baseDate)
  targetDate.setDate(targetDate.getDate() + 1)
  const targetDateStr = targetDate.toISOString().split('T')[0]

  // Start of the current month
  const monthStart = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1)
    .toISOString()
    .split('T')[0]

  if (blogIds.length === 0) {
    return {
      monthlyPostCounts: new Map(),
      dailyPostCounts: new Map(),
      scheduledTimes: new Map(),
    }
  }

  const [monthlyResult, dailyResult, timesResult] = await Promise.all([
    // Monthly count: pending/writing/reviewing/review_queue/auto_published/published posts this month
    supabase
      .from('scheduled_posts')
      .select('blog_id')
      .in('blog_id', blogIds)
      .gte('scheduled_date', monthStart)
      .not('status', 'eq', 'rejected'),

    // Daily count: posts scheduled on the target date (any non-rejected status)
    supabase
      .from('scheduled_posts')
      .select('blog_id')
      .in('blog_id', blogIds)
      .eq('scheduled_date', targetDateStr)
      .not('status', 'eq', 'rejected'),

    // Scheduled times on target date (for gap calculation)
    supabase
      .from('scheduled_posts')
      .select('blog_id, scheduled_time')
      .in('blog_id', blogIds)
      .eq('scheduled_date', targetDateStr)
      .not('status', 'eq', 'rejected'),
  ])

  // Build monthly counts map
  const monthlyPostCounts = new Map<string, number>()
  if (!monthlyResult.error && monthlyResult.data) {
    for (const row of monthlyResult.data) {
      monthlyPostCounts.set(row.blog_id, (monthlyPostCounts.get(row.blog_id) ?? 0) + 1)
    }
  }

  // Build daily counts map
  const dailyPostCounts = new Map<string, number>()
  if (!dailyResult.error && dailyResult.data) {
    for (const row of dailyResult.data) {
      dailyPostCounts.set(row.blog_id, (dailyPostCounts.get(row.blog_id) ?? 0) + 1)
    }
  }

  // Build scheduled times map (sorted ascending so we can find the latest)
  const scheduledTimes = new Map<string, string[]>()
  if (!timesResult.error && timesResult.data) {
    for (const row of timesResult.data) {
      const existing = scheduledTimes.get(row.blog_id) ?? []
      existing.push(row.scheduled_time as string)
      scheduledTimes.set(row.blog_id, existing)
    }
    // Sort each blog's list in ascending order
    scheduledTimes.forEach((times, blogId) => {
      scheduledTimes.set(blogId, times.sort())
    })
  }

  return { monthlyPostCounts, dailyPostCounts, scheduledTimes }
}

/**
 * Quota check - ensure blog hasn't reached monthly quota.
 * Quota is 10 posts per blog per month by default.
 * If the blog has a custom monthlyPostCount limit set, that value is used instead.
 */
function quotaCheck(blog: BlogInfo, context: BlogScheduleContext): boolean {
  const monthlyQuota = blog.monthlyPostCount ?? 10
  const currentCount = context.monthlyPostCounts.get(blog.id) ?? 0
  return currentCount < monthlyQuota
}

/**
 * Daily limit check - ensure blog hasn't reached daily limit
 */
function dailyLimitCheck(blog: BlogInfo, context: BlogScheduleContext): boolean {
  const dailyLimit = blog.dailyLimit ?? 3
  const postsScheduledToday = context.dailyPostCounts.get(blog.id) ?? 0
  return postsScheduledToday < dailyLimit
}

/**
 * Check internal competition prevention
 * Prevent same keyword from being assigned to same blog within 7 days
 */
async function checkCompetitionPrevention(
  userId: string,
  keywordId: string,
  blogId: string,
  supabaseClient?: SupabaseClient
): Promise<boolean> {
  const supabase = supabaseClient ?? createClient()
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('blog_keyword_assignments')
    .select('id')
    .eq('keyword_id', keywordId)
    .eq('blog_id', blogId)
    .gte('assigned_date', sevenDaysAgo)
    .limit(1)

  if (error) {
    console.error('Competition check error:', error)
    return true // Allow on error
  }

  return !data || data.length === 0
}

/**
 * Calculate scheduled date and time.
 *
 * Rules:
 * - Window: 09:00 – 18:00
 * - If no existing schedule for the blog: 09:00 + random 0-60 min offset
 * - Otherwise: latest scheduled time + random 60-120 min gap
 * - If the computed time exceeds 18:00: advance to the next day at 09:00 + random 0-60 min offset
 *
 * The context.scheduledTimes map is updated in-place by the caller after each
 * assignment so that successive keywords within the same run are correctly spaced.
 */
function calculateScheduleTime(
  baseDate: Date,
  blog: BlogInfo,
  context: BlogScheduleContext
): { date: string; time: string } {
  const SCHEDULE_START_HOUR = 9   // 09:00
  const SCHEDULE_END_HOUR = 18    // 18:00 (exclusive — posts must finish before this)

  // Start from tomorrow
  const scheduleDate = new Date(baseDate)
  scheduleDate.setDate(scheduleDate.getDate() + 1)

  const existingTimes = context.scheduledTimes.get(blog.id) ?? []

  /**
   * Convert "HH:MM" to total minutes since midnight.
   */
  function toMinutes(hhmm: string): number {
    const [h, m] = hhmm.split(':').map(Number)
    return h * 60 + m
  }

  /**
   * Convert total minutes since midnight to "HH:MM".
   */
  function toHHMM(minutes: number): string {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }

  /**
   * Pick a random integer in [min, max] inclusive.
   */
  function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min
  }

  const startMinutes = SCHEDULE_START_HOUR * 60  // 540
  const endMinutes = SCHEDULE_END_HOUR * 60       // 1080

  let candidateMinutes: number

  if (existingTimes.length === 0) {
    // No existing posts: start at 09:00 + random 0-60 min
    candidateMinutes = startMinutes + randomInt(0, 60)
  } else {
    // Find the latest scheduled time for this blog on the target date
    const latestMinutes = Math.max(...existingTimes.map(toMinutes))
    // Add a random 60-120 minute gap after the latest post
    candidateMinutes = latestMinutes + randomInt(60, 120)
  }

  let dateStr: string
  let timeStr: string

  if (candidateMinutes < endMinutes) {
    // Fits within the same day's window
    dateStr = scheduleDate.toISOString().split('T')[0]
    timeStr = toHHMM(candidateMinutes)
  } else {
    // Overflows 18:00 — move to the day after tomorrow at 09:00 + random 0-60 min
    const nextDay = new Date(scheduleDate)
    nextDay.setDate(nextDay.getDate() + 1)
    dateStr = nextDay.toISOString().split('T')[0]
    timeStr = toHHMM(startMinutes + randomInt(0, 60))
  }

  return { date: dateStr, time: timeStr }
}

/**
 * Expand primary assignments to same-category blogs in other languages.
 *
 * For each primary assignment, find blogs owned by the same user that:
 *   - share the same category as the primary blog
 *   - have a different language
 *   - are not warned
 *   - have not already been assigned this keyword in the primary loop
 *
 * New assignments are scheduled 60-120 min after the primary blog's slot so
 * they are clearly differentiated in the queue.
 *
 * This step is purely additive — it never removes or modifies primary assignments.
 */
async function expandMultiLanguageAssignments(
  primaryAssignments: DistributionAssignment[],
  allBlogs: BlogInfo[],
  userId: string,
  scheduleContext: BlogScheduleContext,
  baseDate: Date,
  supabaseClient?: SupabaseClient
): Promise<DistributionAssignment[]> {
  const extra: DistributionAssignment[] = []

  // Build a set of (keywordId, blogId) pairs already assigned in the primary loop
  const alreadyAssigned = new Set<string>(
    primaryAssignments.map(a => `${a.keywordId}:${a.blogId}`)
  )

  for (const primary of primaryAssignments) {
    const primaryBlog = allBlogs.find(b => b.id === primary.blogId)

    // Skip if primary blog has no category or no language — can't match variants
    if (!primaryBlog?.category || !primaryBlog.language) continue

    // Find same-category, different-language blogs
    const variantBlogs = allBlogs.filter(
      b =>
        b.id !== primary.blogId &&
        b.category === primaryBlog.category &&
        b.language != null &&
        b.language !== primaryBlog.language &&
        !b.isWarned
    )

    for (const variant of variantBlogs) {
      // Skip if this (keyword, blog) pair already has an assignment
      const pairKey = `${primary.keywordId}:${variant.id}`
      if (alreadyAssigned.has(pairKey)) continue

      // Quota and daily limit checks using in-memory context
      if (!quotaCheck(variant, scheduleContext)) continue
      if (!dailyLimitCheck(variant, scheduleContext)) continue

      // Competition prevention — same keyword must not have been assigned to
      // this variant blog within the last 7 days
      const canAssign = await checkCompetitionPrevention(
        userId,
        primary.keywordId,
        variant.id,
        supabaseClient
      )
      if (!canAssign) continue

      // Calculate schedule time for this variant blog
      const { date, time } = calculateScheduleTime(baseDate, variant, scheduleContext)

      // Update in-memory context so subsequent variants get correct offsets
      const existingTimes = scheduleContext.scheduledTimes.get(variant.id) ?? []
      existingTimes.push(time)
      scheduleContext.scheduledTimes.set(variant.id, existingTimes)

      const currentDaily = scheduleContext.dailyPostCounts.get(variant.id) ?? 0
      scheduleContext.dailyPostCounts.set(variant.id, currentDaily + 1)

      const currentMonthly = scheduleContext.monthlyPostCounts.get(variant.id) ?? 0
      scheduleContext.monthlyPostCounts.set(variant.id, currentMonthly + 1)

      // Mark pair as assigned to prevent duplicates within this expansion loop
      alreadyAssigned.add(pairKey)

      const fitScore = getIntentFitScore(primary.intentType, variant.grade)
      const reason = `Multi-lang variant of "${primaryBlog.language}" blog. Intent: ${primary.intentType}, Fit Score: ${fitScore}, Blog Grade: ${variant.grade}`

      extra.push({
        keywordId: primary.keywordId,
        keyword: primary.keyword,
        keywordGrade: primary.keywordGrade,
        intentType: primary.intentType,
        blogId: variant.id,
        blogName: variant.name,
        blogGrade: variant.grade,
        scheduledDate: date,
        scheduledTime: time,
        intentFitScore: fitScore,
        reason,
      })
    }
  }

  return extra
}

/**
 * Preview distribution without saving
 */
export async function previewDistribution(
  options: Omit<DistributionOptions, 'preview'>
): Promise<DistributionPreviewItem[]> {
  return (await distributeKeywords({
    ...options,
    preview: true,
  })) as DistributionPreviewItem[]
}

/**
 * Confirm and apply distribution
 */
export async function confirmDistribution(
  options: Omit<DistributionOptions, 'preview'>
): Promise<DistributionAssignment[]> {
  return (await distributeKeywords({
    ...options,
    preview: false,
  })) as DistributionAssignment[]
}
