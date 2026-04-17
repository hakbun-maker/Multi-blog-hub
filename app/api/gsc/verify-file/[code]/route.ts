/**
 * GSC 소유권 확인 HTML 파일 서빙
 * 커스텀 도메인에서 /googleXXXX.html 요청 시 → 미들웨어가 여기로 rewrite
 * DB에서 해당 블로그의 gsc_verification_code를 조회하여 서빙
 */
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(
  _request: Request,
  { params }: { params: { code: string } }
) {
  const code = params.code // "google84dcee0d247a0d0e" 형태

  // DB에서 이 코드를 가진 블로그 찾기
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: blogs } = await supabase
    .from('blogs')
    .select('layout_config')
    .eq('is_active', true)

  // layout_config.tracking.gsc_verification_code가 일치하는 블로그 찾기
  const matchedBlog = (blogs ?? []).find((blog: any) => {
    const tracking = (blog.layout_config as any)?.tracking
    return tracking?.gsc_verification_code === code
  })

  if (!matchedBlog) {
    return new NextResponse('Not Found', { status: 404 })
  }

  // Google이 기대하는 HTML 응답
  const html = `google-site-verification: ${code}.html`

  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html' },
  })
}
