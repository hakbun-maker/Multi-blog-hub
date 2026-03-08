import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

function extractOG(html: string, property: string): string {
  const p1 = new RegExp(`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']*)["']`, 'i')
  const p2 = new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*property=["']${property}["']`, 'i')
  return html.match(p1)?.[1] ?? html.match(p2)?.[1] ?? ''
}

function extractMetaName(html: string, name: string): string {
  const p1 = new RegExp(`<meta[^>]*name=["']${name}["'][^>]*content=["']([^"']*)["']`, 'i')
  const p2 = new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*name=["']${name}["']`, 'i')
  return html.match(p1)?.[1] ?? html.match(p2)?.[1] ?? ''
}

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { url } = await request.json() as { url: string }
  if (!url) return NextResponse.json({ error: 'URL이 필요합니다.' }, { status: 400 })

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BlogHub/1.0)' },
    })
    clearTimeout(timeout)

    if (!res.ok) throw new Error('Fetch failed')

    // HTML을 텍스트로 가져올 때 인코딩 처리
    const buffer = await res.arrayBuffer()
    const html = new TextDecoder('utf-8').decode(buffer)

    const title = extractOG(html, 'og:title')
      || html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim()
      || ''

    const description = extractOG(html, 'og:description')
      || extractMetaName(html, 'description')
      || ''

    const image = extractOG(html, 'og:image') || ''
    const siteName = extractOG(html, 'og:site_name') || ''
    const domain = new URL(url).hostname.replace(/^www\./, '')

    return NextResponse.json({
      title,
      description,
      image,
      siteName: siteName || domain,
      domain,
    })
  } catch {
    try {
      const domain = new URL(url).hostname.replace(/^www\./, '')
      return NextResponse.json({ title: '', description: '', image: '', siteName: domain, domain })
    } catch {
      return NextResponse.json({ error: 'URL 분석 실패' }, { status: 400 })
    }
  }
}
