'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  BookOpen,
  PenSquare,
  BarChart2,
  Search,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  CalendarClock,
  Rocket,
  TrendingUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSidebar } from '@/components/layout/SidebarContext'

const NAV_MAIN = [
  { href: '/dashboard',  label: '대시보드',   icon: LayoutDashboard },
  { href: '/blogs',      label: '블로그 관리', icon: BookOpen },
  { href: '/editor/new', label: '글 작성',    icon: PenSquare },
  { href: '/stats',      label: '통계',       icon: BarChart2 },
]

const NAV_MONETIZE = [
  { href: '/keywords',  label: '키워드 탐색기',  icon: Search },
  { href: '/scheduler', label: '스케줄러',       icon: CalendarClock },
  { href: '/monetize',  label: '수익화 글 작성', icon: TrendingUp },
]

const NAV_BOTTOM = [
  { href: '/settings', label: '설정',     icon: Settings },
]

function NavLink({ href, label, icon: Icon, collapsed, indent = false }: {
  href: string
  label: string
  icon: React.ElementType
  collapsed: boolean
  indent?: boolean
}) {
  const pathname = usePathname()
  const isActive = pathname === href || pathname.startsWith(href + '/')
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
        collapsed && 'justify-center px-0',
        indent && !collapsed && 'pl-8',
        isActive
          ? 'bg-blue-50 text-blue-600'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      )}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      {!collapsed && <span>{label}</span>}
    </Link>
  )
}

export function AppSidebar() {
  const pathname = usePathname()
  const { collapsed, toggle } = useSidebar()
  const isMonetizeActive = NAV_MONETIZE.some(
    item => pathname === item.href || pathname.startsWith(item.href + '/')
  )
  const [monetizeOpen, setMonetizeOpen] = useState(isMonetizeActive)

  return (
    <>
      {/* Desktop / Tablet 사이드바 */}
      <aside className={cn(
        'hidden md:flex flex-col flex-shrink-0 bg-white border-r border-gray-200 min-h-screen transition-all duration-200',
        collapsed ? 'w-16' : 'w-60'
      )}>
        {/* 로고 */}
        <div className="h-14 flex items-center px-4 border-b border-gray-200">
          {collapsed ? (
            <span className="text-blue-600 font-bold text-lg mx-auto">M</span>
          ) : (
            <span className="text-base font-bold text-blue-600 truncate">Multi Blog Hub</span>
          )}
        </div>

        {/* 네비게이션 */}
        <nav className="flex-1 py-4 px-2 flex flex-col gap-1 overflow-y-auto">
          {/* 메인 메뉴 */}
          {NAV_MAIN.map(item => (
            <NavLink key={item.href} {...item} collapsed={collapsed} />
          ))}

          {/* 수익화 로켓 그룹 */}
          <div className="mt-2">
            {collapsed ? (
              // 접힌 상태: 서브 아이템 아이콘만 표시
              <>
                <div className="flex items-center justify-center py-1.5">
                  <Rocket className="w-4 h-4 text-orange-400" />
                </div>
                {NAV_MONETIZE.map(item => (
                  <NavLink key={item.href} {...item} collapsed={collapsed} />
                ))}
              </>
            ) : (
              // 펼친 상태: 그룹 헤더 + 서브 아이템
              <>
                <button
                  onClick={() => setMonetizeOpen(prev => !prev)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-semibold transition-colors',
                    isMonetizeActive
                      ? 'text-orange-600 bg-orange-50'
                      : 'text-gray-700 hover:bg-gray-100'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Rocket className="w-5 h-5 flex-shrink-0" />
                    <span>수익화 로켓</span>
                  </div>
                  {monetizeOpen
                    ? <ChevronUp className="w-4 h-4 text-gray-400" />
                    : <ChevronDown className="w-4 h-4 text-gray-400" />
                  }
                </button>
                {monetizeOpen && (
                  <div className="mt-1 space-y-0.5">
                    {NAV_MONETIZE.map(item => (
                      <NavLink key={item.href} {...item} collapsed={collapsed} indent />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </nav>

        {/* 하단 고정 메뉴 */}
        <div className="py-3 px-2 border-t border-gray-200 space-y-1">
          {NAV_BOTTOM.map(item => (
            <NavLink key={item.href} {...item} collapsed={collapsed} />
          ))}
          <button
            onClick={toggle}
            className="flex items-center justify-center w-full py-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors mt-1"
            title={collapsed ? '사이드바 열기' : '사이드바 닫기'}
          >
            {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>
      </aside>

      {/* Mobile 하단 탭바 */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 flex">
        {[
          ...NAV_MAIN,
          { href: '/keywords', label: '수익화', icon: Rocket },
        ].map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex-1 flex flex-col items-center py-2 gap-0.5 text-xs font-medium transition-colors',
                isActive ? 'text-orange-500' : 'text-gray-500',
                href === '/keywords' && isActive ? 'text-orange-500' : ''
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
