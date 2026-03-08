'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Sparkles, PenLine, BookOpen, Send, Wand2, Loader2, FileText, Eye, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { AIGeneratePanel } from '@/components/editor/AIGeneratePanel'
import { PostEditor, type PostEditorRef } from '@/components/editor/PostEditor'
import { SEOMetaForm } from '@/components/editor/SEOMetaForm'
import { SnippetDrawer } from '@/components/editor/SnippetDrawer'
import { DraftDrawer } from '@/components/editor/DraftDrawer'
import { useEditorStore, type GeneratedPostResult } from '@/store/editorStore'

type EditorMode = 'ai' | 'manual'

export default function EditorNewPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initBlogId = searchParams.get('blogId')
  const initKeyword = searchParams.get('keyword') ?? ''

  const [mode, setMode] = useState<EditorMode>(initKeyword ? 'ai' : 'manual')
  const [blogs, setBlogs] = useState<{ id: string; name: string; color: string | null; ai_provider: string | null }[]>([])
  const [generatedPosts, setGeneratedPosts] = useState<GeneratedPostResult[]>([])
  const [activeGenTab, setActiveGenTab] = useState(0)
  const [snippetOpen, setSnippetOpen] = useState(false)
  const [draftOpen, setDraftOpen] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [tocEnabled, setTocEnabled] = useState(true)
  const [generatingMeta, setGeneratingMeta] = useState(false)
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const editorRef = useRef<PostEditorRef>(null)

  const {
    title, setTitle,
    htmlContent, setHtmlContent,
    selectedBlogId, setSelectedBlogId,
    tags, setTags,
    seoMeta, setSeoMeta,
    currentPostId, setCurrentPostId,
    setKeywords,
    resetEditor,
  } = useEditorStore()

  useEffect(() => {
    fetch('/api/blogs').then(r => r.json()).then(d => {
      const list = d.data ?? []
      setBlogs(list)
      // URL에 blogId가 있으면 해당 블로그, 없으면 첫 번째 블로그 자동 선택
      if (initBlogId) setSelectedBlogId(initBlogId)
      else if (list.length > 0) setSelectedBlogId(list[0].id)
    })
    if (initKeyword) setKeywords([initKeyword])
    return () => resetEditor()
  }, [])

  // 자동 저장 (3초 디바운스)
  const triggerAutoSave = (html: string) => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => saveDraft(html), 3000)
  }

  const saveDraft = async (html?: string, showAlert = false) => {
    const contentToSave = html ?? htmlContent
    if (!title.trim() && !contentToSave.trim()) {
      if (showAlert) alert('저장할 내용이 없습니다. 제목이나 본문을 입력해주세요.')
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
        console.error('임시저장 실패:', data.error)
        if (showAlert) alert(`임시저장 실패: ${data.error}`)
        setSaveStatus('idle')
      }
    } catch (e) {
      console.error('임시저장 오류:', e)
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
      tags, seoMeta, blogId: selectedBlogId, publishedAt: new Date().toISOString(),
    }
    const res = currentPostId
      ? await fetch(`/api/posts/${currentPostId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      : await fetch('/api/posts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

    setPublishing(false)
    if (res.ok) router.push('/dashboard')
  }

  // AI 생성 결과를 에디터에 로드
  const loadGeneratedPost = (post: GeneratedPostResult) => {
    if (!post.success) return
    setTitle(post.title ?? '')
    setHtmlContent(post.htmlContent ?? '')
    setSelectedBlogId(post.blogId)
    setTags(post.tags ?? [])
    setSeoMeta(post.seoMeta ?? { title: '', description: '' })
    setMode('manual')
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
    setSeoMeta({
      title: draft.seo_title ?? '',
      description: draft.meta_description ?? '',
    })
    setMode('manual')
  }

  // 미리보기
  const openPreview = () => {
    // localStorage에 본문 데이터 저장 (URL 파라미터로는 너무 큼)
    localStorage.setItem('__preview_data__', JSON.stringify({
      htmlContent,
      tags,
      seoDescription: seoMeta.description,
    }))
    const params = new URLSearchParams({
      title,
      ...(selectedBlogId ? { blogId: selectedBlogId } : {}),
    })
    window.open(`/editor/preview?${params.toString()}`, '_blank')
  }

  // h2 기반 목차 생성
  const headings = editorRef.current?.getHeadings?.() ?? []
  const tocHeadings = headings.filter(h => h.level === 2)

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
          <Button size="sm" variant="outline" onClick={openPreview}>
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
          { id: 'ai', label: 'AI 글 생성', icon: Sparkles },
          { id: 'manual', label: '직접 작성', icon: PenLine },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setMode(id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              mode === id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {/* AI 생성 모드 */}
      {mode === 'ai' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <AIGeneratePanel
              blogs={blogs}
              onGenerated={posts => { setGeneratedPosts(posts); setActiveGenTab(0) }}
            />
          </div>

          {generatedPosts.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-gray-700">생성된 글</h2>
              <div className="flex gap-1 flex-wrap">
                {generatedPosts.map((p, i) => (
                  <button key={p.blogId} onClick={() => setActiveGenTab(i)}
                    className={`px-3 py-1.5 text-xs rounded-full border transition-all ${
                      activeGenTab === i ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:border-blue-300'
                    }`}>
                    {p.blogName}
                  </button>
                ))}
              </div>

              {generatedPosts[activeGenTab] && (() => {
                const post = generatedPosts[activeGenTab]
                return (
                  <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                    {post.success ? (
                      <>
                        <h3 className="font-semibold text-gray-900">{post.title}</h3>
                        <div className="text-sm text-gray-600 max-h-48 overflow-y-auto prose prose-sm"
                          dangerouslySetInnerHTML={{ __html: post.htmlContent ?? '' }} />
                        {post.tags && post.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {post.tags.map(t => (
                              <span key={t} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{t}</span>
                            ))}
                          </div>
                        )}
                        <Button size="sm" className="w-full" onClick={() => loadGeneratedPost(post)}>
                          이 글을 에디터에서 편집하기
                        </Button>
                      </>
                    ) : (
                      <p className="text-sm text-red-500">생성 실패: {post.error}</p>
                    )}
                  </div>
                )
              })()}
            </div>
          )}
        </div>
      )}

      {/* 직접 작성 모드 */}
      {mode === 'manual' && (
        <div className="space-y-4">
          {/* 제목 */}
          <Input value={title} onChange={e => setTitle(e.target.value)}
            placeholder="글 제목을 입력하세요"
            className="text-xl font-bold border-0 border-b border-gray-200 rounded-none px-0 focus-visible:ring-0 h-auto py-2" />

          {/* 블로그 선택 */}
          <div className="flex items-center gap-2">
            <Label className="text-sm text-gray-500 whitespace-nowrap">발행 블로그:</Label>
            <select value={selectedBlogId ?? ''}
              onChange={e => setSelectedBlogId(e.target.value || null)}
              className="text-sm border border-gray-200 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">블로그 선택</option>
              {blogs.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          {/* 목차 토글 */}
          <div className="flex items-center gap-2">
            <Switch checked={tocEnabled} onCheckedChange={setTocEnabled} />
            <Label className="text-sm text-gray-600">목차 자동 생성</Label>
          </div>

          {/* 목차 표시 */}
          {tocEnabled && tocHeadings.length > 0 && (
            <nav className="toc-container bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">목차</h4>
              <ul className="space-y-1">
                {tocHeadings.map((h, i) => (
                  <li key={i} className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer">
                    {h.text}
                  </li>
                ))}
              </ul>
            </nav>
          )}

          {/* TipTap 에디터 */}
          <PostEditor
            ref={editorRef}
            content={htmlContent}
            onChange={(html) => { setHtmlContent(html); triggerAutoSave(html) }}
            articleTitle={title}
          />

          {/* 태그 + AI 기타 설정 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">태그</Label>
              <Button size="sm" variant="outline" onClick={generateMeta} disabled={generatingMeta}
                className="h-7 text-xs gap-1">
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

          {/* SEO 설정 */}
          <SEOMetaForm
            seoTitle={seoMeta.title}
            seoDescription={seoMeta.description}
            onTitleChange={v => setSeoMeta({ ...seoMeta, title: v })}
            onDescChange={v => setSeoMeta({ ...seoMeta, description: v })}
          />
        </div>
      )}

      {/* 스니펫 드로어 */}
      <SnippetDrawer
        blogId={selectedBlogId}
        isOpen={snippetOpen}
        onClose={() => setSnippetOpen(false)}
        onInsert={(content) => {
          setHtmlContent(htmlContent + content)
        }}
      />

      {/* 임시저장 글 불러오기 드로어 */}
      <DraftDrawer
        isOpen={draftOpen}
        onClose={() => setDraftOpen(false)}
        onLoad={loadDraft}
      />
    </div>
  )
}
