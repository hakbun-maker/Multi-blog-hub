import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { bulkApplyAutoIndexAndSitemap } from '@/lib/google/gsc-site'
import { getValidIndexingToken } from '@/lib/google/token-refresh'
import { inspectUrl, type IndexVerdict } from '@/lib/google/url-inspection'
import { getFixGuide } from '@/lib/google/indexing-fix-guide'
import { submitUrlToGoogle } from '@/lib/google/indexing-api'

/**
 * 색인 종합 점검·요청 — 4단계 통합 처리.
 *
 * 1. 자동색인 ON
 * 2. 사이트맵 재제출
 * 3. URL Inspection으로 발행글 색인 상태 검사 (verdict + coverageState)
 * 4. 재요청 효과가 있는 글(canRetry=true)에만 Indexing API로 자동 재요청 (1일 200건 한도)
 *
 * POST body: { skipInspection?: boolean, skipReindex?: boolean, inspectionLimit?: number, reindexLimit?: number }
 */
export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as {
    skipInspection?: boolean
    skipReindex?: boolean
    inspectionLimit?: number
    reindexLimit?: number
  }
  const skipInspection = body.skipInspection === true
  const skipReindex = body.skipReindex === true
  // 한 번 실행에 60초 안에 끝나도록 보수적 한도. 매일 클릭하면 점차 전체 처리됨.
  const inspectionLimit = Math.max(1, Math.min(200, body.inspectionLimit ?? 50))
  const reindexLimit = Math.max(1, Math.min(100, body.reindexLimit ?? 30))
  // 인증 실패가 연속 N회 발생하면 즉시 중단 (토큰 만료 등 회복 불가 상태)
  const MAX_CONSECUTIVE_ERRORS = 5

  try {
    // ── 1·2단계: 자동색인 ON + 사이트맵 제출 ──
    const { results } = await bulkApplyAutoIndexAndSitemap(user.id)
    const baseSummary = {
      total: results.length,
      autoIndexSet: results.filter(r => r.autoIndexSet).length,
      sitemapOk: results.filter(r => r.sitemapOk).length,
      failed: results.filter(r => !r.sitemapOk || !r.autoIndexSet).length,
    }

    if (skipInspection) {
      return NextResponse.json({ ok: true, summary: baseSummary, results })
    }

    // ── 3단계: URL Inspection ──
    const accessToken = await getValidIndexingToken(user.id)
    if (!accessToken) {
      return NextResponse.json({
        ok: true,
        summary: {
          ...baseSummary,
          inspection: { total: 0, passed: 0, partial: 0, failed: 0, neutral: 0, errors: 0, skipped: 'GSC 토큰 없음' },
          reindex: { attempted: 0, succeeded: 0, failed: 0, skipped: 'GSC 토큰 없음' },
        },
        results,
      })
    }

    // 검사 대상: 발행글 중 이미 색인된(PASS/PARTIAL) 글은 스킵
    // - 미검사(NULL) + FAIL + NEUTRAL + VERDICT_UNSPECIFIED 우선
    // - 매번 가장 오래된 미검사 글부터 처리하도록 정렬
    const [{ data: posts }, { data: blogs }] = await Promise.all([
      supabase
        .from('posts')
        .select('id, slug, blog_id, status, indexing_verdict, indexing_inspected_at')
        .eq('user_id', user.id)
        .eq('status', 'published')
        .not('slug', 'is', null)
        .or('indexing_verdict.is.null,indexing_verdict.eq.FAIL,indexing_verdict.eq.NEUTRAL,indexing_verdict.eq.VERDICT_UNSPECIFIED')
        .order('indexing_inspected_at', { ascending: true, nullsFirst: true })
        .order('published_at', { ascending: false })
        .limit(inspectionLimit),
      supabase.from('blogs').select('id, slug, custom_domain').eq('user_id', user.id),
    ])

    console.log('[bulk-apply] 검사 대상 글:', {
      count: posts?.length ?? 0,
      limit: inspectionLimit,
      verdicts: (posts ?? []).reduce<Record<string, number>>((acc, p) => {
        const v = (p.indexing_verdict as string | null) ?? 'NULL'
        acc[v] = (acc[v] ?? 0) + 1
        return acc
      }, {}),
    })

    const blogById = new Map((blogs ?? []).map(b => [b.id as string, { slug: b.slug as string, custom_domain: b.custom_domain as string | null }]))

    interface InspectionRow {
      postId: string
      url: string
      blogId: string
      verdict: IndexVerdict | null
      coverageState: string | null
      lastCrawlTime: string | null
      error?: string
    }

    // GSC 속성 등록 형식이 사용자마다 다름 (Domain property vs URL prefix)
    // 블로그당 첫 글에서 동작하는 형식을 찾아 캐시 → 이후 글은 그 형식 재사용
    const workingSiteUrlByBlog = new Map<string, string>()

    const inspectionStartedAt = Date.now()
    const inspectionResults: InspectionRow[] = []
    let inspectionConsecutiveErrors = 0
    let inspectionAborted: string | undefined
    for (const p of (posts ?? []) as { id: string; slug: string; blog_id: string }[]) {
      const blog = blogById.get(p.blog_id)
      if (!blog || !blog.custom_domain) {
        inspectionResults.push({
          postId: p.id,
          url: '',
          blogId: p.blog_id,
          verdict: null,
          coverageState: null,
          lastCrawlTime: null,
          error: 'custom_domain 없음',
        })
        continue
      }
      const inspectionUrl = `https://${blog.custom_domain}/${encodeURIComponent(p.slug)}`

      const cached = workingSiteUrlByBlog.get(p.blog_id)
      const candidates = cached
        ? [cached]
        : [`sc-domain:${blog.custom_domain}`, `https://${blog.custom_domain}/`]

      let r: Awaited<ReturnType<typeof inspectUrl>> | null = null
      for (const siteUrl of candidates) {
        r = await inspectUrl(siteUrl, inspectionUrl, accessToken)
        if (!r.error) {
          workingSiteUrlByBlog.set(p.blog_id, siteUrl)
          break
        }
        if (candidates.length > 1) await new Promise(res => setTimeout(res, 100))
      }

      inspectionResults.push({
        postId: p.id,
        url: inspectionUrl,
        blogId: p.blog_id,
        verdict: r?.error ? null : (r?.verdict ?? null),
        coverageState: r?.coverageState ?? null,
        lastCrawlTime: r?.lastCrawlTime ?? null,
        error: r?.error,
      })

      // 연속 에러 카운트 — N회 연속 시 중단 (토큰·권한 문제 등 회복 불가)
      if (r?.error) {
        inspectionConsecutiveErrors++
        if (inspectionConsecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
          inspectionAborted = `${MAX_CONSECUTIVE_ERRORS}회 연속 오류 — 토큰/권한 점검 필요. 마지막 오류: ${r.error.slice(0, 80)}`
          break
        }
      } else {
        inspectionConsecutiveErrors = 0
      }

      await new Promise(res => setTimeout(res, 100))
    }
    console.log('[bulk-apply] 검사 완료:', {
      total: inspectionResults.length,
      elapsedMs: Date.now() - inspectionStartedAt,
      aborted: inspectionAborted ?? null,
    })

    // DB 저장
    const now = new Date().toISOString()
    await Promise.all(
      inspectionResults
        .filter(r => r.verdict !== null)
        .map(r =>
          supabase
            .from('posts')
            .update({
              indexing_verdict: r.verdict,
              indexing_coverage_state: r.coverageState,
              indexing_inspected_at: now,
              indexing_last_crawl_at: r.lastCrawlTime,
            })
            .eq('id', r.postId)
            .eq('user_id', user.id),
        ),
    )

    const inspectionSummary = {
      total: inspectionResults.length,
      passed: inspectionResults.filter(r => r.verdict === 'PASS').length,
      partial: inspectionResults.filter(r => r.verdict === 'PARTIAL').length,
      failed: inspectionResults.filter(r => r.verdict === 'FAIL').length,
      neutral: inspectionResults.filter(r => r.verdict === 'NEUTRAL').length,
      errors: inspectionResults.filter(r => !!r.error).length,
      ...(inspectionAborted ? { skipped: inspectionAborted } : {}),
    }

    // 카테고리별 분류 (reasonShort 기준)
    const categoryMap = new Map<string, { reasonShort: string; severity: string; canRetry: boolean; count: number }>()
    for (const r of inspectionResults) {
      const guide = getFixGuide(r.verdict, r.coverageState)
      const key = guide.reasonShort
      const cur = categoryMap.get(key)
      if (cur) cur.count++
      else categoryMap.set(key, { reasonShort: guide.reasonShort, severity: guide.severity, canRetry: guide.canRetry, count: 1 })
    }
    const categories = Array.from(categoryMap.values()).sort((a, b) => b.count - a.count)

    // ── 4단계: canRetry=true 글에 자동 색인 재요청 ──
    interface ReindexResult { postId: string; url: string; ok: boolean; error?: string }
    const reindexResults: ReindexResult[] = []
    let reindexSkipped: string | undefined

    if (skipReindex) {
      reindexSkipped = 'skipReindex=true'
    } else {
      // 재요청 대상: canRetry=true AND 이미 색인된 글 아님 AND error 없음
      const candidatesForRetry = inspectionResults.filter(r => {
        if (r.error) return false
        const guide = getFixGuide(r.verdict, r.coverageState)
        if (!guide.canRetry) return false
        if (guide.state === 'indexed') return false
        return true
      })

      const toRetry = candidatesForRetry.slice(0, reindexLimit)
      if (candidatesForRetry.length > reindexLimit) {
        reindexSkipped = `${candidatesForRetry.length - reindexLimit}개는 한 번 실행 한도(${reindexLimit}건) 초과 — 다음 실행 때 처리`
      }
      const reindexStartedAt = Date.now()
      console.log('[bulk-apply] 재요청 시작:', { candidates: candidatesForRetry.length, toRetry: toRetry.length })

      let reindexConsecutiveErrors = 0
      for (const r of toRetry) {
        const res = await submitUrlToGoogle(supabase, user.id, r.url)
        reindexResults.push({ postId: r.postId, url: r.url, ok: res.ok, error: res.error })
        // needsConnection이면 더 시도해봐도 같은 결과 → 중단
        if (res.needsConnection) {
          reindexSkipped = '재요청 도중 토큰 만료 — 재연결 필요'
          break
        }
        // 연속 실패 N회 시 중단
        if (!res.ok) {
          reindexConsecutiveErrors++
          if (reindexConsecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
            reindexSkipped = `${MAX_CONSECUTIVE_ERRORS}회 연속 실패 — 중단. 마지막 오류: ${(res.error ?? '').slice(0, 80)}`
            break
          }
        } else {
          reindexConsecutiveErrors = 0
        }
        await new Promise(res => setTimeout(res, 100))
      }
      console.log('[bulk-apply] 재요청 완료:', {
        attempted: reindexResults.length,
        succeeded: reindexResults.filter(r => r.ok).length,
        elapsedMs: Date.now() - reindexStartedAt,
        skipped: reindexSkipped ?? null,
      })
    }

    const reindexSummary = {
      attempted: reindexResults.length,
      succeeded: reindexResults.filter(r => r.ok).length,
      failed: reindexResults.filter(r => !r.ok).length,
      ...(reindexSkipped ? { skipped: reindexSkipped } : {}),
    }

    return NextResponse.json({
      ok: true,
      summary: { ...baseSummary, inspection: inspectionSummary, reindex: reindexSummary },
      results,
      inspection: inspectionResults,
      categories,
      reindex: reindexResults,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : '일괄 적용 중 오류 발생'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
