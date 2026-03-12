'use client'

import { useState, useEffect } from 'react'
import { X, Wand2, Loader2, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Blog {
  id: string
  name: string
  url?: string
  custom_domain?: string
}

interface Category {
  id: string
  name: string
}

interface Post {
  id: string
  title: string
  slug: string
  blogId?: string
  blogName?: string
  excerpt?: string
  postUrl?: string
  content_html?: string
}

interface BtnConfig {
  text: string
  href: string
  bgColor: string
  textColor: string
  round: string
}

const BG_PRESETS = [
  { name: '파랑', value: '#2563eb' },
  { name: '빨강', value: '#dc2626' },
  { name: '초록', value: '#16a34a' },
  { name: '주황', value: '#ea580c' },
  { name: '보라', value: '#7c3aed' },
  { name: '검정', value: '#1f2937' },
]

const ROUND_OPTIONS = [
  { label: '없음', value: '0' },
  { label: '약간', value: '4px' },
  { label: '보통', value: '8px' },
  { label: '둥글게', value: '16px' },
  { label: '최대', value: '9999px' },
]

interface RelatedPostPanelProps {
  isOpen: boolean
  onClose: () => void
  onInsert: (h2Text: string, html: string) => void
  articleContent?: string
  articleTitle?: string
  getHeadings?: () => { level: number; text: string }[]
}

export function RelatedPostPanel({
  isOpen, onClose, onInsert, articleContent, articleTitle, getHeadings,
}: RelatedPostPanelProps) {
  const [tab, setTab] = useState<'ai' | 'manual'>('ai')

  const [btnConfig, setBtnConfig] = useState<BtnConfig>({
    text: '',
    href: '',
    bgColor: '#2563eb',
    textColor: '#ffffff',
    round: '8px',
  })

  // AI tab
  const [selectedH2, setSelectedH2] = useState('')
  const [h2Options, setH2Options] = useState<string[]>([])
  const [aiLoading, setAiLoading] = useState(false)
  const [aiRecommendations, setAiRecommendations] = useState<Post[]>([])
  const [aiError, setAiError] = useState('')
  const [aiDone, setAiDone] = useState(false)

  // Manual tab
  const [blogs, setBlogs] = useState<Blog[]>([])
  const [selectedBlogId, setSelectedBlogId] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [posts, setPosts] = useState<Post[]>([])
  const [loadingPosts, setLoadingPosts] = useState(false)
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    if (getHeadings) {
      const headings = getHeadings().filter(h => h.level === 2).map(h => h.text)
      setH2Options(headings)
      if (headings.length > 0) setSelectedH2(prev => prev || headings[0])
    }
    fetch('/api/blogs').then(r => r.json()).then(d => setBlogs(d.data ?? []))
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selectedBlogId) { setCategories([]); setPosts([]); return }
    fetch(`/api/categories?blogId=${selectedBlogId}`)
      .then(r => r.json()).then(d => setCategories(d.data ?? []))
  }, [selectedBlogId])

  useEffect(() => {
    if (!selectedBlogId) return
    setLoadingPosts(true)
    const url = selectedCategoryId
      ? `/api/posts?blogId=${selectedBlogId}&categoryId=${selectedCategoryId}`
      : `/api/posts?blogId=${selectedBlogId}`
    fetch(url).then(r => r.json()).then(d => {
      const blog = blogs.find(b => b.id === selectedBlogId)
      const baseUrl = (blog?.url || blog?.custom_domain || '').replace(/\/$/, '')
      setPosts((d.data ?? []).map((p: { id: string; title: string; slug: string; blog_id: string; content_html?: string }) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        blogId: p.blog_id,
        content_html: p.content_html,
        postUrl: baseUrl ? `${baseUrl}/${p.slug}` : '',
      })))
    }).finally(() => setLoadingPosts(false))
  }, [selectedBlogId, selectedCategoryId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleAIRecommend = async () => {
    setAiLoading(true)
    setAiError('')
    setAiDone(false)
    try {
      const res = await fetch('/api/ai/recommend-related-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleTitle, articleContent, h2Text: selectedH2 }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'AI 추천 실패')
      setAiRecommendations(data.recommendations ?? [])
      setAiDone(true)
    } catch (e: unknown) {
      setAiError(e instanceof Error ? e.message : 'AI 추천에 실패했습니다.')
    } finally {
      setAiLoading(false)
    }
  }

  const selectPost = (post: Post, blogsList?: Blog[]) => {
    const blogList = blogsList || blogs
    const blog = blogList.find(b => b.id === post.blogId)
    const baseUrl = (blog?.url || blog?.custom_domain || '').replace(/\/$/, '')
    const postUrl = post.postUrl || (baseUrl ? `${baseUrl}/${post.slug}` : '')
    setBtnConfig(prev => ({
      ...prev,
      href: postUrl,
      text: post.title,
    }))
  }

  const handleInsert = () => {
    if (!btnConfig.text.trim()) return
    let href = btnConfig.href.trim()
    if (href && !/^https?:\/\//i.test(href)) href = `https://${href}`
    // ButtonInsertPanel과 동일한 data-button 포맷으로 생성 (TipTap이 style을 strip하지 않도록)
    const padding = '10px 24px'
    const fontSize = '14px'
    const dataAttrs = `data-button="true" data-bg-color="${btnConfig.bgColor}" data-text-color="${btnConfig.textColor}" data-padding="${padding}" data-border-radius="${btnConfig.round}" data-font-size="${fontSize}"`
    const style = `display:inline-block;background-color:${btnConfig.bgColor};color:${btnConfig.textColor};padding:${padding};border-radius:${btnConfig.round};text-decoration:none;font-weight:600;font-size:${fontSize};text-align:center;cursor:pointer;`
    const btnHtml = href
      ? `<a href="${href}" ${dataAttrs} style="${style}" target="_blank" rel="noopener noreferrer">${btnConfig.text}</a>`
      : `<span ${dataAttrs} style="${style}">${btnConfig.text}</span>`
    onInsert(selectedH2, `<div style="text-align:center;margin:1.5em 0;">${btnHtml}</div>`)
  }

  const getExcerpt = (post: Post) =>
    (post.content_html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 350)

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/10" onClick={onClose} />
      )}

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 h-full bg-white shadow-2xl border-l border-gray-200 z-50 flex flex-col transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ width: 'min(560px, 92vw)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-indigo-50 flex-shrink-0">
          <h3 className="text-sm font-semibold text-indigo-800 flex items-center gap-2">
            관련글 삽입
          </h3>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-4">
          {/* CTA 버튼 삽입 섹션 */}
          <div className="bg-blue-50/60 rounded-xl p-3 border border-blue-200 space-y-3">
            <h4 className="text-xs font-bold text-blue-700 uppercase tracking-wide">CTA 버튼 삽입</h4>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">버튼 텍스트</Label>
                <Input
                  value={btnConfig.text}
                  onChange={e => setBtnConfig(p => ({ ...p, text: e.target.value }))}
                  placeholder="버튼에 표시할 텍스트"
                  className="text-sm h-8"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">링크 URL</Label>
                <Input
                  value={btnConfig.href}
                  onChange={e => setBtnConfig(p => ({ ...p, href: e.target.value }))}
                  placeholder="https://... (글 선택 시 자동입력)"
                  className="text-sm h-8"
                />
              </div>
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              <div className="space-y-1">
                <Label className="text-xs">버튼 색상</Label>
                <div className="flex items-center gap-1">
                  {BG_PRESETS.map(c => (
                    <button
                      key={c.value}
                      onClick={() => setBtnConfig(p => ({ ...p, bgColor: c.value }))}
                      className={`w-5 h-5 rounded-full border-2 transition-all ${btnConfig.bgColor === c.value ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: c.value }}
                      title={c.name}
                    />
                  ))}
                  <div className="relative ml-0.5">
                    <input
                      type="color"
                      value={btnConfig.bgColor}
                      onChange={e => setBtnConfig(p => ({ ...p, bgColor: e.target.value }))}
                      className="absolute inset-0 w-5 h-5 opacity-0 cursor-pointer"
                    />
                    <div
                      className="w-5 h-5 rounded-full border-2 border-dashed border-gray-300 text-[9px] flex items-center justify-center"
                      title="직접 선택"
                    >+</div>
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">모서리</Label>
                <div className="flex gap-1">
                  {ROUND_OPTIONS.map(r => (
                    <button
                      key={r.value}
                      onClick={() => setBtnConfig(p => ({ ...p, round: r.value }))}
                      className={`px-1.5 py-0.5 text-xs rounded border transition-colors ${btnConfig.round === r.value ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 hover:bg-gray-100'}`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-blue-100">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">미리보기:</span>
                <span style={{
                  display: 'inline-block',
                  backgroundColor: btnConfig.bgColor,
                  color: btnConfig.textColor,
                  padding: '4px 14px',
                  borderRadius: btnConfig.round,
                  fontSize: '12px',
                  fontWeight: 600,
                }}>
                  {btnConfig.text || '버튼 텍스트'}
                </span>
              </div>
              <Button size="sm" onClick={handleInsert} disabled={!btnConfig.text.trim()} className="h-7 text-xs px-3">
                추가
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setTab('ai')}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === 'ai' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              AI 추천 주제 탐색
            </button>
            <button
              onClick={() => setTab('manual')}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === 'manual' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              직접 입력
            </button>
          </div>

          {/* AI Tab */}
          {tab === 'ai' && (
            <div className="space-y-3">
              {/* 삽입 위치 + AI 추천받기 */}
              <div className="flex items-end gap-2">
                {h2Options.length > 0 ? (
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">삽입 위치 (소주제)</Label>
                    <select
                      value={selectedH2}
                      onChange={e => setSelectedH2(e.target.value)}
                      className="w-full text-sm border border-gray-200 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    >
                      {h2Options.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                ) : (
                  <p className="flex-1 text-xs text-gray-400 py-2">H2 소제목이 없습니다. 글의 소제목(H2)을 먼저 작성해주세요.</p>
                )}
                <Button
                  size="sm"
                  onClick={handleAIRecommend}
                  disabled={aiLoading}
                  className="gap-1 flex-shrink-0 h-9"
                >
                  {aiLoading
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Wand2 className="w-3.5 h-3.5" />}
                  AI 추천받기
                </Button>
              </div>

              {aiError && <p className="text-xs text-red-500 bg-red-50 rounded p-2">{aiError}</p>}

              {aiLoading && (
                <div className="flex items-center justify-center py-10 text-sm text-gray-400 gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  AI가 관련 글을 분석 중입니다...
                </div>
              )}

              {!aiLoading && aiDone && aiRecommendations.length === 0 && (
                <div className="text-center py-8 text-sm text-gray-400">
                  <p>발행된 관련 글을 찾지 못했습니다.</p>
                  <p className="text-xs mt-1">직접 입력 탭에서 글을 선택해보세요.</p>
                </div>
              )}

              {!aiLoading && aiRecommendations.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 font-medium">{aiRecommendations.length}개의 관련 글이 추천되었습니다</p>
                  {aiRecommendations.map(post => (
                    <div key={post.id} className="rounded-lg border border-gray-200 p-3 space-y-2 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 line-clamp-2">{post.title}</p>
                          {post.blogName && <p className="text-xs text-gray-400 mt-0.5">{post.blogName}</p>}
                          {post.excerpt && <p className="text-xs text-gray-500 mt-1.5 leading-relaxed line-clamp-3">{post.excerpt}</p>}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => selectPost(post)}
                          className="flex-shrink-0 h-7 text-xs gap-1 hover:bg-indigo-50 hover:border-indigo-400"
                        >
                          선택
                        </Button>
                      </div>
                      {post.postUrl && (
                        <p className="text-xs text-blue-400 truncate flex items-center gap-1">
                          <ExternalLink className="w-3 h-3 flex-shrink-0" />
                          {post.postUrl}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {!aiLoading && !aiDone && (
                <div className="text-center py-10 text-sm text-gray-400 space-y-1">
                  <p>소주제를 선택하고 <strong>AI 추천받기</strong> 버튼을 눌러주세요.</p>
                  <p className="text-xs">발행된 글 중에서 관련 글을 자동으로 찾아드립니다.</p>
                </div>
              )}
            </div>
          )}

          {/* Manual Tab */}
          {tab === 'manual' && (
            <div className="space-y-3">
              {/* 삽입 위치 */}
              {h2Options.length > 0 && (
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-gray-500 whitespace-nowrap">삽입 위치:</Label>
                  <select
                    value={selectedH2}
                    onChange={e => setSelectedH2(e.target.value)}
                    className="flex-1 text-sm border border-gray-200 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  >
                    {h2Options.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">블로그 선택</Label>
                  <select
                    value={selectedBlogId}
                    onChange={e => { setSelectedBlogId(e.target.value); setSelectedCategoryId(''); setExpandedPostId(null) }}
                    className="w-full text-sm border border-gray-200 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  >
                    <option value="">블로그를 선택하세요</option>
                    {blogs.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">카테고리</Label>
                  <select
                    value={selectedCategoryId}
                    onChange={e => { setSelectedCategoryId(e.target.value); setExpandedPostId(null) }}
                    disabled={!selectedBlogId}
                    className="w-full text-sm border border-gray-200 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">전체</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              {!selectedBlogId && (
                <div className="text-center py-10 text-sm text-gray-400">
                  <p>블로그를 선택하면 글 목록이 표시됩니다.</p>
                </div>
              )}

              {loadingPosts && (
                <div className="flex items-center justify-center py-8 text-sm text-gray-400 gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />글 목록 불러오는 중...
                </div>
              )}

              {!loadingPosts && selectedBlogId && posts.length === 0 && (
                <div className="text-center py-8 text-sm text-gray-400">
                  <p>이 블로그에 글이 없습니다.</p>
                </div>
              )}

              {!loadingPosts && posts.length > 0 && (
                <div className="space-y-1.5">
                  {posts.map(post => (
                    <div key={post.id} className="border border-gray-200 rounded-lg overflow-hidden">
                      {/* Row header */}
                      <div
                        className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors select-none"
                        onClick={() => setExpandedPostId(prev => prev === post.id ? null : post.id)}
                      >
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          {expandedPostId === post.id
                            ? <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                            : <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />}
                          <span className="text-sm text-gray-800 truncate">{post.title}</span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={e => { e.stopPropagation(); selectPost(post) }}
                          className="ml-2 flex-shrink-0 h-6 text-xs hover:bg-indigo-50 hover:border-indigo-400"
                        >
                          선택
                        </Button>
                      </div>

                      {/* Accordion body */}
                      {expandedPostId === post.id && (
                        <div className="px-3 pb-3 pt-2 bg-gray-50 border-t border-gray-100">
                          <p className="text-xs text-gray-600 leading-relaxed line-clamp-6">
                            {getExcerpt(post) || '내용 미리보기가 없습니다.'}
                          </p>
                          {post.postUrl && (
                            <p className="text-xs text-blue-400 mt-2 truncate flex items-center gap-1">
                              <ExternalLink className="w-3 h-3 flex-shrink-0" />
                              {post.postUrl}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
