'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const COLORS = [
  '#3b82f6','#8b5cf6','#10b981','#f59e0b',
  '#ef4444','#06b6d4','#84cc16','#f97316',
]

type DomainType = 'subdomain' | 'custom'

export function BlogCreateForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [aiProvider, setAiProvider] = useState('claude')
  const [domainType, setDomainType] = useState<DomainType>('subdomain')
  const [customDomain, setCustomDomain] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleNameChange = (v: string) => {
    setName(v)
    if (!slug) {
      setSlug(v.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const body: Record<string, string> = { name, slug, description, color, aiProvider }
    if (domainType === 'custom' && customDomain.trim()) {
      body.customDomain = customDomain.trim()
    } else {
      body.subdomain = slug
    }

    const res = await fetch('/api/blogs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()

    if (res.ok) {
      router.push(`/blogs/${data.data.id}`)
      router.refresh()
    } else {
      setError(data.error || '블로그 생성에 실패했습니다.')
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-xl">
      <div className="space-y-1.5">
        <Label htmlFor="name">블로그 이름 *</Label>
        <Input id="name" value={name} onChange={e => handleNameChange(e.target.value)}
          placeholder="내 여행 블로그" required />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="slug">슬러그 (URL) *</Label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400 whitespace-nowrap">blog.hub/</span>
          <Input id="slug" value={slug} onChange={e => setSlug(e.target.value)}
            placeholder="my-travel-blog" required
            pattern="[a-z0-9-]+" title="영소문자, 숫자, 하이픈만 가능" />
        </div>
      </div>

      <div className="space-y-2">
        <Label>도메인 방식</Label>
        <div className="flex gap-2">
          {(['subdomain', 'custom'] as DomainType[]).map(t => (
            <button key={t} type="button" onClick={() => setDomainType(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                domainType === t
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400'
              }`}>
              {t === 'subdomain' ? '서브도메인' : '커스텀 도메인'}
            </button>
          ))}
        </div>

        {domainType === 'subdomain' && slug && (
          <p className="text-xs text-gray-400">{slug}.blog-hub.vercel.app</p>
        )}

        {domainType === 'custom' && (
          <div className="space-y-1">
            <Input value={customDomain} onChange={e => setCustomDomain(e.target.value)}
              placeholder="example.com" />
            <p className="text-xs text-gray-400">DNS A레코드를 76.76.21.21에 연결하세요.</p>
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">설명</Label>
        <Input id="description" value={description} onChange={e => setDescription(e.target.value)}
          placeholder="블로그에 대한 간단한 설명" />
      </div>

      <div className="space-y-2">
        <Label>블로그 색상</Label>
        <div className="flex gap-2 flex-wrap">
          {COLORS.map(c => (
            <button key={c} type="button" onClick={() => setColor(c)}
              className={`w-8 h-8 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'}`}
              style={{ backgroundColor: c }} />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>AI 공급자</Label>
        <div className="flex gap-2">
          {['claude', 'openai', 'gemini'].map(p => (
            <button key={p} type="button" onClick={() => setAiProvider(p)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                aiProvider === p
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400'
              }`}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? '생성 중...' : '블로그 생성'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>취소</Button>
      </div>
    </form>
  )
}
