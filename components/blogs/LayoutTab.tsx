'use client'

import { useState, useEffect, useCallback } from 'react'
import { Save, ChevronDown, ChevronUp, Plus, Trash2, GripVertical, Loader2, Eye, Code, X } from 'lucide-react'
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
    bg_color: string
    text_color: string
    sticky: boolean
    height: 'compact' | 'normal' | 'tall'
    notice_bar: { enabled: boolean; text: string; bg_color: string }
    nav_items: NavItem[]
  }
  layout: {
    preset: 'minimal' | 'right_sidebar' | 'left_sidebar' | 'magazine'
    max_width: string
    bg_color: string
    font: string
    font_size: number
    line_height: number
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
    naver_code: string
    kakao_pixel: string
    custom_head: string
    custom_body: string
  }
}

// ─── 기본값 ───

export const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  header: {
    logo_type: 'text',
    logo_image_url: null,
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
    naver_code: '',
    kakao_pixel: '',
    custom_head: '',
    custom_body: '',
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
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <span className="text-sm font-semibold text-gray-800">{title}</span>
        {open ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
      </button>
      {open && <div className="p-4 space-y-4">{children}</div>}
    </div>
  )
}

// ─── 레이아웃 프리셋 카드 ───

const PRESET_OPTIONS: { value: LayoutConfig['layout']['preset']; label: string; desc: string }[] = [
  { value: 'minimal', label: '미니멀', desc: '전체 너비' },
  { value: 'right_sidebar', label: '우측 사이드바', desc: '본문 + 우측' },
  { value: 'left_sidebar', label: '좌측 사이드바', desc: '좌측 + 본문' },
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
  initialConfig: Partial<LayoutConfig> | null | undefined
  onSuccess: (msg: string) => void
}

export default function LayoutTab({ blogId, blogSlug, initialConfig, onSuccess }: LayoutTabProps) {
  const [config, setConfig] = useState<LayoutConfig>(() => mergeConfig(initialConfig))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showJsonModal, setShowJsonModal] = useState(false)

  // initialConfig가 나중에 로드될 수 있으므로 업데이트
  useEffect(() => {
    setConfig(mergeConfig(initialConfig))
  }, [initialConfig])

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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.'
      setError(message)
    }
    setSaving(false)
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
            onClick={() => window.open(`/blog/${blogSlug}`, '_blank')}
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
          </div>
        )}

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
            <Button type="button" variant="outline" size="sm" onClick={addNavItem} className="h-7 text-xs">
              <Plus className="w-3 h-3 mr-1" />추가
            </Button>
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
          {(config.layout.preset === 'left_sidebar' || config.layout.preset === 'right_sidebar') && (
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
        <div className="space-y-1">
          <Label className="text-xs">AdSense Publisher ID</Label>
          <Input
            value={config.ads.adsense_pub_id}
            onChange={e => updateAds({ adsense_pub_id: e.target.value })}
            placeholder="ca-pub-xxxxxxxxxxxx"
            className="text-sm font-mono"
          />
        </div>

        {/* 광고 슬롯 */}
        {AD_SLOTS.map(slot => {
          const adSlot = config.ads[slot.key]
          if (typeof adSlot !== 'object' || adSlot === null) return null
          const typedSlot = adSlot as AdSlot
          const isSidebar = slot.key === 'left_sidebar_ad' || slot.key === 'right_sidebar_ad'
          const sidebarInactive =
            (slot.key === 'left_sidebar_ad' && config.layout.preset !== 'left_sidebar') ||
            (slot.key === 'right_sidebar_ad' && config.layout.preset !== 'right_sidebar')

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
                <textarea
                  value={typedSlot.code}
                  onChange={e => updateAdSlot(slot.key, { code: e.target.value })}
                  placeholder="광고 코드를 붙여넣으세요 (AdSense, etc.)"
                  rows={3}
                  className="w-full text-xs font-mono border border-gray-200 rounded-md px-3 py-2 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
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
        <div className="space-y-1">
          <Label className="text-xs">Google Analytics 4 ID</Label>
          <Input
            value={config.tracking.ga4_id}
            onChange={e => updateTracking({ ga4_id: e.target.value })}
            placeholder="G-XXXXXXXXXX"
            className="text-sm font-mono"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Google Search Console (확인 코드)</Label>
          <Input
            value={config.tracking.gsc_code}
            onChange={e => updateTracking({ gsc_code: e.target.value })}
            placeholder="확인 코드 (meta 태그 content 값)"
            className="text-sm font-mono"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">네이버 서치어드바이저</Label>
          <Input
            value={config.tracking.naver_code}
            onChange={e => updateTracking({ naver_code: e.target.value })}
            placeholder="확인 코드"
            className="text-sm font-mono"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">카카오 픽셀</Label>
          <Input
            value={config.tracking.kakao_pixel}
            onChange={e => updateTracking({ kakao_pixel: e.target.value })}
            placeholder="픽셀 ID"
            className="text-sm font-mono"
          />
        </div>

        {/* 고급: 커스텀 코드 */}
        <details className="group">
          <summary className="text-xs font-medium text-gray-500 cursor-pointer hover:text-gray-700">
            고급: 커스텀 코드
          </summary>
          <div className="mt-3 space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">커스텀 {'<head>'} 코드</Label>
              <textarea
                value={config.tracking.custom_head}
                onChange={e => updateTracking({ custom_head: e.target.value })}
                placeholder="<head> 태그 안에 삽입할 HTML/스크립트"
                rows={4}
                className="w-full text-xs font-mono border border-gray-200 rounded-md px-3 py-2 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">커스텀 {'<body>'} 코드</Label>
              <textarea
                value={config.tracking.custom_body}
                onChange={e => updateTracking({ custom_body: e.target.value })}
                placeholder="<body> 태그 끝에 삽입할 HTML/스크립트"
                rows={4}
                className="w-full text-xs font-mono border border-gray-200 rounded-md px-3 py-2 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </details>
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
