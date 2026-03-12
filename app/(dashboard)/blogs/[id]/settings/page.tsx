'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Trash2, Pencil, X } from 'lucide-react'
import { useCategories } from '@/hooks/useCategories'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'

type SettingsTab = 'basic' | 'categories' | 'ai' | 'ads' | 'crosslink'

const TABS: { id: SettingsTab; label: string }[] = [
  { id: 'basic', label: '기본정보' },
  { id: 'categories', label: '카테고리' },
  { id: 'ai', label: 'AI 캐릭터' },
  { id: 'ads', label: '광고' },
  { id: 'crosslink', label: '크로스링킹' },
]

const COLORS = [
  '#3b82f6','#8b5cf6','#10b981','#f59e0b',
  '#ef4444','#06b6d4','#84cc16','#f97316',
]

const FIELD_GUIDES = {
  tone: {
    label: '글쓰기 톤',
    description: 'AI가 글을 쓸 때 전반적으로 유지할 감정적 분위기와 어조를 서술해주세요.',
    placeholder: `예시:
따뜻하고 친근한 톤을 유지합니다. 독자가 친한 언니/오빠에게 이야기를 듣는 것처럼 편안하게 느끼도록 합니다. 너무 격식을 차리지 않되, 가볍고 유쾌한 분위기를 기본으로 깔아주세요. 때로는 공감하는 표현("다들 이런 경험 있으시죠?")을 섞어 독자와의 거리를 좁힙니다.

다른 예시:
- 전문적이고 신뢰감 있는 톤. 데이터와 근거를 들며, 독자가 "이 사람 진짜 아는구나" 싶은 느낌.
- 유머러스하고 위트 있는 톤. 비유와 드립을 적절히 사용하되, 억지스럽지 않게.`,
  },
  style: {
    label: '글쓰기 스타일',
    description: '글의 구조, 전개 방식, 표현 기법 등 "어떻게 쓸 것인가"를 구체적으로 서술해주세요.',
    placeholder: `예시:
도입부에서 독자의 공감을 끌어내는 질문이나 상황 묘사로 시작합니다. 본문은 소제목(##)으로 나누어 스캔하기 쉽게 구성합니다. 각 섹션은 핵심 포인트 → 구체적 설명 → 실제 사례 순으로 전개합니다. 마무리는 독자에게 행동을 유도하는 한 줄 요약으로 끝냅니다.

다른 예시:
- 스토리텔링형: "지난주에 이런 일이 있었어요" 식의 경험담 중심 전개.
- 리스트형: 번호를 매겨 깔끔하게 정리. "TOP 7", "꼭 알아야 할 5가지" 같은 포맷.
- 비교분석형: A vs B 구조로 장단점을 표로 정리하며 결론 제시.`,
  },
  persona: {
    label: '페르소나 설명',
    description: 'AI가 어떤 인물로서 글을 쓸지 — 배경, 전문성, 성격, 경험 등을 구체적으로 묘사해주세요.',
    placeholder: `예시:
"나나"는 10년차 여행 블로거입니다. 30개국 이상을 방문했으며, 특히 동남아 저예산 배낭여행에 전문성이 있습니다. MBTI는 ENFP로 사람 만나는 것을 좋아하고, 현지인 맛집을 찾아다니는 것이 취미입니다. 여행지에서의 실패담도 솔직하게 공유하는 것이 특징이며, "직접 가봤으니까 말하는 건데..."라는 식의 경험 기반 서술을 선호합니다.

다른 예시:
- IT 개발자 출신 테크 리뷰어. 스펙보다 실사용 경험 중심. "3개월 써보고 내린 결론"
- 육아 3년차 워킹맘. 현실적인 팁 위주. 광고성 리뷰 싫어하는 솔직한 성격.`,
  },
  writingFormat: {
    label: '글쓰기 포맷',
    description: '글의 뼈대(구조)를 어떤 형식으로 잡을지 구체적으로 서술해주세요.',
    placeholder: `예시:
[도입] 독자의 관심을 끄는 질문 또는 상황 묘사 (2~3줄)
[본문] 소제목(##) 3~5개로 구분
  - 각 소제목 아래 핵심 요약 한 줄 → 상세 설명 → 실제 사례/팁
  - 중요한 정보는 **볼드**나 > 인용블록으로 강조
  - 비교가 필요하면 표(| A | B |) 활용
[이미지] 본문 중간에 자연스럽게 배치 (소제목 사이)
[마무리] 핵심 내용 3줄 요약 + 독자 행동 유도 ("댓글로 알려주세요!")
[SEO] 키워드를 제목, 첫 문단, 소제목에 자연스럽게 포함`,
  },
  speechExamples: {
    label: '말투 예시',
    description: '실제로 AI가 사용할 문장 패턴과 표현의 구체적인 예시를 적어주세요. AI가 이 말투를 참고해서 글을 씁니다.',
    placeholder: `예시:
✅ 사용할 표현:
- "솔직히 말하면, 이건 진짜 대박이에요."
- "제가 직접 써봤는데요, 결론부터 말씀드리면..."
- "이거 모르면 손해예요, 진심으로."
- "다들 이런 경험 있으시죠? 저도 처음엔 그랬어요."
- "한 줄 요약: ~입니다. 끝!"

❌ 피할 표현:
- "~하는 것이 좋을 것으로 사료됩니다" (너무 딱딱함)
- "독자 여러분께서는~" (너무 격식체)
- "무조건 이걸 사세요!" (과장 광고 느낌)

문장 길이: 한 문장은 40자 이내로 짧게. 긴 설명이 필요하면 문장을 나눠주세요.
이모지: 소제목에 1개씩만. 본문에서는 자제.`,
  },
} as const

