/**
 * Planner 에이전트 — 키워드를 블로그에 배정하고 스케줄을 결정합니다.
 *
 * 핵심 로직:
 * 1. 키워드의 주제/Intent를 블로그의 카테고리/설명과 매칭
 * 2. 같은 카테고리의 다른 언어 블로그에도 동시 배정 (다국어 확장)
 * 3. 이벤트 키워드는 D-Day 기반 타임라인으로 기획
 * 4. 블로그별 발행 시간은 모두 다르게 배정
 */
import { getServiceClient, runAgent } from './agent-runner'
import { INTENT_BLOG_FIT } from '@/lib/monetize/constants'
import type { AgentRunResult, EventPhase } from './types'
import type { Grade, IntentType } from '@/types/monetize'

// ─── Blog matching types ────────────────────────────────────────────────────

interface BlogInfo {
  id: string
  name: string
  description: string | null
  primary_ad_category: string | null
  language: string | null
  grade: string | null
}

// ─── Event Phase Config ─────────────────────────────────────────────────────

const EVENT_PHASE_CONFIG: Record<string, { dDayOffset: number; intentType: IntentType; suffix: string }[]> = {
  concert: [
    { dDayOffset: -30, intentType: 'INFO', suffix: '정보 총정리' },
    { dDayOffset: -14, intentType: 'COMPARE', suffix: '좌석 추천 가격 비교' },
    { dDayOffset: -7, intentType: 'AD', suffix: '준비물 주변 맛집' },
    { dDayOffset: 1, intentType: 'REVIEW', suffix: '후기 현장 리뷰' },
  ],
  sports: [
    { dDayOffset: -7, intentType: 'INFO', suffix: '경기 일정 정보' },
    { dDayOffset: -1, intentType: 'COMPARE', suffix: '승부 예측 분석' },
    { dDayOffset: 1, intentType: 'REVIEW', suffix: '경기 결과 하이라이트' },
  ],
  festival: [
    { dDayOffset: -21, intentType: 'INFO', suffix: '일정 프로그램 안내' },
    { dDayOffset: -7, intentType: 'AD', suffix: '입장권 교통편 준비' },
    { dDayOffset: 1, intentType: 'REVIEW', suffix: '축제 후기 현장' },
  ],
  exhibition: [
    { dDayOffset: -14, intentType: 'INFO', suffix: '전시 정보 관람 포인트' },
    { dDayOffset: -3, intentType: 'AD', suffix: '티켓 예매 할인' },
    { dDayOffset: 1, intentType: 'REVIEW', suffix: '관람 후기' },
  ],
  other: [
    { dDayOffset: -7, intentType: 'INFO', suffix: '정보' },
    { dDayOffset: 1, intentType: 'REVIEW', suffix: '후기' },
  ],
}

// ─── Keyword-Blog Matching ──────────────────────────────────────────────────

/** 키워드의 주제와 블로그의 카테고리/설명을 매칭하여 점수를 계산 */
function matchScore(keywordText: string, intentType: string | null, blog: BlogInfo): number {
  let score = 0
  const kw = keywordText.toLowerCase()
  const blogDesc = `${blog.name} ${blog.description ?? ''} ${blog.primary_ad_category ?? ''}`.toLowerCase()

  // 1. 카테고리 직접 매칭 (가장 높은 점수)
  const cat = blog.primary_ad_category?.toLowerCase() ?? ''
  if (cat && kw.includes(cat)) score += 30
  if (cat && CATEGORY_KEYWORD_MAP[cat]?.some(ckw => kw.includes(ckw))) score += 25

  // 2. 블로그 설명에 키워드 관련 단어가 포함되어 있는지
  const kwWords = kw.match(/[가-힣]{2,}/g) ?? []
  for (const word of kwWords) {
    if (blogDesc.includes(word)) score += 10
  }

  // 3. Intent-Grade 적합도
  const blogGrade = (blog.grade ?? 'C') as Grade
  const intent = (intentType ?? 'INFO') as IntentType
  const fitMatrix = INTENT_BLOG_FIT[intent]
  score += (fitMatrix?.[blogGrade] ?? 1) * 5

  return score
}

