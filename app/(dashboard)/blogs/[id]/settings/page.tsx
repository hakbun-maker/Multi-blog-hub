'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'

type SettingsTab = 'basic' | 'ai' | 'ads' | 'crosslink'

const TABS: { id: SettingsTab; label: string }[] = [
  { id: 'basic', label: '기본정보' },
  { id: 'ai', label: 'AI 캐릭터' },
  { id: 'ads', label: '광고' },
  { id: 'crosslink', label: '크로스링킹' },
]

const COLORS = [
  '#3b82f6','#8b5cf6','#10b981','#f59e0b',
  '#ef4444','#06b6d4','#84cc16','#f97316',
]

const TONES = ['친근함', '전문적', '유머러스', '진지함', '캐주얼', '학술적']
const STYLES = ['설명형', '스토리텔링', '리스트형', '튜토리얼', '리뷰형', '뉴스형']

export default function BlogSettingsPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<SettingsTab>('basic')
  const [blog, setBlog] = useState<any>(null)
  const [allBlogs, setAllBlogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')

  // 기본정보 폼
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [customDomain, setCustomDomain] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [isActive, setIsActive] = useState(true)

  // AI 캐릭터 폼
  const [aiProvider, setAiProvider] = useState('claude')
  const [characterName, setCharacterName] = useState('')
  const [tone, setTone] = useState('친근함')
  const [style, setStyle] = useState('설명형')
  const [persona, setPersona] = useState('')

  // 크로스링킹
  const [linkedBlogIds, setLinkedBlogIds] = useState<string[]>([])

  useEffect(() => {
    const fetchData = async () => {
      const [blogRes, blogsRes] = await Promise.all([
        fetch(`/api/blogs/${params.id}`),
        fetch('/api/blogs'),
      ])
      if (!blogRes.ok) { router.push('/blogs'); return }

      const { data: blogData } = await blogRes.json()
      const { data: blogsData } = await blogsRes.json()

      setBlog(blogData)
      setAllBlogs((blogsData ?? []).filter((b: any) => b.id !== params.id))

      // 폼 초기화
      setName(blogData.name ?? '')
      setDescription(blogData.description ?? '')
      setCustomDomain(blogData.custom_domain ?? '')
      setColor(blogData.color ?? COLORS[0])
      setIsActive(blogData.is_active ?? true)
      setAiProvider(blogData.ai_provider ?? 'claude')

      const aiConfig = blogData.ai_character_config ?? {}
      setCharacterName(aiConfig.name ?? '')
      setTone(aiConfig.tone ?? '친근함')
      setStyle(aiConfig.style ?? '설명형')
      setPersona(aiConfig.persona ?? '')
      setLinkedBlogIds(aiConfig.linkedBlogIds ?? [])

      setLoading(false)
    }
    fetchData()
  }, [params.id, router])

  const showSuccess = (msg: string) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(''), 3000)
  }

  const handleSaveBasic = async () => {
    setSaving(true)
    const res = await fetch(`/api/blogs/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, customDomain: customDomain || null, color, isActive }),
    })
    setSaving(false)
    if (res.ok) showSuccess('기본정보가 저장되었습니다.')
  }

  const handleSaveAI = async () => {
    setSaving(true)
    const res = await fetch(`/api/blogs/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        aiProvider,
        aiCharacterConfig: { name: characterName, tone, style, persona },
      }),
    })
    setSaving(false)
    if (res.ok) showSuccess('AI 캐릭터 설정이 저장되었습니다.')
  }

  const handleSaveCrossLink = async () => {
    setSaving(true)
    const aiConfig = blog?.ai_character_config ?? {}
    const res = await fetch(`/api/blogs/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aiCharacterConfig: { ...aiConfig, linkedBlogIds } }),
    })
    setSaving(false)
    if (res.ok) showSuccess('크로스링킹 설정이 저장되었습니다.')
  }

  const handleDeleteBlog = async () => {
    if (!confirm(`"${blog?.name}" 블로그를 삭제하시겠습니까?\n모든 글과 데이터가 삭제됩니다.`)) return
    const res = await fetch(`/api/blogs/${params.id}`, { method: 'DELETE' })
    if (res.ok) router.push('/blogs')
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="h-64 bg-gray-100 rounded" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Link href={`/blogs/${params.id}`}><ArrowLeft className="w-4 h-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">블로그 설정</h1>
            <p className="text-sm text-gray-500">{blog?.name}</p>
          </div>
        </div>
      </div>

      {/* 성공 토스트 */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-2.5 rounded-lg">
          ✓ {success}
        </div>
      )}

      {/* SettingsTabNav */}
      <div className="border-b border-gray-200">
        <div className="flex gap-0">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === t.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* BasicInfoTab */}
      {activeTab === 'basic' && (
        <div className="space-y-5">
          <div className="space-y-1.5">
            <Label>블로그 이름 *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>설명</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="블로그 설명" />
          </div>
          <div className="space-y-1.5">
            <Label>커스텀 도메인</Label>
            <Input value={customDomain} onChange={e => setCustomDomain(e.target.value)}
              placeholder="example.com" />
            <p className="text-xs text-gray-400">DNS A레코드를 76.76.21.21에 연결하세요.</p>
          </div>
          <div className="space-y-2">
            <Label>블로그 색상</Label>
            <div className="flex gap-2">
              {COLORS.map(c => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Label>활성화</Label>
            <button onClick={() => setIsActive(!isActive)}
              className={`relative w-10 h-6 rounded-full transition-colors ${isActive ? 'bg-blue-600' : 'bg-gray-200'}`}>
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${isActive ? 'left-5' : 'left-1'}`} />
            </button>
            <span className="text-sm text-gray-500">{isActive ? '활성' : '비활성'}</span>
          </div>
          <div className="flex justify-between pt-2">
            <Button onClick={handleSaveBasic} disabled={saving || !name.trim()}>
              <Save className="w-4 h-4 mr-1.5" />{saving ? '저장 중...' : '저장'}
            </Button>
            <Button variant="outline" className="text-red-500 border-red-200 hover:bg-red-50"
              onClick={handleDeleteBlog}>
              <Trash2 className="w-4 h-4 mr-1.5" />블로그 삭제
            </Button>
          </div>
        </div>
      )}

      {/* AICharacterTab */}
      {activeTab === 'ai' && (
        <div className="space-y-5">
          <div className="space-y-2">
            <Label>AI 공급자</Label>
            <div className="flex gap-2">
              {['claude', 'openai', 'gemini'].map(p => (
                <button key={p} type="button" onClick={() => setAiProvider(p)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                    aiProvider === p ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400'
                  }`}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>캐릭터 이름</Label>
            <Input value={characterName} onChange={e => setCharacterName(e.target.value)}
              placeholder="예: 여행 전문가 나나" />
          </div>
          <div className="space-y-2">
            <Label>글쓰기 톤</Label>
            <div className="flex flex-wrap gap-2">
              {TONES.map(t => (
                <button key={t} type="button" onClick={() => setTone(t)}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
                    tone === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400'
                  }`}>{t}</button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>글쓰기 스타일</Label>
            <div className="flex flex-wrap gap-2">
              {STYLES.map(s => (
                <button key={s} type="button" onClick={() => setStyle(s)}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
                    style === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400'
                  }`}>{s}</button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>페르소나 설명</Label>
            <textarea
              value={persona}
              onChange={e => setPersona(e.target.value)}
              rows={4}
              placeholder="AI 캐릭터의 배경, 전문성, 글쓰기 특성을 설명해주세요..."
              className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <Button onClick={handleSaveAI} disabled={saving}>
            <Save className="w-4 h-4 mr-1.5" />{saving ? '저장 중...' : 'AI 설정 저장'}
          </Button>
        </div>
      )}

      {/* AdsTab */}
      {activeTab === 'ads' && (
        <Card className="shadow-none border border-gray-200">
          <CardContent className="p-6 text-center text-gray-400">
            <p className="font-medium text-gray-600 mb-1">광고 관리</p>
            <p className="text-sm">P4-S3 광고 관리 화면 구현 후 연동됩니다.</p>
            <p className="text-xs mt-2">AdSense 코드 및 위치별 광고 단위 설정이 가능해집니다.</p>
          </CardContent>
        </Card>
      )}

      {/* CrossLinkTab */}
      {activeTab === 'crosslink' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            선택한 블로그의 글에 이 블로그 링크를 자동으로 삽입합니다.
          </p>
          {!allBlogs.length ? (
            <Card className="shadow-none border border-gray-200">
              <CardContent className="p-6 text-center text-gray-400">
                <p className="text-sm">연결할 다른 블로그가 없습니다.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {allBlogs.map(b => (
                <label key={b.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={linkedBlogIds.includes(b.id)}
                    onChange={e => {
                      if (e.target.checked) setLinkedBlogIds(prev => [...prev, b.id])
                      else setLinkedBlogIds(prev => prev.filter(id => id !== b.id))
                    }}
                    className="w-4 h-4 text-blue-600" />
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: b.color ?? COLORS[0] }} />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{b.name}</p>
                    <p className="text-xs text-gray-400">{b.subdomain ?? b.custom_domain ?? b.slug}</p>
                  </div>
                </label>
              ))}
            </div>
          )}
          <Button onClick={handleSaveCrossLink} disabled={saving}>
            <Save className="w-4 h-4 mr-1.5" />{saving ? '저장 중...' : '크로스링킹 저장'}
          </Button>
        </div>
      )}
    </div>
  )
}
