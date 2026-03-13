'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Send, BookOpen, Wand2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PostEditor } from '@/components/editor/PostEditor'
import { SEOMetaForm } from '@/components/editor/SEOMetaForm'
import { SnippetDrawer } from '@/components/editor/SnippetDrawer'

export default function EditorEditPage({ params }: { params: { id: string } }) {
  const router = useRouter()
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
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
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
  }, [params.id])

  // 블로그 변경 시 카테고리 fetch
  useEffect(() => {
    if (!selectedBlogId) { setCategories([]); return }
    fetch(`/api/categories?blogId=${selectedBlogId}`).then(r => r.json()).then(d => {
      setCategories(d.data ?? [])
    })
  }, [selectedBlogId])

  const triggerAutoSave = (html: string) => {
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
    if (res.ok) router.push(selectedBlogId ? `/blogs/${selectedBlogId}` : '/dashboard')
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">글 편집</h1>
        <div className="flex items-center gap-2">
          {saveStatus === 'saving' && <span className="text-xs text-gray-400">저장 중...</span>}
          {saveStatus === 'saved' && <span className="text-xs text-green-500">✓ 저장됨</span>}
          <Button size="sm" variant="outline" onClick={() => setSnippetOpen(true)}>
            <BookOpen className="w-4 h-4 mr-1.5" />스니펫
          </Button>
          <Button size="sm" variant="outline" onClick={() => saveDraft()}>임시저장</Button>
          <Button size="sm" onClick={handlePublish} disabled={publishing}>
            <Send className="w-4 h-4 mr-1.5" />{publishing ? '발행 중...' : '발행'}
          </Button>
        </div>
      </div>

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

      <PostEditor
        content={htmlContent}
        onChange={(html) => { setHtmlContent(html); triggerAutoSave(html) }}
      />

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

      <SnippetDrawer blogId={selectedBlogId} isOpen={snippetOpen}
        onClose={() => setSnippetOpen(false)}
        onInsert={(content) => setHtmlContent(htmlContent + content)} />
    </div>
  )
}