/** 카테고리별 관련 키워드 (매칭 보조) */
const CATEGORY_KEYWORD_MAP: Record<string, string[]> = {
  tech: ['ai', '노트북', '스마트폰', '앱', '프로그래밍', '코딩', '소프트웨어'],
  health: ['건강', '다이어트', '운동', '영양', '비타민', '혈당', '혈압', '의학', '질병'],
  medical: ['건강', '의학', '질병', '치료', '병원', '약', '증상', '진단', '수술'],
  finance: ['주식', '투자', '부동산', '재테크', '연금', '적금', '보험', '세금'],
  food: ['맛집', '레시피', '요리', '카페', '음식', '배달'],
  travel: ['여행', '호텔', '항공', '캠핑', '관광', '리조트'],
  beauty: ['화장품', '스킨케어', '메이크업', '뷰티', '피부'],
  fashion: ['옷', '코디', '패션', '명품', '신발', '가방'],
  parenting: ['육아', '아기', '어린이', '교육', '임산부'],
  pets: ['강아지', '고양이', '반려동물', '펫'],
  education: ['공부', '자격증', '영어', '학습', '시험'],
  entertainment: ['영화', '넷플릭스', '음악', '게임', '웹툰', '공연', 'kpop'],
  home: ['인테리어', '가구', '가전', '청소', '이사'],
  auto: ['자동차', '전기차', '중고차', '운전'],
  sports: ['축구', '야구', '골프', '등산', '헬스', '수영'],
  culture: ['공연', '전시', '뮤지컬', '클래식', '문화', '예술'],
}

// ─── Main Agent ─────────────────────────────────────────────────────────────

