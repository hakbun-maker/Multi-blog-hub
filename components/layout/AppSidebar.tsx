'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  BookOpen,
  PenSquare,
  CalendarClock,
  BarChart2,
  Megaphone,
  Search,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/dashboard',  label: '대시보드',    icon: LayoutDashboard },
  { href: '/blogs',      label: '블로그 관리',  icon: BookOpen },
  { href: '/editor/new', label: '글 작성',     icon: PenSquare },
  { href: '/scheduler',  label: '스케줄러',    icon: CalendarClock },
  { href: '/stats',      label: '통계',        icon: BarChart2 },
  { href: '/ads',        label: '광고 관리',   icon: Megaphone },
  { href: '/keywords',   label: '키워드 탐색기', icon: Search },
  { href: '/settings',   label: '설정',        icon: Settings },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <>
      {/* Desktop / Tablet 사이드바 */}
      <aside className="hidden md:flex flex-col w-60 lg:w-60 md:w-16 flex-shrink-0 bg-white border-r border-gray-200 min-h-screen">
        {/* 로고 */}
        <div className="h-14 flex items-center px-4 border-b border-gray-200">
          <span className="hidden lg:block text-base font-bold text-blue-600 truncate">
            Multi Blog Hub
          </span>
          <span className="lg:hidden text-blue-600 font-bold text-lg">M</span>
        </div>

        {/* 네비게이션 */}
        <nav className="flex-1 py-4 space-y-1 px-2">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="hidden lg:block">{label}</span>
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Mobile 하단 탭바 */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 flex">
        {NAV_ITEMS.slice(0, 5).map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex-1 flex flex-col items-center py-2 gap-0.5 text-xs font-medium transition-colors',
                isActive ? 'text-blue-600' : 'text-gray-500'
              )}
            >
              <Icon className="w-5 h-5" />
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
