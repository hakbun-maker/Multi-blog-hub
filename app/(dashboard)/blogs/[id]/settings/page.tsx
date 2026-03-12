'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Trash2, Pencil, X, Sparkles, RotateCw, Loader2, Info, ChevronDown, ChevronUp } from 'lucide-react'
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

const BLOG_TYPES = [
  { value: 'legal', label: '법률' },
  { value: 'finance', label: '금융/재테크' },
  { value: 'medical', label: '의료/건강' },
  { value: 'it-tech', label: 'IT/테크' },
  { value: 'education', label: '교육' },
  { value: 'beauty-fashion', label: '뷰티/패션' },
  { value: 'food', label: '음식/요리' },
  { value: 'travel', label: '여행' },
  { value: 'parenting', label: '육아/가족' },
  { value: 'lifestyle', label: '라이프스타일' },
  { value: 'real-estate', label: '부동산' },
  { value: 'business', label: '비즈니스/마케팅' },
  { value: 'entertainment', label: '엔터테인먼트' },
  { value: 'sports', label: '스포츠/피트니스' },
  { value: 'pets', label: '반려동물' },
  { value: 'automotive', label: '자동차' },
  { value: 'interior', label: '인테리어/홈' },
  { value: 'news', label: '뉴스/시사' },
  { value: 'science', label: '과학/기술' },
  { value: 'other', label: '기타' },
]

// ─── AI 캐릭터 필드 정의 ───

interface CharacterField {
  key: string
  label: string
  description: string
  placeholder: string
  type: 'input' | 'textarea' | 'select'
  options?: string[]
}

interface CharacterCategory {
  title: string
  fields: CharacterField[]
}

