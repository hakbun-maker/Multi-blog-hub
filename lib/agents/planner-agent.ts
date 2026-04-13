/**
 * Planner 에이전트 — 키워드를 블로그에 배정하고 스케줄을 결정합니다.
 *
 * 핵심 로직:
 * 1. 키워드의 주제를 블로그의 blog_type/카테고리/설명과 매칭
 * 2. 같은 blog_type의 다른 언어 블로그에도 동시 배정 (다국어 확장)
 * 3. 이벤트 키워드는 D-Day 기반 타임라인으로 기획
 * 4. 블로그별 발행 시간은 모두 다르게 배정
 */
import { getServiceClient, runAgent } from './agent-runner'
import { EVENT_PHASES, inferEventCategory } from './shared'
import type { AgentRunResult, EventPhase } from './types'
import type { IntentType } from '@/types/monetize'

// ─── Blog matching types ────────────────────────────────────────────────────

interface BlogInfo {
  id: string
  name: string
  description: string | null
  primary_ad_category: string | null
  blog_type: string | null
  language: string | null
  grade: string | null
}

// ─── blog_type ↔ 키워드 주제 매핑 (핵심 매칭 로직) ────────────────────────

const BLOG_TYPE_KEYWORDS: Record<string, string[]> = {
  'entertainment': ['콘서트', '공연', '뮤지컬', '팬미팅', '가수', '아이돌', 'K-POP', '넷플릭스', '영화', '드라마', 'OTT', '음악', '엔터', '코첼라', '페스티벌', '축제', '이벤트', '티켓', '예매', '셀럽'],
  'medical': ['건강', '의학', '질병', '치료', '병원', '약', '증상', '진단', '수술', '혈당', '혈압', '비타민', '영양', '다이어트', '운동', '노화', '면역', '건강검진', '의료'],
  'finance': ['주식', '투자', '부동산', '재테크', '연금', '적금', '보험', '세금', 'ETF', '금리', '대출', '자산'],
  'it-tech': ['AI', '프로그래밍', '코딩', '노트북', '스마트폰', '앱', '소프트웨어', '개발', '클라우드', 'IT', '테크'],
  'food': ['맛집', '레시피', '요리', '카페', '음식', '배달', '식당', '맛', '메뉴'],
  'travel': ['여행', '호텔', '항공', '캠핑', '관광', '리조트', '숙소', '비행기', '투어', '명소'],
  'beauty-fashion': ['화장품', '스킨케어', '메이크업', '뷰티', '피부', '패션', '옷', '코디', '명품', '향수'],
  'parenting': ['육아', '아기', '어린이', '교육', '임산부', '출산', '유아', '초등', '학습'],
  'pets': ['강아지', '고양이', '반려동물', '펫', '사료', '동물병원'],
  'sports': ['축구', '야구', '골프', '등산', '헬스', '수영', 'KBO', 'K리그', '경기', '스포츠'],
  'real-estate': ['부동산', '아파트', '전세', '월세', '매매', '분양', '인테리어', '이사'],
  'education': ['공부', '자격증', '영어', '학습', '시험', '토익', '대학', '입시', '독학'],
  'lifestyle': ['라이프', '일상', '취미', '트렌드', '추천', '후기', '비교', '쇼핑', '선물'],
  'interior': ['인테리어', '가구', '가전', '청소', '홈리빙', '원룸', '수납'],
  'automotive': ['자동차', '전기차', '중고차', '운전', '차량', '타이어', '보험'],
  'news': ['뉴스', '시사', '정치', '경제', '사회'],
  'science': ['과학', '연구', '기술', '우주', '환경'],
}

/** 시즌/일반 키워드 주제 추론 (키워드 텍스트에서 가장 적합한 blog_type 추정) */
function inferBlogType(keywordText: string): string | null {
  const kw = keywordText.toLowerCase()
  let bestType: string | null = null
  let bestCount = 0

  for (const [blogType, keywords] of Object.entries(BLOG_TYPE_KEYWORDS)) {
    const count = keywords.filter(k => kw.includes(k.toLowerCase())).length
    if (count > bestCount) {
      bestCount = count
      bestType = blogType
    }
  }

  // 시즌 키워드 특수 처리: "선물 추천", "이벤트" → lifestyle
  if (!bestType) {
    if (kw.includes('선물') || kw.includes('이벤트') || kw.includes('추천')) return 'lifestyle'
    if (kw.includes('축제') || kw.includes('공연') || kw.includes('콘서트')) return 'entertainment'
  }

  return bestType
}

