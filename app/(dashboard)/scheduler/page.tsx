'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Play, Pause, Trash2, RefreshCw, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react'

interface SchedulerJob {
  id: string
  name: string
  status: 'active' | 'paused'
  frequency: 'once' | 'daily' | 'weekly' | 'monthly'
  run_hour: number
  run_minute: number
  blog_ids: string[]
  posts_per_run: number
  image_count: number
  next_run_at: string
  created_at: string
}

interface Blog {
  id: string
  name: string
  color: string
}

interface Keyword {
  id: string
  keyword: string
  status: 'pending' | 'used'
  created_at: string
}

interface Log {
  id: string
  job_id: string
  status: 'running' | 'success' | 'failed'
  post_ids: string[] | null
  error_msg: string | null
  created_at: string
  scheduler_jobs?: { name: string }
}

export default function SchedulerPage() {
  const [jobs, setJobs] = useState<SchedulerJob[]>([])
  const [blogs, setBlogs] = useState<Blog[]>([])
  const [keywords, setKeywords] = useState<Keyword[]>([])
  const [logs, setLogs] = useState<Log[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [keywordInput, setKeywordInput] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    name: '',
    frequency: 'daily',
    run_hour: 9,
    run_minute: 0,
    blog_ids: [] as string[],
    posts_per_run: 1,
    image_count: 0,
  })

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [jobsRes, blogsRes, kwRes, logsRes] = await Promise.all([
        fetch('/api/scheduler/jobs'),
        fetch('/api/blogs'),
        fetch('/api/keywords/pool'),
        fetch('/api/scheduler/logs'),
      ])
      const [j, b, k, l] = await Promise.all([jobsRes.json(), blogsRes.json(), kwRes.json(), logsRes.json()])
      setJobs(j.data ?? [])
      setBlogs(b.data ?? [])
      setKeywords(k.data ?? [])
      setLogs(l.data ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  async function createJob() {
    setSubmitting(true)
    try {
      const res = await fetch('/api/scheduler/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setShowCreateModal(false)
        setForm({ name: '', frequency: 'daily', run_hour: 9, run_minute: 0, blog_ids: [], posts_per_run: 1, image_count: 0 })
        fetchAll()
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function toggleJob(job: SchedulerJob) {
    const newStatus = job.status === 'active' ? 'paused' : 'active'
    await fetch(`/api/scheduler/jobs/${job.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    fetchAll()
  }

  async function deleteJob(id: string) {
    if (!confirm('이 자동화 규칙을 삭제하시겠습니까?')) return
    await fetch(`/api/scheduler/jobs/${id}`, { method: 'DELETE' })
    fetchAll()
  }

  async function addKeywords() {
    const lines = keywordInput.split('\n').map(s => s.trim()).filter(Boolean)
    if (!lines.length) return
    setSubmitting(true)
    try {
      await fetch('/api/keywords/pool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords: lines }),
      })
      setKeywordInput('')
      fetchAll()
    } finally {
      setSubmitting(false)
    }
  }

  async function deleteKeyword(id: string) {
    await fetch(`/api/scheduler/keywords/${id}`, { method: 'DELETE' })
    fetchAll()
  }

  function formatTime(h: number, m: number) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }

  function freqLabel(f: string) {
    return { once: '1회', daily: '매일', weekly: '매주', monthly: '매월' }[f] ?? f
  }

  const pendingCount = keywords.filter(k => k.status === 'pending').length

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">스케줄러</h1>
          <p className="text-muted-foreground text-sm">AI 자동 발행 규칙을 관리합니다</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="mr-2 h-4 w-4" /> 규칙 추가
        </Button>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{jobs.filter(j => j.status === 'active').length}</div>
            <div className="text-sm text-muted-foreground">활성 규칙</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{pendingCount}</div>
            <div className="text-sm text-muted-foreground">대기 키워드</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{logs.filter(l => l.status === 'success').length}</div>
            <div className="text-sm text-muted-foreground">성공한 실행</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="jobs">
        <TabsList>
          <TabsTrigger value="jobs">자동화 규칙</TabsTrigger>
          <TabsTrigger value="keywords">키워드 풀 ({pendingCount})</TabsTrigger>
          <TabsTrigger value="logs">실행 로그</TabsTrigger>
        </TabsList>

        {/* 자동화 규칙 탭 */}
        <TabsContent value="jobs" className="mt-4">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : jobs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                자동화 규칙이 없습니다. 규칙 추가 버튼을 눌러 시작하세요.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {jobs.map(job => (
                <Card key={job.id}>
                  <CardContent className="py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{job.name}</span>
                          <Badge variant={job.status === 'active' ? 'default' : 'secondary'}>
                            {job.status === 'active' ? '활성' : '일시정지'}
                          </Badge>
                          <Badge variant="outline">{freqLabel(job.frequency)}</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1 flex gap-3">
                          <span><Clock className="inline h-3 w-3 mr-1" />{formatTime(job.run_hour, job.run_minute)}</span>
                          <span>블로그 {job.blog_ids?.length ?? 0}개</span>
                          <span>회당 {job.posts_per_run}개</span>
                          {job.next_run_at && (
                            <span>다음 실행: {new Date(job.next_run_at).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => toggleJob(job)}>
                        {job.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => deleteJob(job.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* 키워드 풀 탭 */}
        <TabsContent value="keywords" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">키워드 추가</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                placeholder="키워드를 한 줄에 하나씩 입력하세요&#10;예) 강아지 사료 추천&#10;고양이 간식"
                value={keywordInput}
                onChange={e => setKeywordInput(e.target.value)}
                rows={4}
              />
              <Button onClick={addKeywords} disabled={submitting || !keywordInput.trim()}>
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                추가
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-2">
            {keywords.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">키워드가 없습니다.</CardContent></Card>
            ) : (
              keywords.map(kw => (
                <div key={kw.id} className="flex items-center justify-between py-2 px-4 border rounded-lg bg-card">
                  <div className="flex items-center gap-3">
                    <Badge variant={kw.status === 'pending' ? 'default' : 'secondary'}>
                      {kw.status === 'pending' ? '대기' : '사용됨'}
                    </Badge>
                    <span className="text-sm">{kw.keyword}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {new Date(kw.created_at).toLocaleDateString('ko-KR')}
                    </span>
                    <Button size="sm" variant="ghost" onClick={() => deleteKeyword(kw.id)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        {/* 실행 로그 탭 */}
        <TabsContent value="logs" className="mt-4">
          <div className="space-y-2">
            {logs.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">실행 로그가 없습니다.</CardContent></Card>
            ) : (
              logs.map(log => (
                <div key={log.id} className="flex items-center justify-between py-3 px-4 border rounded-lg bg-card">
                  <div className="flex items-center gap-3">
                    {log.status === 'success' && <CheckCircle className="h-4 w-4 text-green-500" />}
                    {log.status === 'failed' && <XCircle className="h-4 w-4 text-destructive" />}
                    {log.status === 'running' && <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />}
                    <div>
                      <span className="text-sm font-medium">{log.scheduler_jobs?.name ?? log.job_id}</span>
                      {log.error_msg && <p className="text-xs text-destructive mt-0.5">{log.error_msg}</p>}
                      {log.post_ids?.length ? (
                        <p className="text-xs text-muted-foreground mt-0.5">포스트 {log.post_ids.length}개 생성</p>
                      ) : null}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(log.created_at).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* 규칙 생성 모달 */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>자동화 규칙 추가</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>규칙 이름</Label>
              <Input placeholder="예) 매일 아침 발행" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>발행 주기</Label>
                <Select value={form.frequency} onValueChange={v => setForm(f => ({ ...f, frequency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="once">1회</SelectItem>
                    <SelectItem value="daily">매일</SelectItem>
                    <SelectItem value="weekly">매주</SelectItem>
                    <SelectItem value="monthly">매월</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>실행 시각</Label>
                <div className="flex gap-1.5 items-center">
                  <Input
                    type="number" min={0} max={23} value={form.run_hour}
                    onChange={e => setForm(f => ({ ...f, run_hour: Number(e.target.value) }))}
                    className="w-16 text-center"
                  />
                  <span>:</span>
                  <Input
                    type="number" min={0} max={59} value={form.run_minute}
                    onChange={e => setForm(f => ({ ...f, run_minute: Number(e.target.value) }))}
                    className="w-16 text-center"
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>회당 발행 수</Label>
                <Input type="number" min={1} max={10} value={form.posts_per_run}
                  onChange={e => setForm(f => ({ ...f, posts_per_run: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1.5">
                <Label>이미지 수</Label>
                <Input type="number" min={0} max={5} value={form.image_count}
                  onChange={e => setForm(f => ({ ...f, image_count: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>대상 블로그</Label>
              <div className="border rounded-lg p-3 space-y-2 max-h-36 overflow-y-auto">
                {blogs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">블로그가 없습니다.</p>
                ) : (
                  blogs.map(b => (
                    <div key={b.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`blog-${b.id}`}
                        checked={form.blog_ids.includes(b.id)}
                        onCheckedChange={checked => {
                          setForm(f => ({
                            ...f,
                            blog_ids: checked
                              ? [...f.blog_ids, b.id]
                              : f.blog_ids.filter(id => id !== b.id),
                          }))
                        }}
                      />
                      <label htmlFor={`blog-${b.id}`} className="flex items-center gap-1.5 text-sm cursor-pointer">
                        <span className="w-2 h-2 rounded-full inline-block" style={{ background: b.color ?? '#6366f1' }} />
                        {b.name}
                      </label>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>취소</Button>
            <Button onClick={createJob} disabled={submitting || !form.name || form.blog_ids.length === 0}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              생성
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
