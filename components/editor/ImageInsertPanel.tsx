'use client'

import { useState, useEffect, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { X, Wand2, Loader2, ImagePlus, Plus } from 'lucide-react'

interface ImageInsertPanelProps {
  isOpen: boolean
  getHeadings: () => { level: number; text: string }[]
  addEntryTrigger?: number
  onInsert: (h2Text: string, html: string) => void
  onClose: () => void
  articleTitle?: string
  articleContent?: string
}

const RATIO_OPTIONS = [
  { label: '16:9', value: '16:9' },
  { label: '1:1', value: '1:1' },
  { label: '9:16', value: '9:16' },
]

const BG_COLORS = [
  'bg-violet-50/70',
  'bg-amber-50/70',
]

interface ImageEntry {
  id: number
  selectedH2: string
  prompt: string
  useKorean: boolean
  aspectRatio: string
  imageTitle: string
  altText: string
  caption: string
  generating: boolean
  generatingPrompt: boolean
  error: string
  done: boolean
}

let entryIdCounter = 0

/** h2 텍스트에서 "1. ", "2. " 같은 번호 접두사 제거 */
function stripNumberPrefix(text: string): string {
  return text.replace(/^\d+\.\s*/, '').trim()
}

function createEntry(defaultH2: string): ImageEntry {
  const isMain = defaultH2 === '__main__'
  const topic = isMain ? '' : stripNumberPrefix(defaultH2)
  return {
    id: entryIdCounter++,
    selectedH2: defaultH2,
    prompt: '',
    useKorean: false,
    aspectRatio: '16:9',
    imageTitle: isMain ? '블로그 대표 이미지' : `${topic} 핵심 내용 이미지`,
    altText: isMain ? '본문의 주요 내용을 시각화한 대표 이미지' : `${topic} 주제를 시각적으로 표현한 일러스트`,
    caption: isMain ? '이 글의 핵심 내용을 담은 대표 이미지입니다' : `${topic}의 내용을 한눈에 보여주는 이미지`,
    generating: false,
    generatingPrompt: false,
    error: '',
    done: false,
  }
}

export function ImageInsertPanel({ isOpen, getHeadings, addEntryTrigger, onInsert, onClose, articleTitle, articleContent }: ImageInsertPanelProps) {
  const [headingOptions, setHeadingOptions] = useState<{ value: string; label: string }[]>([])
  const [entries, setEntries] = useState<ImageEntry[]>([])
  const [bulkGenerating, setBulkGenerating] = useState(false)

  // h2 목록 갱신 (메인 + h2들)
  const refreshHeadings = useCallback(() => {
    const h2s = getHeadings().filter(h => h.level === 2)
    const options = [
      { value: '__main__', label: '메인 (글 최상단)' },
      ...h2s.map(h => ({ value: h.text, label: h.text })),
    ]
    setHeadingOptions(options)
    return options
  }, [getHeadings])

  useEffect(() => {
    const options = refreshHeadings()
    // 최초 1개 항목 생성
    if (entries.length === 0) {
      setEntries([createEntry(options[0]?.value ?? '__main__')])
    }
  }, [refreshHeadings]) // entries.length 의존성 제외 (무한 루프 방지)

  // 외부 트리거로 항목 추가
  useEffect(() => {
    if (addEntryTrigger && addEntryTrigger > 0) {
      refreshHeadings()
      setEntries(prev => [...prev, createEntry(headingOptions[0]?.value ?? '__main__')])
    }
  }, [addEntryTrigger]) // eslint-disable-line react-hooks/exhaustive-deps

  // 항목 추가
  const addEntry = () => {
    refreshHeadings()
    setEntries(prev => [...prev, createEntry(headingOptions[0]?.value ?? '__main__')])
  }

  // 항목 삭제
  const removeEntry = (id: number) => {
    setEntries(prev => prev.filter(e => e.id !== id))
  }

  // 항목 업데이트
  const updateEntry = (id: number, partial: Partial<ImageEntry>) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, ...partial } : e))
  }

  // h2 선택 변경 시 메타 자동 채움 (SEO 친화적)
  const onH2Change = (id: number, h2: string) => {
    const isMain = h2 === '__main__'
    const topic = isMain ? '' : stripNumberPrefix(h2)
    updateEntry(id, {
      selectedH2: h2,
      imageTitle: isMain ? '블로그 대표 이미지' : `${topic} 핵심 내용 이미지`,
      altText: isMain ? '본문의 주요 내용을 시각화한 대표 이미지' : `${topic} 주제를 시각적으로 표현한 일러스트`,
      caption: isMain ? '이 글의 핵심 내용을 담은 대표 이미지입니다' : `${topic}의 내용을 한눈에 보여주는 이미지`,
    })
  }

  // AI 프롬프트 자동 생성
  const generatePrompt = async (entry: ImageEntry) => {
    const isMain = entry.selectedH2 === '__main__'
    // 메인 이미지: 글 제목 + 본문 요약 전달로 핵심 내용 기반 프롬프트 생성
    const subject = isMain
      ? (articleTitle || '블로그 메인 대표 이미지')
      : entry.selectedH2
    const contentForPrompt = isMain
      ? (articleContent || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500)
      : ''
    updateEntry(entry.id, { generatingPrompt: true, error: '' })
    try {
      const res = await fetch('/api/ai/generate-meta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: subject,
          htmlContent: contentForPrompt,
          mode: 'image-prompt',
          language: entry.useKorean ? 'ko' : 'en',
        }),
      })
      const data = await res.json()
      if (res.ok && data.imagePrompt) {
        const updates: Partial<ImageEntry> = { prompt: data.imagePrompt, generatingPrompt: false }
        if (data.imageTitle) updates.imageTitle = data.imageTitle
        if (data.altText) updates.altText = data.altText
        if (data.caption) updates.caption = data.caption
        updateEntry(entry.id, updates)
      } else {
        updateEntry(entry.id, {
          error: data.error || 'AI 프롬프트 생성 실패',
          generatingPrompt: false,
        })
      }
    } catch {
      updateEntry(entry.id, { error: 'AI 프롬프트 생성 중 오류', generatingPrompt: false })
    }
  }

  // 이미지 생성 및 삽입
  const handleGenerate = async (entry: ImageEntry) => {
    if (!entry.prompt.trim()) {
      updateEntry(entry.id, { error: '프롬프트를 입력하세요.' })
      return
    }
    updateEntry(entry.id, { error: '', generating: true })
    try {
      const res = await fetch('/api/ai/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: entry.prompt, count: 1, aspectRatio: entry.aspectRatio, imageTitle: entry.imageTitle }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      const url = data.images?.[0]?.url
      if (!url) throw new Error('이미지가 생성되지 않았습니다.')

      const html = `<img src="${url}" alt="${entry.altText}" title="${entry.altText}" style="max-width:100%;height:auto;display:block;margin:0 auto;" /><p class="image-caption" style="text-align:center;font-size:0.85em;color:#666;margin-top:0.3em;">${entry.caption}</p>`

      onInsert(entry.selectedH2, html)
      updateEntry(entry.id, { generating: false, done: true })
    } catch (e: unknown) {
      updateEntry(entry.id, {
        error: e instanceof Error ? e.message : '이미지 생성에 실패했습니다.',
        generating: false,
      })
    }
  }

  // 전체 이미지 일괄 생성
  const handleBulkGenerate = async () => {
    const pending = entries.filter(e => !e.done && e.prompt.trim())
    if (pending.length === 0) return
    setBulkGenerating(true)
    for (const entry of pending) {
      await handleGenerate(entry)
    }
    setBulkGenerating(false)
  }

  const pendingCount = entries.filter(e => !e.done && e.prompt.trim()).length

  return (
    <>
      {isOpen && <div className="fixed inset-0 z-40 bg-black/10" onClick={onClose} />}
      <div
        className={`fixed top-0 right-0 h-full bg-white shadow-2xl border-l border-gray-200 z-50 flex flex-col transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ width: 'min(540px, 92vw)' }}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-violet-50 flex-shrink-0">
          <h3 className="text-sm font-semibold text-violet-800">AI 이미지 생성</h3>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* 스크롤 콘텐츠 */}
        <div className="overflow-y-auto flex-1 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">{entries.length}개 항목</span>
          </div>

          {/* 이미지 항목들 */}
          <div className="space-y-3">
            {entries.map((entry, idx) => (
              <div key={entry.id} className={`rounded-lg p-3 space-y-2.5 border border-gray-200 ${BG_COLORS[idx % BG_COLORS.length]} ${entry.done ? 'opacity-50' : ''}`}>
                {/* 항목 헤더 */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500">이미지 #{idx + 1}</span>
                  {entries.length > 1 && (
                    <button onClick={() => removeEntry(entry.id)} className="text-gray-400 hover:text-red-500">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* H2 선택 */}
                <div className="space-y-1">
                  <Label className="text-xs">삽입 위치</Label>
                  <select value={entry.selectedH2} onChange={e => onH2Change(entry.id, e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
                    {headingOptions.map((h, i) => (
                      <option key={i} value={h.value}>{h.label}</option>
                    ))}
                  </select>
                </div>

                {/* 프롬프트 */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">이미지 프롬프트</Label>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <Switch checked={entry.useKorean}
                          onCheckedChange={v => updateEntry(entry.id, { useKorean: v })}
                          className="scale-75" />
                        <span className="text-xs text-gray-400">{entry.useKorean ? '한글' : '영문'}</span>
                      </div>
                      <Button type="button" size="sm" variant="outline"
                        onClick={() => generatePrompt(entry)}
                        disabled={entry.generatingPrompt || entry.done}
                        className="h-6 text-xs gap-1 px-2">
                        {entry.generatingPrompt ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                        AI
                      </Button>
                    </div>
                  </div>
                  <textarea value={entry.prompt}
                    onChange={e => updateEntry(entry.id, { prompt: e.target.value })}
                    placeholder="이미지를 설명하는 프롬프트를 입력하세요..."
                    rows={2}
                    className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>

                {/* 비율 */}
                <div className="space-y-1">
                  <Label className="text-xs">이미지 비율</Label>
                  <div className="flex gap-1">
                    {RATIO_OPTIONS.map(r => (
                      <button key={r.value}
                        onClick={() => updateEntry(entry.id, { aspectRatio: r.value })}
                        className={`px-3 py-1 text-xs rounded border transition-colors ${
                          entry.aspectRatio === r.value ? 'bg-violet-600 text-white border-violet-600' : 'border-gray-200 hover:bg-gray-100'
                        }`}>{r.label}</button>
                    ))}
                  </div>
                </div>

                {/* 이미지 메타 */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">이미지 제목</Label>
                    <Input value={entry.imageTitle}
                      onChange={e => updateEntry(entry.id, { imageTitle: e.target.value })}
                      placeholder="이미지 제목" className="text-xs h-7" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">대체 텍스트</Label>
                    <Input value={entry.altText}
                      onChange={e => updateEntry(entry.id, { altText: e.target.value })}
                      placeholder="대체 텍스트" className="text-xs h-7" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">이미지 설명</Label>
                    <Input value={entry.caption}
                      onChange={e => updateEntry(entry.id, { caption: e.target.value })}
                      placeholder="이미지 설명" className="text-xs h-7" />
                  </div>
                </div>

                {entry.error && <p className="text-xs text-red-500">{entry.error}</p>}

                {entry.done && (
                  <div className="text-xs text-green-600 font-medium text-center py-1">삽입 완료</div>
                )}
                {entry.generating && (
                  <div className="flex items-center gap-1 text-xs text-blue-600 justify-center py-1">
                    <Loader2 className="w-3 h-3 animate-spin" />이미지 생성 중...
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 전체 이미지 생성 버튼 */}
          <Button size="sm" onClick={handleBulkGenerate}
            disabled={bulkGenerating || pendingCount === 0} className="w-full gap-1">
            {bulkGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
            {bulkGenerating ? '이미지 생성 중...' : pendingCount > 0 ? `전체 이미지 생성 (${pendingCount}개)` : '프롬프트를 입력하세요'}
          </Button>

          {/* 하단 버튼 */}
          <div className="pt-2 border-t border-gray-200">
            <Button size="sm" variant="outline" onClick={addEntry} className="gap-1 text-xs">
              <Plus className="w-3.5 h-3.5" />이미지 항목 추가
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
