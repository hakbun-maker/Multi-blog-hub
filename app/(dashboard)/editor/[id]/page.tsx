'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Send, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PostEditor } from '@/components/editor/PostEditor'
import { SEOMetaForm } from '@/components/editor/SEOMetaForm'
import { SnippetDrawer } from '@/components/editor/SnippetDrawer'

export default function EditorEditPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [post, setPost] = useState<{ id: string; title: string; content?: string; html_content?: string; blog_id: string; tags?: string[]; seo_meta?: { title?: string; description?: string } } | null>(null)
  const [blogs, setBlogs] = useState<{ id: string; name: string }[]>([])
  const [title, setTitle] = useState('')
  const [htmlContent, setHtmlContent] = useState('')
  const [selectedBlogId, setSelectedBlogId] = useState<string | null>(null)
  const [tags, setTags] = useState<string[]>([])
  const [seoMeta, setSeoMeta] = useState({ title: '', description: '' })
  const [snippetOpen, setSnippetOpen] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    Promise.all([
      fetch(`/api/posts/${params.id}`).then(r => r.json()),
      fetch('/api/blogs').then(r => r.json()),
    ]).then(([postData, blogsData]) => {
      const p = postData.data
      setPost(p)
      setTitle(p.title ?? '')
      setHtmlContent(p.html_content ?? '')
      setSelectedBlogId(p.blog_id ?? null)
      setTags(p.tags ?? [])
      setSeoMeta(p.seo_meta ?? { title: '', description: '' })
      setBlogs(blogsData.data ?? [])
    })
  }, [params.id])

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
        title, htmlContent: html ?? htmlContent, content: html ?? htmlContent,
        status: 'draft', tags, seoMeta,
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
        title, htmlContent, content: htmlContent,
        status: 'published', tags, seoMeta,
        publishedAt: new Date().toISOString(),
        blogId: selectedBlogId,
      }),
    })
    setPublishing(false)
    if (res.ok) router.push(selectedBlogId ? `/blogs/${selectedBlogId}` : '/dashboard')
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

      <div className="flex items-center gap-2">
        <Label className="text-sm text-gray-500 whitespace-nowrap">발행 블로그:</Label>
        <select value={selectedBlogId ?? ''}
          onChange={e => setSelectedBlogId(e.target.value || null)}
          className="text-sm border border-gray-200 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">블로그 선택</option>
          {blogs.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      <PostEditor
        content={htmlContent}
        onChange={(html) => { setHtmlContent(html); triggerAutoSave(html) }}
      />

      <div className="space-y-1.5">
        <Label className="text-sm">태그</Label>
        <Input placeholder="태그를 쉼표로 구분해서 입력"
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
