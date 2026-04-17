'use client'

import { useState, useEffect, useCallback } from 'react'
import { Save, ChevronDown, ChevronUp, Plus, Trash2, GripVertical, Loader2, Eye, Code, X, Sparkles, Scissors } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// ─── 타입 정의 ───

interface NavItem { label: string; url: string }
interface ColumnItem { label: string; url: string }
interface ColumnData { title: string; items: ColumnItem[] }
interface SnsItem { type: string; url: string }
interface AdSlot { enabled: boolean; code: string }

export interface LayoutConfig {
  header: {
    logo_type: 'text' | 'image'
    logo_image_url: string | null
    favicon_url: string | null
    bg_color: string
    text_color: string
    sticky: boolean
    height: 'compact' | 'normal' | 'tall'
    notice_bar: { enabled: boolean; text: string; bg_color: string }
    nav_items: NavItem[]
  }
  layout: {
    preset: 'minimal' | 'right_sidebar' | 'left_sidebar' | 'both_sidebar' | 'magazine'
    max_width: string
    bg_color: string
    font: string
    font_size: number
    line_height: number
  }
  related_posts: {
    enabled: boolean
    type: 'recent' | 'popular'
    count: number
    section_title: string
  }
  ads: {
    adsense_pub_id: string
    top_banner: AdSlot
    below_title: AdSlot
    in_article: AdSlot
    left_sidebar_ad: AdSlot
    right_sidebar_ad: AdSlot
    footer_ad: AdSlot
  }
  footer: {
    bg_color: string
    text_color: string
    columns: number
    column_data: ColumnData[]
    copyright: string
    sns: SnsItem[]
  }
  tracking: {
    ga4_id: string
    gsc_code: string
    gsc_auto_index: boolean
    naver_code: string
    kakao_pixel: string
    custom_head: string
    custom_body: string
    sitemap_submitted_at: string
  }
}

// ─── 기본값 ───

export const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  header: {
    logo_type: 'text',
    logo_image_url: null,
    favicon_url: null,
    bg_color: '#ffffff',
    text_color: '#111111',
    sticky: true,
    height: 'normal',
    notice_bar: { enabled: false, text: '', bg_color: '#fef3c7' },
    nav_items: [],
  },
  layout: {
    preset: 'minimal',
    max_width: '960px',
    bg_color: '#f9fafb',
    font: 'Pretendard',
    font_size: 16,
    line_height: 1.8,
  },
  ads: {
    adsense_pub_id: '',
    top_banner: { enabled: false, code: '' },
    below_title: { enabled: false, code: '' },
    in_article: { enabled: false, code: '' },
    left_sidebar_ad: { enabled: false, code: '' },
    right_sidebar_ad: { enabled: false, code: '' },
    footer_ad: { enabled: false, code: '' },
  },
  footer: {
    bg_color: '#1f2937',
    text_color: '#9ca3af',
    columns: 1,
    column_data: [],
    copyright: '',
    sns: [],
  },
  tracking: {
    ga4_id: '',
    gsc_code: '',
    gsc_auto_index: false,
    naver_code: '',
    kakao_pixel: '',
    custom_head: '',
    custom_body: '',
    sitemap_submitted_at: '',
  },
  related_posts: {
    enabled: false,
    type: 'recent',
    count: 5,
    section_title: '',
  },
}

// ─── 유틸: 기본값과 병합 ───

function mergeConfig(saved: Partial<LayoutConfig> | null | undefined): LayoutConfig {
  if (!saved) return { ...DEFAULT_LAYOUT_CONFIG }
  return {
    header: { ...DEFAULT_LAYOUT_CONFIG.header, ...saved.header },
    layout: { ...DEFAULT_LAYOUT_CONFIG.layout, ...saved.layout },
    ads: { ...DEFAULT_LAYOUT_CONFIG.ads, ...saved.ads },
    footer: { ...DEFAULT_LAYOUT_CONFIG.footer, ...saved.footer },
    tracking: { ...DEFAULT_LAYOUT_CONFIG.tracking, ...saved.tracking },
    related_posts: { ...DEFAULT_LAYOUT_CONFIG.related_posts, ...saved.related_posts },
  }
}

// ─── 색상 입력 컴포넌트 ───

function ColorInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label?: string }) {
  return (
    <div className="space-y-1">
      {label && <Label className="text-xs">{label}</Label>}
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-8 h-8 rounded border border-gray-200 cursor-pointer p-0"
        />
        <Input
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-28 text-xs font-mono"
          placeholder="#000000"
        />
      </div>
    </div>
  )
}

// ─── 토글 스위치 ───

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-sm text-gray-700">{label}</span>}
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-6 rounded-full transition-colors ${checked ? 'bg-blue-600' : 'bg-gray-200'}`}
      >
        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${checked ? 'left-5' : 'left-1'}`} />
      </button>
    </div>
  )
}

// ─── 섹션 아코디언 ───

