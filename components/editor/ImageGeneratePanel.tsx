'use client'

import { useState } from 'react'
import { ImageIcon, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type AspectRatio = '1:1' | '16:9' | '9:16'

interface ImageGeneratePanelProps {
  /** 기본 프롬프트 (글 제목 기반 자동 생성 시 전달) */
  defaultPrompt?: string
  /** 생성할 이미지 수 */
  count: number
  /** 에디터에 이미지 삽입 콜백 */
  onInsert: (html: string) => void
}

const ASPECT_OPTIONS: { value: AspectRatio; label: string }[] = [
  { value: '16:9', label: '가로형 (16:9)' },
  { value: '1:1', label: '정사각형 (1:1)' },
  { value: '9:16', label: '세로형 (9:16)' },
]

export function ImageGeneratePanel({ defaultPrompt = '', count, onInsert }: ImageGeneratePanelProps) {
  const [prompt, setPrompt] = useState(defaultPrompt)
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [images, setImages] = useState<{ url: string }[]>([])

  const handleGenerate = async () => {
    if (!prompt.trim()) { setError('이미지 프롬프트를 입력하세요.'); return }
    setError('')
    setLoading(true)
    setImages([])

    try {
      const res = await fetch('/api/ai/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, count: Math.min(count, 4), aspectRatio }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setImages(data.images ?? [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '이미지 생성에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const insertImage = (url: string) => {
    onInsert(`<img src="${url}" alt="${prompt}" style="max-width:100%;height:auto;" />`)
  }

  return (
    <div className="border border-blue-100 rounded-lg p-4 space-y-3 bg-blue-50/40">
      <div className="flex items-center gap-1.5 text-sm font-medium text-blue-700">
        <ImageIcon className="w-4 h-4" />
        AI 이미지 생성 ({count}개)
      </div>

      {/* 프롬프트 */}
      <div className="space-y-1">
        <Label className="text-xs text-gray-600">이미지 설명 (영어 권장)</Label>
        <Input
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="예: A beautiful sunset over mountains, photorealistic"
          className="text-sm"
        />
      </div>

      {/* 비율 */}
      <div className="space-y-1">
        <Label className="text-xs text-gray-600">비율</Label>
        <div className="flex gap-1.5">
          {ASPECT_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setAspectRatio(opt.value)}
              className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                aspectRatio === opt.value
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-gray-200 text-gray-600 hover:border-blue-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <Button
        size="sm"
        variant="outline"
        onClick={handleGenerate}
        disabled={loading}
        className="w-full border-blue-300 text-blue-700 hover:bg-blue-100"
      >
        {loading ? (
          <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />생성 중...</>
        ) : (
          <><ImageIcon className="w-3.5 h-3.5 mr-1.5" />이미지 생성</>
        )}
      </Button>

      {/* 생성된 이미지 미리보기 */}
      {images.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500">{images.length}개 이미지 생성 완료. 클릭하면 에디터에 삽입됩니다.</p>
          <div className="grid grid-cols-2 gap-2">
            {images.map((img, i) => (
              <div
                key={i}
                className="relative group cursor-pointer rounded overflow-hidden border border-gray-200"
                onClick={() => insertImage(img.url)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt={`생성 이미지 ${i + 1}`} className="w-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-white text-xs font-medium">에디터에 삽입</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