/** 키워드와 블로그의 매칭 점수 계산 */
function matchScore(keywordText: string, blog: BlogInfo): number {
  let score = 0
  const inferredType = inferBlogType(keywordText)

  // 1. blog_type 직접 매칭 (가장 높은 점수)
  if (inferredType && blog.blog_type === inferredType) {
    score += 50
  }

  // 2. blog_type의 키워드가 블로그 설명에 포함
  if (blog.blog_type && BLOG_TYPE_KEYWORDS[blog.blog_type]) {
    const typeKeywords = BLOG_TYPE_KEYWORDS[blog.blog_type]
    const kw = keywordText.toLowerCase()
    for (const tk of typeKeywords) {
      if (kw.includes(tk.toLowerCase())) score += 15
    }
  }

  // 3. 블로그 설명에 키워드 관련 단어 포함
  const blogDesc = `${blog.name} ${blog.description ?? ''} ${blog.primary_ad_category ?? ''}`.toLowerCase()
  const kwWords = keywordText.match(/[가-힣]{2,}/g) ?? []
  for (const word of kwWords) {
    if (blogDesc.includes(word)) score += 5
  }

  return score
}

// EVENT_PHASES, inferEventCategory는 shared.ts에서 import

// ─── Main Agent ─────────────────────────────────────────────────────────────

