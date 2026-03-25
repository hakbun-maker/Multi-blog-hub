'use client'

import { useEffect, useRef, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Send, BookOpen, Wand2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PostEditor } from '@/components/editor/PostEditor'
import { SEOMetaForm } from '@/components/editor/SEOMetaForm'
import { SnippetDrawer } from '@/components/editor/SnippetDrawer'
import { MonetizeEditorHeader } from '@/components/monetize/editor/MonetizeEditorHeader'
import { MonetizeEditorSidebar } from '@/components/monetize/editor/MonetizeEditorSidebar'
import { MonetizeEditorActions } from '@/components/monetize/editor/MonetizeEditorActions'
import type { Grade, IntentType } from '@/types/monetize'

interface EditContext {
  postId: string
  keyword: string
  keywordGrade?: Grade
  intentType?: IntentType | null
  blogName: string
  blogId: string
  status: string
  content: string
  score?: number
}

function EditorContent({ params }: { params: { id: string } }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isReviewMode = searchParams.get('from') === 'review'
  const [editContext, setEditContext] = useState<EditContext | null>(null)
  const [post, setPost] = useState<{ id: string; title: string; content_html?: string; blog_id: string; keyword?: string; seo_title?: string; meta_description?: string } | null>(null)
  const [blogs, setBlogs] = useState<{ id: string; name: string }[]>([])
  const [title, setTitle] = useState('')
  const [htmlContent, setHtmlContent] = useState('')
  const [selectedBlogId, setSelectedBlogId] = useState<string | null>(null)
  const [tags, setTags] = useState<string[]>([])
  const [seoMeta, setSeoMeta] = useState({ title: '', description: '' })
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [snippetOpen, setSnippetOpen] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [generatingMeta, setGeneratingMeta] = useState(false)
  const [indexingError, setIndexingError] = useState<string | null>(null)
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (isReviewMode) {
      // Review mode: fetch edit-context from monetize pipeline
      fetch(`/api/writing/edit-context/${params.id}`)
        .then(r => r.json())
        .then(data => {
          if (!data.data) { router.push('/monetize/writing'); return }
          const ctx = data.data
          setEditContext(ctx)
          setHtmlContent(ctx.content || '')
          setSelectedBlogId(ctx.blogId)
          // Set minimal post object for rendering
          setPost({ id: ctx.postId, title: '', blog_id: ctx.blogId })
          // Also fetch blogs for the selector
          fetch('/api/blogs').then(r => r.json()).then(d => setBlogs(d.data ?? []))
        })
    } else {
      // Normal mode: fetch post + blogs
      Promise.all([
        fetch(`/api/posts/${params.id}`).then(r => r.json()),
        fetch('/api/blogs').then(r => r.json()),
      ]).then(([postData, blogsData]) => {
        const p = postData.data
        setPost(p)
        setTitle(p.title ?? '')
        setHtmlContent(p.content_html ?? '')
        setSelectedBlogId(p.blog_id ?? null)
        setSelectedCategoryId(p.category_id ?? null)
        setTags(p.keyword ? p.keyword.split(',').map((t: string) => t.trim()).filter(Boolean) : [])
        setSeoMeta({ title: p.seo_title ?? '', description: p.meta_description ?? '' })
        setBlogs(blogsData.data ?? [])
      })
    }
  }, [params.id, isReviewMode, router])

  // 블로그 변경 시 카테고리 fetch
  useEffect(() => {
    if (!selectedBlogId) { setCategories([]); return }
    fetch(`/api/categories?blogId=${selectedBlogId}`).then(r => r.json()).then(d => {
      setCategories(d.data ?? [])
    })
  }, [selectedBlogId])

  // AI 개선 이벤트 리스너 (검수 모드에서만 활성)
  useEffect(() => {
    if (!isReviewMode) return
    const handleAiImprove = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail?.content) {
        setHtmlContent(detail.content)
      }
    }
    window.addEventListener('ai-improve-content', handleAiImprove)
    return () => window.removeEventListener('ai-improve-content', handleAiImprove)
  }, [isReviewMode])

  const triggerAutoSave = (html: string) => {
    if (isReviewMode) return // Review mode uses MonetizeEditorActions for saving
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => saveDraft(html), 3000)
  }

  const saveDraft = async (html?: string) => {
    setSaveStatus('saving')
    await fetch(`/api/posts/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title, htmlContent: html ?? htmlContent,
        status: 'draft', tags, seoMeta,
        categoryId: selectedCategoryId,
      }),
    })
    setSaveStatus('saved')
    setTimeout(() => setSaveStatus('idle'), 2000)
  }

  const handlePublish = async () => {
    if (!title.trim()) { alert('제목을 입력하세요.'); return }
    setPublishing(true)
    const res = await fetch(`/api/posts/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title, htmlContent,
        status: 'published', tags, seoMeta,
        publishedAt: new Date().toISOString(),
        blogId: selectedBlogId,
        categoryId: selectedCategoryId,
      }),
    })
    setPublishing(false)
    if (res.ok) {
      const result = await res.json()
      if (result.indexing?.requested && !result.indexing?.ok) {
        setIndexingError(result.indexing.error || '알 수 없는 오류')
      } else {
        router.push(selectedBlogId ? `/blogs/${selectedBlogId}` : '/dashboard')
      }
    }
  }

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
        if (data.seoTitle) setSeoMeta(prev => ({ ...prev, title: data.seoTitle }))
        if (data.seoDescription) setSeoMeta(prev => ({ ...prev, description: data.seoDescription }))
        if (data.tags?.length) setTags(data.tags)
      }
    } catch { /* ignore */ }
    finally { setGeneratingMeta(false) }
  }

  if (!post) return <div className="animate-pulse space-y-4"><div className="h-8 bg-gray-200 rounded w-64" /><div className="h-96 bg-gray-100 rounded" /></div>

  return (
    <div className="space-y-4">
      {/* Google Indexing 실패 팝업 */}
      {indexingError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">글은 발행되었지만, 색인 요청에 실패했습니다</h3>
                <p className="text-sm text-gray-500 mt-1">Google Indexing API 오류: {indexingError}</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 space-y-1.5">
              <p className="font-medium text-gray-700">해결 방법:</p>
              <p>1. <strong>블로그 설정 &gt; 레이아웃 &gt; 분석 &amp; 추적 &gt; GSC</strong>에서 Google 계정이 연결되어 있는지 확인하세요.</p>
              <p>2. 연결이 해제되었다면 다시 연결한 후 글을 재발행하세요.</p>
              <p>3. Google Search Console에서 해당 사이트가 등록되어 있어야 합니다.</p>
              <p>4. 문제가 계속되면 연결을 해제 후 다시 연결해 보세요.</p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setIndexingError(null); router.push(selectedBlogId ? `/blogs/${selectedBlogId}` : '/dashboard') }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                확인 (목록으로 이동)
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          {isReviewMode ? '검수 글 수정' : '글 편집'}
        </h1>
        <div className="flex items-center gap-2">
          {!isReviewMode && (
            <>
              {saveStatus === 'saving' && <span className="text-xs text-gray-400">저장 중...</span>}
              {saveStatus === 'saved' && <span className="text-xs text-green-500">✓ 저장됨</span>}
              <Button size="sm" variant="outline" onClick={() => setSnippetOpen(true)}>
                <BookOpen className="w-4 h-4 mr-1.5" />스니펫
              </Button>
              <Button size="sm" variant="outline" onClick={() => saveDraft()}>임시저장</Button>
              <Button size="sm" onClick={handlePublish} disabled={publishing}>
                <Send className="w-4 h-4 mr-1.5" />{publishing ? '발행 중...' : '발행'}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* 검수 모드: 키워드/등급/인텐트/블로그 헤더 */}
      {isReviewMode && editContext && (
        <MonetizeEditorHeader
          keyword={editContext.keyword}
          keywordGrade={editContext.keywordGrade}
          intentType={editContext.intentType}
          blogName={editContext.blogName}
        />
      )}

      {/* 검수 모드: 2/3 에디터 + 1/3 사이드패널 그리드 / 일반 모드: 단일 컬럼 */}
      <div className={isReviewMode ? 'grid grid-cols-3 gap-6' : ''}>
        {/* 메인 에디터 영역 */}
        <div className={`space-y-4 ${isReviewMode ? 'col-span-2' : ''}`}>
          <Input value={title} onChange={e => setTitle(e.target.value)}
            placeholder="글 제목을 입력하세요"
            className="text-xl font-bold border-0 border-b border-gray-200 rounded-none px-0 focus-visible:ring-0 h-auto py-2" />

          {!isReviewMode && (
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
          )}

          <PostEditor
            content={htmlContent}
            onChange={(html) => { setHtmlContent(html); triggerAutoSave(html) }}
          />

          {!isReviewMode && (
            <>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">태그</Label>
                  <Button size="sm" variant="outline" onClick={generateMeta} disabled={generatingMeta}
                    className="h-7 text-xs gap-1">
                    {generatingMeta ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                    AI 기타 설정 작성
                  </Button>
                </div>
                <Input placeholder="태그를 쉼표로 구분해서 입력 (예: 여행, 제주도)"
                  value={tags.join(', ')}
                  onChange={e => setTags(e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
                  className="text-sm" />
              </div>

              <SEOMetaForm
                seoTitle={seoMeta.title} seoDescription={seoMeta.description}
                onTitleChange={v => setSeoMeta({ ...seoMeta, title: v })}
                onDescChange={v => setSeoMeta({ ...seoMeta, description: v })}
              />
            </>
          )}
        </div>

        {/* 검수 사이드패널 (1/3) */}
        {isReviewMode && editContext && (
          <div className="col-span-1 space-y-4">
            <MonetizeEditorSidebar
              postId={params.id}
              keyword={editContext.keyword}
              content={htmlContent}
            />
            <MonetizeEditorActions
              postId={params.id}
              content={htmlContent}
              score={editContext.score}
            />
          </div>
        )}
      </div>

      <SnippetDrawer isOpen={snippetOpen}
        onClose={() => setSnippetOpen(false)}
        onInsert={(content) => setHtmlContent(htmlContent + content)} />
    </div>
  )
}

export default function EditorEditPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-64" />
        <div className="h-96 bg-gray-100 rounded" />
      </div>
    }>
      <EditorContent params={params} />
    </Suspense>
  )
}
