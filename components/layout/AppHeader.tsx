'use client'

import { useRouter } from 'next/navigation'
import { LogOut, User, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { useSidebar } from '@/components/layout/SidebarContext'

interface AppHeaderProps {
  userEmail?: string
  userName?: string
}

export function AppHeader({ userEmail, userName }: AppHeaderProps) {
  const router = useRouter()
  const { collapsed, toggle } = useSidebar()

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  const displayName = userName || userEmail?.split('@')[0] || '사용자'

  return (
    <header className="h-14 flex items-center justify-between px-6 bg-white border-b border-gray-200 sticky top-0 z-40">
      {/* 좌측: 모바일 로고 + 데스크톱 토글 */}
      <div className="flex items-center gap-2">
        <span className="md:hidden text-base font-bold text-blue-600">Multi Blog Hub</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={toggle}
          className="hidden md:flex h-8 w-8 p-0"
          title={collapsed ? '사이드바 열기' : '사이드바 닫기'}
        >
          {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </Button>
      </div>

      {/* 우측: 프로필 드롭다운 */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
              <User className="w-4 h-4 text-blue-600" />
            </div>
            <span className="hidden sm:block text-sm text-gray-700">{displayName}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <div className="px-3 py-2">
            <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
            {userEmail && (
              <p className="text-xs text-gray-500 truncate">{userEmail}</p>
            )}
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleLogout}
            className="text-red-600 cursor-pointer"
          >
            <LogOut className="w-4 h-4 mr-2" />
            로그아웃
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