export async function runPlannerAgent(userId: string): Promise<AgentRunResult> {
  return runAgent(userId, 'planner', async () => {
    const supabase = getServiceClient()
    let assigned = 0
    let eventPlanned = 0
    let multiLangExpanded = 0

    let deletedMismatch = 0
    let deletedLowScore = 0

    // 1. scored 단계 키워드 전체 조회
    const { data: scoredKeywords } = await supabase
      .from('keyword_pipeline')
      .select('*')
      .eq('user_id', userId)
      .eq('stage', 'scored')
      .order('revenue_score', { ascending: false })

    if (!scoredKeywords || scoredKeywords.length === 0) return { assigned: 0, deletedMismatch: 0, deletedLowScore: 0, multiLangExpanded: 0 }

    // 2. 사용자 블로그 목록 (blog_type 포함!)
    const { data: blogs } = await supabase
      .from('blogs')
      .select('id, name, description, primary_ad_category, blog_type, language, grade')
      .eq('user_id', userId)
      .eq('is_active', true)

    if (!blogs || blogs.length === 0) return { assigned: 0, deletedMismatch: 0, deletedLowScore: 0, error: 'no_active_blogs' }

    // ──── 4단계-A: 블로그 유형 불일치 키워드 삭제 ────
    // 사용자가 보유한 blog_type에 매칭되지 않는 키워드를 제거
    const userBlogTypes = new Set(blogs.map(b => b.blog_type).filter(Boolean))
    const matchedKeywords: typeof scoredKeywords = []
    const mismatchIds: string[] = []

    for (const kw of scoredKeywords) {
      const inferredType = inferBlogType(kw.keyword_text)
      if (!inferredType || userBlogTypes.has(inferredType)) {
        matchedKeywords.push(kw)
      } else {
        mismatchIds.push(kw.id)
      }
    }

    if (mismatchIds.length > 0) {
      // 50개씩 배치 삭제
      for (let i = 0; i < mismatchIds.length; i += 50) {
        await supabase.from('keyword_pipeline').delete().in('id', mismatchIds.slice(i, i + 50))
      }
      deletedMismatch = mismatchIds.length
    }

    // ──── 4단계-B: 하위 60% 점수 삭제 ────
    // 매칭된 키워드 중 상위 40%만 남기고 나머지 삭제
    const sortedByScore = [...matchedKeywords].sort((a, b) => (b.revenue_score ?? 0) - (a.revenue_score ?? 0))
    const cutoffIndex = Math.ceil(sortedByScore.length * 0.4)
    const kept = sortedByScore.slice(0, cutoffIndex)
    const lowScoreIds = sortedByScore.slice(cutoffIndex).map(k => k.id)

    if (lowScoreIds.length > 0) {
      for (let i = 0; i < lowScoreIds.length; i += 50) {
        await supabase.from('keyword_pipeline').delete().in('id', lowScoreIds.slice(i, i + 50))
      }
      deletedLowScore = lowScoreIds.length
    }

    // ──── 4단계-C: 상위 40% 키워드를 블로그에 배정 ────
    const remainingKeywords = kept

    // 3. blog_type별 블로그 그룹 (다국어 확장용)
    const blogsByType = new Map<string, BlogInfo[]>()
    for (const blog of blogs) {
      const type = blog.blog_type ?? 'other'
      if (!blogsByType.has(type)) blogsByType.set(type, [])
      blogsByType.get(type)!.push(blog)
    }

    // 4. 일정 관리 (블로그별 시간 슬롯)
    const blogSchedule = new Map<string, { nextDate: Date; nextHour: number }>()

    function getNextTimeForBlog(blogId: string): { date: string; time: string } {
      if (!blogSchedule.has(blogId)) {
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        blogSchedule.set(blogId, { nextDate: tomorrow, nextHour: 9 })
      }
      const sched = blogSchedule.get(blogId)!
      const date = sched.nextDate.toISOString().split('T')[0]
      const time = `${String(sched.nextHour).padStart(2, '0')}:00`

      // 다음 슬롯으로 이동
      sched.nextHour += 1 + Math.floor(Math.random() * 2)
      if (sched.nextHour > 17) {
        sched.nextHour = 9
        sched.nextDate.setDate(sched.nextDate.getDate() + 1)
      }

      return { date, time }
    }

    // 5. 각 키워드를 최적 블로그에 배정
    const MIN_MATCH_SCORE = 10

    for (const kw of remainingKeywords) {
      // ─── 이벤트 키워드 ───
      if (kw.keyword_type === 'event' && kw.event_title && kw.event_date) {
        const clusterId = `evt_${kw.event_title.replace(/\s+/g, '_').slice(0, 30)}_${kw.event_date}`

        const { data: existingCluster } = await supabase
          .from('keyword_pipeline')
          .select('id')
          .eq('user_id', userId)
          .eq('event_cluster_id', clusterId)
          .limit(1)

        if (!existingCluster || existingCluster.length === 0) {
          const eventDate = new Date(kw.event_date)
          const category = inferEventCategory(kw.event_title)
          const phases = EVENT_PHASES[category] ?? EVENT_PHASES.other
          const { blog: bestBlog, score: bestScore } = findBestBlogWithScore(blogs, kw.event_title ?? kw.keyword_text)

          if (bestScore < MIN_MATCH_SCORE) {
            await supabase.from('keyword_pipeline').delete().eq('id', kw.id)
            deletedMismatch++
            continue
          }

          for (const phase of phases) {
            const publishDate = new Date(eventDate)
            publishDate.setDate(publishDate.getDate() + phase.dDayOffset)
            if (publishDate < new Date() && phase.dDayOffset < 0) continue

            const phaseKeyword = `${kw.event_title} ${phase.suffix}`
            const phaseName: EventPhase = phase.dDayOffset <= -14 ? 'pre_info'
              : phase.dDayOffset <= -3 ? 'comparison'
              : phase.dDayOffset <= 0 ? 'preparation'
              : 'review'

            await supabase.from('keyword_pipeline').insert({
              user_id: userId,
              keyword_text: phaseKeyword,
              keyword_type: 'event',
              stage: 'scheduled',
              revenue_score: kw.revenue_score ?? 0,
              keyword_grade: kw.keyword_grade ?? 'C',
              intent_type: phase.intentType,
              assigned_blog_id: bestBlog.id,
              assigned_blog_name: bestBlog.name,
              scheduled_date: publishDate.toISOString().split('T')[0],
              scheduled_time: `${String(9 + (phases.indexOf(phase) % 8)).padStart(2, '0')}:00`,
              event_title: kw.event_title,
              event_date: kw.event_date,
              event_d_day: phase.dDayOffset,
              event_phase: phaseName,
              event_cluster_id: clusterId,
              assigned_at: new Date().toISOString(),
            })
            eventPlanned++
          }
        }

        const { blog: bestBlog, score: bestScore } = findBestBlogWithScore(blogs, kw.event_title ?? kw.keyword_text)
        if (bestScore < MIN_MATCH_SCORE) continue

        await supabase.from('keyword_pipeline').update({
          stage: 'assigned',
          assigned_blog_id: bestBlog.id,
          assigned_blog_name: bestBlog.name,
          event_cluster_id: `evt_${kw.event_title.replace(/\s+/g, '_').slice(0, 30)}_${kw.event_date}`,
          assigned_at: new Date().toISOString(),
        }).eq('id', kw.id)
        assigned++
        continue
      }

      // ─── 일반/시즌 키워드 ───
      const { blog: bestBlog, score: bestScore } = findBestBlogWithScore(blogs, kw.keyword_text)

      if (bestScore < MIN_MATCH_SCORE) {
        // 매칭되는 블로그가 없으면 삭제 (찌꺼기 방지)
        await supabase.from('keyword_pipeline').delete().eq('id', kw.id)
        deletedMismatch++
        continue
      }

      const { date, time } = getNextTimeForBlog(bestBlog.id)

      await supabase.from('keyword_pipeline').update({
        stage: 'scheduled',
        assigned_blog_id: bestBlog.id,
        assigned_blog_name: bestBlog.name,
        scheduled_date: date,
        scheduled_time: time,
        assigned_at: new Date().toISOString(),
      }).eq('id', kw.id)
      assigned++

      // ─── 다국어 확장 (같은 blog_type + 다른 언어 블로그가 있을 때만) ───
      //     단, 한국어 키워드를 그대로 외국어 블로그에 넣지 않음
      //     같은 blog_type의 한국어 블로그가 여러 개일 때만 확장
      const bestType = bestBlog.blog_type ?? 'other'
      const sameTypeBlogs = blogsByType.get(bestType) ?? []
      const sameLanguageOtherBlogs = sameTypeBlogs.filter(b =>
        b.id !== bestBlog.id && b.language === bestBlog.language
      )

      for (const siblingBlog of sameLanguageOtherBlogs) {
        // 동일 언어의 동일 카테고리 블로그에만 확장
        const siblingScore = matchScore(kw.keyword_text, siblingBlog)
        if (siblingScore < MIN_MATCH_SCORE) continue

        const { date: sibDate, time: sibTime } = getNextTimeForBlog(siblingBlog.id)

        await supabase.from('keyword_pipeline').insert({
          user_id: userId,
          keyword_text: kw.keyword_text,
          keyword_type: kw.keyword_type,
          stage: 'scheduled',
          revenue_score: kw.revenue_score,
          keyword_grade: kw.keyword_grade,
          intent_type: kw.intent_type,
          assigned_blog_id: siblingBlog.id,
          assigned_blog_name: siblingBlog.name,
          scheduled_date: sibDate,
          scheduled_time: sibTime,
          assigned_at: new Date().toISOString(),
        })
        multiLangExpanded++
      }
    }

    // ──── 마지막: scored 단계에 남아있는 잔여 키워드 전부 삭제 ────
    // 스케줄 확정되지 못한 키워드는 파이프라인에 방치하지 않음
    const { data: leftover } = await supabase
      .from('keyword_pipeline')
      .select('id')
      .eq('user_id', userId)
      .eq('stage', 'scored')

    const leftoverIds = (leftover ?? []).map((r: any) => r.id)
    if (leftoverIds.length > 0) {
      for (let i = 0; i < leftoverIds.length; i += 50) {
        await supabase.from('keyword_pipeline').delete().in('id', leftoverIds.slice(i, i + 50))
      }
      deletedMismatch += leftoverIds.length
    }

    return { assigned, deletedMismatch, deletedLowScore, multiLangExpanded }
  })
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function findBestBlogWithScore(blogs: BlogInfo[], keywordText: string): { blog: BlogInfo; score: number } {
  let bestBlog = blogs[0]
  let bestScore = 0

  for (const blog of blogs) {
    const score = matchScore(keywordText, blog)
    if (score > bestScore) {
      bestScore = score
      bestBlog = blog
    }
  }

  return { blog: bestBlog, score: bestScore }
}

// inferEventCategory는 shared.ts에서 import