const CHARACTER_CATEGORIES: CharacterCategory[] = [
  {
    title: '페르소나 (기본 정체성)',
    fields: [
      { key: 'nickname', label: '닉네임', description: '블로그 필자 이름', placeholder: '"테크민수", "소소한하루", "여행하는 나나"', type: 'input' },
      { key: 'ageRange', label: '나이대', description: '문체와 감성에 영향', placeholder: '"20대 후반", "30대 중반", "40대 초반"', type: 'input' },
      { key: 'expertise', label: '직업/전문분야', description: '글의 관점을 결정', placeholder: '"IT 개발자", "육아맘", "요리사", "금융 컨설턴트"', type: 'input' },
      { key: 'personalityKeywords', label: '성격 키워드', description: '3~5개 핵심 성격', placeholder: '"꼼꼼한, 유머러스한, 솔직한, 다정한"', type: 'input' },
      { key: 'blogPurpose', label: '블로그 운영 목적', description: '글의 방향성 결정', placeholder: '"정보 공유", "일상 기록", "수익화", "전문 지식 전달"', type: 'input' },
    ],
  },
  {
    title: '말투 & 톤 (차별화 요소)',
    fields: [
      { key: 'honorificStyle', label: '존칭 스타일', description: '문체의 기본 틀', placeholder: '~해요체', type: 'select', options: ['~해요체', '~합니다체', '반말(~임,~거든)', '~다체'] },
      { key: 'sentenceLength', label: '문장 길이 경향', description: '호흡감 차이', placeholder: '중간', type: 'select', options: ['짧고 끊어쓰기', '중간', '길고 흐르는 문체'] },
      { key: 'emotionLevel', label: '감정 표현 수준', description: '글의 온도감', placeholder: '보통', type: 'select', options: ['절제형', '보통', '풍부형'] },
      { key: 'humorStyle', label: '유머 스타일', description: '재미 요소 차별화', placeholder: '없음', type: 'select', options: ['없음', '드라이', '자기비하', '말장난'] },
      { key: 'habitExpressions', label: '습관 표현', description: '캐릭터 고유 버릇 2~3가지', placeholder: '"솔직히~", "근데 이게 진짜~", "~인 거 아시죠?"', type: 'textarea' },
      { key: 'emojiUsage', label: '이모지 사용', description: '시각적 차이', placeholder: '가끔(1~2개)', type: 'select', options: ['안 씀', '가끔(1~2개)', '자주(문단마다)'] },
    ],
  },
  {
    title: '글 구조 & 포맷',
    fields: [
      { key: 'introPattern', label: '도입부 패턴', description: '첫인상 차별화', placeholder: '질문형', type: 'select', options: ['질문형', '일화/경험형', '바로 본론형', '공감 유도형'] },
      { key: 'subtitleStyle', label: '소제목 스타일', description: '글의 시각적 구조', placeholder: '키워드형', type: 'select', options: ['번호형', '키워드형', '질문형', '안 씀'] },
      { key: 'closingPattern', label: '마무리 패턴', description: '글의 끝맺음 차이', placeholder: '요약 정리형', type: 'select', options: ['요약 정리형', '개인 감상형', '질문/소통 유도형', '한줄 마무리'] },
      { key: 'postLengthRange', label: '글 길이 범위', description: '분량 차이', placeholder: '보통(1500~2500자)', type: 'select', options: ['짧음(800~1200자)', '보통(1500~2500자)', '긴글(3000자+)'] },
    ],
  },
  {
    title: '콘텐츠 관점',
    fields: [
      { key: 'approachAngle', label: '접근 앵글', description: '같은 키워드를 다르게 해석', placeholder: '실용 정보', type: 'select', options: ['실용 정보', '개인 체험기', '비교 분석', '감성 에세이'] },
      { key: 'expertiseDepth', label: '전문성 깊이', description: '설명 수준 차이', placeholder: '중급', type: 'select', options: ['초보 눈높이', '중급', '전문가'] },
      { key: 'personalExpRatio', label: '개인 경험 비율', description: '체험담 삽입 정도', placeholder: '보통(20~30%)', type: 'select', options: ['높음(50%+)', '보통(20~30%)', '낮음(거의 없음)'] },
      { key: 'evidenceStyle', label: '근거 제시 방식', description: '신뢰감 구축 스타일', placeholder: '직접 체험형', type: 'select', options: ['직접 체험형', '전문가 인용형', '다수 의견형'] },
    ],
  },
  {
    title: '핵심 차별점',
    fields: [
      { key: 'diffKeywords', label: '핵심 차별 키워드 3개', description: '이 캐릭터를 다른 캐릭터와 구별짓는 가장 중요한 특성 3가지', placeholder: '"솔직한 체험 리뷰, 데이터 기반 분석, 유머러스한 비유"', type: 'textarea' },
      { key: 'forbiddenExpressions', label: '절대 금지 표현', description: '다른 캐릭터와 겹치지 않도록 쓰지 말아야 할 표현/패턴', placeholder: '"~하는 것이 좋을 것으로 사료됩니다", "독자 여러분께서는~"', type: 'textarea' },
    ],
  },
]

const ALL_FIELD_KEYS = CHARACTER_CATEGORIES.flatMap(c => c.fields.map(f => f.key))

// ─── 도메인 설정 서브 컴포넌트 ───

