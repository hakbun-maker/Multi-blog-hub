'use client'

/**
 * /settings/notifications — 알림 전체 보기 + 상세 가이드
 *
 * 종 아이콘 드롭다운은 짧은 미리보기, 여기는 마크다운 가이드까지 표시.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, AlertCircle, AlertTriangle, Info, CheckCircle2, ExternalLink, Trash2, BellOff } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Notification {
  id: string
  type: string
  severity: 'info' | 'warning' | 'error' | 'success'
  title: string
  message: string
  action_label: string | null
  action_url: string | null
  guide_markdown: string | null
  read_at: string | null
  dismissed_at: string | null
  created_at: string
  metadata: Record<string, unknown> | null
}

const SEVERITY_ICON = {
  info: Info,
  warning: AlertTriangle,
  error: AlertCircle,
  success: CheckCircle2,
}

const SEVERITY_BG = {
  info: 'bg-blue-50 border-blue-200',
  warning: 'bg-amber-50 border-amber-200',
  error: 'bg-red-50 border-red-200',
  success: 'bg-green-50 border-green-200',
}

const SEVERITY_ICON_COLOR = {
  info: 'text-blue-500',
  warning: 'text-amber-500',
  error: 'text-red-500',
  success: 'text-green-500',
}

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread'>('unread')

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/notifications')
      const json = await res.json()
      setItems(json.notifications ?? [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = filter === 'unread' ? items.filter(n => n.read_at === null) : items

  const handleAction = async (id: string, action: 'read' | 'unread' | 'dismiss') => {
    await fetch(`/api/notifications/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('이 알림을 영구 삭제할까요?')) return
    await fetch(`/api/notifications/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/settings"><ArrowLeft className="w-4 h-4 mr-1" />설정</Link>
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">알림</h1>
          <p className="text-sm text-gray-500 mt-1">
            토큰 만료, 색인 갱신 등 직접 처리해야 할 작업을 안내합니다.
          </p>
        </div>
        <div className="inline-flex rounded-lg border border-gray-200 p-0.5">
          <button
            onClick={() => setFilter('unread')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              filter === 'unread' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            미읽음
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              filter === 'all' ? 'bg-gray-700 text-white' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            전체
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-sm text-gray-400">로드 중…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-sm text-gray-400">
          <BellOff className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          {filter === 'unread' ? '읽지 않은 알림이 없습니다.' : '알림이 없습니다.'}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(n => {
            const Icon = SEVERITY_ICON[n.severity]
            return (
              <div
                key={n.id}
                className={`border rounded-lg p-4 ${SEVERITY_BG[n.severity]} ${n.read_at === null ? 'ring-1 ring-blue-200' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${SEVERITY_ICON_COLOR[n.severity]}`} />
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-gray-900">{n.title}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {new Date(n.created_at).toLocaleString('ko-KR')}
                          {n.read_at === null && <span className="ml-2 text-blue-600 font-medium">미읽음</span>}
                        </p>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        {n.read_at === null ? (
                          <Button size="sm" variant="ghost" onClick={() => handleAction(n.id, 'read')} className="h-7 px-2 text-xs">
                            읽음
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost" onClick={() => handleAction(n.id, 'unread')} className="h-7 px-2 text-xs text-gray-400">
                            미읽음
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(n.id)} className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    <p className="text-sm text-gray-700">{n.message}</p>

                    {/* 가이드 마크다운 */}
                    {n.guide_markdown && (
                      <div className="bg-white/70 rounded-md border border-gray-200 p-3 mt-2">
                        <p className="text-[11px] font-semibold text-gray-500 mb-2">📋 처리 방법</p>
                        <pre className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed font-sans">{n.guide_markdown}</pre>
                      </div>
                    )}

                    {/* 액션 버튼 */}
                    {n.action_url && n.action_label && (
                      <Button asChild size="sm" className="mt-1">
                        <Link href={n.action_url}>
                          {n.action_label}
                          <ExternalLink className="w-3 h-3 ml-1" />
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
