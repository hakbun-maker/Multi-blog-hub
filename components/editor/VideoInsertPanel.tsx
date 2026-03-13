'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Loader2, Video, X, Search } from 'lucide-react'

interface VideoInsertPanelProps {
  onInsert: (html: string) => void
  onClose: () => void
}

interface VideoInfo {
  title: string
  authorName: string
  thumbnailUrl: string
  embedUrl: string
  originalUrl: string
}

function parseYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([\w-]+)/,
    /(?:youtu\.be\/)([\w-]+)/,
    /(?:youtube\.com\/embed\/)([\w-]+)/,
    /(?:youtube\.com\/shorts\/)([\w-]+)/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return null
}

export function VideoInsertPanel({ onInsert, onClose }: VideoInsertPanelProps) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null)
  const [showInfo, setShowInfo] = useState(true)

  const fetchVideoInfo = async () => {
    if (!url.trim()) { setError('URL을 입력하세요.'); return }

    const videoId = parseYouTubeId(url.trim())
    if (!videoId) { setError('유효한 YouTube URL을 입력하세요.'); return }

    setLoading(true)
    setError('')
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
      const res = await fetch(oembedUrl)
      if (!res.ok) throw new Error('영상 정보를 가져올 수 없습니다.')
      const data = await res.json()

      setVideoInfo({
        title: data.title ?? '',
        authorName: data.author_name ?? '',
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        embedUrl: `https://www.youtube.com/embed/${videoId}`,
        originalUrl: url.trim(),
      })
    } catch {
      setError('영상 정보를 가져올 수 없습니다. URL을 확인해주세요.')
    } finally {
      setLoading(false)
    }
  }

  const handleInsert = () => {
    if (!videoInfo) return

    let html = ''

    // 영상 정보 텍스트 (선택) - TipTap이 보존하는 형식 사용
    if (showInfo) {
      html += `<p><strong>${videoInfo.title}</strong> — <em>${videoInfo.authorName}</em></p>`
    }

    // 항상 iframe 삽입 (TipTap iframe 확장이 처리)
    html += `<iframe src="${videoInfo.embedUrl}" frameborder="0" allowfullscreen="true"></iframe>`

    onInsert(html)
  }

  return (
    <div className="border-b border-gray-100 bg-blue-50/30 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
          <Video className="w-4 h-4" />외부 영상 삽입
        </h4>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* URL 입력 */}
      <div className="flex gap-2">
        <Input
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && fetchVideoInfo()}
          placeholder="YouTube 영상 URL을 입력하세요"
          className="text-sm flex-1"
        />
        <Button size="sm" onClick={fetchVideoInfo} disabled={loading} className="gap-1 shrink-0">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
          확인
        </Button>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      {/* 영상 정보 미리보기 */}
      {videoInfo && (
        <div className="space-y-3">
          {/* 정보 카드 미리보기 */}
          <div className="bg-white border border-gray-200 rounded-lg p-3 space-y-2">
            <div className="text-center">
              <p className="font-semibold text-sm text-gray-900">{videoInfo.title}</p>
              <p className="text-xs text-gray-500">{videoInfo.authorName}</p>
            </div>
            {/* 썸네일 미리보기 */}
            <div className="relative">
              <img
                src={videoInfo.thumbnailUrl}
                alt={videoInfo.title}
                className="w-full rounded-md"
                onError={e => {
                  // maxresdefault 실패 시 hqdefault로 폴백
                  const img = e.target as HTMLImageElement
                  if (img.src.includes('maxresdefault')) {
                    img.src = img.src.replace('maxresdefault', 'hqdefault')
                  }
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 bg-black/60 rounded-full flex items-center justify-center">
                  <div className="w-0 h-0 border-l-[18px] border-l-white border-t-[10px] border-t-transparent border-b-[10px] border-b-transparent ml-1" />
                </div>
              </div>
            </div>
          </div>

          {/* 삽입 옵션 */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Switch checked={showInfo} onCheckedChange={setShowInfo} className="scale-75" />
              <Label className="text-xs text-gray-600">영상 정보 포함</Label>
            </div>
          </div>

          <Button size="sm" onClick={handleInsert} className="w-full gap-1">
            <Video className="w-3.5 h-3.5" />글에 삽입
          </Button>
        </div>
      )}
    </div>
  )
}
