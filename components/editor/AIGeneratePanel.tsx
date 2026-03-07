'use client'

import { useState } from 'react'
import { X, Sparkles, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BlogMultiSelect } from './BlogMultiSelect'
import { ImageGeneratePanel } from './ImageGeneratePanel'
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
  onImageInsert?: (html: string) => void
}

export function AIGeneratePanel({ blogs, onGenerated, onImageInsert }: AIGeneratePanelProps) {
  const {
    keyword, setKeyword,
    relatedKeywords, setRelatedKeywords,
    selectedBlogIds, toggleBlogId,
    imageCount, setImageCount,
    isGenerating, setIsGenerating,
  } = useEditorStore()

  const [kwInput, setKwInput] = useState('')
  const [error, setError] = useState('')

  const addKeyword = () => {
    const kw = kwInput.trim()
    if (kw && !relatedKeywords.includes(kw)) {
      setRelatedKeywords([...relatedKeywords, kw])
    }
    setKwInput('')
  }

  const removeKeyword = (kw: string) => {
    setRelatedKeywords(relatedKeywords.filter(k => k !== kw))
  }

  const handleGenerate = async () => {
    if (!keyword.trim()) { setError('키워드를 입력하세요.'); return }
    if (!selectedBlogIds.length) { setError('블로그를 1개 이상 선택하세요.'); return }
    setError('')
    setIsGenerating(true)

    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword, relatedKeywords, blogIds: selectedBlogIds, imageCount }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      // 블로그 이름 매핑
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
      {/* 키워드 입력 */}
      <div className="space-y-1.5">
        <Label>주제 키워드 *</Label>
        <Input value={keyword} onChange={e => setKeyword(e.target.value)}
          placeholder="예: 제주도 여행 코스" onKeyDown={e => e.key === 'Enter' && e.preventDefault()} />
      </div>

      {/* 연관 키워드 */}
      <div className="space-y-1.5">
        <Label>연관 키워드</Label>
        <div className="flex gap-2">
          <Input value={kwInput} onChange={e => setKwInput(e.target.value)}
            placeholder="연관 키워드 추가" className="flex-1"
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addKeyword() } }} />
          <Button type="button" size="sm" variant="outline" onClick={addKeyword}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        {relatedKeywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {relatedKeywords.map(kw => (
              <span key={kw} className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">
                {kw}
                <button onClick={() => removeKeyword(kw)} className="hover:text-blue-900">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 이미지 수 */}
      <div className="space-y-1.5">
        <Label>이미지 수: {imageCount}개</Label>
        <input type="range" min={0} max={4} value={imageCount}
          onChange={e => setImageCount(Number(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-blue-600" />
        <p className="text-xs text-gray-400">0이면 이미지 없이 글만 생성합니다. 최대 4개.</p>
      </div>

      {/* 이미지 생성 패널 (imageCount > 0일 때 표시) */}
      {imageCount > 0 && onImageInsert && (
        <ImageGeneratePanel
          count={imageCount}
          onInsert={onImageInsert}
        />
      )}

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
