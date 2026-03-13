'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Plus, Pencil, Trash2, Loader2, Code2 } from 'lucide-react'

interface AdUnit {
  id: string
  name: string
  ad_code: string
  position: 'top' | 'content' | 'bottom' | 'sidebar'
  is_active: boolean
  blog_id: string | null
  created_at: string
}

interface Blog {
  id: string
  name: string
  color: string
}

const POSITIONS = [
  { value: 'top', label: '상단' },
  { value: 'content', label: '본문 내' },
  { value: 'bottom', label: '하단' },
  { value: 'sidebar', label: '사이드바' },
]

export default function AdsPage() {
  const [ads, setAds] = useState<AdUnit[]>([])
  const [blogs, setBlogs] = useState<Blog[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<AdUnit | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    name: '',
    adCode: '',
    position: 'content',
    blogId: '',
  })

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [adsRes, blogsRes] = await Promise.all([
        fetch('/api/ads'),
        fetch('/api/blogs'),
      ])
      const [a, b] = await Promise.all([adsRes.json(), blogsRes.json()])
      setAds(a.data ?? [])
      setBlogs(b.data ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  function openCreate() {
    setEditTarget(null)
    setForm({ name: '', adCode: '', position: 'content', blogId: '' })
    setShowModal(true)
  }

  function openEdit(ad: AdUnit) {
    setEditTarget(ad)
    setForm({ name: ad.name, adCode: ad.ad_code, position: ad.position, blogId: ad.blog_id ?? '' })
    setShowModal(true)
  }

  async function save() {
    setSubmitting(true)
    try {
      if (editTarget) {
        await fetch(`/api/ads/${editTarget.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: form.name, adCode: form.adCode, position: form.position }),
        })
      } else {
        await fetch('/api/ads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, blogId: form.blogId || null }),
        })
      }
      setShowModal(false)
      fetchAll()
    } finally {
      setSubmitting(false)
    }
  }

  async function toggleActive(ad: AdUnit) {
    await fetch(`/api/ads/${ad.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !ad.is_active }),
    })
    fetchAll()
  }

  async function deleteAd(id: string) {
    if (!confirm('이 광고 단위를 삭제하시겠습니까?')) return
    await fetch(`/api/ads/${id}`, { method: 'DELETE' })
    fetchAll()
  }

  function getBlogName(blogId: string | null) {
    if (!blogId) return '전체 블로그'
    return blogs.find(b => b.id === blogId)?.name ?? blogId
  }

  function positionLabel(pos: string) {
    return POSITIONS.find(p => p.value === pos)?.label ?? pos
  }

  const activeCount = ads.filter(a => a.is_active).length

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">광고 관리</h1>
          <p className="text-muted-foreground text-sm">AdSense 광고 단위를 관리합니다</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> 광고 단위 추가
        </Button>
      </div>

      {/* 요약 */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{ads.length}</div>
            <div className="text-sm text-muted-foreground">총 광고 단위</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{activeCount}</div>
            <div className="text-sm text-muted-foreground">활성</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-muted-foreground">{ads.length - activeCount}</div>
            <div className="text-sm text-muted-foreground">비활성</div>
          </CardContent>
        </Card>
      </div>

      {/* 광고 단위 목록 */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : ads.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Code2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">광고 단위가 없습니다.</p>
            <p className="text-sm text-muted-foreground mt-1">AdSense 광고 코드를 추가해 수익을 창출하세요.</p>
            <Button className="mt-4" onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" /> 첫 광고 단위 추가
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ads.map(ad => (
            <Card key={ad.id} className={!ad.is_active ? 'opacity-60' : ''}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{ad.name}</CardTitle>
                    <div className="flex gap-2 mt-1.5">
                      <Badge variant="outline">{positionLabel(ad.position)}</Badge>
                      <Badge variant="secondary" className="text-xs">{getBlogName(ad.blog_id)}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Switch checked={ad.is_active} onCheckedChange={() => toggleActive(ad)} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {ad.ad_code ? (
                  <pre className="text-xs bg-muted p-2 rounded overflow-x-auto max-h-20 text-muted-foreground">
                    {ad.ad_code.slice(0, 120)}{ad.ad_code.length > 120 ? '...' : ''}
                  </pre>
                ) : (
                  <p className="text-xs text-muted-foreground italic">광고 코드 없음</p>
                )}
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="outline" onClick={() => openEdit(ad)}>
                    <Pencil className="h-3.5 w-3.5 mr-1" /> 편집
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => deleteAd(ad.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 생성/편집 모달 */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editTarget ? '광고 단위 편집' : '광고 단위 추가'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>광고 단위 이름</Label>
              <Input placeholder="예) 헤더 배너" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>위치</Label>
                <Select value={form.position} onValueChange={v => setForm(f => ({ ...f, position: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {POSITIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {!editTarget && (
                <div className="space-y-1.5">
                  <Label>블로그 (선택)</Label>
                  <Select value={form.blogId} onValueChange={v => setForm(f => ({ ...f, blogId: v }))}>
                    <SelectTrigger><SelectValue placeholder="전체" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">전체 블로그</SelectItem>
                      {blogs.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>광고 코드</Label>
              <Textarea
                placeholder="<script>... (AdSense 코드 붙여넣기)</script>"
                value={form.adCode}
                onChange={e => setForm(f => ({ ...f, adCode: e.target.value }))}
                rows={6}
                className="font-mono text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>취소</Button>
            <Button onClick={save} disabled={submitting || !form.name}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editTarget ? '저장' : '추가'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