function Section({ title, defaultOpen, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen ?? false)
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between px-4 py-3 transition-colors ${open ? 'bg-indigo-100 hover:bg-indigo-200 border-b border-indigo-200' : 'bg-slate-300 hover:bg-slate-400'}`}
      >
        <span className={`text-sm font-semibold ${open ? 'text-indigo-900' : 'text-slate-800'}`}>{title}</span>
        {open ? <ChevronUp className="w-4 h-4 text-indigo-600" /> : <ChevronDown className="w-4 h-4 text-slate-600" />}
      </button>
      {open && <div className="p-4 space-y-4 bg-indigo-50/20">{children}</div>}
    </div>
  )
}

// ─── 레이아웃 프리셋 카드 ───

const PRESET_OPTIONS: { value: LayoutConfig['layout']['preset']; label: string; desc: string }[] = [
  { value: 'minimal', label: '미니멀', desc: '전체 너비' },
  { value: 'right_sidebar', label: '우측 사이드바', desc: '본문 + 우측' },
  { value: 'left_sidebar', label: '좌측 사이드바', desc: '좌측 + 본문' },
  { value: 'both_sidebar', label: '좌우 사이드바', desc: '좌측 + 본문 + 우측' },
  { value: 'magazine', label: '매거진', desc: '카드 그리드' },
]

// 프리셋 시각화를 위한 미니 SVG
function PresetDiagram({ preset }: { preset: string }) {
  const w = 80, h = 50
  switch (preset) {
    case 'minimal':
      return (
        <svg width={w} height={h} className="text-gray-300">
          <rect x={10} y={5} width={60} height={40} rx={2} fill="currentColor" />
        </svg>
      )
    case 'right_sidebar':
      return (
        <svg width={w} height={h} className="text-gray-300">
          <rect x={5} y={5} width={45} height={40} rx={2} fill="currentColor" />
          <rect x={54} y={5} width={22} height={40} rx={2} fill="currentColor" opacity={0.5} />
        </svg>
      )
    case 'left_sidebar':
      return (
        <svg width={w} height={h} className="text-gray-300">
          <rect x={5} y={5} width={22} height={40} rx={2} fill="currentColor" opacity={0.5} />
          <rect x={31} y={5} width={45} height={40} rx={2} fill="currentColor" />
        </svg>
      )
    case 'both_sidebar':
      return (
        <svg width={w} height={h} className="text-gray-300">
          <rect x={2} y={5} width={16} height={40} rx={2} fill="currentColor" opacity={0.5} />
          <rect x={22} y={5} width={36} height={40} rx={2} fill="currentColor" />
          <rect x={62} y={5} width={16} height={40} rx={2} fill="currentColor" opacity={0.5} />
        </svg>
      )
    case 'magazine':
      return (
        <svg width={w} height={h} className="text-gray-300">
          <rect x={5} y={5} width={33} height={18} rx={2} fill="currentColor" />
          <rect x={42} y={5} width={33} height={18} rx={2} fill="currentColor" />
          <rect x={5} y={27} width={33} height={18} rx={2} fill="currentColor" />
          <rect x={42} y={27} width={33} height={18} rx={2} fill="currentColor" />
        </svg>
      )
    default:
      return null
  }
}

// ─── SNS 타입 옵션 ───

const SNS_TYPES = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'twitter', label: 'Twitter / X' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'blog', label: '블로그' },
]

// ─── 광고 슬롯 정의 ───

const AD_SLOTS: { key: keyof Omit<LayoutConfig['ads'], 'adsense_pub_id'>; label: string; desc: string }[] = [
  { key: 'top_banner', label: '상단 배너', desc: '페이지 상단에 표시' },
  { key: 'below_title', label: '제목 아래', desc: '글 제목 바로 아래 (글 상세 페이지)' },
  { key: 'in_article', label: '본문 중간', desc: '본문 중간에 자동 삽입' },
  { key: 'left_sidebar_ad', label: '좌측 사이드바', desc: '좌측 사이드바 레이아웃 선택 시 표시' },
  { key: 'right_sidebar_ad', label: '우측 사이드바', desc: '우측 사이드바 레이아웃 선택 시 표시' },
  { key: 'footer_ad', label: '하단', desc: '페이지 하단에 표시' },
]

// ─── JSON 편집 모달 ───

function JsonModal({ config, onApply, onClose }: {
  config: LayoutConfig
  onApply: (cfg: LayoutConfig) => void
  onClose: () => void
}) {
  const [text, setText] = useState(() => JSON.stringify(config, null, 2))
  const [parseError, setParseError] = useState('')

  const handleApply = () => {
    try {
      const parsed = JSON.parse(text) as LayoutConfig
      onApply(parsed)
      onClose()
    } catch {
      setParseError('JSON 형식이 올바르지 않습니다.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col mx-4">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-800">레이아웃 설정 JSON</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-hidden p-4">
          <textarea
            value={text}
            onChange={e => { setText(e.target.value); setParseError('') }}
            className="w-full h-full min-h-[400px] text-xs font-mono border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            spellCheck={false}
          />
          {parseError && (
            <p className="text-xs text-red-600 mt-1">{parseError}</p>
          )}
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-100">
          <p className="text-xs text-gray-400 flex-1 self-center">JSON을 수정하고 &quot;적용&quot;을 눌러 반영하세요.</p>
          <Button variant="outline" size="sm" onClick={onClose}>취소</Button>
          <Button size="sm" onClick={handleApply}>적용</Button>
        </div>
      </div>
    </div>
  )
}

// ─── 메인 컴포넌트 ───

interface LayoutTabProps {
  blogId: string
  blogSlug?: string
  customDomain?: string | null
  initialConfig: Partial<LayoutConfig> | null | undefined
  onSuccess: (msg: string) => void
  onConfigSaved?: (config: LayoutConfig) => void
}

export default function LayoutTab({ blogId, blogSlug, customDomain: customDomainProp, initialConfig, onSuccess, onConfigSaved }: LayoutTabProps) {
  const [config, setConfig] = useState<LayoutConfig>(() => mergeConfig(initialConfig))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showJsonModal, setShowJsonModal] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiGenerating, setAiGenerating] = useState(false)
  const [gaConnected, setGaConnected] = useState(false)
  const [gaEmail, setGaEmail] = useState<string | null>(null)
  const [gaCreating, setGaCreating] = useState(false)
  const [gscConnected, setGscConnected] = useState(false)
  const [gscEmail, setGscEmail] = useState<string | null>(null)
  const [sitemapSubmitting, setSitemapSubmitting] = useState(false)
  const [sitemapResult, setSitemapResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [gscRegistering, setGscRegistering] = useState(false)
  const [gscRegisterResult, setGscRegisterResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [snippetPickerSlot, setSnippetPickerSlot] = useState<string | null>(null)
  const [snippets, setSnippets] = useState<{ id: string; name: string; content: string; type: string }[]>([])
  const [snippetsLoading, setSnippetsLoading] = useState(false)
  const [customDomain, setCustomDomain] = useState<string | null>(customDomainProp ?? null)

  // prop이 업데이트되면 반영
  useEffect(() => {
    if (customDomainProp) setCustomDomain(customDomainProp)
  }, [customDomainProp])

  // 직접 DB에서 custom_domain 조회 (prop이 없을 때 fallback)
  useEffect(() => {
    if (customDomain) return
    fetch(`/api/blogs/${blogId}`)
      .then(r => r.json())
      .then(res => {
        if (res.data?.custom_domain) setCustomDomain(res.data.custom_domain)
      })
      .catch(() => {})
  }, [blogId, customDomain])

  // initialConfig가 나중에 로드될 수 있으므로 업데이트
  useEffect(() => {
    setConfig(mergeConfig(initialConfig))
  }, [initialConfig])

  // Google Analytics 연결 상태 확인
  useEffect(() => {
    fetch('/api/ga4/status')
      .then(r => r.json())
      .then(data => {
        setGaConnected(data.connected)
        setGaEmail(data.googleAccountId)
      })
      .catch(() => {})
  }, [])

  // Google Indexing (GSC) 연결 상태 확인
  useEffect(() => {
    fetch('/api/gsc/status')
      .then(r => r.json())
      .then(data => {
        setGscConnected(data.connected)
        setGscEmail(data.googleAccountId)
      })
      .catch(() => {})
  }, [])

  // ─── 상태 업데이트 헬퍼 ───

  const updateHeader = useCallback((patch: Partial<LayoutConfig['header']>) => {
    setConfig(prev => ({ ...prev, header: { ...prev.header, ...patch } }))
  }, [])

  const updateLayout = useCallback((patch: Partial<LayoutConfig['layout']>) => {
    setConfig(prev => ({ ...prev, layout: { ...prev.layout, ...patch } }))
  }, [])

  const updateAds = useCallback((patch: Partial<LayoutConfig['ads']>) => {
    setConfig(prev => ({ ...prev, ads: { ...prev.ads, ...patch } }))
  }, [])

  const updateFooter = useCallback((patch: Partial<LayoutConfig['footer']>) => {
    setConfig(prev => ({ ...prev, footer: { ...prev.footer, ...patch } }))
  }, [])

  const updateTracking = useCallback((patch: Partial<LayoutConfig['tracking']>) => {
    setConfig(prev => ({ ...prev, tracking: { ...prev.tracking, ...patch } }))
  }, [])

  const updateRelatedPosts = useCallback((patch: Partial<LayoutConfig['related_posts']>) => {
    setConfig(prev => ({ ...prev, related_posts: { ...prev.related_posts, ...patch } }))
  }, [])

  // ─── 저장 ───

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/blogs/${blogId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ layoutConfig: config }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '저장 실패')
      }
      onSuccess('레이아웃 설정이 저장되었습니다.')
      onConfigSaved?.(config)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.'
      setError(message)
    }
    setSaving(false)
  }

  // ─── AI 레이아웃 생성 ───

  const handleAIGenerate = async () => {
    if (!aiPrompt.trim() || aiGenerating) return
    setAiGenerating(true)
    setError('')
    try {
      const res = await fetch('/api/ai/generate-layout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blogId,
          instruction: aiPrompt,
          currentConfig: config,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'AI 생성 실패')
      if (data.layoutConfig) {
        setConfig(mergeConfig(data.layoutConfig))
        setAiPrompt('')
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'AI 레이아웃 생성 중 오류가 발생했습니다.'
      setError(message)
    }
    setAiGenerating(false)
  }

  // ─── GA4 자동 등록 / 연결 해제 ───

  const handleGaAutoCreate = async () => {
    setGaCreating(true)
    setError('')
    try {
      const res = await fetch('/api/ga4/create-property', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blogId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      updateTracking({ ga4_id: data.measurementId })
      onSuccess(`GA4 속성이 생성되었습니다. 측정 ID: ${data.measurementId}`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'GA4 자동 등록 실패'
      setError(message)
    }
    setGaCreating(false)
  }

  const handleGaDisconnect = async () => {
    try {
      await fetch('/api/ga4/disconnect', { method: 'POST' })
      setGaConnected(false)
      setGaEmail(null)
    } catch {
      setError('Google 연결 해제에 실패했습니다.')
    }
  }

  const handleGscDisconnect = async () => {
    try {
      await fetch('/api/gsc/disconnect', { method: 'POST' })
      setGscConnected(false)
      setGscEmail(null)
      updateTracking({ gsc_auto_index: false })
    } catch {
      setError('Google Indexing 연결 해제에 실패했습니다.')
    }
  }

  const handleGscRegisterSite = async () => {
    setGscRegistering(true)
    setGscRegisterResult(null)
    try {
      const res = await fetch('/api/gsc/register-site', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blogId }),
      })
      const data = await res.json()

      if (data.ok && data.step === 'complete') {
        // 소유권 확인 + 사이트맵 제출 모두 완료
        setGscRegisterResult({ ok: true, message: 'GSC에 사이트가 등록되고, 자동 색인과 사이트맵이 설정되었습니다.' })
        const now = new Date().toISOString()
        const updatedConfig = {
          ...config,
          tracking: { ...config.tracking, gsc_auto_index: true, gsc_verified: true, sitemap_submitted_at: now },
        }
        setConfig(updatedConfig)
        onConfigSaved?.(updatedConfig)
      } else if (data.step === 'verify') {
        // 사이트 추가됨 + 소유권 미확인
        setGscRegisterResult({
          ok: false,
          message: `GSC에 사이트가 추가되었습니다.\n\n소유권 확인이 필요합니다:\n1. Google Search Console(${data.siteUrl || ''})에서 소유권 확인을 완료하세요.\n2. 완료 후 다시 [등록/갱신]을 클릭하면 사이트맵이 자동 제출됩니다.`,
        })
        const updatedConfig = {
          ...config,
          tracking: { ...config.tracking, gsc_auto_index: true },
        }
        setConfig(updatedConfig)
        onConfigSaved?.(updatedConfig)
      } else {
        setGscRegisterResult({ ok: false, message: data.error || 'GSC 사이트 등록 실패' })
      }
    } catch {
      setGscRegisterResult({ ok: false, message: '네트워크 오류가 발생했습니다.' })
    }
    setGscRegistering(false)
  }

  const handleSubmitSitemap = async () => {
    setSitemapSubmitting(true)
    setSitemapResult(null)
    try {
      const res = await fetch('/api/gsc/submit-sitemap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blogId }),
      })
      const data = await res.json()
      if (res.ok) {
        const now = new Date().toISOString()
        setSitemapResult({ ok: true, message: `사이트맵 제출 완료: ${data.sitemapUrl}` })
        // 제출 시각 저장 (config에 반영 + DB 저장)
        const updatedConfig = { ...config, tracking: { ...config.tracking, sitemap_submitted_at: now } }
        setConfig(updatedConfig)
        await fetch(`/api/blogs/${blogId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ layoutConfig: updatedConfig }),
        })
        onConfigSaved?.(updatedConfig)
      } else {
        setSitemapResult({ ok: false, message: data.error || '사이트맵 제출 실패' })
      }
    } catch {
      setSitemapResult({ ok: false, message: '네트워크 오류가 발생했습니다.' })
    }
    setSitemapSubmitting(false)
  }

  // ─── 네비게이션 아이템 관리 ───

  const addNavItem = () => {
    updateHeader({ nav_items: [...config.header.nav_items, { label: '', url: '' }] })
  }

  const removeNavItem = (idx: number) => {
    updateHeader({ nav_items: config.header.nav_items.filter((_, i) => i !== idx) })
  }

  const updateNavItem = (idx: number, field: 'label' | 'url', value: string) => {
    const items = [...config.header.nav_items]
    items[idx] = { ...items[idx], [field]: value }
    updateHeader({ nav_items: items })
  }

  // ─── 카테고리를 네비게이션에 추가 ───

  const [navCategories, setNavCategories] = useState<{ id: string; name: string; slug: string }[]>([])
  const [showCategoryPicker, setShowCategoryPicker] = useState(false)

  const openCategoryPicker = async () => {
    if (showCategoryPicker) { setShowCategoryPicker(false); return }
    setShowCategoryPicker(true)
    try {
      const res = await fetch(`/api/categories?blogId=${blogId}`)
      const json = await res.json()
      setNavCategories(json.data ?? [])
    } catch { /* ignore */ }
  }

  const addCategoryNavItem = (cat: { name: string; slug: string }) => {
    const baseUrl = customDomain || (blogSlug ? `/blog/${blogSlug}` : '')
    const url = `${baseUrl}?category=${cat.slug}`
    updateHeader({ nav_items: [...config.header.nav_items, { label: cat.name, url }] })
    setShowCategoryPicker(false)
  }

  // ─── 푸터 컬럼 관리 ───

  const ensureColumns = (count: number) => {
    const current = [...config.footer.column_data]
    while (current.length < count) current.push({ title: '', items: [] })
    updateFooter({ columns: count, column_data: current.slice(0, count) })
  }

  const updateColumnTitle = (colIdx: number, title: string) => {
    const cols = [...config.footer.column_data]
    cols[colIdx] = { ...cols[colIdx], title }
    updateFooter({ column_data: cols })
  }

  const addColumnLink = (colIdx: number) => {
    const cols = [...config.footer.column_data]
    cols[colIdx] = { ...cols[colIdx], items: [...cols[colIdx].items, { label: '', url: '' }] }
    updateFooter({ column_data: cols })
  }

  const removeColumnLink = (colIdx: number, linkIdx: number) => {
    const cols = [...config.footer.column_data]
    cols[colIdx] = { ...cols[colIdx], items: cols[colIdx].items.filter((_, i) => i !== linkIdx) }
    updateFooter({ column_data: cols })
  }

  const updateColumnLink = (colIdx: number, linkIdx: number, field: 'label' | 'url', value: string) => {
    const cols = [...config.footer.column_data]
    const items = [...cols[colIdx].items]
    items[linkIdx] = { ...items[linkIdx], [field]: value }
    cols[colIdx] = { ...cols[colIdx], items }
    updateFooter({ column_data: cols })
  }

  // ─── SNS 관리 ───

  const addSns = () => {
    updateFooter({ sns: [...config.footer.sns, { type: 'instagram', url: '' }] })
  }

  const removeSns = (idx: number) => {
    updateFooter({ sns: config.footer.sns.filter((_, i) => i !== idx) })
  }

  const updateSns = (idx: number, field: 'type' | 'url', value: string) => {
    const items = [...config.footer.sns]
    items[idx] = { ...items[idx], [field]: value }
    updateFooter({ sns: items })
  }

  // ─── 광고 슬롯 업데이트 ───

  const updateAdSlot = (key: string, patch: Partial<AdSlot>) => {
    const current = (config.ads as Record<string, unknown>)[key] as AdSlot
    setConfig(prev => ({
      ...prev,
      ads: { ...prev.ads, [key]: { ...current, ...patch } },
    }))
  }

  // ─── 스니펫 불러오기 (광고 코드용) ───

  const openSnippetPicker = async (slotKey: string) => {
    if (snippetPickerSlot === slotKey) { setSnippetPickerSlot(null); return }
    setSnippetPickerSlot(slotKey)
    setSnippetsLoading(true)
    try {
      const res = await fetch('/api/snippets')
      const json = await res.json()
      setSnippets(json.data ?? [])
    } catch { /* ignore */ }
    setSnippetsLoading(false)
  }

  const applySnippet = (slotKey: string, content: string) => {
    updateAdSlot(slotKey, { code: content })
    setSnippetPickerSlot(null)
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2.5 rounded-lg">
          {error}
        </div>
      )}

      {/* 상단 액션 버튼 */}
      <div className="flex gap-2 justify-end">
        {blogSlug && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.open(customDomain ? `https://${customDomain}` : `/blog/${blogSlug}`, '_blank')}
          >
            <Eye className="w-4 h-4 mr-1.5" />미리보기
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowJsonModal(true)}
        >
          <Code className="w-4 h-4 mr-1.5" />JSON 편집
        </Button>
      </div>

      {/* ═══ AI 레이아웃 생성 ═══ */}
      <div className="border border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-600" />
          <span className="text-sm font-semibold text-purple-800">AI 레이아웃 디자이너</span>
          <span className="text-xs text-purple-500">블로그 유형 &amp; AI 캐릭터 페르소나 반영</span>
        </div>
        <textarea
          value={aiPrompt}
          onChange={e => setAiPrompt(e.target.value)}
          placeholder="원하는 레이아웃을 자유롭게 설명해주세요.&#10;예: 따뜻한 느낌의 파스텔 톤으로 만들어줘. 우측 사이드바 레이아웃에 로고 이미지도 생성해줘.&#10;예: 전문적이고 깔끔한 IT 블로그 느낌으로, 매거진 레이아웃에 다크 테마로 변경해줘."
          className="w-full text-sm border border-purple-200 rounded-lg px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white/80 placeholder:text-gray-400"
          rows={3}
          disabled={aiGenerating}
        />
        <div className="flex items-center justify-between">
          <p className="text-xs text-purple-500">
            AI가 블로그 특성에 맞게 색상, 레이아웃, 폰트, 푸터 등을 자동 설정합니다. Imagen 키가 있으면 로고 이미지도 생성합니다.
          </p>
          <Button
            type="button"
            size="sm"
            onClick={handleAIGenerate}
            disabled={aiGenerating || !aiPrompt.trim()}
            className="bg-purple-600 hover:bg-purple-700 text-white shrink-0 ml-3"
          >
            {aiGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                생성 중...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-1.5" />
                AI 생성
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ═══ 1. 헤더 설정 ═══ */}
      <Section title="헤더 설정" defaultOpen>
        {/* 로고 타입 */}
        <div className="space-y-1">
          <Label className="text-xs">로고 타입</Label>
          <div className="flex gap-2">
            {(['text', 'image'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => updateHeader({ logo_type: t })}
                className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
                  config.header.logo_type === t
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                }`}
              >
                {t === 'text' ? '텍스트' : '이미지'}
              </button>
            ))}
          </div>
        </div>

        {/* 이미지 URL (이미지 모드일 때만) */}
        {config.header.logo_type === 'image' && (
          <div className="space-y-1">
            <Label className="text-xs">로고 이미지 URL</Label>
            <Input
              value={config.header.logo_image_url ?? ''}
              onChange={e => updateHeader({ logo_image_url: e.target.value || null })}
              placeholder="https://example.com/logo.png"
              className="text-sm"
            />
            <p className="text-[11px] text-gray-400">블로그 헤더 및 SNS 공유 이미지(og:image)로 사용됩니다.</p>
          </div>
        )}

        {/* 파비콘 */}
        <div className="space-y-1">
          <Label className="text-xs">파비콘 URL</Label>
          <Input
            value={config.header.favicon_url ?? ''}
            onChange={e => updateHeader({ favicon_url: e.target.value || null })}
            placeholder="https://example.com/favicon.ico"
            className="text-sm"
          />
          <p className="text-[11px] text-gray-400">브라우저 탭에 표시될 아이콘 (16×16 또는 32×32 ICO/PNG)</p>
        </div>

        {/* 색상 */}
        <div className="flex gap-6">
          <ColorInput label="헤더 배경색" value={config.header.bg_color} onChange={v => updateHeader({ bg_color: v })} />
          <ColorInput label="글자색" value={config.header.text_color} onChange={v => updateHeader({ text_color: v })} />
        </div>

        {/* 높이 */}
        <div className="space-y-1">
          <Label className="text-xs">헤더 높이</Label>
          <select
            value={config.header.height}
            onChange={e => updateHeader({ height: e.target.value as LayoutConfig['header']['height'] })}
            className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="compact">컴팩트 (compact)</option>
            <option value="normal">보통 (normal)</option>
            <option value="tall">넓음 (tall)</option>
          </select>
        </div>

        {/* 고정(Sticky) */}
        <Toggle label="고정(Sticky) 헤더" checked={config.header.sticky} onChange={v => updateHeader({ sticky: v })} />

        {/* 상단 공지 바 */}
        <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
          <Toggle label="상단 공지 바" checked={config.header.notice_bar.enabled} onChange={v => updateHeader({ notice_bar: { ...config.header.notice_bar, enabled: v } })} />
          {config.header.notice_bar.enabled && (
            <div className="space-y-2 ml-0">
              <Input
                value={config.header.notice_bar.text}
                onChange={e => updateHeader({ notice_bar: { ...config.header.notice_bar, text: e.target.value } })}
                placeholder="공지 내용을 입력하세요"
                className="text-sm"
              />
              <ColorInput label="공지 바 배경색" value={config.header.notice_bar.bg_color} onChange={v => updateHeader({ notice_bar: { ...config.header.notice_bar, bg_color: v } })} />
            </div>
          )}
        </div>

        {/* 네비게이션 메뉴 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">네비게이션 메뉴</Label>
            <div className="flex gap-1.5 relative">
              <Button type="button" variant="outline" size="sm" onClick={openCategoryPicker} className="h-7 text-xs">
                <Plus className="w-3 h-3 mr-1" />카테고리 추가
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={addNavItem} className="h-7 text-xs">
                <Plus className="w-3 h-3 mr-1" />추가
              </Button>
              {showCategoryPicker && (
                <div className="absolute right-0 bottom-8 z-20 w-56 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                  <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-700">카테고리 선택</span>
                    <button type="button" onClick={() => setShowCategoryPicker(false)} className="text-gray-400 hover:text-gray-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {navCategories.length === 0 ? (
                      <div className="px-3 py-4 text-center text-xs text-gray-400">등록된 카테고리가 없습니다.</div>
                    ) : (
                      navCategories.map(cat => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => addCategoryNavItem(cat)}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0"
                        >
                          {cat.name}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          {config.header.nav_items.length === 0 && (
            <p className="text-xs text-gray-400">메뉴 항목이 없습니다.</p>
          )}
          {config.header.nav_items.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <GripVertical className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
              <Input value={item.label} onChange={e => updateNavItem(idx, 'label', e.target.value)} placeholder="메뉴명" className="text-sm flex-1" />
              <Input value={item.url} onChange={e => updateNavItem(idx, 'url', e.target.value)} placeholder="URL" className="text-sm flex-1" />
              <Button type="button" variant="ghost" size="sm" onClick={() => removeNavItem(idx)} className="h-8 w-8 p-0 text-red-400 hover:text-red-600">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </Section>

      {/* ═══ 2. 본문 레이아웃 ═══ */}
      <Section title="본문 레이아웃">
        {/* 레이아웃 프리셋 */}
        <div className="space-y-2">
          <Label className="text-xs">레이아웃 프리셋</Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {PRESET_OPTIONS.map(p => (
              <button
                key={p.value}
                type="button"
                onClick={() => updateLayout({ preset: p.value })}
                className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all ${
                  config.layout.preset === p.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <PresetDiagram preset={p.value} />
                <span className="text-xs font-medium text-gray-700">{p.label}</span>
                <span className="text-[10px] text-gray-400">{p.desc}</span>
              </button>
            ))}
          </div>
          {(config.layout.preset === 'left_sidebar' || config.layout.preset === 'right_sidebar' || config.layout.preset === 'both_sidebar') && (
            <p className="text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded-md">
              사이드바 광고는 아래 &quot;광고 배치&quot; 섹션에서 설정하세요.
            </p>
          )}
        </div>

        {/* 최대 너비 */}
        <div className="space-y-1">
          <Label className="text-xs">최대 너비</Label>
          <select
            value={config.layout.max_width}
            onChange={e => updateLayout({ max_width: e.target.value })}
            className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="768px">768px (좁은)</option>
            <option value="960px">960px (보통)</option>
            <option value="1200px">1200px (넓은)</option>
            <option value="100%">100% (전체)</option>
          </select>
          <p className="text-xs text-gray-400">헤더·본문·푸터를 포함한 전체 콘텐츠 영역의 최대 가로 폭입니다. 화면이 이 값보다 넓어도 콘텐츠는 이 폭을 넘지 않고 가운데 정렬됩니다.</p>
        </div>

        {/* 배경색 */}
        <ColorInput label="배경색" value={config.layout.bg_color} onChange={v => updateLayout({ bg_color: v })} />

        {/* 폰트 */}
        <div className="space-y-1">
          <Label className="text-xs">폰트</Label>
          <select
            value={config.layout.font}
            onChange={e => updateLayout({ font: e.target.value })}
            className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Pretendard">Pretendard</option>
            <option value="Noto Sans KR">Noto Sans KR</option>
            <option value="NanumGothic">나눔고딕</option>
            <option value="Malgun Gothic">맑은 고딕</option>
          </select>
        </div>

        {/* 글자 크기 */}
        <div className="space-y-1">
          <Label className="text-xs">기본 글자 크기 ({config.layout.font_size}px)</Label>
          <input
            type="range"
            min={14}
            max={20}
            value={config.layout.font_size}
            onChange={e => updateLayout({ font_size: Number(e.target.value) })}
            className="w-full"
          />
          <div className="flex justify-between text-[10px] text-gray-400">
            <span>14px</span><span>20px</span>
          </div>
        </div>

        {/* 줄 간격 */}
        <div className="space-y-1">
          <Label className="text-xs">줄 간격 ({config.layout.line_height})</Label>
          <input
            type="range"
            min={1.4}
            max={2.0}
            step={0.1}
            value={config.layout.line_height}
            onChange={e => updateLayout({ line_height: Number(e.target.value) })}
            className="w-full"
          />
          <div className="flex justify-between text-[10px] text-gray-400">
            <span>1.4</span><span>2.0</span>
          </div>
        </div>
      </Section>

      {/* ═══ 3. 광고 배치 ═══ */}
      <Section title="광고 배치">
        {/* AdSense Publisher ID */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">AdSense Publisher ID</Label>
          <Input
            value={config.ads.adsense_pub_id}
            onChange={e => updateAds({ adsense_pub_id: e.target.value })}
            placeholder="ca-pub-xxxxxxxxxxxx 또는 pub-xxxxxxxxxxxx"
            className="text-sm font-mono"
          />
          <details className="group">
            <summary className="text-xs text-blue-600 cursor-pointer hover:underline">어디서 찾나요?</summary>
            <div className="mt-1.5 text-xs text-gray-500 bg-gray-50 rounded-lg p-3 space-y-1 leading-relaxed">
              <p className="font-medium text-gray-700">AdSense 계정이 없다면 먼저 가입하세요:</p>
              <p>1. <a href="https://www.google.com/adsense" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Google AdSense</a>에 접속하여 가입합니다.</p>
              <p>2. 사이트 URL로 블로그 주소를 입력하고 승인 절차를 진행합니다.</p>
              <p>3. 승인까지 보통 1~14일 소요됩니다.</p>
              <p className="font-medium text-gray-700 pt-2">Publisher ID 찾기:</p>
              <p>4. AdSense에 로그인 후 <strong>계정 → 계정 정보</strong>로 이동합니다.</p>
              <p>5. <strong>게시자 ID</strong> 항목에 <code className="bg-gray-200 px-1 rounded">ca-pub-xxxxxxxxxxxx</code> 형태의 ID가 표시됩니다.</p>
              <p>6. 이 값을 복사하여 위 입력란에 붙여넣으세요.</p>
              <p className="text-gray-400 pt-1">✓ Publisher ID를 입력하면 아래 광고 슬롯에 AdSense 광고를 배치할 수 있습니다. 각 슬롯별로 광고 코드를 넣어주세요.</p>
              <p className="text-amber-600 pt-1">⚠️ AdSense 승인 전에는 광고가 표시되지 않습니다. 먼저 AdSense 가입 및 사이트 승인을 완료해주세요.</p>
              <p className="text-blue-600 pt-1">💡 같은 AdSense 계정의 블로그라면 Publisher ID가 동일합니다. 다른 블로그에서 이미 입력한 ID를 그대로 복사·붙여넣기 하세요.</p>
            </div>
          </details>
        </div>

        {/* 광고 슬롯 */}
        {AD_SLOTS.map(slot => {
          const adSlot = config.ads[slot.key]
          if (typeof adSlot !== 'object' || adSlot === null) return null
          const typedSlot = adSlot as AdSlot
          const isSidebar = slot.key === 'left_sidebar_ad' || slot.key === 'right_sidebar_ad'
          const sidebarInactive =
            (slot.key === 'left_sidebar_ad' && config.layout.preset !== 'left_sidebar' && config.layout.preset !== 'both_sidebar') ||
            (slot.key === 'right_sidebar_ad' && config.layout.preset !== 'right_sidebar' && config.layout.preset !== 'both_sidebar')

          return (
            <div key={slot.key} className={`p-3 rounded-lg space-y-2 ${isSidebar && sidebarInactive ? 'bg-gray-50 opacity-60' : 'bg-gray-50'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-700">{slot.label}</span>
                  <span className="text-xs text-gray-400 ml-2">{slot.desc}</span>
                  {isSidebar && sidebarInactive && (
                    <span className="ml-2 text-xs text-amber-600">(현재 레이아웃 미사용)</span>
                  )}
                </div>
                <Toggle checked={typedSlot.enabled} onChange={v => updateAdSlot(slot.key, { enabled: v })} />
              </div>
              {typedSlot.enabled && (
                <div className="space-y-1.5">
                  <textarea
                    value={typedSlot.code}
                    onChange={e => updateAdSlot(slot.key, { code: e.target.value })}
                    placeholder="광고 코드를 붙여넣으세요 (AdSense, etc.)"
                    rows={3}
                    className="w-full text-xs font-mono border border-gray-200 rounded-md px-3 py-2 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="relative">
                    <Button type="button" variant="outline" size="sm" onClick={() => openSnippetPicker(slot.key)} className="h-7 text-xs gap-1">
                      <Scissors className="w-3 h-3" />스니펫 불러오기
                    </Button>
                    {snippetPickerSlot === slot.key && (
                      <div className="absolute left-0 bottom-8 z-20 w-72 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                        <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-700">스니펫 선택</span>
                          <button type="button" onClick={() => setSnippetPickerSlot(null)} className="text-gray-400 hover:text-gray-600">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          {snippetsLoading ? (
                            <div className="px-3 py-4 text-center text-xs text-gray-400"><Loader2 className="w-4 h-4 animate-spin inline mr-1" />불러오는 중...</div>
                          ) : snippets.length === 0 ? (
                            <div className="px-3 py-4 text-center text-xs text-gray-400">저장된 스니펫이 없습니다.</div>
                          ) : (
                            snippets.map(s => (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() => applySnippet(slot.key, s.content)}
                                className="w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-medium text-gray-800 truncate flex-1">{s.name}</span>
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${s.type === 'html' ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'}`}>
                                    {s.type}
                                  </span>
                                </div>
                                <p className="text-[10px] text-gray-400 truncate mt-0.5">{s.content.slice(0, 60)}</p>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </Section>

      {/* ═══ 4. 푸터 설정 ═══ */}
      <Section title="푸터 설정">
        {/* 색상 */}
        <div className="flex gap-6">
          <ColorInput label="배경색" value={config.footer.bg_color} onChange={v => updateFooter({ bg_color: v })} />
          <ColorInput label="글자색" value={config.footer.text_color} onChange={v => updateFooter({ text_color: v })} />
        </div>

        {/* 컬럼 수 */}
        <div className="space-y-1">
          <Label className="text-xs">컬럼 수</Label>
          <div className="flex gap-2">
            {[1, 2, 3].map(n => (
              <button
                key={n}
                type="button"
                onClick={() => ensureColumns(n)}
                className={`px-4 py-1.5 text-xs rounded-md border transition-colors ${
                  config.footer.columns === n
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                }`}
              >
                {n}열
              </button>
            ))}
          </div>
        </div>

        {/* 컬럼별 설정 */}
        {Array.from({ length: config.footer.columns }).map((_, colIdx) => {
          const col = config.footer.column_data[colIdx] ?? { title: '', items: [] }
          return (
            <div key={colIdx} className="p-3 bg-gray-50 rounded-lg space-y-2">
              <Label className="text-xs">컬럼 {colIdx + 1}</Label>
              <Input
                value={col.title}
                onChange={e => updateColumnTitle(colIdx, e.target.value)}
                placeholder="컬럼 제목"
                className="text-sm"
              />
              {col.items.map((link, linkIdx) => (
                <div key={linkIdx} className="flex items-center gap-2">
                  <Input value={link.label} onChange={e => updateColumnLink(colIdx, linkIdx, 'label', e.target.value)} placeholder="링크 이름" className="text-sm flex-1" />
                  <Input value={link.url} onChange={e => updateColumnLink(colIdx, linkIdx, 'url', e.target.value)} placeholder="URL" className="text-sm flex-1" />
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeColumnLink(colIdx, linkIdx)} className="h-8 w-8 p-0 text-red-400">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => addColumnLink(colIdx)} className="h-7 text-xs">
                <Plus className="w-3 h-3 mr-1" />링크 추가
              </Button>
            </div>
          )
        })}

        {/* 저작권 문구 */}
        <div className="space-y-1">
          <Label className="text-xs">저작권 문구</Label>
          <Input
            value={config.footer.copyright}
            onChange={e => updateFooter({ copyright: e.target.value })}
            placeholder="(C) 2026 My Blog. All rights reserved."
            className="text-sm"
          />
        </div>

        {/* SNS 링크 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">SNS 링크</Label>
            <Button type="button" variant="outline" size="sm" onClick={addSns} className="h-7 text-xs">
              <Plus className="w-3 h-3 mr-1" />추가
            </Button>
          </div>
          {config.footer.sns.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <select
                value={item.type}
                onChange={e => updateSns(idx, 'type', e.target.value)}
                className="text-sm border border-gray-200 rounded-md px-2 py-1.5 bg-white w-32"
              >
                {SNS_TYPES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              <Input value={item.url} onChange={e => updateSns(idx, 'url', e.target.value)} placeholder="https://..." className="text-sm flex-1" />
              <Button type="button" variant="ghost" size="sm" onClick={() => removeSns(idx)} className="h-8 w-8 p-0 text-red-400">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </Section>

      {/* ═══ 5. 분석 & 추적 ═══ */}
      <Section title="분석 & 추적">
        {/* GA4 */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold">Google Analytics 4 ID</Label>
          <Input
            value={config.tracking.ga4_id}
            onChange={e => updateTracking({ ga4_id: e.target.value })}
            placeholder="G-XXXXXXXXXX"
            className="text-sm font-mono"
          />

          {/* Google 계정 연결 & 자동 등록 */}
          <div className="rounded-lg border p-3 space-y-2 bg-gray-50">
            {gaConnected ? (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-green-700">
                    <span className="w-2 h-2 bg-green-500 rounded-full shrink-0" />
                    Google 계정 연결됨{gaEmail && ` (${gaEmail})`}
                  </div>
                  <button
                    type="button"
                    onClick={handleGaDisconnect}
                    className="text-xs text-red-500 hover:underline"
                  >
                    연결 해제
                  </button>
                </div>
                {!config.tracking.ga4_id && (
                  <button
                    type="button"
                    onClick={handleGaAutoCreate}
                    disabled={gaCreating}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-50"
                  >
                    {gaCreating ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> GA4 속성 생성 중...</>
                    ) : (
                      '자동 등록 (GA4 속성 + 데이터 스트림 자동 생성)'
                    )}
                  </button>
                )}
              </>
            ) : (
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => {
                    window.location.href = `/api/oauth/google-analytics/authorize?blogId=${blogId}`
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Google 계정 연결하기
                </button>
                <p className="text-[11px] text-gray-400 text-center">
                  연결하면 GA4 속성을 자동으로 생성할 수 있습니다.
                </p>
              </div>
            )}
          </div>

          <details className="group">
            <summary className="text-xs text-blue-600 cursor-pointer hover:underline">수동으로 입력하려면?</summary>
            <div className="mt-1.5 text-xs text-gray-500 bg-gray-50 rounded-lg p-3 space-y-1 leading-relaxed">
              <p className="font-medium text-gray-700">먼저 Google Analytics에 블로그를 등록하세요:</p>
              <p>1. <a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Google Analytics</a>에 로그인합니다.</p>
              <p>2. 좌측 하단 <strong>관리(⚙️)</strong>를 클릭합니다.</p>
              <p>3. <strong>+ 속성 만들기</strong>를 클릭하고 블로그 이름을 입력합니다.</p>
              <p>4. 비즈니스 정보를 선택한 후 <strong>웹</strong> 플랫폼을 선택합니다.</p>
              <p>5. 블로그 URL을 입력하고 스트림을 생성합니다.</p>
              <p className="font-medium text-gray-700 pt-2">그 다음 측정 ID를 가져오세요:</p>
              <p>6. <strong>관리(⚙️)</strong> → <strong>데이터 스트림</strong>을 클릭합니다.</p>
              <p>7. 방금 만든 웹 스트림을 선택하면 <code className="bg-gray-200 px-1 rounded">G-XXXXXXXXXX</code> 형태의 <strong>측정 ID</strong>가 표시됩니다.</p>
              <p>8. 이 값을 복사하여 위 입력란에 붙여넣으세요.</p>
              <p className="text-gray-400 pt-1">✓ 입력하면 블로그 방문자 수, 페이지뷰, 유입 경로, 체류 시간 등을 Google Analytics 대시보드에서 실시간으로 분석할 수 있습니다.</p>
            </div>
          </details>
        </div>

        {/* GSC */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">Google Search Console</Label>

          {/* Google Indexing 연결 & 자동 색인 */}
          <div className="rounded-lg border p-3 space-y-2 bg-gray-50 mt-2">
            {gscConnected ? (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-green-700">
                    <span className="w-2 h-2 bg-green-500 rounded-full shrink-0" />
                    Google Indexing 연결됨{gscEmail && ` (${gscEmail})`}
                  </div>
                  <button
                    type="button"
                    onClick={handleGscDisconnect}
                    className="text-xs text-red-500 hover:underline"
                  >
                    연결 해제
                  </button>
                </div>
                {/* GSC 사이트 등록 */}
                <div className="flex items-center justify-between py-1">
                  <div>
                    <p className="text-xs font-medium text-gray-700">GSC 사이트 등록</p>
                    <p className="text-[11px] text-gray-400">이 블로그를 Google Search Console에 속성으로 등록합니다.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleGscRegisterSite}
                    disabled={gscRegistering}
                    className="text-xs px-2.5 py-1 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors whitespace-nowrap"
                  >
                    {gscRegistering ? '등록 중...' : '등록/갱신'}
                  </button>
                </div>
                {gscRegisterResult && (
                  <p className={`text-[11px] -mt-1 whitespace-pre-line ${gscRegisterResult.ok ? 'text-green-600' : 'text-red-500'}`}>
                    {gscRegisterResult.ok ? '✓ ' : '✗ '}{gscRegisterResult.message}
                  </p>
                )}

                {/* GSC 소유권 확인 코드 */}
                <div className="py-1 border-t border-gray-100 mt-1">
                  <p className="text-xs font-medium text-gray-700">소유권 확인 코드</p>
                  <p className="text-[11px] text-gray-400 mb-1">
                    GSC에서 HTML 태그 방식의 인증 코드(content 값)를 붙여넣으세요.
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={config.tracking.gsc_code || ''}
                      onChange={(e) => updateTracking({ gsc_code: e.target.value.trim() })}
                      placeholder="예: AbCdEfGh1234..."
                      className="flex-1 text-xs px-2 py-1.5 rounded-md border border-gray-300 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                  {config.tracking.gsc_code && (
                    <p className="text-[10px] text-green-600 mt-1">
                      ✓ 인증 코드가 설정되었습니다. 페이지 &lt;head&gt;에 메타 태그로 삽입됩니다.
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between py-1">
                  <div>
                    <p className="text-xs font-medium text-gray-700">글 발행 시 자동 색인 요청</p>
                    <p className="text-[11px] text-gray-400">발행할 때마다 Google에 URL을 자동 제출합니다.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateTracking({ gsc_auto_index: !config.tracking.gsc_auto_index })}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      config.tracking.gsc_auto_index ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                      config.tracking.gsc_auto_index ? 'translate-x-[18px]' : 'translate-x-[2px]'
                    }`} />
                  </button>
                </div>

                {/* 사이트맵 제출 */}
                <div className="pt-1 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-700">사이트맵 제출</p>
                      <p className="text-[11px] text-gray-400">GSC에 sitemap.xml을 즉시 제출합니다.</p>
                      <p className="text-[11px] text-amber-500 mt-0.5">※ GSC 반영까지 수일~수주 소요될 수 있습니다.</p>
                    </div>
                    {config.tracking.sitemap_submitted_at ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-green-600 font-medium whitespace-nowrap">
                          ✓ 제출완료
                        </span>
                        <button
                          type="button"
                          onClick={handleSubmitSitemap}
                          disabled={sitemapSubmitting}
                          className="text-[11px] text-gray-400 hover:text-blue-600 underline whitespace-nowrap"
                        >
                          {sitemapSubmitting ? '제출 중...' : '재제출'}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSubmitSitemap}
                        disabled={sitemapSubmitting}
                        className="text-xs px-2.5 py-1 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors whitespace-nowrap"
                      >
                        {sitemapSubmitting ? '제출 중...' : '제출하기'}
                      </button>
                    )}
                  </div>
                  {config.tracking.sitemap_submitted_at && !sitemapResult && (
                    <p className="text-[11px] text-gray-400 mt-1">
                      마지막 제출: {new Date(config.tracking.sitemap_submitted_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  )}
                  {sitemapResult && (
                    <p className={`text-[11px] mt-1.5 ${sitemapResult.ok ? 'text-green-600' : 'text-red-500'}`}>
                      {sitemapResult.ok ? '✓ ' : '✗ '}{sitemapResult.message}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => {
                    window.location.href = `/api/oauth/google-indexing/authorize?blogId=${blogId}`
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Google 계정 연결하기 (Indexing API)
                </button>
                <p className="text-[11px] text-gray-400 text-center">
                  연결하면 모든 블로그가 GSC에 자동 등록되고, 글 발행 시 자동 색인됩니다.
                </p>
                <div className="text-[11px] text-gray-400 bg-white rounded p-2 space-y-0.5 leading-relaxed">
                  <p>Google 계정을 연결하면 <strong>Indexing API + Search Console</strong> 권한이 부여됩니다.</p>
                  <p>연결 시 모든 블로그가 <strong>GSC에 자동 등록</strong>되며,</p>
                  <p>새 블로그 생성 시에도 자동으로 등록됩니다.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 네이버 서치어드바이저 */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">네이버 서치어드바이저</Label>
          <Input
            value={config.tracking.naver_code}
            onChange={e => updateTracking({ naver_code: e.target.value })}
            placeholder="확인 코드"
            className="text-sm font-mono"
          />
          <details className="group">
            <summary className="text-xs text-blue-600 cursor-pointer hover:underline">어디서 찾나요?</summary>
            <div className="mt-1.5 text-xs text-gray-500 bg-gray-50 rounded-lg p-3 space-y-1 leading-relaxed">
              <p>1. <a href="https://searchadvisor.naver.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">네이버 서치어드바이저</a>에 로그인합니다.</p>
              <p>2. <strong>웹마스터 도구</strong> → <strong>사이트 추가</strong>에서 블로그 URL을 등록합니다.</p>
              <p>3. 소유 확인 방법에서 <strong>&quot;HTML 태그&quot;</strong>를 선택합니다.</p>
              <p>4. 아래와 같은 메타 태그가 표시됩니다:</p>
              <code className="block bg-gray-200 px-2 py-1 rounded text-[11px] break-all">&lt;meta name=&quot;naver-site-verification&quot; content=&quot;<strong>여기_값</strong>&quot; /&gt;</code>
              <p>5. <strong>content=&quot;...&quot;</strong> 안의 값만 복사하여 위에 붙여넣으세요.</p>
              <p className="text-gray-400 pt-1">✓ 입력하면 네이버 검색에 블로그가 등록되어, 네이버 검색 노출/색인 현황과 방문 분석을 확인할 수 있습니다. 한국 대상 블로그라면 필수입니다.</p>
            </div>
          </details>
        </div>

        {/* 카카오 픽셀 */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">카카오 픽셀</Label>
          <Input
            value={config.tracking.kakao_pixel}
            onChange={e => updateTracking({ kakao_pixel: e.target.value })}
            placeholder="픽셀 ID"
            className="text-sm font-mono"
          />
          <details className="group">
            <summary className="text-xs text-blue-600 cursor-pointer hover:underline">어디서 찾나요?</summary>
            <div className="mt-1.5 text-xs text-gray-500 bg-gray-50 rounded-lg p-3 space-y-1 leading-relaxed">
              <p>1. <a href="https://moment.kakao.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">카카오 모먼트</a>에 로그인합니다.</p>
              <p>2. <strong>도구</strong> → <strong>카카오 픽셀 &amp; SDK</strong>로 이동합니다.</p>
              <p>3. <strong>새 픽셀 만들기</strong>로 픽셀을 생성하거나, 기존 픽셀을 선택합니다.</p>
              <p>4. 픽셀 상세 페이지에서 <strong>픽셀 ID</strong> (숫자)를 확인합니다.</p>
              <p>5. 이 숫자를 위 입력란에 붙여넣으세요.</p>
              <p className="text-gray-400 pt-1">✓ 입력하면 카카오 광고를 통해 유입된 방문자의 행동(페이지뷰, 전환 등)을 추적할 수 있습니다. 카카오 광고를 운영하지 않는다면 비워두셔도 됩니다.</p>
            </div>
          </details>
        </div>

        {/* 고급: 커스텀 코드 */}
        <details className="group">
          <summary className="text-xs font-medium text-gray-500 cursor-pointer hover:text-gray-700">
            고급: 커스텀 코드
          </summary>
          <div className="mt-3 space-y-4">
            {/* 커스텀 <head> */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">커스텀 {'<head>'} 코드</Label>
              <textarea
                value={config.tracking.custom_head}
                onChange={e => updateTracking({ custom_head: e.target.value })}
                placeholder="<head> 태그 안에 삽입할 HTML/스크립트"
                rows={4}
                className="w-full text-xs font-mono border border-gray-200 rounded-md px-3 py-2 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <details className="group">
                <summary className="text-xs text-blue-600 cursor-pointer hover:underline">이것은 무엇인가요? (상세 가이드)</summary>
                <div className="mt-1.5 text-xs text-gray-500 bg-amber-50 border border-amber-100 rounded-lg p-3 space-y-2 leading-relaxed">
                  <p><strong>{'<head>'} 코드란?</strong> 블로그 HTML의 {'<head>'} 영역에 삽입되는 코드입니다. 방문자에게 직접 보이지 않지만, 브라우저가 페이지를 로드할 때 먼저 실행됩니다.</p>
                  <p className="font-semibold text-gray-700">자주 사용되는 코드:</p>
                  <div className="space-y-2">
                    <div className="bg-white rounded p-2 border border-amber-100">
                      <p className="font-medium text-gray-700">1. 웹폰트 로드</p>
                      <code className="block text-[11px] text-gray-500 mt-1 break-all">&lt;link href=&quot;https://fonts.googleapis.com/css2?family=Noto+Serif+KR&quot; rel=&quot;stylesheet&quot;&gt;</code>
                      <p className="text-gray-400 mt-1">→ Google Fonts에서 원하는 폰트를 선택 후 {'<link>'} 코드를 복사합니다.</p>
                    </div>
                    <div className="bg-white rounded p-2 border border-amber-100">
                      <p className="font-medium text-gray-700">2. 파비콘 (브라우저 탭 아이콘)</p>
                      <code className="block text-[11px] text-gray-500 mt-1 break-all">&lt;link rel=&quot;icon&quot; href=&quot;https://example.com/favicon.ico&quot;&gt;</code>
                      <p className="text-gray-400 mt-1">→ 16x16 또는 32x32 픽셀 ICO/PNG 파일의 URL을 넣습니다.</p>
                    </div>
                    <div className="bg-white rounded p-2 border border-amber-100">
                      <p className="font-medium text-gray-700">3. Open Graph / SNS 공유 메타태그</p>
                      <code className="block text-[11px] text-gray-500 mt-1 break-all">&lt;meta property=&quot;og:image&quot; content=&quot;https://example.com/thumbnail.jpg&quot;&gt;</code>
                      <p className="text-gray-400 mt-1">→ 카카오톡, 페이스북 등에서 링크 공유 시 표시되는 썸네일/제목을 지정합니다.</p>
                    </div>
                    <div className="bg-white rounded p-2 border border-amber-100">
                      <p className="font-medium text-gray-700">4. 외부 분석 도구 스크립트</p>
                      <code className="block text-[11px] text-gray-500 mt-1 break-all">&lt;script src=&quot;https://cdn.example.com/analytics.js&quot;&gt;&lt;/script&gt;</code>
                      <p className="text-gray-400 mt-1">→ Hotjar, Microsoft Clarity, Channel Talk 등 서드파티 도구의 스크립트 코드를 넣습니다. 각 서비스의 설치 가이드에서 {'<head>'}에 넣으라는 코드를 여기에 붙여넣으면 됩니다.</p>
                    </div>
                    <div className="bg-white rounded p-2 border border-amber-100">
                      <p className="font-medium text-gray-700">5. 커스텀 CSS 스타일</p>
                      <code className="block text-[11px] text-gray-500 mt-1 break-all">&lt;style&gt; .my-class {'{'} color: red; {'}'} &lt;/style&gt;</code>
                      <p className="text-gray-400 mt-1">→ 블로그의 특정 요소 스타일을 직접 수정하고 싶을 때 CSS를 넣습니다.</p>
                    </div>
                  </div>
                  <p className="text-amber-700 pt-1">⚠️ 잘못된 스크립트를 넣으면 블로그 로딩 속도가 느려지거나 오류가 발생할 수 있습니다. 신뢰할 수 있는 서비스의 공식 코드만 넣어주세요.</p>
                </div>
              </details>
            </div>

            {/* 커스텀 <body> */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">커스텀 {'<body>'} 코드</Label>
              <textarea
                value={config.tracking.custom_body}
                onChange={e => updateTracking({ custom_body: e.target.value })}
                placeholder="<body> 태그 끝에 삽입할 HTML/스크립트"
                rows={4}
                className="w-full text-xs font-mono border border-gray-200 rounded-md px-3 py-2 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <details className="group">
                <summary className="text-xs text-blue-600 cursor-pointer hover:underline">이것은 무엇인가요? (상세 가이드)</summary>
                <div className="mt-1.5 text-xs text-gray-500 bg-amber-50 border border-amber-100 rounded-lg p-3 space-y-2 leading-relaxed">
                  <p><strong>{'<body>'} 코드란?</strong> 블로그 HTML의 {'<body>'} 태그 맨 끝에 삽입됩니다. 페이지 콘텐츠가 모두 로드된 후 실행되므로, 페이지 로딩 속도에 영향을 덜 줍니다.</p>
                  <p className="font-semibold text-gray-700">자주 사용되는 코드:</p>
                  <div className="space-y-2">
                    <div className="bg-white rounded p-2 border border-amber-100">
                      <p className="font-medium text-gray-700">1. 실시간 채팅 위젯</p>
                      <p className="text-gray-400 mt-1">→ <strong>Channel Talk, Zendesk, Crisp</strong> 등 고객 상담 채팅 위젯 코드입니다. 각 서비스 대시보드에서 &quot;설치 코드&quot;를 복사하면 됩니다. 블로그 우하단에 채팅 버튼이 나타납니다.</p>
                    </div>
                    <div className="bg-white rounded p-2 border border-amber-100">
                      <p className="font-medium text-gray-700">2. 히트맵 / 사용자 행동 분석</p>
                      <p className="text-gray-400 mt-1">→ <strong>Microsoft Clarity, Hotjar</strong> 등에서 제공하는 코드를 넣으면, 방문자가 어디를 클릭하고, 어디까지 스크롤했는지 히트맵으로 확인할 수 있습니다. 무료 서비스도 있습니다.</p>
                    </div>
                    <div className="bg-white rounded p-2 border border-amber-100">
                      <p className="font-medium text-gray-700">3. 팝업 / 배너 스크립트</p>
                      <p className="text-gray-400 mt-1">→ 뉴스레터 구독 팝업, 이벤트 배너 등을 보여주는 외부 스크립트입니다. <strong>Mailchimp, Stibee</strong> 등에서 제공합니다.</p>
                    </div>
                    <div className="bg-white rounded p-2 border border-amber-100">
                      <p className="font-medium text-gray-700">4. 리타겟팅 / 광고 전환 태그</p>
                      <p className="text-gray-400 mt-1">→ <strong>Meta (Facebook) Pixel, Google Ads 전환 태그, 네이버 전환 스크립트</strong> 등입니다. 각 광고 플랫폼에서 &quot;전환 추적 코드&quot;를 복사하여 붙여넣습니다. 광고 성과를 측정하려면 필요합니다.</p>
                    </div>
                    <div className="bg-white rounded p-2 border border-amber-100">
                      <p className="font-medium text-gray-700">5. 커스텀 JavaScript</p>
                      <code className="block text-[11px] text-gray-500 mt-1 break-all">&lt;script&gt; console.log(&apos;블로그 로드 완료&apos;) &lt;/script&gt;</code>
                      <p className="text-gray-400 mt-1">→ 직접 작성한 JavaScript 코드를 넣어 블로그 동작을 커스터마이즈할 수 있습니다.</p>
                    </div>
                  </div>
                  <p className="text-amber-700 pt-1">⚠️ {'<body>'} 코드는 페이지 로드 후 실행되어 사용자 경험에 직접 영향을 줍니다. 알 수 없는 출처의 스크립트는 넣지 마세요.</p>
                </div>
              </details>
            </div>
          </div>
        </details>
      </Section>

      {/* ═══ 6. 최근글 / 추천글 ═══ */}
      <Section title="최근글 / 추천글">
        <Toggle
          label="글 하단에 관련글 표시"
          checked={config.related_posts.enabled}
          onChange={v => updateRelatedPosts({ enabled: v })}
        />
        {config.related_posts.enabled && (
          <>
            <div className="space-y-1">
              <Label className="text-xs">표시 방식</Label>
              <div className="flex gap-2">
                {([
                  { value: 'recent', label: '최근글' },
                  { value: 'popular', label: '추천글 (조회수 순)' },
                ] as const).map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateRelatedPosts({ type: opt.value })}
                    className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
                      config.related_posts.type === opt.value
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">표시 개수</Label>
              <div className="flex gap-2">
                {[3, 5, 10].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => updateRelatedPosts({ count: n })}
                    className={`px-4 py-1.5 text-xs rounded-md border transition-colors ${
                      config.related_posts.count === n
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    {n}개
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">섹션 제목 (비우면 기본값 사용)</Label>
              <Input
                value={config.related_posts.section_title}
                onChange={e => updateRelatedPosts({ section_title: e.target.value })}
                placeholder={config.related_posts.type === 'recent' ? '최근 글' : '추천 글'}
                className="text-sm"
              />
            </div>
            <p className="text-xs text-gray-400">글 본문 하단 — 하단 광고 아래에 표시됩니다.</p>
          </>
        )}
      </Section>

      {/* 저장 버튼 */}
      <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
        {saving ? (
          <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />저장 중...</>
        ) : (
          <><Save className="w-4 h-4 mr-1.5" />레이아웃 저장</>
        )}
      </Button>

      {/* JSON 편집 모달 */}
      {showJsonModal && (
        <JsonModal
          config={config}
          onApply={setConfig}
          onClose={() => setShowJsonModal(false)}
        />
      )}
    </div>
  )
}
