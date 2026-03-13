import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// 앱 자체 호스트 목록 (커스텀 도메인 감지 제외 대상)
const APP_HOSTS = [
  'localhost',
  'multi-blog-hub.vercel.app',
]

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') ?? ''
  const rootDomain = hostname.split(':')[0] // 포트 제거

  // 커스텀 도메인 감지: 앱 호스트도 아니고 vercel.app 도메인도 아닌 경우
  const isCustomDomain =
    !APP_HOSTS.includes(rootDomain) &&
    !rootDomain.endsWith('.vercel.app')

  if (isCustomDomain) {
    // Supabase에서 custom_domain으로 블로그 slug 조회
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const res = await fetch(
      `${supabaseUrl}/rest/v1/blogs?custom_domain=eq.${rootDomain}&is_active=eq.true&select=slug&limit=1`,
      { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
    )
    const blogs = await res.json()
    const slug = blogs?.[0]?.slug

    if (slug) {
      const pathname = request.nextUrl.pathname
      // 이미 /blog/로 시작하면 그대로
      if (!pathname.startsWith('/blog/') && !pathname.startsWith('/api/')) {
        const url = request.nextUrl.clone()
        url.pathname = pathname === '/' ? `/blog/${slug}` : `/blog/${slug}${pathname}`
        return NextResponse.rewrite(url)
      }
    } else {
      // 등록된 블로그 없으면 404
      return new NextResponse('Not Found', { status: 404 })
    }
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 인증이 필요한 경로: /dashboard, /blogs, /editor, /scheduler, /stats, /ads, /keywords, /settings
  const protectedPaths = [
    '/dashboard',
    '/blogs',
    '/editor',
    '/scheduler',
    '/stats',
    '/ads',
    '/keywords',
    '/settings',
  ]

  const isProtected = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  )

  if (isProtected && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // 이미 로그인한 사용자가 /login, /signup 접근 시 대시보드로
  if (user && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
