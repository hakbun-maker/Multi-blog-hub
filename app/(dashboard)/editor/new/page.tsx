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
import { useEditorStore, type BlogPipelineState } from '@/store/editorStore'

type EditorMode = 'ai' | 'manual'

export default function EditorNewPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initBlogId = searchParams.get('blogId')
  const initKeyword = searchParams.get('keyword') ?? ''

  const [mode, setMode] = useState<EditorMode>(initKeyword ? 'ai' : 'manual')
  const [blogs, setBlogs] = useState<{ id: string; name: string; color: string | null; ai_provider: string | null }[]>([])
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
    if (res.ok) router.push('/dashboard')
  }

  // AI 파이프라인 완료 콜백
  const handlePipelineComplete = useCallback(async (states: Record<string, BlogPipelineState>) => {
    setAiResults(states)
    const blogIds = Object.keys(states)
    if (blogIds.length) setActiveBlogTab(blogIds[0])

    // 자동 발행 모드
    if (autoPublish) {
      setPublishingAll(true)
      for (const blogId of blogIds) {
        const s = states[blogId]
        if (s.step !== 'done' || !s.title) continue
        await fetch('/api/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: s.title, htmlContent: s.htmlContent,
            status: 'published', tags: s.tags,
            seoMeta: s.seoMeta, blogId,
            publishedAt: new Date().toISOString(),
          }),
        })
      }
      setPublishingAll(false)
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

  // 전체 발행 (수동 모드)
  const handlePublishAll = async () => {
    const blogIds = Object.keys(aiResults)
    if (!blogIds.length) return
    setPublishingAll(true)
    for (const blogId of blogIds) {
      const s = aiResults[blogId]
      if (s.step !== 'done' || !s.title) continue
      await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: s.title, htmlContent: s.htmlContent,
          status: 'published', tags: s.tags,
          seoMeta: s.seoMeta, blogId,
          publishedAt: new Date().toISOString(),
        }),
      })
    }
    setPublishingAll(false)
    router.push('/dashboard')
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

  // AI 결과의 H2 목차 추출
  const aiTocHeadings = (() => {
    if (!activeResult?.htmlContent) return []
    const matches = activeResult.htmlContent.match(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)
    if (!matches) return []
    return matches.map(m => m.replace(/<[^>]*>/g, '').trim()).filter(Boolean)
  })()

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">글 작성</h1>
        <div className="flex items-center gap-2">
          {saveStatus === 'saving' && <span className="text-xs text-gray-400">저장 중...</span>}
          {saveStatus === 'saved' && <span className="text-xs text-green-500">저장됨</span>}
          <Button size="sm" variant="outline" onClick={() => setSnippetOpen(true)}>
            <BookOpen className="w-4 h-4 mr-1.5" />스니펫
          </Button>
          <Button size="sm" variant="outline" onClick={() => saveDraft(undefined, true)}>
            <Save className="w-4 h-4 mr-1.5" />임시저장
          </Button>
          <Button size="sm" variant="outline" onClick={() => setDraftOpen(true)}>
            <FileText className="w-4 h-4 mr-1.5" />글 불러오기
          </Button>
          <Button size="sm" variant="outline" onClick={() => openPreview()}>
            <Eye className="w-4 h-4 mr-1.5" />미리보기
          </Button>
          <Button size="sm" onClick={handlePublish} disabled={publishing}>
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
          {pipelineDone && hasAiResults && !autoPublish && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-4">
              {/* 헤더: 제목 + 재생성 + 전체 발행 */}
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">생성 결과</h2>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline"
                    onClick={() => activeBlogTab && aiPanelRef.current?.run([activeBlogTab])}
                    disabled={publishingAll}>
                    <Sparkles className="w-4 h-4 mr-1.5" />재생성
                  </Button>
                  <Button onClick={handlePublishAll} disabled={publishingAll}>
                    <Send className="w-4 h-4 mr-2" />
                    {publishingAll ? '발행 중...' : `전체 발행 (${Object.values(aiResults).filter(s => s.step === 'done').length}개)`}
                  </Button>
                </div>
              </div>

              {/* 블로그 탭 */}
              <div className="border-b border-gray-300">
                <div className="flex gap-0">
                  {Object.values(aiResults).map(s => (
                    <button key={s.blogId} onClick={() => setActiveBlogTab(s.blogId)}
                      className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                        activeBlogTab === s.blogId
                          ? 'border-blue-600 text-blue-600 bg-white'
                          : s.step === 'error'
                            ? 'border-transparent text-red-400 hover:text-red-500'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}>
                      {s.blogName}
                      {s.step === 'done' && <span className="ml-1.5 text-green-500">&#10003;</span>}
                      {s.step === 'error' && <span className="ml-1.5 text-red-400">&#10007;</span>}
                    </button>
                  ))}
                </div>
              </div>

              {/* 활성 블로그의 결과 */}
              {activeResult && activeResult.step === 'done' && (
                <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
                  {/* 미리보기 버튼 */}
                  <div className="flex justify-end">
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

                  {/* H2 목차 */}
                  {aiTocHeadings.length > 0 && (
                    <nav className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-blue-800 mb-2">목차</h4>
                      <ol className="space-y-1 list-decimal list-inside">
                        {aiTocHeadings.map((text, i) => (
                          <li key={i}
                            className="text-sm text-blue-700 hover:text-blue-900 cursor-pointer hover:underline"
                            onClick={() => {
                              const container = document.querySelector('.ProseMirror')
                              if (!container) return
                              const h2s = container.querySelectorAll('h2')
                              h2s[i]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                            }}>
                            {text}
                          </li>
                        ))}
                      </ol>
                    </nav>
                  )}

                  {/* 본문 편집 */}
                  <PostEditor
                    content={activeResult.htmlContent}
                    onChange={html => updateAiResult(activeBlogTab!, { htmlContent: html })}
                    articleTitle={activeResult.title}
                  />

                  {/* 태그 */}
                  <div className="space-y-2">
                    <Label className="text-sm">태그</Label>
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

      <SnippetDrawer blogId={selectedBlogId} isOpen={snippetOpen}
        onClose={() => setSnippetOpen(false)}
        onInsert={content => setHtmlContent(htmlContent + content)} />

      <DraftDrawer isOpen={draftOpen} onClose={() => setDraftOpen(false)} onLoad={loadDraft} />
    </div>
  )
}
