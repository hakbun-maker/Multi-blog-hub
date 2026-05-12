'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Bell, AlertCircle, AlertTriangle, Info, CheckCircle2, X, ExternalLink } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'

interface Notification {
  id: string
  type: string
  severity: 'info' | 'warning' | 'error' | 'success'
  title: string
  message: string
  action_label: string | null
  action_url: string | null
  read_at: string | null
  created_at: string
}

const SEVERITY_ICON = {
  info: Info,
  warning: AlertTriangle,
  error: AlertCircle,
  success: CheckCircle2,
}

const SEVERITY_COLOR = {
  info: 'text-blue-500',
  warning: 'text-amber-500',
  error: 'text-red-500',
  success: 'text-green-500',
}

export function NotificationBell() {
  const [items, setItems] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/notifications')
      if (!res.ok) return
      const json = await res.json()
      setItems(json.notifications ?? [])
      setUnreadCount(json.unreadCount ?? 0)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    // 5분마다 폴링 (서버에서 새 알림 자동 생성됐을 때 반영)
    const interval = setInterval(load, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [load])

  const markRead = async (id: string) => {
    await fetch(`/api/notifications/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'read' }),
    })
    load()
  }

  const dismiss = async (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    await fetch(`/api/notifications/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'dismiss' }),
    })
    load()
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative h-9 w-9 p-0" title="알림">
          <Bell className="w-4 h-4 text-gray-600" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 max-h-[480px] overflow-hidden flex flex-col p-0">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="text-sm font-semibold text-gray-900">알림</h3>
          {unreadCount > 0 && (
            <span className="text-[11px] text-blue-600 font-medium">미읽음 {unreadCount}개</span>
          )}
        </div>

        {/* 리스트 */}
        <div className="flex-1 overflow-y-auto">
          {loading && items.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">로드 중…</div>
          ) : items.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              <Bell className="w-6 h-6 mx-auto text-gray-300 mb-2" />
              알림이 없습니다.
            </div>
          ) : (
            items.map(n => {
              const Icon = SEVERITY_ICON[n.severity]
              const isUnread = n.read_at === null
              return (
                <div
                  key={n.id}
                  className={`px-4 py-3 border-b last:border-b-0 group ${
                    isUnread ? 'bg-blue-50/40' : 'bg-white'
                  } hover:bg-gray-50 transition-colors`}
                  onClick={() => isUnread && markRead(n.id)}
                >
                  <div className="flex items-start gap-2">
                    <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${SEVERITY_COLOR[n.severity]}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-gray-900">{n.title}</p>
                        <button
                          onClick={(e) => dismiss(n.id, e)}
                          className="text-gray-300 hover:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                          title="알림 닫기"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{n.message}</p>
                      {n.action_url && n.action_label && (
                        <Link
                          href={n.action_url}
                          className="inline-flex items-center gap-1 mt-1.5 text-xs text-blue-600 font-medium hover:underline"
                          onClick={() => setOpen(false)}
                        >
                          {n.action_label}
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      )}
                      <p className="text-[10px] text-gray-400 mt-1">
                        {formatTimeAgo(n.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* 푸터 */}
        <div className="border-t px-4 py-2 bg-gray-50/50">
          <Link
            href="/settings/notifications"
            className="text-xs text-blue-600 hover:underline"
            onClick={() => setOpen(false)}
          >
            전체 알림 보기 →
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function formatTimeAgo(iso: string): string {
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  const min = Math.floor(diff / 60000)
  const hour = Math.floor(min / 60)
  const day = Math.floor(hour / 24)
  if (min < 1) return '방금 전'
  if (min < 60) return `${min}분 전`
  if (hour < 24) return `${hour}시간 전`
  if (day < 7) return `${day}일 전`
  return d.toLocaleDateString('ko-KR')
}
