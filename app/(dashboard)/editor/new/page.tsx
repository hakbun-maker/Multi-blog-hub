'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Sparkles, PenLine, BookOpen, Send, Wand2, Loader2, FileText, Eye, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { AIGeneratePanel, type AIGeneratePanelRef } from '@/components/editor/AIGeneratePanel'
import { PostEditor, type PostEditorRef } from '@/components/editor/PostEditor'
import { SEOMetaForm } from '@/components/editor/SEOMetaForm'
import { SnippetDrawer } from '@/components/editor/SnippetDrawer'
import { DraftDrawer } from '@/components/editor/DraftDrawer'
import { ThreadsSection, type ThreadsState } from '@/components/editor/ThreadsSection'
import { useEditorStore, type BlogPipelineState } from '@/store/editorStore'

type EditorMode = 'ai' | 'manual'

// 글 제목 → slug 변환 (서버 /api/posts와 동일 로직, 단 timestamp 제외)
// 미리보기용 — 실제 발행 시 서버가 timestamp 붙여 생성
function slugify(title: string): string {
  return (title || '제목없음')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function EditorNewPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initBlogId = searchParams.get('blogId')
  const initKeyword = searchParams.get('keyword') ?? ''

  const [mode, setMode] = useState<EditorMode>(initKeyword ? 'ai' : 'manual')
  const [blogs, setBlogs] = useState<{ id: string; name: string; color: string | null; ai_provider: string | null; blog_type?: string | null; language?: string | null; custom_domain?: string | null }[]>([])
  const [snippetOpen, setSnippetOpen] = useState(false)
  const [draftOpen, setDraftOpen] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [tocEnabled, setTocEnabled] = useState(true)
  const [generatingMeta, setGeneratingMeta] = useState(false)
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const editorRef = useRef<PostEditorRef>(null)
  const aiPanelRef = useRef<AIGeneratePanelRef>(null)

  // 카테고리
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)

  // AI 결과 표시용 상태
  const [aiResults, setAiResults] = useState<Record<string, BlogPipelineState>>({})
  const [activeBlogTab, setActiveBlogTab] = useState<string | null>(null)
  const [publishingAll, setPublishingAll] = useState(false)
  // 발행 대상으로 선택된 블로그 (디폴트: 모두 true)
  const [selectedForPublish, setSelectedForPublish] = useState<Record<string, boolean>>({})
  // AI 결과 패널의 태그·SEO 재생성 진행 상태 (블로그별)
  const [regeneratingMeta, setRegeneratingMeta] = useState<Record<string, boolean>>({})
  // Threads 발행 상태 (블로그별)
  const [threadsState, setThreadsState] = useState<Record<string, ThreadsState>>({})

  const {
    title, setTitle,
    htmlContent, setHtmlContent,
    selectedBlogId, setSelectedBlogId,
    tags, setTags,
    seoMeta, setSeoMeta,
    currentPostId, setCurrentPostId,
    setKeywords,
    autoPublish,
    pipelineGlobalStep,
    resetEditor,
    resetPipeline,
  } = useEditorStore()

  // 수익화 글 발행 시 monetize_meta 빌드 — useJsonLd는 호출 시점의 최신 store 값 사용 (closure stale 방지)
  const buildMonetizeMetaForPublish = (s: BlogPipelineState) => {
    if (!s.monetizeMeta) return null
    return { ...s.monetizeMeta, useJsonLd: useEditorStore.getState().useJsonLd }
  }

  useEffect(() => {
    fetch('/api/blogs').then(r => r.json()).then(d => {
      const list = d.data ?? []
      setBlogs(list)
      if (initBlogId) setSelectedBlogId(initBlogId)
      else if (list.length > 0) setSelectedBlogId(list[0].id)
    })
    if (initKeyword) setKeywords([initKeyword])
    return () => { resetEditor(); resetPipeline() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 블로그 변경 시 카테고리 fetch
  useEffect(() => {
    if (!selectedBlogId) { setCategories([]); setSelectedCategoryId(null); return }
    Promise.all([
      fetch(`/api/categories?blogId=${selectedBlogId}`).then(r => r.json()),
      fetch(`/api/blogs/${selectedBlogId}`).then(r => r.json()),
    ]).then(([catData, blogData]) => {
      setCategories(catData.data ?? [])
      setSelectedCategoryId(blogData.data?.default_category_id ?? null)
    })
  }, [selectedBlogId])

  // 자동 저장 (3초 디바운스)
  const triggerAutoSave = (html: string) => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => saveDraft(html), 3000)
  }

  const saveDraft = async (html?: string, showAlert = false) => {
    const contentToSave = html ?? htmlContent
    if (!title.trim() && !contentToSave.trim()) {
      if (showAlert) alert('저장할 내용이 없습니다.')
      return
    }
    if (!selectedBlogId) {
      if (showAlert) alert('블로그를 선택해주세요.')
      return
    }
    setSaveStatus('saving')
    try {
      const body = {
        title: title.trim() || '제목없음',
        htmlContent: contentToSave,
        status: 'draft', tags,
        seoMeta: { title: seoMeta.title, description: seoMeta.description },
        blogId: selectedBlogId,
        categoryId: selectedCategoryId,
      }
      const res = currentPostId
        ? await fetch(`/api/posts/${currentPostId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        : await fetch('/api/posts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

      const data = await res.json()
      if (res.ok) {
        if (!currentPostId && data.data?.id) setCurrentPostId(data.data.id)
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2000)
      } else {
        if (showAlert) alert(`임시저장 실패: ${data.error}`)
        setSaveStatus('idle')
      }
    } catch {
      if (showAlert) alert('임시저장 중 오류가 발생했습니다.')
      setSaveStatus('idle')
    }
  }

  const handlePublish = async () => {
    if (!title.trim()) { alert('제목을 입력하세요.'); return }
    if (!selectedBlogId) { alert('발행할 블로그를 선택하세요.'); return }
    setPublishing(true)
    const body = {
      title, htmlContent, status: 'published',
      tags, seoMeta, blogId: selectedBlogId, categoryId: selectedCategoryId,
      publishedAt: new Date().toISOString(),
    }
    const res = currentPostId
      ? await fetch(`/api/posts/${currentPostId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      : await fetch('/api/posts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setPublishing(false)
    if (res.ok) {
      const result = await res.json()
      // needsConnection은 GSC 미연결 상태 → 사용자 의식적 미연결일 수 있어 alert 생략
      if (result.indexing?.requested && !result.indexing?.ok && !result.indexing?.needsConnection) {
        alert(`발행 완료! (Google 색인 요청 실패: ${result.indexing.error || '알 수 없는 오류'})`)
      }
      router.push('/dashboard')
    }
  }

  // 블로그별 default_category_id를 일괄 조회
  const fetchDefaultCategories = async (blogIds: string[]): Promise<Record<string, string | null>> => {
    const result: Record<string, string | null> = {}
    await Promise.all(blogIds.map(async (blogId) => {
      try {
        const res = await fetch(`/api/blogs/${blogId}`)
        const json = await res.json()
        result[blogId] = json.data?.default_category_id ?? null
      } catch {
        result[blogId] = null
      }
    }))
    return result
  }

  // AI 파이프라인 완료 콜백 (재생성 시 다른 블로그 결과 보존을 위해 머지)
  const handlePipelineComplete = useCallback(async (states: Record<string, BlogPipelineState>) => {
    setAiResults(prev => ({ ...prev, ...states }))
    setSelectedForPublish(prev => {
      const next = { ...prev }
      for (const id of Object.keys(states)) {
        if (next[id] === undefined) next[id] = true
      }
      return next
    })
    const blogIds = Object.keys(states)
    setActiveBlogTab(prev => prev ?? (blogIds.length ? blogIds[0] : null))

    // 자동 발행 모드 (이번 파이프라인에서 새로 생성된 블로그만)
    if (autoPublish) {
      setPublishingAll(true)
      const defaultCategories = await fetchDefaultCategories(blogIds)
      const errors: string[] = []
      let needsGscConnection = false
      for (const blogId of blogIds) {
        const s = states[blogId]
        if (s.step !== 'done' || !s.title) continue
        try {
          const res = await fetch('/api/posts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: s.title, htmlContent: s.htmlContent,
              status: 'published', tags: s.tags,
              seoMeta: s.seoMeta, blogId,
              categoryId: defaultCategories[blogId],
              publishedAt: new Date().toISOString(),
              ...(s.monetizeMeta ? { monetizeMeta: buildMonetizeMetaForPublish(s) } : {}),
            }),
          })
          if (!res.ok) {
            const data = await res.json().catch(() => ({ error: 'Unknown error' }))
            errors.push(`${s.blogName}: ${data.error}`)
          } else {
            const result = await res.json().catch(() => ({}))
            // needsConnection (GSC 미연결)은 alert 스팸 방지를 위해 errors에 쌓지 않음
            if (result.indexing?.requested && !result.indexing?.ok && !result.indexing?.needsConnection) {
              errors.push(`${s.blogName}: 발행 성공, 색인 실패 (${result.indexing.error || '알 수 없는 오류'})`)
            }
            if (result.indexing?.needsConnection) needsGscConnection = true
          }
        } catch (err) {
          errors.push(`${s.blogName}: 네트워크 오류`)
        }
      }
      setPublishingAll(false)
      if (errors.length > 0) {
        alert(`발행 결과 알림:\n${errors.join('\n')}`)
      } else if (needsGscConnection) {
        alert('발행 완료. GSC가 연결되지 않아 색인 자동 요청은 건너뛰었습니다.\n블로그 설정 > 레이아웃 > 분석 & 추적 > GSC에서 Google 계정을 연결하세요.')
      }
      router.push('/dashboard')
    }
  }, [autoPublish, router])

  // AI 결과 수정 시 로컬 상태도 업데이트
  const updateAiResult = (blogId: string, patch: Partial<BlogPipelineState>) => {
    setAiResults(prev => ({
      ...prev,
      [blogId]: { ...prev[blogId], ...patch },
    }))
  }

  // 본문은 그대로 두고 태그·SEO만 AI로 재생성
  const regenerateMetaForActive = async () => {
    if (!activeBlogTab || !activeResult) return
    setRegeneratingMeta(prev => ({ ...prev, [activeBlogTab]: true }))
    try {
      const res = await fetch('/api/ai/generate-meta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: activeResult.title,
          htmlContent: activeResult.htmlContent,
          mode: 'meta',
          language: blogs.find(b => b.id === activeBlogTab)?.language ?? 'ko',
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(`태그·SEO 생성 실패: ${data.error || '알 수 없는 오류'}`)
        return
      }
      const patch: Partial<BlogPipelineState> = {}
      if (Array.isArray(data.tags) && data.tags.length) patch.tags = data.tags
      if (data.seoTitle || data.seoDescription) {
        patch.seoMeta = {
          title: data.seoTitle ?? activeResult.seoMeta.title,
          description: data.seoDescription ?? activeResult.seoMeta.description,
        }
      }
      if (Object.keys(patch).length) updateAiResult(activeBlogTab, patch)
    } catch (e) {
      alert(`네트워크 오류: ${e instanceof Error ? e.message : ''}`)
    } finally {
      setRegeneratingMeta(prev => ({ ...prev, [activeBlogTab]: false }))
    }
  }

  // 전체 발행 (수동 모드 - 체크된 블로그만)
  const handlePublishAll = async () => {
    const blogIds = Object.keys(aiResults).filter(id => selectedForPublish[id] !== false)
    if (!blogIds.length) { alert('발행할 블로그를 1개 이상 선택해주세요.'); return }
    setPublishingAll(true)
    const defaultCategories = await fetchDefaultCategories(blogIds)
    const errors: string[] = []
    let needsGscConnection = false
    // Threads 발행 큐 (각 블로그 발행 후 시차 두고 처리)
    const threadsQueue: { blogId: string; blogName: string; postId: string; content: string }[] = []

    for (const blogId of blogIds) {
      const s = aiResults[blogId]
      if (s.step !== 'done' || !s.title) continue
      try {
        const res = await fetch('/api/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: s.title, htmlContent: s.htmlContent,
            status: 'published', tags: s.tags,
            seoMeta: s.seoMeta, blogId,
            categoryId: defaultCategories[blogId],
            publishedAt: new Date().toISOString(),
            ...(s.monetizeMeta ? { monetizeMeta: buildMonetizeMetaForPublish(s) } : {}),
          }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({ error: 'Unknown error' }))
          errors.push(`${s.blogName}: ${data.error}`)
        } else {
          const result = await res.json().catch(() => ({}))
          if (result.indexing?.requested && !result.indexing?.ok) {
            errors.push(`${s.blogName}: 발행 성공, 색인 실패 (${result.indexing.error || '알 수 없는 오류'})`)
          }
          // Threads 발행 대상 큐에 추가 (체크된 블로그만)
          const tState = threadsState[blogId]
          if (tState?.enabled && tState.threadsText.trim()) {
            const postData = result.data as { id?: string; slug?: string } | undefined
            const blog = blogs.find(b => b.id === blogId)
            const realUrl = blog?.custom_domain && postData?.slug
              ? `https://${blog.custom_domain}/${encodeURIComponent(postData.slug)}`
              : tState.postUrl
            // 본문 + CTA + 실제 URL 조합
            const fullContent = realUrl
              ? `${tState.threadsText}\n\n${tState.ctaText.replace(/https?:\/\/\S+/g, realUrl)}`
              : `${tState.threadsText}\n\n${tState.ctaText}`
            threadsQueue.push({
              blogId,
              blogName: s.blogName,
              postId: postData?.id ?? '',
              content: fullContent.trim().slice(0, 500),
            })
          }
        }
      } catch (err) {
        errors.push(`${s.blogName}: 네트워크 오류`)
      }
    }

    // Threads 시차 발행 (블로그별 30초 간격 — 자연스러움 + Meta rate limit 방지)
    if (threadsQueue.length > 0) {
      for (let i = 0; i < threadsQueue.length; i++) {
        const item = threadsQueue[i]
        if (i > 0) await new Promise(r => setTimeout(r, 30000))  // 30초 간격
        try {
          const tres = await fetch('/api/sns/threads/publish', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: item.content,
              blogId: item.blogId,
              postId: item.postId,
            }),
          })
          if (!tres.ok) {
            const tdata = await tres.json().catch(() => ({}))
            errors.push(`${item.blogName} (Threads): ${tdata.error || '발행 실패'}`)
          }
        } catch (e) {
          errors.push(`${item.blogName} (Threads): 네트워크 오류`)
        }
      }
    }

    setPublishingAll(false)
    if (errors.length > 0) {
      alert(`발행 결과 알림:\n${errors.join('\n')}`)
    } else if (needsGscConnection) {
      alert('발행 완료. GSC가 연결되지 않아 색인 자동 요청은 건너뛰었습니다.\n블로그 설정 > 레이아웃 > 분석 & 추적 > GSC에서 Google 계정을 연결하세요.')
      router.push('/dashboard')
    } else {
      router.push('/dashboard')
    }
  }

  // AI 메타/태그 자동 생성
  const generateMeta = async () => {
    if (!htmlContent.trim() && !title.trim()) { alert('글 내용을 먼저 작성해주세요.'); return }
    setGeneratingMeta(true)
    try {
      const res = await fetch('/api/ai/generate-meta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, htmlContent }),
      })
      const data = await res.json()
      if (res.ok) {
        if (data.seoTitle && data.seoDescription) {
          setSeoMeta({ title: data.seoTitle, description: data.seoDescription })
        } else if (data.seoTitle) {
          setSeoMeta({ ...seoMeta, title: data.seoTitle })
        } else if (data.seoDescription) {
          setSeoMeta({ ...seoMeta, description: data.seoDescription })
        }
        if (data.tags?.length) setTags(data.tags)
      }
    } catch { /* ignore */ }
    finally { setGeneratingMeta(false) }
  }

  // 임시저장 글 불러오기
  const loadDraft = (draft: { id: string; title: string; content_html?: string; blog_id: string; keyword?: string; seo_title?: string; meta_description?: string }) => {
    setCurrentPostId(draft.id)
    setTitle(draft.title ?? '')
    setHtmlContent(draft.content_html ?? '')
    setSelectedBlogId(draft.blog_id ?? null)
    setTags(draft.keyword ? draft.keyword.split(',').map(t => t.trim()).filter(Boolean) : [])
    setSeoMeta({ title: draft.seo_title ?? '', description: draft.meta_description ?? '' })
    setMode('manual')
  }

  // 미리보기
  const openPreview = (previewTitle?: string, previewHtml?: string, previewTags?: string[], previewDesc?: string, previewBlogId?: string) => {
    localStorage.setItem('__preview_data__', JSON.stringify({
      htmlContent: previewHtml ?? htmlContent,
      tags: previewTags ?? tags,
      seoDescription: previewDesc ?? seoMeta.description,
    }))
    const params = new URLSearchParams({
      title: previewTitle ?? title,
      ...(previewBlogId ?? selectedBlogId ? { blogId: (previewBlogId ?? selectedBlogId)! } : {}),
    })
    window.open(`/editor/preview?${params.toString()}`, '_blank')
  }

  const headings = editorRef.current?.getHeadings?.() ?? []
  const tocHeadings = headings.filter(h => h.level === 2)

  const pipelineDone = pipelineGlobalStep === 'done'
  const hasAiResults = Object.keys(aiResults).length > 0
  const activeResult = activeBlogTab ? aiResults[activeBlogTab] : null

  // AI 결과의 H2 목차는 본문 HTML에 이미 포함되므로 별도 추출 불필요

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">글 작성</h1>
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5 sm:pb-0 flex-shrink-0">
          {saveStatus === 'saving' && <span className="text-xs text-gray-400 whitespace-nowrap">저장 중...</span>}
          {saveStatus === 'saved' && <span className="text-xs text-green-500 whitespace-nowrap">저장됨</span>}
          <Button size="sm" variant="outline" onClick={() => setSnippetOpen(true)} className="whitespace-nowrap">
            <BookOpen className="w-4 h-4 mr-1.5" />스니펫
          </Button>
          <Button size="sm" variant="outline" onClick={() => saveDraft(undefined, true)} className="whitespace-nowrap">
            <Save className="w-4 h-4 mr-1.5" />임시저장
          </Button>
          <Button size="sm" variant="outline" onClick={() => setDraftOpen(true)} className="whitespace-nowrap">
            <FileText className="w-4 h-4 mr-1.5" />글 불러오기
          </Button>
          <Button size="sm" variant="outline" onClick={() => openPreview()} className="whitespace-nowrap">
            <Eye className="w-4 h-4 mr-1.5" />미리보기
          </Button>
          <Button size="sm" onClick={handlePublish} disabled={publishing} className="whitespace-nowrap">
            <Send className="w-4 h-4 mr-1.5" />{publishing ? '발행 중...' : '발행'}
          </Button>
        </div>
      </div>

      {/* 모드 탭 */}
      <div className="flex border-b border-gray-200">
        {([
          { id: 'ai' as const, label: 'AI 글 생성', icon: Sparkles },
          { id: 'manual' as const, label: '직접 작성', icon: PenLine },
        ]).map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setMode(id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              mode === id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {/* ══ AI 생성 모드 ══ */}
      {mode === 'ai' && (
        <div className="space-y-6">
          {/* AI 설정 패널 */}
          <AIGeneratePanel ref={aiPanelRef} blogs={blogs} onPipelineComplete={handlePipelineComplete} />

          {/* ── 파이프라인 완료 후: 생성 결과 영역 ── */}
          {hasAiResults && !autoPublish && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-4">
              {/* 헤더: 제목 + 전체 발행 */}
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">생성 결과</h2>
                <Button onClick={handlePublishAll} disabled={publishingAll}>
                  <Send className="w-4 h-4 mr-2" />
                  {publishingAll
                    ? '발행 중...'
                    : `선택 발행 (${Object.values(aiResults).filter(s => s.step === 'done' && selectedForPublish[s.blogId] !== false).length}개)`}
                </Button>
              </div>

              {/* 블로그 탭 — 체크박스로 발행 대상 선택 (디폴트 ON) */}
              <div className="border-b border-gray-300">
                <div className="flex gap-0">
                  {Object.values(aiResults).map(s => {
                    const checked = selectedForPublish[s.blogId] !== false
                    return (
                      <div key={s.blogId}
                        className={`flex items-center gap-1.5 px-3 py-2 border-b-2 transition-colors ${
                          activeBlogTab === s.blogId
                            ? 'border-blue-600 bg-white'
                            : 'border-transparent'
                        }`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={e => setSelectedForPublish(prev => ({ ...prev, [s.blogId]: e.target.checked }))}
                          disabled={s.step !== 'done'}
                          title="발행 대상 선택"
                          className="w-3.5 h-3.5 cursor-pointer accent-blue-600"
                          onClick={e => e.stopPropagation()}
                        />
                        <button onClick={() => setActiveBlogTab(s.blogId)}
                          className={`text-sm font-medium ${
                            activeBlogTab === s.blogId
                              ? 'text-blue-600'
                              : s.step === 'error'
                                ? 'text-red-400 hover:text-red-500'
                                : 'text-gray-500 hover:text-gray-700'
                          }`}>
                          {s.blogName}
                          {s.step === 'done' && <span className="ml-1.5 text-green-500">&#10003;</span>}
                          {s.step === 'error' && <span className="ml-1.5 text-red-400">&#10007;</span>}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* 활성 블로그의 결과 */}
              {activeResult && activeResult.step !== 'done' && activeResult.step !== 'idle' && (
                <div className="bg-white rounded-lg border border-gray-200 p-8 flex items-center justify-center gap-3 text-gray-500">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                  <span className="text-sm">{activeResult.stepMessage || '재생성 중...'}</span>
                </div>
              )}
              {activeResult && activeResult.step === 'done' && (
                <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
                  {/* 개별 액션 버튼 */}
                  <div className="flex justify-between items-center">
                    <Button size="sm" variant="outline"
                      onClick={() => {
                        if (!activeBlogTab) return
                        updateAiResult(activeBlogTab, { step: 'writing', stepMessage: '재생성 준비 중...' })
                        aiPanelRef.current?.run([activeBlogTab])
                      }}
                      disabled={publishingAll}>
                      <Sparkles className="w-4 h-4 mr-1.5" />이 글 재생성
                    </Button>
                    <Button size="sm" variant="outline"
                      onClick={() => openPreview(activeResult.title, activeResult.htmlContent, activeResult.tags, activeResult.seoMeta.description, activeBlogTab!)}>
                      <Eye className="w-4 h-4 mr-1.5" />미리보기
                    </Button>
                  </div>

                  {/* 제목 */}
                  <Input
                    value={activeResult.title}
                    onChange={e => updateAiResult(activeBlogTab!, { title: e.target.value })}
                    className="text-xl font-bold border-0 border-b border-gray-200 rounded-none px-0 focus-visible:ring-0 h-auto py-2"
                    placeholder="제목" />

                  {/* AI 생성 HTML 본문에 이미 목차가 포함되어 있으므로 에디터 UI 목차는 표시하지 않음 */}

                  {/* 본문 편집 — key로 탭 전환 시 에디터 완전 재마운트 (CTA 등 콘텐츠 손실 방지) */}
                  <PostEditor
                    key={activeBlogTab}
                    content={activeResult.htmlContent}
                    onChange={html => updateAiResult(activeBlogTab!, { htmlContent: html })}
                    articleTitle={activeResult.title}
                  />

                  {/* 태그 + AI 재생성 버튼 */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">태그</Label>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={regenerateMetaForActive}
                        disabled={!activeBlogTab || regeneratingMeta[activeBlogTab] || !activeResult.htmlContent.trim()}
                        className="h-7 text-xs gap-1"
                        title="본문은 유지하고 태그·SEO 메타만 AI로 다시 작성"
                      >
                        {activeBlogTab && regeneratingMeta[activeBlogTab]
                          ? <><Loader2 className="w-3 h-3 animate-spin" />작성 중...</>
                          : <><Wand2 className="w-3 h-3" />AI 태그·SEO 재생성</>}
                      </Button>
                    </div>
                    <Input
                      value={activeResult.tags.join(', ')}
                      onChange={e => updateAiResult(activeBlogTab!, { tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
                      placeholder="태그를 쉼표로 구분" className="text-sm" />
                  </div>

                  {/* SEO */}
                  <SEOMetaForm
                    seoTitle={activeResult.seoMeta.title}
                    seoDescription={activeResult.seoMeta.description}
                    onTitleChange={v => updateAiResult(activeBlogTab!, { seoMeta: { ...activeResult.seoMeta, title: v } })}
                    onDescChange={v => updateAiResult(activeBlogTab!, { seoMeta: { ...activeResult.seoMeta, description: v } })}
                  />

                  {/* Threads 동시 발행 섹션 */}
                  {activeBlogTab && (() => {
                    const blog = blogs.find(b => b.id === activeBlogTab)
                    const tState = threadsState[activeBlogTab] ?? {
                      enabled: false, threadsText: '', ctaText: '',
                      postUrl: null, generating: false, generated: false,
                    }
                    return (
                      <ThreadsSection
                        blogId={activeBlogTab}
                        blogName={blog?.name ?? activeResult.blogName}
                        blogCustomDomain={(blog as { custom_domain?: string | null } | undefined)?.custom_domain ?? null}
                        postTitle={activeResult.title}
                        postContent={activeResult.htmlContent}
                        postSlug={slugify(activeResult.title)}
                        state={tState}
                        onChange={(patch) => setThreadsState(prev => ({
                          ...prev,
                          [activeBlogTab]: { ...tState, ...patch },
                        }))}
                      />
                    )
                  })()}
                </div>
              )}

              {activeResult && activeResult.step === 'error' && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{activeResult.error ?? activeResult.stepMessage}</p>
                </div>
              )}
            </div>
          )}

          {/* 자동 발행 중 */}
          {publishingAll && (
            <div className="flex items-center gap-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span className="text-sm text-blue-700">전체 블로그에 발행 중...</span>
            </div>
          )}
        </div>
      )}

      {/* ══ 직접 작성 모드 ══ */}
      {mode === 'manual' && (
        <div className="space-y-4">
          <Input value={title} onChange={e => setTitle(e.target.value)}
            placeholder="글 제목을 입력하세요"
            className="text-xl font-bold border-0 border-b border-gray-200 rounded-none px-0 focus-visible:ring-0 h-auto py-2" />

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Label className="text-sm text-gray-500 whitespace-nowrap">발행 블로그:</Label>
              <select value={selectedBlogId ?? ''}
                onChange={e => setSelectedBlogId(e.target.value || null)}
                className="text-sm border border-gray-200 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">블로그 선택</option>
                {blogs.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            {categories.length > 0 && (
              <div className="flex items-center gap-2">
                <Label className="text-sm text-gray-500 whitespace-nowrap">카테고리:</Label>
                <select value={selectedCategoryId ?? ''}
                  onChange={e => setSelectedCategoryId(e.target.value || null)}
                  className="text-sm border border-gray-200 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">미분류</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={tocEnabled} onCheckedChange={setTocEnabled} />
            <Label className="text-sm text-gray-600">목차 자동 생성</Label>
          </div>

          {tocEnabled && tocHeadings.length > 0 && (
            <nav className="toc-container bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">목차</h4>
              <ul className="space-y-1">
                {tocHeadings.map((h, i) => (
                  <li key={i} className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer">{h.text}</li>
                ))}
              </ul>
            </nav>
          )}

          <PostEditor
            ref={editorRef}
            content={htmlContent}
            onChange={html => { setHtmlContent(html); triggerAutoSave(html) }}
            articleTitle={title}
          />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">태그</Label>
              <Button size="sm" variant="outline" onClick={generateMeta} disabled={generatingMeta} className="h-7 text-xs gap-1">
                {generatingMeta ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                AI 기타 설정 작성
              </Button>
            </div>
            <Input
              placeholder="태그를 쉼표로 구분해서 입력 (예: 여행, 제주도)"
              value={tags.join(', ')}
              onChange={e => setTags(e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
              className="text-sm" />
          </div>

          <SEOMetaForm
            seoTitle={seoMeta.title} seoDescription={seoMeta.description}
            onTitleChange={v => setSeoMeta({ ...seoMeta, title: v })}
            onDescChange={v => setSeoMeta({ ...seoMeta, description: v })}
          />
        </div>
      )}

      <SnippetDrawer
        isOpen={snippetOpen}
        onClose={() => setSnippetOpen(false)}
        onInsert={content => {
          const editor = editorRef.current?.getEditor()
          if (editor) {
            editor.commands.focus()
            editor.commands.insertContent(content)
          } else {
            setHtmlContent(htmlContent + content)
          }
        }} />

      <DraftDrawer isOpen={draftOpen} onClose={() => setDraftOpen(false)} onLoad={loadDraft} />
    </div>
  )
}
