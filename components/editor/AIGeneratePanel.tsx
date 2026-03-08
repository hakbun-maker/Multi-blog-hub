'use client'

import { useState } from 'react'
import { X, Sparkles, Plus, Loader2, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BlogMultiSelect } from './BlogMultiSelect'
import { useEditorStore, type GeneratedPostResult } from '@/store/editorStore'

interface Blog {
  id: string
  name: string
  color: string | null
  ai_provider: string | null
}

interface AIGeneratePanelProps {
  blogs: Blog[]
  onGenerated: (posts: GeneratedPostResult[]) => void
}

export function AIGeneratePanel({ blogs, onGenerated }: AIGeneratePanelProps) {
  const {
    keywords, setKeywords,
    relatedKeywords, setRelatedKeywords,
    selectedBlogIds, toggleBlogId,
    imageCount, setImageCount,
    isGenerating, setIsGenerating,
  } = useEditorStore()

  const [kwInput, setKwInput] = useState('')
  const [relInput, setRelInput] = useState('')
  const [error, setError] = useState('')
  const [analyzing, setAnalyzing] = useState(false)

  // 주제 키워드 추가
  const addKeyword = () => {
    const kw = kwInput.trim()
    if (kw && !keywords.includes(kw)) {
      setKeywords([...keywords, kw])
    }
    setKwInput('')
  }

  const removeKeyword = (kw: string) => {
    setKeywords(keywords.filter(k => k !== kw))
  }

  // 연관 키워드 수동 추가
  const addRelatedKeyword = () => {
    const kw = relInput.trim()
    if (kw && !relatedKeywords.includes(kw)) {
      setRelatedKeywords([...relatedKeywords, kw])
    }
    setRelInput('')
  }

  const removeRelatedKeyword = (kw: string) => {
    setRelatedKeywords(relatedKeywords.filter(k => k !== kw))
  }

  // AI 키워드 분석
  const analyzeKeywords = async () => {
    if (!keywords.length) { setError('주제 키워드를 1개 이상 입력하세요.'); return }
    setAnalyzing(true)
    setError('')
    try {
      const res = await fetch('/api/ai/analyze-keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      // AI가 분석한 연관 키워드를 기존에 추가 (중복 제거)
      const newKws = (data.relatedKeywords as string[]) ?? []
      const merged = [...relatedKeywords]
      for (const kw of newKws) {
        if (!merged.includes(kw)) merged.push(kw)
      }
      setRelatedKeywords(merged)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'AI 분석에 실패했습니다.')
    } finally {
      setAnalyzing(false)
    }
  }

  // 글 생성
  const handleGenerate = async () => {
    if (!keywords.length) { setError('주제 키워드를 1개 이상 입력하세요.'); return }
    if (!selectedBlogIds.length) { setError('블로그를 1개 이상 선택하세요.'); return }
    setError('')
    setIsGenerating(true)

    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: keywords.join(', '),
          relatedKeywords,
          blogIds: selectedBlogIds,
          imageCount,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      const postsWithName: GeneratedPostResult[] = data.posts.map((p: GeneratedPostResult) => ({
        ...p,
        blogName: blogs.find(b => b.id === p.blogId)?.name ?? p.blogId,
      }))
      onGenerated(postsWithName)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'AI 글 생성에 실패했습니다.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* 주제 키워드 (복수 입력) */}
      <div className="space-y-1.5">
        <Label>주제 키워드 * <span className="text-xs text-gray-400 font-normal">(복수 입력 가능)</span></Label>
        <div className="flex gap-2">
          <Input value={kwInput} onChange={e => setKwInput(e.target.value)}
            placeholder="예: 제주도 여행 코스"
            className="flex-1"
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addKeyword() } }} />
          <Button type="button" size="sm" variant="outline" onClick={addKeyword}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        {keywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {keywords.map(kw => (
              <span key={kw} className="flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                {kw}
                <button onClick={() => removeKeyword(kw)} className="hover:text-blue-900">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 연관 키워드 + AI 분석 */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label>연관 키워드 + 형태소</Label>
          <Button type="button" size="sm" variant="outline" onClick={analyzeKeywords}
            disabled={analyzing || !keywords.length}
            className="h-7 text-xs gap-1">
            {analyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
            AI 분석
          </Button>
        </div>
        <div className="flex gap-2">
          <Input value={relInput} onChange={e => setRelInput(e.target.value)}
            placeholder="직접 추가할 연관 키워드" className="flex-1"
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addRelatedKeyword() } }} />
          <Button type="button" size="sm" variant="outline" onClick={addRelatedKeyword}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        {relatedKeywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {relatedKeywords.map(kw => (
              <span key={kw} className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full">
                {kw}
                <button onClick={() => removeRelatedKeyword(kw)} className="hover:text-green-900">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        <p className="text-xs text-gray-400">AI 분석 버튼을 클릭하면 주제 키워드를 기반으로 연관 키워드와 형태소를 자동 추출합니다.</p>
      </div>

      {/* 이미지 수 */}
      <div className="space-y-1.5">
        <Label>이미지 수: {imageCount}개</Label>
        <input type="range" min={0} max={4} value={imageCount}
          onChange={e => setImageCount(Number(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-blue-600" />
        <p className="text-xs text-gray-400">AI가 글 본문에 포함할 이미지 수입니다. 추가 이미지는 글 작성 후 &apos;이미지 추가&apos; 기능으로 삽입할 수 있습니다.</p>
      </div>

      {/* 블로그 선택 */}
      <div className="space-y-1.5">
        <Label>발행할 블로그 선택 *</Label>
        <BlogMultiSelect blogs={blogs} selectedIds={selectedBlogIds} onToggle={toggleBlogId} />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <Button onClick={handleGenerate} disabled={isGenerating} className="w-full">
        <Sparkles className="w-4 h-4 mr-2" />
        {isGenerating ? 'AI 글 생성 중...' : `AI 글 생성 (${selectedBlogIds.length}개 블로그)`}
      </Button>
    </div>
  )
}