export async function runPlannerAgent(userId: string): Promise<AgentRunResult> {
  return runAgent(userId, 'planner', async () => {
    const supabase = getServiceClient()
    let assigned = 0
    let eventPlanned = 0
    let multiLangExpanded = 0

    // 1. scored 단계 키워드 가져오기
    const { data: scoredKeywords } = await supabase
      .from('keyword_pipeline')
      .select('*')
      .eq('user_id', userId)
      .eq('stage', 'scored')
      .order('revenue_score', { ascending: false })
      .limit(50)

    if (!scoredKeywords || scoredKeywords.length === 0) return { assigned: 0, eventPlanned: 0, multiLangExpanded: 0 }

    // 2. 사용자 블로그 목록 (설명, 카테고리, 언어 포함)
    const { data: blogs } = await supabase
      .from('blogs')
      .select('id, name, description, primary_ad_category, language, grade')
      .eq('user_id', userId)
      .eq('is_active', true)

    if (!blogs || blogs.length === 0) return { assigned: 0, eventPlanned: 0, error: 'no_active_blogs' }

    // 3. 블로그를 카테고리별로 그룹화 (다국어 확장용)
    const blogsByCategory = new Map<string, BlogInfo[]>()
    for (const blog of blogs) {
      const cat = blog.primary_ad_category?.toLowerCase() ?? 'general'
      if (!blogsByCategory.has(cat)) blogsByCategory.set(cat, [])
      blogsByCategory.get(cat)!.push(blog)
    }

    // 4. 일정 관리
    let nextDate = new Date()
    nextDate.setDate(nextDate.getDate() + 1) // 내일부터
    const blogTimeSlots = new Map<string, number>() // blogId → 다음 시간 슬롯

    function getNextTimeForBlog(blogId: string): { date: string; time: string } {
      let slot = blogTimeSlots.get(blogId) ?? 9
      if (slot > 17) {
        slot = 9
        // 이 블로그의 다음 날짜로
      }
      const date = nextDate.toISOString().split('T')[0]
      const time = `${String(slot).padStart(2, '0')}:00`
      blogTimeSlots.set(blogId, slot + 1 + Math.floor(Math.random() * 2))
      return { date, time }
    }

    // 5. 각 키워드를 최적 블로그에 배정
    for (const kw of scoredKeywords) {
      // ─── 이벤트 키워드: D-Day 기반 클러스터 기획 ───
      if (kw.keyword_type === 'event' && kw.event_title && kw.event_date) {
        const clusterId = `evt_${kw.event_title.replace(/\s+/g, '_').slice(0, 30)}_${kw.event_date}`

        // 이미 클러스터가 있는지 확인
        const { data: existingCluster } = await supabase
          .from('keyword_pipeline')
          .select('id')
          .eq('user_id', userId)
          .eq('event_cluster_id', clusterId)
          .limit(1)

        if (!existingCluster || existingCluster.length === 0) {
          // 새 이벤트: Phase별 키워드 클러스터 생성
          const eventDate = new Date(kw.event_date)
          const category = inferEventCategory(kw.event_title)
          const phases = EVENT_PHASE_CONFIG[category] ?? EVENT_PHASE_CONFIG.other

          // 이벤트에 가장 적합한 블로그 찾기
          const bestBlog = findBestBlog(blogs, kw.keyword_text, kw.intent_type)

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

        // 원본 이벤트 키워드도 배정 완료 처리
        const bestBlog = findBestBlog(blogs, kw.keyword_text, kw.intent_type)
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

      // ─── 일반 키워드: 최적 블로그 배정 + 다국어 확장 ───
      const bestBlog = findBestBlog(blogs, kw.keyword_text, kw.intent_type)
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

      // ─── 다국어 확장: 같은 카테고리의 다른 언어 블로그에도 배정 ───
      const bestCat = bestBlog.primary_ad_category?.toLowerCase() ?? ''
      if (bestCat) {
        const sameCategoryBlogs = blogsByCategory.get(bestCat) ?? []
        const otherLangBlogs = sameCategoryBlogs.filter(b =>
          b.id !== bestBlog.id && b.language !== bestBlog.language
        )

        for (const langBlog of otherLangBlogs) {
          const { date: langDate, time: langTime } = getNextTimeForBlog(langBlog.id)

          // 다국어 키워드 파이프라인 항목 생성
          await supabase.from('keyword_pipeline').insert({
            user_id: userId,
            keyword_text: kw.keyword_text, // 원본 키워드 (Writer가 해당 언어로 번역 작성)
            keyword_type: kw.keyword_type,
            stage: 'scheduled',
            revenue_score: kw.revenue_score,
            keyword_grade: kw.keyword_grade,
            intent_type: kw.intent_type,
            assigned_blog_id: langBlog.id,
            assigned_blog_name: langBlog.name,
            scheduled_date: langDate,
            scheduled_time: langTime,
            assigned_at: new Date().toISOString(),
          })
          multiLangExpanded++
        }
      }
    }

    return { assigned, eventPlanned, multiLangExpanded }
  })
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** 키워드와 가장 잘 매칭되는 블로그 찾기 */
function findBestBlog(blogs: BlogInfo[], keywordText: string, intentType: string | null): BlogInfo {
  if (blogs.length === 1) return blogs[0]

  let bestBlog = blogs[0]
  let bestScore = -1

  for (const blog of blogs) {
    const score = matchScore(keywordText, intentType, blog)
    if (score > bestScore) {
      bestScore = score
      bestBlog = blog
    }
  }

  return bestBlog
}

function inferEventCategory(title: string): string {
  if (/콘서트|공연|뮤지컬|팬미팅|가수|아이돌/.test(title)) return 'concert'
  if (/야구|축구|농구|KBO|K리그|경기/.test(title)) return 'sports'
  if (/축제|페스티벌/.test(title)) return 'festival'
  if (/전시|박람회|미술/.test(title)) return 'exhibition'
  return 'other'
}