function DomainSettingSection({ customDomain, setCustomDomain }: { customDomain: string; setCustomDomain: (v: string) => void }) {
  const [showGuide, setShowGuide] = useState(false)

  return (
    <div className="space-y-2">
      <Label>내 도메인 연결</Label>
      <Input value={customDomain} onChange={e => setCustomDomain(e.target.value)}
        placeholder="myblog.com 또는 blog.mydomain.com" />
      <p className="text-xs text-gray-500">
        가비아, 카페24, GoDaddy 등에서 구매한 도메인을 입력하면 이 블로그의 주소로 사용됩니다.
        도메인이 없으면 비워두세요.
      </p>

      <button
        type="button"
        onClick={() => setShowGuide(!showGuide)}
        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
      >
        <Info className="w-3.5 h-3.5" />
        도메인 연결 방법 (DNS 설정 가이드)
        {showGuide ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {showGuide && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4 text-xs text-gray-700">
          <p className="font-semibold text-sm text-gray-900">도메인을 구매한 사이트에서 DNS 설정이 필요합니다</p>

          <div className="space-y-2">
            <p className="font-medium text-gray-800">myblog.com 같은 루트 도메인을 연결할 때</p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse bg-white rounded">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 px-3 py-1.5 text-left font-medium">타입</th>
                    <th className="border border-gray-200 px-3 py-1.5 text-left font-medium">이름(호스트)</th>
                    <th className="border border-gray-200 px-3 py-1.5 text-left font-medium">값(위치/대상)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-200 px-3 py-1.5 font-mono">A</td>
                    <td className="border border-gray-200 px-3 py-1.5 font-mono">@</td>
                    <td className="border border-gray-200 px-3 py-1.5 font-mono">76.76.21.21</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-gray-500">@ 는 &quot;도메인 자체&quot;를 의미합니다.</p>
          </div>

          <div className="space-y-2">
            <p className="font-medium text-gray-800">blog.mydomain.com 같은 서브도메인을 연결할 때</p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse bg-white rounded">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 px-3 py-1.5 text-left font-medium">타입</th>
                    <th className="border border-gray-200 px-3 py-1.5 text-left font-medium">이름(호스트)</th>
                    <th className="border border-gray-200 px-3 py-1.5 text-left font-medium">값(위치/대상)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-200 px-3 py-1.5 font-mono">CNAME</td>
                    <td className="border border-gray-200 px-3 py-1.5 font-mono">blog</td>
                    <td className="border border-gray-200 px-3 py-1.5 font-mono">cname.vercel-dns.com</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-gray-500">&quot;blog&quot; 자리에 원하는 이름(www, news 등)을 넣습니다.</p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded p-3 space-y-1">
            <p className="font-medium text-amber-800">참고사항</p>
            <ul className="list-disc list-inside text-amber-700 space-y-0.5">
              <li>DNS 설정 후 적용까지 <b>최대 24~48시간</b> 소요 (보통 10분~1시간)</li>
              <li>SSL 인증서(https)는 <b>자동 발급</b>됩니다</li>
            </ul>
          </div>

          <div className="space-y-1">
            <p className="font-medium text-gray-800">업체별 DNS 설정 위치</p>
            <ul className="list-disc list-inside text-gray-600 space-y-0.5">
              <li><b>가비아</b>: My가비아 &gt; 도메인 관리 &gt; DNS 설정</li>
              <li><b>카페24</b>: 나의서비스관리 &gt; 도메인 관리 &gt; DNS 관리</li>
              <li><b>GoDaddy</b>: 내 도메인 &gt; DNS 관리 &gt; 레코드 추가</li>
              <li><b>Cloudflare</b>: 대시보드 &gt; 해당 도메인 &gt; DNS &gt; 레코드</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

export default function BlogSettingsPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<SettingsTab>('basic')
  const [blog, setBlog] = useState<Record<string, unknown> | null>(null)
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
  const [blogType, setBlogType] = useState('')
  const [slug, setSlug] = useState('')

  // AI 캐릭터 폼 (21개 필드를 단일 객체로 관리)
  const [aiProvider, setAiProvider] = useState<'claude' | 'gemini'>('gemini')
  const [characterConfig, setCharacterConfig] = useState<Record<string, string>>({})
  const [generatingAll, setGeneratingAll] = useState(false)
  const [regeneratingField, setRegeneratingField] = useState<string | null>(null)

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
      setAllBlogs((blogsData ?? []).filter((b: { id: string }) => b.id !== params.id))

      // 폼 초기화
      setName(blogData.name ?? '')
      setDescription(blogData.description ?? '')
      setBlogUrl(blogData.url ?? '')
      setCustomDomain(blogData.custom_domain ?? '')
      setColor(blogData.color ?? COLORS[0])
      setIsActive(blogData.is_active ?? true)
      setBlogType(blogData.blog_type ?? '')
      setSlug(blogData.slug ?? '')
      setAiProvider(blogData.ai_provider ?? 'gemini')

      // AI 캐릭터 설정 로드
      const aiConfig = blogData.ai_character_config ?? {}
      const config: Record<string, string> = {}
      for (const key of ALL_FIELD_KEYS) {
        if (aiConfig[key]) config[key] = aiConfig[key]
      }
      setCharacterConfig(config)

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

  const updateCharField = useCallback((key: string, value: string) => {
    setCharacterConfig(prev => ({ ...prev, [key]: value }))
  }, [])

  const handleSaveBasic = async () => {
    setSaving(true)
    const res = await fetch(`/api/blogs/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, url: blogUrl || null, customDomain: customDomain || null, color, isActive, blogType: blogType || null }),
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
        aiCharacterConfig: { ...characterConfig, linkedBlogIds },
      }),
    })
    setSaving(false)
    if (res.ok) showSuccess('AI 캐릭터 설정이 저장되었습니다.')
  }

  // 블로그 정보를 AI에 전달하기 위한 헬퍼
  const getBlogInfo = () => ({
    name,
    description,
    blogType,
    categories: categories.map(c => c.name),
  })

  const handleGenerateAll = async () => {
    setGeneratingAll(true)
    try {
      const res = await fetch('/api/ai/generate-character', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blogId: params.id, provider: aiProvider, blogInfo: getBlogInfo() }),
      })
      const data = await res.json()
      if (data.character) {
        setCharacterConfig(prev => {
          const merged = { ...prev }
          for (const [k, v] of Object.entries(data.character)) {
            if (typeof v === 'string' && v.trim()) merged[k] = v.trim()
          }
          return merged
        })
        showSuccess('AI 캐릭터가 생성되었습니다. 확인 후 저장해주세요.')
      } else {
        alert(data.error ?? 'AI 생성에 실패했습니다.')
      }
    } catch {
      alert('AI 생성 중 오류가 발생했습니다.')
    }
    setGeneratingAll(false)
  }

  const handleRegenerateField = async (fieldKey: string) => {
    setRegeneratingField(fieldKey)
    try {
      const res = await fetch('/api/ai/generate-character', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blogId: params.id,
          provider: aiProvider,
          fieldKey,
          existingConfig: characterConfig,
          blogInfo: getBlogInfo(),
        }),
      })
      const data = await res.json()
      if (data.value) {
        updateCharField(fieldKey, data.value)
      } else {
        alert(data.error ?? '재생성에 실패했습니다.')
      }
    } catch {
      alert('재생성 중 오류가 발생했습니다.')
    }
    setRegeneratingField(null)
  }

  const handleSaveCrossLink = async () => {
    setSaving(true)
    const aiConfig = (blog?.ai_character_config ?? {}) as Record<string, unknown>
    const res = await fetch(`/api/blogs/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aiCharacterConfig: { ...aiConfig, linkedBlogIds } }),
    })
    setSaving(false)
    if (res.ok) showSuccess('크로스링킹 설정이 저장되었습니다.')
  }

  const handleDeleteBlog = async () => {
    if (!confirm(`"${name}" 블로그를 삭제하시겠습니까?\n모든 글과 데이터가 삭제됩니다.`)) return
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
            <p className="text-sm text-gray-500">{name}</p>
          </div>
        </div>
      </div>

      {/* 성공 토스트 */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-2.5 rounded-lg">
          {success}
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

      {/* ═══ BasicInfoTab ═══ */}
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
            <Label>슬러그 (URL)</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400 whitespace-nowrap">blog.hub/</span>
              <Input value={slug} readOnly disabled className="bg-gray-50 text-gray-500" />
            </div>
            <p className="text-xs text-gray-400">슬러그는 블로그의 고유 URL 주소로, 생성 후 변경할 수 없습니다.</p>
          </div>
          <div className="space-y-1.5">
            <Label>블로그 유형</Label>
            <select
              value={blogType}
              onChange={e => setBlogType(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">선택 안함</option>
              {BLOG_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400">Google YMYL 기준 블로그 유형입니다. AI 캐릭터 생성 및 글 작성 시 유형에 맞는 전문성과 톤을 반영합니다.</p>
          </div>
          <div className="space-y-1.5">
            <Label>블로그 URL</Label>
            <Input value={blogUrl} onChange={e => setBlogUrl(e.target.value)}
              placeholder="https://moneymakingwisdom.tistory.com" />
            <p className="text-xs text-gray-400">실제 블로그 주소를 입력하세요. 블로그 보기 버튼에 사용됩니다.</p>
          </div>
          <DomainSettingSection customDomain={customDomain} setCustomDomain={setCustomDomain} />
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

      {/* ═══ CategoriesTab ═══ */}
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

      {/* ═══ AICharacterTab ═══ */}
      {activeTab === 'ai' && (
        <div className="space-y-6">
          {/* AI 공급자 선택 + 일괄 생성 버튼 */}
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="space-y-2">
              <Label>AI 공급자</Label>
              <div className="flex gap-2">
                {(['claude', 'gemini'] as const).map(p => (
                  <button key={p} type="button" onClick={() => setAiProvider(p)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                      aiProvider === p ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400'
                    }`}>
                    {p === 'claude' ? 'Claude' : 'Gemini'}
                  </button>
                ))}
              </div>
            </div>
            <Button
              onClick={handleGenerateAll}
              disabled={generatingAll}
              className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white"
            >
              {generatingAll ? (
                <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />캐릭터 생성 중...</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-1.5" />AI 캐릭터 일괄 생성</>
              )}
            </Button>
          </div>

          {!blogType && (
            <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm px-4 py-2.5 rounded-lg">
              기본정보 탭에서 &quot;블로그 유형&quot;을 먼저 설정하면, AI가 유형에 맞는 캐릭터를 더 정확하게 생성합니다.
            </div>
          )}

          {/* 카테고리별 필드 렌더링 */}
          {CHARACTER_CATEGORIES.map((category) => (
            <div key={category.title} className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2">
                {category.title}
              </h3>
              <div className="space-y-3">
                {category.fields.map((field) => {
                  const value = characterConfig[field.key] ?? ''
                  const isRegenerating = regeneratingField === field.key

                  return (
                    <div key={field.key} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm">{field.label}</Label>
                          <p className="text-xs text-gray-400">{field.description}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-purple-500 hover:text-purple-700 hover:bg-purple-50"
                          disabled={isRegenerating || generatingAll}
                          onClick={() => handleRegenerateField(field.key)}
                          title="AI로 이 항목만 재생성"
                        >
                          {isRegenerating ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <RotateCw className="w-3.5 h-3.5" />
                          )}
                        </Button>
                      </div>

                      {field.type === 'select' ? (
                        <select
                          value={field.options?.includes(value) ? value : ''}
                          onChange={e => updateCharField(field.key, e.target.value)}
                          className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">{field.placeholder}</option>
                          {field.options?.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                          {/* AI가 옵션에 없는 값을 생성한 경우 표시 */}
                          {value && !field.options?.includes(value) && (
                            <option value={value}>{value} (AI 생성)</option>
                          )}
                        </select>
                      ) : (
                        <textarea
                          value={value}
                          onChange={e => updateCharField(field.key, e.target.value)}
                          rows={field.type === 'textarea' ? 3 : 1}
                          placeholder={field.placeholder}
                          className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed min-h-[38px]"
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          <Button onClick={handleSaveAI} disabled={saving} className="w-full sm:w-auto">
            <Save className="w-4 h-4 mr-1.5" />{saving ? '저장 중...' : 'AI 캐릭터 저장'}
          </Button>
        </div>
      )}

      {/* ═══ AdsTab ═══ */}
      {activeTab === 'ads' && (
        <Card className="shadow-none border border-gray-200">
          <CardContent className="p-6 text-center text-gray-400">
            <p className="font-medium text-gray-600 mb-1">광고 관리</p>
            <p className="text-sm">P4-S3 광고 관리 화면 구현 후 연동됩니다.</p>
            <p className="text-xs mt-2">AdSense 코드 및 위치별 광고 단위 설정이 가능해집니다.</p>
          </CardContent>
        </Card>
      )}

      {/* ═══ CrossLinkTab ═══ */}
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
