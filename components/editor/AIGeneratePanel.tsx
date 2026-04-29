'use client'

import { useState, useCallback, useRef, forwardRef, useImperativeHandle } from 'react'
import { X, Sparkles, Plus, Loader2, Check, AlertCircle, Image as ImageIcon, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { BlogMultiSelect } from './BlogMultiSelect'
import { useEditorStore, type BlogPipelineState, type PipelineStep } from '@/store/editorStore'
import { insertImagesIntoHtml, countH2Sections, type PlacedImage } from '@/lib/ai/image-placement'

interface Blog {
  id: string
  name: string
  color: string | null
  ai_provider: string | null
  blog_type?: string | null
  language?: string | null
}

interface AIGeneratePanelProps {
  blogs: Blog[]
  onPipelineComplete: (states: Record<string, BlogPipelineState>) => void
}

export interface AIGeneratePanelRef {
  run: (overrideBlogIds?: string[]) => void
}

const STEP_LABELS: Record<PipelineStep, string> = {
  idle: '대기',
  keywords: '키워드 분석',
  writing: '글 작성',
  images: '이미지 생성',
  meta: 'SEO 설정',
  done: '완료',
  error: '오류',
}

const STEP_ORDER: PipelineStep[] = ['keywords', 'writing', 'images', 'meta', 'done']

export const AIGeneratePanel = forwardRef<AIGeneratePanelRef, AIGeneratePanelProps>(function AIGeneratePanel({ blogs, onPipelineComplete }, ref) {
  const {
    keywords, setKeywords,
    relatedKeywords, setRelatedKeywords,
    selectedBlogIds, toggleBlogId,
    imageCount, setImageCount,
    isGenerating, setIsGenerating,
    pipelineStates, setPipelineState,
    pipelineGlobalStep, setPipelineGlobalStep,
    autoPublish, setAutoPublish,
    useExpertMode, setUseExpertMode,
    useToc, setUseToc,
    useMonetize, setUseMonetize,
    useJsonLd, setUseJsonLd,
    resetPipeline,
  } = useEditorStore()

  // 수익화 글 1차 데이터 (Information Gain) — 세션 한정, store에는 저장 안 함
  const [infoGain, setInfoGain] = useState('')

  const [kwInput, setKwInput] = useState('')
  const [error, setError] = useState('')
  const abortRef = useRef(false)

  useImperativeHandle(ref, () => ({
    run: (overrideBlogIds?: string[]) => runPipeline(overrideBlogIds),
  }))

  const addKeyword = () => {
    const kw = kwInput.trim()
    if (kw && !keywords.includes(kw)) setKeywords([...keywords, kw])
    setKwInput('')
  }

  const removeKeyword = (kw: string) => setKeywords(keywords.filter(k => k !== kw))
  const removeRelatedKeyword = (kw: string) => setRelatedKeywords(relatedKeywords.filter(k => k !== kw))

  const stopPipeline = () => {
    abortRef.current = true
  }

  // ── 파이프라인 실행 ──
  const runPipeline = useCallback(async (overrideBlogIds?: string[]) => {
    if (!keywords.length) { setError('주제 키워드를 1개 이상 입력하세요.'); return }
    const targetIds = overrideBlogIds ?? selectedBlogIds
    if (!targetIds.length) { setError('블로그를 1개 이상 선택하세요.'); return }

    setError('')
    setIsGenerating(true)
    if (!overrideBlogIds) resetPipeline()
    abortRef.current = false

    const selectedBlogs = blogs.filter(b => targetIds.includes(b.id))
    for (const blog of selectedBlogs) {
      setPipelineState(blog.id, {
        blogId: blog.id, blogName: blog.name,
        step: 'idle', stepMessage: '대기 중...',
        title: '', htmlContent: '', tags: [],
        seoMeta: { title: '', description: '' },
      })
    }

    const isRegenerate = !!overrideBlogIds

    try {
      // Step 1: 연관 키워드 분석 (재작성 시에는 기존 relatedKeywords 재사용 → 스킵)
      let mergedRelated: string[] = [...relatedKeywords]
      if (!isRegenerate) {
        setPipelineGlobalStep('keywords')
        for (const blog of selectedBlogs) {
          setPipelineState(blog.id, { step: 'keywords', stepMessage: '연관 키워드 분석 중...' })
        }

        const kwRes = await fetch('/api/ai/analyze-keywords', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keywords }),
        })
        const kwData = await kwRes.json()
        if (!kwRes.ok) throw new Error(kwData.error || '키워드 분석 실패')
        if (abortRef.current) throw new Error('__abort__')

        const analyzedKeywords: string[] = kwData.relatedKeywords ?? []
        for (const kw of analyzedKeywords) {
          if (!mergedRelated.includes(kw)) mergedRelated.push(kw)
        }
        setRelatedKeywords(mergedRelated)
      }

      // Step 1.5: 전문글 작성 모드 - 뉴스 기사 검색
      let newsArticles: { title: string; description: string }[] = []
      const expertMode = useEditorStore.getState().useExpertMode
      if (expertMode) {
        for (const blog of selectedBlogs) {
          setPipelineState(blog.id, { stepMessage: '뉴스 기사 검색 중...' })
        }
        try {
          const newsRes = await fetch('/api/naver/news', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ keywords }),
          })
          const newsData = await newsRes.json()
          if (newsRes.ok && newsData.articles?.length) {
            newsArticles = newsData.articles
          }
        } catch {
          // 뉴스 검색 실패는 무시하고 계속 진행
        }
        if (abortRef.current) throw new Error('__abort__')
      }

      // Step 2: 블로그별 글 작성
      setPipelineGlobalStep('writing')
      for (const blog of selectedBlogs) {
        setPipelineState(blog.id, { step: 'writing', stepMessage: '글 작성 중...' })
      }
      if (abortRef.current) throw new Error('__abort__')

      const tocEnabledForGen = useEditorStore.getState().useToc
      const monetizeForGen = useEditorStore.getState().useMonetize
      const writeRes = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: keywords.join(', '),
          relatedKeywords: mergedRelated,
          blogIds: targetIds,
          imageCount: 0,
          newsArticles: newsArticles.length > 0 ? newsArticles : undefined,
          useToc: tocEnabledForGen,
          useMonetize: monetizeForGen,
          ...(monetizeForGen && infoGain.trim() ? { infoGain: infoGain.trim() } : {}),
        }),
      })
      const writeData = await writeRes.json()
      if (!writeRes.ok) throw new Error(writeData.error || '글 작성 실패')
      if (abortRef.current) throw new Error('__abort__')

      const posts: { blogId: string; title: string; htmlContent: string }[] = []
      for (const post of writeData.posts ?? []) {
        if (post.success) {
          setPipelineState(post.blogId, {
            step: 'writing', stepMessage: '글 작성 완료',
            title: post.title ?? '', htmlContent: post.htmlContent ?? '',
            ...(post.monetizeMeta ? { monetizeMeta: post.monetizeMeta } : {}),
          })
          posts.push({ blogId: post.blogId, title: post.title ?? '', htmlContent: post.htmlContent ?? '' })
        } else {
          setPipelineState(post.blogId, {
            step: 'error',
            stepMessage: `글 작성 실패: ${post.error ?? '알 수 없는 오류'}`,
            error: post.error,
          })
        }
      }

      // Step 3: 이미지 생성
      if (imageCount > 0 && !abortRef.current) {
        setPipelineGlobalStep('images')

        for (const post of posts) {
          if (abortRef.current) break
          setPipelineState(post.blogId, { step: 'images', stepMessage: '이미지 생성 중...' })

          try {
            const h2Count = countH2Sections(post.htmlContent)
            // 섹션당 1장 + 남은 이미지는 마지막 섹션에 누적, Imagen API 한계 4장
            const maxImages = Math.max(1, h2Count)
            const actualCount = Math.min(imageCount, maxImages, 4)

            const promptRes = await fetch('/api/ai/generate-meta', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ title: post.title, htmlContent: post.htmlContent, mode: 'image-prompt', language: blogs.find(b => b.id === post.blogId)?.language ?? 'ko' }),
            })
            const promptData = await promptRes.json()
            const imagePrompt = promptData.imagePrompt || `Blog illustration for: ${post.title}`
            const altText = promptData.altText || post.title
            const caption = promptData.caption || ''

            const imgRes = await fetch('/api/ai/generate-image', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ prompt: imagePrompt, count: actualCount, aspectRatio: '16:9', imageTitle: post.title }),
            })
            const imgData = await imgRes.json()

            if (imgRes.ok && imgData.images?.length) {
              const placedImages: PlacedImage[] = imgData.images.map((img: { url: string }, i: number) => ({
                url: img.url,
                alt: `${altText} ${i + 1}`,
                caption: i === 0 ? caption : undefined,
              }))
              const newHtml = insertImagesIntoHtml(post.htmlContent, placedImages)
              setPipelineState(post.blogId, { htmlContent: newHtml, stepMessage: `이미지 ${imgData.images.length}개 삽입 완료` })
              post.htmlContent = newHtml
            } else {
              setPipelineState(post.blogId, { stepMessage: '이미지 생성 실패 (글은 유지됨)' })
            }
          } catch {
            setPipelineState(post.blogId, { stepMessage: '이미지 생성 실패 (글은 유지됨)' })
          }
        }
      }

      if (abortRef.current) throw new Error('__abort__')

      // Step 4: 태그/SEO 생성
      setPipelineGlobalStep('meta')
      for (const post of posts) {
        if (abortRef.current) break
        setPipelineState(post.blogId, { step: 'meta', stepMessage: '태그/SEO 설정 생성 중...' })
        try {
          const metaRes = await fetch('/api/ai/generate-meta', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: post.title, htmlContent: post.htmlContent, language: blogs.find(b => b.id === post.blogId)?.language ?? 'ko' }),
          })
          const metaData = await metaRes.json()
          if (metaRes.ok) {
            setPipelineState(post.blogId, {
              tags: metaData.tags ?? [],
              seoMeta: { title: metaData.seoTitle ?? post.title, description: metaData.seoDescription ?? '' },
              stepMessage: '태그/SEO 설정 완료',
            })
          }
        } catch {
          setPipelineState(post.blogId, { stepMessage: 'SEO 생성 실패 (수동 입력 가능)' })
        }
      }

      if (abortRef.current) throw new Error('__abort__')

      // 완료
      setPipelineGlobalStep('done')
      for (const post of posts) {
        setPipelineState(post.blogId, { step: 'done', stepMessage: '완료' })
      }

      const finalStates = useEditorStore.getState().pipelineStates
      onPipelineComplete(finalStates)

      // 완료 후 자동 초기화 (블로그 선택은 유지)
      const currentSelectedBlogIds = useEditorStore.getState().selectedBlogIds
      setTimeout(() => {
        resetPipeline()
        // 블로그 선택 복원
        for (const id of currentSelectedBlogIds) {
          if (!useEditorStore.getState().selectedBlogIds.includes(id)) {
            toggleBlogId(id)
          }
        }
      }, 2000) // 2초 후 리셋 (결과 확인 시간)

    } catch (e) {
      const msg = e instanceof Error ? e.message : 'AI 파이프라인 오류'
      if (msg === '__abort__') {
        setError('생성이 중지되었습니다.')
        setPipelineGlobalStep('idle')
      } else {
        setError(msg)
        setPipelineGlobalStep('error')
      }
    } finally {
      setIsGenerating(false)
      abortRef.current = false
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keywords, relatedKeywords, selectedBlogIds, imageCount, blogs])

  const pipelineActive = isGenerating || (pipelineGlobalStep !== 'idle' && pipelineGlobalStep !== 'done')
  const pipelineDone = pipelineGlobalStep === 'done'

  return (
    <div className="space-y-5">
      {/* 1. 주제 키워드 입력 */}
      <div className="space-y-1.5">
        <Label>주제 키워드 * <span className="text-xs text-gray-400 font-normal">(복수 입력 가능)</span></Label>
        <div className="flex gap-2">
          <Input value={kwInput} onChange={e => setKwInput(e.target.value)}
            placeholder="예: 제주도 여행 코스" className="flex-1"
            disabled={isGenerating}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addKeyword() } }} />
          <Button type="button" size="sm" variant="outline" onClick={addKeyword} disabled={isGenerating}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        {keywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {keywords.map(kw => (
              <span key={kw} className="flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                {kw}
                <button onClick={() => removeKeyword(kw)} disabled={isGenerating} className="hover:text-blue-900">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 2. 블로그 선택 */}
      <div className="space-y-1.5">
        <Label>발행할 블로그 선택 *</Label>
        <BlogMultiSelect blogs={blogs} selectedIds={selectedBlogIds} onToggle={toggleBlogId} />
      </div>

      {/* 이미지 수 + 자동발행 + 전문글 작성 + 수익화 글 작성 + 목차 생성 */}
      <div className="grid grid-cols-5 gap-4">
        <div className="space-y-1.5">
          <Label>이미지 수</Label>
          <input type="number" min={0} max={10} value={imageCount}
            onChange={e => setImageCount(Math.max(0, Math.min(10, Number(e.target.value))))}
            disabled={isGenerating}
            className="w-20 h-9 px-2 border border-gray-300 rounded-md text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <p className="text-xs text-gray-400">소제목(H2) 기준 배치</p>
        </div>
        <div className="space-y-1.5">
          <Label>자동 발행</Label>
          <div className="flex items-center gap-2 mt-1">
            <Switch checked={autoPublish} onCheckedChange={setAutoPublish} disabled={isGenerating} />
            <span className="text-xs text-gray-500">{autoPublish ? 'ON: 즉시 발행' : 'OFF: 검토 후'}</span>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>전문글 작성</Label>
          <div className="flex items-center gap-2 mt-1">
            <Switch checked={useExpertMode} onCheckedChange={setUseExpertMode} disabled={isGenerating} />
            <span className="text-xs text-gray-500">{useExpertMode ? '뉴스 참고' : '일반 모드'}</span>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>수익화 글 작성</Label>
          <div className="flex items-center gap-2 mt-1">
            <Switch checked={useMonetize} onCheckedChange={setUseMonetize} disabled={isGenerating} />
            <span className="text-xs text-gray-500">{useMonetize ? 'ON' : 'OFF'}</span>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>목차 생성</Label>
          <div className="flex items-center gap-2 mt-1">
            <Switch checked={useToc} onCheckedChange={setUseToc} disabled={isGenerating} />
            <span className="text-xs text-gray-500">{useToc ? 'ON' : 'OFF'}</span>
          </div>
        </div>
      </div>

      {/* 수익화 글 작성 ON 시 추가 옵션 */}
      {useMonetize && (
        <div className="rounded-lg border border-orange-200 bg-orange-50/40 p-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">검색 결과 강조 자동 추가</Label>
              <div className="flex items-center gap-2">
                <Switch checked={useJsonLd} onCheckedChange={setUseJsonLd} disabled={isGenerating} />
                <span className="text-xs text-gray-600">
                  {useJsonLd ? '구글에 FAQ 펼침 노출' : 'OFF'}
                </span>
              </div>
              <p className="text-[10px] text-gray-400 leading-tight">
                구글 검색 결과에 글의 FAQ가 펼쳐지는 형태로 노출되도록 신호를 보냅니다.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1">
                나만의 경험·데이터
                <span className="text-[10px] text-gray-400 font-normal">(선택, 차별화)</span>
              </Label>
              <Input
                value={infoGain}
                onChange={e => setInfoGain(e.target.value)}
                disabled={isGenerating}
                placeholder="예: '직접 6개월 써본 결과 월 30% 절약', '5곳 견적가격 비교'"
                className="text-xs h-8"
              />
              <p className="text-[10px] text-gray-400 leading-tight">
                AI가 모르는 본인만의 정보를 한 줄 적으면 글에 자연스럽게 녹아 차별화됩니다.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 연관 키워드 */}
      {relatedKeywords.length > 0 && (
        <div className="space-y-1.5">
          <Label className="text-sm text-gray-600">연관 키워드 ({relatedKeywords.length}개)</Label>
          <div className="flex flex-wrap gap-1.5">
            {relatedKeywords.map(kw => (
              <span key={kw} className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full">
                {kw}
                <button onClick={() => removeRelatedKeyword(kw)} disabled={isGenerating} className="hover:text-green-900">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* 실행 / 중지 버튼 */}
      {!pipelineDone && (
        <div className="flex gap-2">
          <Button onClick={() => runPipeline()} disabled={isGenerating} className="flex-1">
            {isGenerating
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />AI 작업 진행 중...</>
              : <><Sparkles className="w-4 h-4 mr-2" />AI 글 생성 시작 ({selectedBlogIds.length}개 블로그)</>}
          </Button>
          {isGenerating && (
            <Button variant="destructive" onClick={stopPipeline} className="shrink-0">
              <Square className="w-4 h-4 mr-1.5" />중지
            </Button>
          )}
        </div>
      )}

      {/* 파이프라인 진행 상태 */}
      {(pipelineActive || pipelineDone) && (
        <div className="space-y-3">
          {/* 글로벌 스텝 인디케이터 */}
          <div className="flex items-center gap-1">
            {STEP_ORDER.map((step, i) => {
              const currentIdx = STEP_ORDER.indexOf(pipelineGlobalStep === 'error' ? 'done' : pipelineGlobalStep)
              const isDone = i < currentIdx || pipelineGlobalStep === 'done'
              const isActive = i === currentIdx && pipelineGlobalStep !== 'done'
              return (
                <div key={step} className="flex items-center gap-1 flex-1">
                  <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium shrink-0 ${
                    isDone ? 'bg-green-500 text-white' : isActive ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'
                  }`}>
                    {isDone ? <Check className="w-3.5 h-3.5" /> : isActive ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : i + 1}
                  </div>
                  <span className={`text-xs truncate hidden sm:inline ${isActive ? 'text-blue-600 font-medium' : isDone ? 'text-green-600' : 'text-gray-400'}`}>
                    {STEP_LABELS[step]}
                  </span>
                  {i < STEP_ORDER.length - 1 && <div className={`flex-1 h-px ${isDone ? 'bg-green-300' : 'bg-gray-200'}`} />}
                </div>
              )
            })}
          </div>

          {/* 블로그별 상태 */}
          <div className="space-y-2">
            {Object.values(pipelineStates).map(state => (
              <div key={state.blogId}
                className={`flex items-center gap-3 p-2.5 rounded-lg border text-sm ${
                  state.step === 'done' ? 'border-green-200 bg-green-50'
                    : state.step === 'error' ? 'border-red-200 bg-red-50'
                      : 'border-gray-200'
                }`}>
                <StepIcon step={state.step} />
                <span className="font-medium text-gray-800">{state.blogName}</span>
                <span className="text-gray-500 text-xs flex-1 truncate">{state.stepMessage}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
})

function StepIcon({ step }: { step: PipelineStep }) {
  switch (step) {
    case 'done': return <Check className="w-4 h-4 text-green-600 shrink-0" />
    case 'error': return <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
    case 'images': return <ImageIcon className="w-4 h-4 text-purple-500 animate-pulse shrink-0" />
    case 'idle': return <div className="w-4 h-4 rounded-full bg-gray-200 shrink-0" />
    default: return <Loader2 className="w-4 h-4 text-blue-500 animate-spin shrink-0" />
  }
}
