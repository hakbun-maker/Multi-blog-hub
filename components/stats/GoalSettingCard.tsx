'use client'

import { useEffect, useState } from 'react'
import { Target, Edit2, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

interface GoalSettingCardProps {
  onSaved?: () => void  // 저장 시 forecast 등 재요청 트리거
}

export function GoalSettingCard({ onSaved }: GoalSettingCardProps) {
  const [goal, setGoal] = useState<number | null>(null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/user/monthly-goal')
      .then(r => r.json())
      .then(j => {
        if (typeof j.monthlyGoal === 'number') setGoal(j.monthlyGoal)
        else setGoal(null)
      })
      .catch(() => { /* 무시 */ })
      .finally(() => setLoading(false))
  }, [])

  const startEdit = () => {
    setDraft(goal !== null ? String(goal) : '')
    setEditing(true)
  }

  const cancelEdit = () => {
    setEditing(false)
    setDraft('')
  }

  const save = async () => {
    setSaving(true)
    const value = draft.trim() === '' ? null : Number(draft)
    if (value !== null && (!Number.isFinite(value) || value < 0)) {
      toast.error('숫자 형식 오류', { description: '0 이상의 USD 금액을 입력하세요.' })
      setSaving(false)
      return
    }
    try {
      const res = await fetch('/api/user/monthly-goal', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monthlyGoal: value }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || '저장 실패')
      setGoal(json.monthlyGoal)
      setEditing(false)
      toast.success('월 목표 저장됨', {
        description: value === null ? '목표가 해제되었습니다.' : `$${value} / 월`,
      })
      onSaved?.()
    } catch (err) {
      toast.error('저장 실패', { description: err instanceof Error ? err.message : '알 수 없는 오류' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="h-14 bg-gray-50 border border-gray-100 rounded-lg animate-pulse" />
  }

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg border border-gray-200 bg-gradient-to-r from-blue-50/50 to-white">
      <div className="flex items-center gap-2.5 min-w-0">
        <Target className="w-4 h-4 text-blue-500 flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-xs text-gray-500">월 수익 목표</p>
          {editing ? (
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-sm text-gray-400">$</span>
              <Input
                type="number"
                min={0}
                max={1000000}
                step={10}
                value={draft}
                onChange={e => setDraft(e.target.value)}
                placeholder="목표 금액 (USD)"
                className="h-7 text-sm w-32"
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter') save()
                  if (e.key === 'Escape') cancelEdit()
                }}
              />
              <span className="text-xs text-gray-400">/ 월</span>
            </div>
          ) : (
            <p className="text-sm font-semibold text-gray-900">
              {goal === null
                ? <span className="text-gray-400 font-normal">미설정</span>
                : `$${goal.toLocaleString()} / 월`
              }
            </p>
          )}
        </div>
      </div>

      {editing ? (
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={cancelEdit} disabled={saving} className="h-7 w-7 p-0">
            <X className="w-3.5 h-3.5" />
          </Button>
          <Button size="sm" onClick={save} disabled={saving} className="h-7 px-2 text-xs">
            {saving ? '저장 중' : <><Check className="w-3.5 h-3.5 mr-1" />저장</>}
          </Button>
        </div>
      ) : (
        <Button size="sm" variant="ghost" onClick={startEdit} className="h-7 px-2 text-xs text-gray-500">
          <Edit2 className="w-3 h-3 mr-1" />
          {goal === null ? '설정' : '변경'}
        </Button>
      )}
    </div>
  )
}