export default function BlogSettingsPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<SettingsTab>('basic')
  const [blog, setBlog] = useState<{ id: string; name: string; color?: string; description?: string; url?: string; custom_domain?: string; is_active?: boolean; ai_provider?: string; character_name?: string; character_tone?: string; character_style?: string; persona?: string; linked_blog_ids?: string[]; ai_character_config?: Record<string, unknown> } | null>(null)
  const [allBlogs, setAllBlogs] = useState<{ id: string; name: string; color?: string; subdomain?: string; custom_domain?: string; slug?: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')

  // 기본정보 폼
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [blogUrl, setBlogUrl] = useState('')
  const [customDomain, setCustomDomain] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [isActive, setIsActive] = useState(true)

  // AI 캐릭터 폼
  const [aiProvider, setAiProvider] = useState('claude')
  const [characterName, setCharacterName] = useState('')
  const [tone, setTone] = useState('')
  const [style, setStyle] = useState('')
  const [persona, setPersona] = useState('')
  const [writingFormat, setWritingFormat] = useState('')
  const [speechExamples, setSpeechExamples] = useState('')

  // 카테고리
  const { categories, fetchCategories, createCategory, updateCategory, deleteCategory } = useCategories(params.id)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [editingCatId, setEditingCatId] = useState<string | null>(null)
  const [editingCatName, setEditingCatName] = useState('')
  const [defaultCategoryId, setDefaultCategoryId] = useState<string | null>(null)
  const [deletingCatId, setDeletingCatId] = useState<string | null>(null)
  const [moveToCatId, setMoveToCatId] = useState<string>('none')

  // 크로스링킹
  const [linkedBlogIds, setLinkedBlogIds] = useState<string[]>([])

  useEffect(() => { fetchCategories() }, [fetchCategories])

  useEffect(() => {
    const fetchData = async () => {
      const [blogRes, blogsRes] = await Promise.all([
        fetch(`/api/blogs/${params.id}`),
        fetch('/api/blogs'),
      ])
      if (!blogRes.ok) { router.push('/blogs'); return }

      const { data: blogData } = await blogRes.json()
      const { data: blogsData } = await blogsRes.json()

      setBlog(blogData)
      setAllBlogs((blogsData ?? []).filter((b: { id: string; name: string; color?: string; subdomain?: string; custom_domain?: string; slug?: string }) => b.id !== params.id))

      // 폼 초기화
      setName(blogData.name ?? '')
      setDescription(blogData.description ?? '')
      setBlogUrl(blogData.url ?? '')
      setCustomDomain(blogData.custom_domain ?? '')
      setColor(blogData.color ?? COLORS[0])
      setIsActive(blogData.is_active ?? true)
      setAiProvider(blogData.ai_provider ?? 'claude')

      const aiConfig = blogData.ai_character_config ?? {}
      setCharacterName(aiConfig.name ?? '')
      setTone(aiConfig.tone ?? '')
      setStyle(aiConfig.style ?? '')
      setPersona(aiConfig.persona ?? '')
      setWritingFormat(aiConfig.writingFormat ?? '')
      setSpeechExamples(aiConfig.speechExamples ?? '')
      setLinkedBlogIds(aiConfig.linkedBlogIds ?? [])
      setDefaultCategoryId(blogData.default_category_id ?? null)

      setLoading(false)
    }
    fetchData()
  }, [params.id, router])

  const showSuccess = (msg: string) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(''), 3000)
  }

  const handleSaveBasic = async () => {
    setSaving(true)
    const res = await fetch(`/api/blogs/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, url: blogUrl || null, customDomain: customDomain || null, color, isActive }),
    })
    setSaving(false)
    if (res.ok) showSuccess('기본정보가 저장되었습니다.')
  }

  const handleSaveAI = async () => {
    setSaving(true)
    const res = await fetch(`/api/blogs/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        aiProvider,
        aiCharacterConfig: { name: characterName, tone, style, persona, writingFormat, speechExamples },
      }),
    })
    setSaving(false)
    if (res.ok) showSuccess('AI 캐릭터 설정이 저장되었습니다.')
  }

  const handleSaveCrossLink = async () => {
    setSaving(true)
    const aiConfig = blog?.ai_character_config ?? {}
    const res = await fetch(`/api/blogs/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aiCharacterConfig: { ...aiConfig, linkedBlogIds } }),
    })
    setSaving(false)
    if (res.ok) showSuccess('크로스링킹 설정이 저장되었습니다.')
  }

  const handleDeleteBlog = async () => {
    if (!confirm(`"${blog?.name}" 블로그를 삭제하시겠습니까?\n모든 글과 데이터가 삭제됩니다.`)) return
    const res = await fetch(`/api/blogs/${params.id}`, { method: 'DELETE' })
    if (res.ok) router.push('/blogs')
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="h-64 bg-gray-100 rounded" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Link href={`/blogs/${params.id}`}><ArrowLeft className="w-4 h-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">블로그 설정</h1>
            <p className="text-sm text-gray-500">{blog?.name}</p>
          </div>
        </div>
      </div>

      {/* 성공 토스트 */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-2.5 rounded-lg">
          ✓ {success}
        </div>
      )}

      {/* SettingsTabNav */}
      <div className="border-b border-gray-200">
        <div className="flex gap-0">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === t.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* BasicInfoTab */}
      {activeTab === 'basic' && (
        <div className="space-y-5">
          <div className="space-y-1.5">
            <Label>블로그 이름 *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>설명</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="블로그 설명" />
          </div>
          <div className="space-y-1.5">
            <Label>블로그 URL</Label>
            <Input value={blogUrl} onChange={e => setBlogUrl(e.target.value)}
              placeholder="https://moneymakingwisdom.tistory.com" />
            <p className="text-xs text-gray-400">실제 블로그 주소를 입력하세요. 블로그 보기 버튼에 사용됩니다.</p>
          </div>
          <div className="space-y-1.5">
            <Label>커스텀 도메인</Label>
            <Input value={customDomain} onChange={e => setCustomDomain(e.target.value)}
              placeholder="example.com" />
            <p className="text-xs text-gray-400">DNS A레코드를 76.76.21.21에 연결하세요.</p>
          </div>
          <div className="space-y-2">
            <Label>블로그 색상</Label>
            <div className="flex gap-2">
              {COLORS.map(c => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Label>활성화</Label>
            <button onClick={() => setIsActive(!isActive)}
              className={`relative w-10 h-6 rounded-full transition-colors ${isActive ? 'bg-blue-600' : 'bg-gray-200'}`}>
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${isActive ? 'left-5' : 'left-1'}`} />
            </button>
            <span className="text-sm text-gray-500">{isActive ? '활성' : '비활성'}</span>
          </div>
          <div className="flex justify-between pt-2">
            <Button onClick={handleSaveBasic} disabled={saving || !name.trim()}>
              <Save className="w-4 h-4 mr-1.5" />{saving ? '저장 중...' : '저장'}
            </Button>
            <Button variant="outline" className="text-red-500 border-red-200 hover:bg-red-50"
              onClick={handleDeleteBlog}>
              <Trash2 className="w-4 h-4 mr-1.5" />블로그 삭제
            </Button>
          </div>
        </div>
      )}

      {/* CategoriesTab */}
      {activeTab === 'categories' && (
        <div className="space-y-6">
          {/* 기본 카테고리 설정 */}
          <div className="space-y-2">
            <Label>기본 카테고리</Label>
            <p className="text-xs text-gray-400">새 글 작성 시 자동으로 선택되는 카테고리입니다.</p>
            <select
              value={defaultCategoryId ?? ''}
              onChange={async (e) => {
                const val = e.target.value || null
                setDefaultCategoryId(val)
                await fetch(`/api/blogs/${params.id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ defaultCategoryId: val }),
                })
                showSuccess('기본 카테고리가 변경되었습니다.')
              }}
              className="text-sm border border-gray-200 rounded-md px-3 py-2 bg-white w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">없음</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* 카테고리 추가 */}
          <div className="space-y-2">
            <Label>카테고리 추가</Label>
            <div className="flex gap-2">
              <Input
                value={newCategoryName}
                onChange={e => setNewCategoryName(e.target.value)}
                placeholder="새 카테고리 이름"
                className="max-w-xs"
                onKeyDown={async (e) => {
                  if (e.key === 'Enter' && newCategoryName.trim()) {
                    await createCategory(newCategoryName.trim())
                    setNewCategoryName('')
                    showSuccess('카테고리가 추가되었습니다.')
                  }
                }}
              />
              <Button
                size="sm"
                disabled={!newCategoryName.trim()}
                onClick={async () => {
                  await createCategory(newCategoryName.trim())
                  setNewCategoryName('')
                  showSuccess('카테고리가 추가되었습니다.')
                }}
              >
                추가
              </Button>
            </div>
          </div>

          {/* 카테고리 목록 */}
          <div className="space-y-2">
            <Label>카테고리 목록</Label>
            {categories.length === 0 ? (
              <p className="text-sm text-gray-400">등록된 카테고리가 없습니다.</p>
            ) : (
              <div className="space-y-1">
                {categories.map(cat => (
                  <div key={cat.id}>
                    <div className="flex items-center gap-2 p-2.5 rounded-lg border border-gray-200 hover:bg-gray-50">
                      {editingCatId === cat.id ? (
                        <>
                          <Input
                            value={editingCatName}
                            onChange={e => setEditingCatName(e.target.value)}
                            className="flex-1 h-8 text-sm"
                            autoFocus
                            onKeyDown={async (e) => {
                              if (e.key === 'Enter' && editingCatName.trim()) {
                                await updateCategory(cat.id, { name: editingCatName.trim() })
                                setEditingCatId(null)
                                showSuccess('카테고리 이름이 변경되었습니다.')
                              }
                              if (e.key === 'Escape') setEditingCatId(null)
                            }}
                          />
                          <Button size="sm" variant="ghost" className="h-7" onClick={() => setEditingCatId(null)}>
                            <X className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="sm" className="h-7" onClick={async () => {
                            if (!editingCatName.trim()) return
                            await updateCategory(cat.id, { name: editingCatName.trim() })
                            setEditingCatId(null)
                            showSuccess('카테고리 이름이 변경되었습니다.')
                          }}>
                            저장
                          </Button>
                        </>
                      ) : (
                        <>
                          <span className="flex-1 text-sm text-gray-800">{cat.name}</span>
                          {defaultCategoryId === cat.id && (
                            <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">기본</span>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={() => { setEditingCatId(cat.id); setEditingCatName(cat.name) }}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-red-400 hover:text-red-600"
                            onClick={async () => {
                              const result = await deleteCategory(cat.id)
                              if (result.ok) {
                                showSuccess('카테고리가 삭제되었습니다.')
                                if (defaultCategoryId === cat.id) setDefaultCategoryId(null)
                              } else if (result.postCount) {
                                setDeletingCatId(cat.id)
                                setMoveToCatId('none')
                              } else {
                                alert(result.error ?? '삭제에 실패했습니다.')
                              }
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                    {/* 글 이동 다이얼로그 */}
                    {deletingCatId === cat.id && (
                      <div className="ml-4 mt-1 p-3 bg-yellow-50 border border-yellow-200 rounded-lg space-y-2">
                        <p className="text-sm text-yellow-800">
                          이 카테고리에 글이 있습니다. 글을 이동할 곳을 선택하세요.
                        </p>
                        <select
                          value={moveToCatId}
                          onChange={e => setMoveToCatId(e.target.value)}
                          className="text-sm border border-yellow-300 rounded-md px-2 py-1.5 bg-white w-full"
                        >
                          <option value="none">미분류</option>
                          {categories.filter(c => c.id !== cat.id).map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDeletingCatId(null)}
                          >
                            취소
                          </Button>
                          <Button
                            size="sm"
                            className="bg-red-500 hover:bg-red-600 text-white"
                            onClick={async () => {
                              const result = await deleteCategory(cat.id, moveToCatId)
                              if (result.ok) {
                                setDeletingCatId(null)
                                showSuccess('카테고리가 삭제되고 글이 이동되었습니다.')
                                if (defaultCategoryId === cat.id) setDefaultCategoryId(null)
                              }
                            }}
                          >
                            글 이동 후 삭제
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* AICharacterTab */}
      {activeTab === 'ai' && (
        <div className="space-y-6">
          {/* AI 공급자 */}
          <div className="space-y-2">
            <Label>AI 공급자</Label>
            <div className="flex gap-2">
              {['claude', 'openai', 'gemini'].map(p => (
                <button key={p} type="button" onClick={() => setAiProvider(p)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                    aiProvider === p ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400'
                  }`}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* 캐릭터 이름 */}
          <div className="space-y-1.5">
            <Label>캐릭터 이름</Label>
            <Input value={characterName} onChange={e => setCharacterName(e.target.value)}
              placeholder="예: 여행 전문가 나나, IT 리뷰어 민수" />
            <p className="text-xs text-gray-400">AI가 이 이름으로 자칭하며 글을 씁니다.</p>
          </div>

          {/* 서술형 필드들 */}
          {([
            { key: 'tone', value: tone, setter: setTone },
            { key: 'style', value: style, setter: setStyle },
            { key: 'persona', value: persona, setter: setPersona },
            { key: 'writingFormat', value: writingFormat, setter: setWritingFormat },
            { key: 'speechExamples', value: speechExamples, setter: setSpeechExamples },
          ] as const).map(({ key, value, setter }) => {
            const guide = FIELD_GUIDES[key]
            return (
              <div key={key} className="space-y-1.5">
                <Label>{guide.label}</Label>
                <p className="text-xs text-gray-500">{guide.description}</p>
                <textarea
                  value={value}
                  onChange={e => setter(e.target.value)}
                  rows={6}
                  placeholder={guide.placeholder}
                  className="w-full text-sm border border-gray-200 rounded-md px-3 py-2.5 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
                />
                {value.trim() && (
                  <p className="text-xs text-green-600">
                    {value.trim().length}자 작성됨
                  </p>
                )}
              </div>
            )
          })}

          <Button onClick={handleSaveAI} disabled={saving} className="w-full sm:w-auto">
            <Save className="w-4 h-4 mr-1.5" />{saving ? '저장 중...' : 'AI 설정 저장'}
          </Button>
        </div>
      )}

      {/* AdsTab */}
      {activeTab === 'ads' && (
        <Card className="shadow-none border border-gray-200">
          <CardContent className="p-6 text-center text-gray-400">
            <p className="font-medium text-gray-600 mb-1">광고 관리</p>
            <p className="text-sm">P4-S3 광고 관리 화면 구현 후 연동됩니다.</p>
            <p className="text-xs mt-2">AdSense 코드 및 위치별 광고 단위 설정이 가능해집니다.</p>
          </CardContent>
        </Card>
      )}

      {/* CrossLinkTab */}
      {activeTab === 'crosslink' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            선택한 블로그의 글에 이 블로그 링크를 자동으로 삽입합니다.
          </p>
          {!allBlogs.length ? (
            <Card className="shadow-none border border-gray-200">
              <CardContent className="p-6 text-center text-gray-400">
                <p className="text-sm">연결할 다른 블로그가 없습니다.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {allBlogs.map(b => (
                <label key={b.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={linkedBlogIds.includes(b.id)}
                    onChange={e => {
                      if (e.target.checked) setLinkedBlogIds(prev => [...prev, b.id])
                      else setLinkedBlogIds(prev => prev.filter(id => id !== b.id))
                    }}
                    className="w-4 h-4 text-blue-600" />
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: b.color ?? COLORS[0] }} />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{b.name}</p>
                    <p className="text-xs text-gray-400">{b.subdomain ?? b.custom_domain ?? b.slug}</p>
                  </div>
                </label>
              ))}
            </div>
          )}
          <Button onClick={handleSaveCrossLink} disabled={saving}>
            <Save className="w-4 h-4 mr-1.5" />{saving ? '저장 중...' : '크로스링킹 저장'}
          </Button>
        </div>
      )}
    </div>
  )
}
