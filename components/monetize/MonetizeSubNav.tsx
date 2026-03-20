'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { TrendingUp, Search, CalendarClock, PenSquare } from 'lucide-react'

const MONETIZE_TABS = [
  { href: '/monetize',         label: '대시보드', icon: TrendingUp },
  { href: '/keywords',         label: '키워드',   icon: Search },
  { href: '/scheduler',        label: '스케줄러', icon: CalendarClock },
  { href: '/monetize/writing', label: '글작성',   icon: PenSquare },
]

export function MonetizeSubNav() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden flex gap-1 overflow-x-auto pb-2 -mx-1 px-1">
      {MONETIZE_TABS.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href ||
          (pathname.startsWith(href + '/') && href !== '/monetize')
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap border transition-colors',
              isActive
                ? 'bg-orange-50 text-orange-600 border-orange-200'
                : 'text-gray-500 border-gray-200 hover:bg-gray-50'
            )}
          >
            <Icon className="w-3 h-3" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
