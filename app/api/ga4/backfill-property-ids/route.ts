import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getValidGoogleToken } from '@/lib/google/token-refresh'

/**
 * 기존에 GA4 measurementId(G-XXXX)만 저장된 블로그에 ga4_property_id 백필.
 * accountSummaries로 모든 property/stream을 받아 measurementId → propertyId 매핑.
 */
export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const accessToken = await getValidGoogleToken(user.id)
  if (!accessToken) {
    return NextResponse.json({ error: 'Google 미연결 — 다시 연결해주세요.' }, { status: 401 })
  }

  // 사용자의 블로그 중 measurementId만 있고 propertyId가 비어있는 것
  const { data: blogs } = await supabase
    .from('blogs')
    .select('id, layout_config, ga4_property_id')
    .eq('user_id', user.id)

  if (!blogs?.length) return NextResponse.json({ updated: 0 })

  const targets = blogs
    .map(b => {
      const tracking = ((b.layout_config as Record<string, unknown>)?.tracking ?? {}) as Record<string, string>
      return { id: b.id, ga4_id: tracking.ga4_id, hasPropertyId: !!b.ga4_property_id }
    })
    .filter(b => b.ga4_id && !b.hasPropertyId)

  if (!targets.length) return NextResponse.json({ updated: 0, message: '백필할 블로그 없음' })

  // accountSummaries 조회 — 모든 property + stream 한 번에
  const measureToProperty = new Map<string, string>()
  let pageToken: string | undefined

  do {
    const url = new URL('https://analyticsadmin.googleapis.com/v1beta/accountSummaries')
    url.searchParams.set('pageSize', '200')
    if (pageToken) url.searchParams.set('pageToken', pageToken)

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: `accountSummaries 실패: ${err}` }, { status: 500 })
    }
    const data = await res.json()
    for (const acct of data.accountSummaries ?? []) {
      for (const ps of acct.propertySummaries ?? []) {
        // propertySummary.property = "properties/123"
        const propertyId = (ps.property as string).replace('properties/', '')
        // 데이터스트림 조회 (measurementId 가져오기)
        const streamRes = await fetch(
          `https://analyticsadmin.googleapis.com/v1beta/${ps.property}/dataStreams`,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        )
        if (!streamRes.ok) continue
        const streamData = await streamRes.json()
        for (const stream of streamData.dataStreams ?? []) {
          const m = stream.webStreamData?.measurementId as string | undefined
          if (m) measureToProperty.set(m, propertyId)
        }
      }
    }
    pageToken = data.nextPageToken
  } while (pageToken)

  // 매핑된 것만 업데이트
  let updated = 0
  for (const t of targets) {
    const propId = measureToProperty.get(t.ga4_id!)
    if (!propId) continue
    const { error } = await supabase
      .from('blogs')
      .update({ ga4_property_id: propId })
      .eq('id', t.id)
      .eq('user_id', user.id)
    if (!error) updated++
  }

  return NextResponse.json({ updated, total_targets: targets.length })
}
