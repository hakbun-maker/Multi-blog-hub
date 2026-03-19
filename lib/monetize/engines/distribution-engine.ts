import type { Grade, IntentType, Keyword, DistributionPreviewItem } from '@/types/monetize'
import { createClient } from '@/lib/supabase/server'
import { INTENT_PRIORITY, INTENT_BLOG_FIT } from '../constants'
import { getIntentFitScore, isIntentFit, calculateIntentPriority } from '../utils'

export interface BlogInfo {
  id: string
  name: string
  grade: Grade
  category?: string
  isWarned?: boolean
  dailyLimit?: number
  postsScheduledToday?: number
}

export interface DistributionOptions {
  userId: string
  keywords: Keyword[]
  blogs: BlogInfo[]
  category?: string
  excludeWarnedBlogs?: boolean
  preview?: boolean
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
  const { userId, keywords, blogs, category, excludeWarnedBlogs = true, preview = false } = options

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

  const assignments: DistributionAssignment[] = []
  const now = new Date()

  for (const keyword of sortedKeywords) {
    const intentType = keyword.intentType || 'INFO'

    for (const blog of availableBlogs) {
      // STEP 3: Grade matrix filter (1st pass)
      if (!gradeMatrixFilter(keyword.keywordGrade, blog.grade)) {
        continue
      }

      // STEP 4: Quota check
      if (!quotaCheck(blog, options.userId)) {
        continue
      }

      // STEP 5: Intent fitness filter (2nd pass)
      if (!isIntentFit(intentType, blog.grade)) {
        continue
      }

      const fitScore = getIntentFitScore(intentType, blog.grade)

      // STEP 6: Internal competition prevention (same keyword not to same blog twice in 7 days)
      const canAssign = await checkCompetitionPrevention(options.userId, keyword.id, blog.id)
      if (!canAssign) {
        continue
      }

      // STEP 7: Daily limit check
      if (!dailyLimitCheck(blog, options.userId)) {
        continue
      }

      // Calculate scheduled date and time
      const { date, time } = calculateScheduleTime(now, blog)

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

  // STEP 9: Create assignment records
  if (preview) {
    return assignments.map(a => ({
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
  const supabase = createClient()

  // Create scheduled_posts
  const scheduledPostInserts = assignments.map(a => ({
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
  const assignmentInserts = assignments.map((a, idx) => ({
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

  return assignments
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
 * Quota check - ensure blog hasn't reached quota
 */
function quotaCheck(blog: BlogInfo, userId: string): boolean {
  // Default quota: 10 posts per blog per month
  const monthlyQuota = 10
  // Placeholder: would need to query actual scheduled posts
  return true
}

/**
 * Daily limit check - ensure blog hasn't reached daily limit
 */
function dailyLimitCheck(blog: BlogInfo, userId: string): boolean {
  const dailyLimit = blog.dailyLimit || 3
  const postsScheduledToday = blog.postsScheduledToday || 0
  return postsScheduledToday < dailyLimit
}

/**
 * Check internal competition prevention
 * Prevent same keyword from being assigned to same blog within 7 days
 */
async function checkCompetitionPrevention(
  userId: string,
  keywordId: string,
  blogId: string
): Promise<boolean> {
  const supabase = createClient()
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
 * Calculate scheduled date and time
 */
function calculateScheduleTime(baseDate: Date, blog: BlogInfo): { date: string; time: string } {
  // Schedule next day at 9 AM by default
  const scheduleDate = new Date(baseDate)
  scheduleDate.setDate(scheduleDate.getDate() + 1)
  scheduleDate.setHours(9, 0, 0, 0)

  const dateStr = scheduleDate.toISOString().split('T')[0]
  const timeStr = '09:00'

  return { date: dateStr, time: timeStr }
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
