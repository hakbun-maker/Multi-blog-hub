'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
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
  Lock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSidebar } from '@/components/layout/SidebarContext'
import { usePlanContext } from '@/components/plan/PlanContext'
import { UpgradeModal } from '@/components/plan/UpgradeModal'
import { SIDEBAR_FEATURE_MAP, PLAN_LABELS } from '@/lib/plan/constants'
import type { PlanId } from '@/types/plan'

const NAV_MAIN = [
  { href: '/dashboard',  label: '대시보드',   icon: LayoutDashboard },
  { href: '/blogs',      label: '블로그 관리', icon: BookOpen },
  { href: '/editor/new', label: '글 작성',    icon: PenSquare },
  { href: '/stats',      label: '통계',       icon: BarChart2 },
]

const NAV_MONETIZE = [
  { href: '/monetize',         label: '수익화 대시보드', icon: TrendingUp },
  { href: '/keywords',         label: '키워드 탐색기',   icon: Search },
  { href: '/scheduler',        label: '스케줄러',        icon: CalendarClock },
  { href: '/monetize/writing', label: '글작성 & 대기',   icon: PenSquare },
]

const NAV_BOTTOM = [
  { href: '/settings', label: '설정',     icon: Settings },
]

function NavLink({ href, label, icon: Icon, collapsed, indent = false, locked = false, onLockedClick, comingSoon = false }: {
  href: string
  label: string
  icon: React.ElementType
  collapsed: boolean
  indent?: boolean
  locked?: boolean
  onLockedClick?: () => void
  comingSoon?: boolean
}) {
  const pathname = usePathname()
  // Exact match or prefix match, but avoid /monetize matching /monetize/writing
  const isActive = pathname === href ||
    (pathname.startsWith(href + '/') && !NAV_MONETIZE.some(m => m.href !== href && m.href.startsWith(href + '/') && pathname.startsWith(m.href)))

  if (locked) {
    return (
      <button
        onClick={onLockedClick}
        title={collapsed ? `${label} ${comingSoon ? '(준비중)' : '(잠금)'}` : undefined}
        className={cn(
          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full',
          collapsed && 'justify-center px-0',
          indent && !collapsed && 'pl-8',
          'text-gray-400 opacity-60 hover:opacity-80 cursor-pointer'
        )}
      >
        <Icon className="w-5 h-5 flex-shrink-0" />
        {!collapsed && (
          <>
            <span className="flex-1 text-left">{label}</span>
            {comingSoon ? (
              <span className="text-[10px] font-semibold text-orange-500 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded whitespace-nowrap">준비중</span>
            ) : (
              <Lock className="w-3.5 h-3.5 text-gray-300" />
            )}
          </>
        )}
      </button>
    )
  }

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
  const router = useRouter()
  const { collapsed, toggle } = useSidebar()
  const { hasFeature, planId } = usePlanContext()
  const [upgradeModal, setUpgradeModal] = useState<{ open: boolean; minPlan: PlanId; featureName: string }>({ open: false, minPlan: 'pro', featureName: '' })

  const isMonetizeActive = NAV_MONETIZE.some(
    item => pathname === item.href || pathname.startsWith(item.href + '/')
  )
  const [monetizeOpen, setMonetizeOpen] = useState(isMonetizeActive)

  // 수익화 로켓 메뉴는 정식 출시 전 — 전부 '준비중'으로 잠금 (플랜 권한 무시)
  const isMonetizeHref = (href: string) =>
    NAV_MONETIZE.some(m => m.href === href || href.startsWith(m.href + '/'))

  const getLockedState = (href: string) => {
    if (isMonetizeHref(href)) return true // 준비중 — 강제 잠금
    const mapping = SIDEBAR_FEATURE_MAP[href]
    if (!mapping) return false
    return !hasFeature(mapping.featureKey)
  }

  const handleLockedClick = (href: string, label: string) => {
    if (isMonetizeHref(href)) {
      // 준비중 — 업그레이드 모달 대신 단순 안내
      alert(`${label} — 준비중입니다.\n수익화 로켓 기능은 정식 출시 전 점검 중입니다.`)
      return
    }
    const mapping = SIDEBAR_FEATURE_MAP[href]
    if (!mapping) return
    setUpgradeModal({ open: true, minPlan: mapping.minPlan, featureName: label })
  }

  return (
    <>
      {/* Desktop / Tablet 사이드바 */}
      <aside className={cn(
        'hidden md:flex flex-col flex-shrink-0 bg-white border-r border-gray-200 min-h-screen transition-all duration-200',
        collapsed ? 'w-20' : 'w-64'
      )}>
        {/* 로고 — 헤더 px-5는 메뉴 NavLink의 (nav px-2 + NavLink px-3) = 20px와 정렬 */}
        <Link
          href="/dashboard"
          className="h-14 flex items-center px-5 border-b border-gray-200 hover:bg-gray-50 transition-colors"
        >
          {collapsed ? (
            <Image src="/logo-mark.svg" alt="Multi Blog Hub" width={276} height={168} priority className="mx-auto h-10 w-auto" />
          ) : (
            <Image src="/logo.svg" alt="multi[blog].hub" width={620} height={90} priority className="h-9 w-auto" />
          )}
        </Link>

        {/* 네비게이션 */}
        <nav className="flex-1 py-4 px-2 flex flex-col gap-1 overflow-y-auto">
          {/* 메인 메뉴 */}
          {NAV_MAIN.map(item => (
            <NavLink key={item.href} {...item} collapsed={collapsed} />
          ))}

          {/* 수익화 로켓 그룹 */}
          <div className="mt-2">
            {collapsed ? (
              <>
                <div className="flex items-center justify-center py-1.5">
                  <Rocket className="w-4 h-4 text-orange-400" />
                </div>
                {NAV_MONETIZE.map(item => (
                  <NavLink
                    key={item.href}
                    {...item}
                    collapsed={collapsed}
                    locked={getLockedState(item.href)}
                    comingSoon
                    onLockedClick={() => handleLockedClick(item.href, item.label)}
                  />
                ))}
              </>
            ) : (
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
                    <span className="text-[10px] font-semibold text-orange-500 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded whitespace-nowrap">준비중</span>
                  </div>
                  {monetizeOpen
                    ? <ChevronUp className="w-4 h-4 text-gray-400" />
                    : <ChevronDown className="w-4 h-4 text-gray-400" />
                  }
                </button>
                {monetizeOpen && (
                  <div className="mt-1 space-y-0.5">
                    {NAV_MONETIZE.map(item => (
                      <NavLink
                        key={item.href}
                        {...item}
                        collapsed={collapsed}
                        indent
                        locked={getLockedState(item.href)}
                        comingSoon
                        onLockedClick={() => handleLockedClick(item.href, item.label)}
                      />
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
          { href: '/monetize', label: '수익화', icon: Rocket },
        ].map(({ href, label, icon: Icon }) => {
          // 수익화 탭: /monetize, /keywords, /scheduler, /monetize/writing 모두 active
          const isMonetizeTab = href === '/monetize'
          const isActive = isMonetizeTab
            ? NAV_MONETIZE.some(m => pathname === m.href || pathname.startsWith(m.href + '/'))
            : pathname === href || pathname.startsWith(href + '/')
          const locked = getLockedState(href)
          return locked ? (
            <button
              key={href}
              onClick={() => handleLockedClick(href, label)}
              className="flex-1 flex flex-col items-center py-2 gap-0.5 text-xs font-medium text-gray-300"
            >
              <Icon className="w-5 h-5" />
              <span>{label}</span>
            </button>
          ) : (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex-1 flex flex-col items-center py-2 gap-0.5 text-xs font-medium transition-colors',
                isActive ? 'text-orange-500' : 'text-gray-500',
              )}
            >
              <Icon className="w-5 h-5" />
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>

      <UpgradeModal
        open={upgradeModal.open}
        onOpenChange={open => setUpgradeModal(prev => ({ ...prev, open }))}
        currentPlan={planId}
        targetPlan={upgradeModal.minPlan}
        message={`이 기능은 ${PLAN_LABELS[upgradeModal.minPlan]} 플랜부터 사용할 수 있어요.`}
        featureName={upgradeModal.featureName}
      />
    </>
  )
}
