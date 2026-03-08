'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

export interface ButtonEditData {
  text: string
  href: string
  bgColor: string
  textColor: string
  padding: string
  borderRadius: string
  fontSize?: string
}

interface ButtonInsertPanelProps {
  onInsert: (html: string) => void
  onClose: () => void
  editData?: ButtonEditData | null
  onUpdate?: (html: string) => void
}

const STORAGE_KEY = 'editor-button-defaults'

const BG_PRESETS = [
  { name: '빨강', value: '#dc2626' },
  { name: '파랑', value: '#2563eb' },
  { name: '초록', value: '#16a34a' },
  { name: '주황', value: '#ea580c' },
  { name: '보라', value: '#7c3aed' },
  { name: '검정', value: '#1f2937' },
  { name: '회색', value: '#6b7280' },
]

const TEXT_PRESETS = [
  { name: '흰색', value: '#ffffff' },
  { name: '검정', value: '#1f2937' },
  { name: '빨강', value: '#dc2626' },
  { name: '파랑', value: '#2563eb' },
  { name: '노랑', value: '#facc15' },
]

const ROUND_OPTIONS = [
  { label: '없음', value: '0' },
  { label: '약간', value: '4px' },
  { label: '보통', value: '8px' },
  { label: '둥글게', value: '16px' },
  { label: '최대', value: '9999px' },
]

const HEIGHT_OPTIONS = [
  { label: '낮게', value: '8px 16px' },
  { label: '기본', value: '12px 24px' },
  { label: '높게', value: '16px 32px' },
]

const FONT_SIZE_OPTIONS = [
  { label: '작게', value: '12px' },
  { label: '기본', value: '14px' },
  { label: '크게', value: '16px' },
]

interface ButtonConfig {
  text: string
  bgColor: string
  textColor: string
  round: string
  height: string
  fontSize: string
  href: string
}

const DEFAULT_CONFIG: ButtonConfig = {
  text: '버튼',
  bgColor: '#dc2626',
  textColor: '#ffffff',
  round: '8px',
  height: '12px 24px',
  fontSize: '12px',
  href: '',
}

function loadDefaults(): ButtonConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return { ...DEFAULT_CONFIG, ...JSON.parse(saved), text: '버튼', href: '' }
  } catch { /* ignore */ }
  return DEFAULT_CONFIG
}

function saveDefaults(config: ButtonConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      bgColor: config.bgColor,
      textColor: config.textColor,
      round: config.round,
      height: config.height,
      fontSize: config.fontSize,
    }))
  } catch { /* ignore */ }
}

function ColorPicker({ presets, value, onChange, label }: {
  presets: { name: string; value: string }[]
  value: string
  onChange: (v: string) => void
  label: string
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-1.5">
        {presets.map(c => (
          <button key={c.value} onClick={() => onChange(c.value)}
            className={`w-6 h-6 rounded-full border-2 transition-all ${
              value === c.value ? 'border-gray-900 scale-110' : 'border-gray-200'
            }`}
            style={{ backgroundColor: c.value }}
            title={c.name} />
        ))}
        <div className="relative ml-1">
          <input type="color" value={value} onChange={e => onChange(e.target.value)}
            className="absolute inset-0 w-6 h-6 opacity-0 cursor-pointer" />
          <div className="w-6 h-6 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center text-[10px] text-gray-400"
            style={{ backgroundColor: presets.some(p => p.value === value) ? 'transparent' : value }}
            title="직접 선택">
            {presets.some(p => p.value === value) ? '+' : ''}
          </div>
        </div>
      </div>
    </div>
  )
}

export function ButtonInsertPanel({ onInsert, onClose, editData, onUpdate }: ButtonInsertPanelProps) {
  const isEditMode = !!editData

  const [config, setConfig] = useState<ButtonConfig>(DEFAULT_CONFIG)

  useEffect(() => {
    if (editData) {
      setConfig({
        text: editData.text,
        bgColor: editData.bgColor,
        textColor: editData.textColor,
        round: editData.borderRadius,
        height: editData.padding,
        fontSize: editData.fontSize || '12px',
        href: editData.href,
      })
    } else {
      setConfig(loadDefaults())
    }
  }, [editData])

  const update = (partial: Partial<ButtonConfig>) => {
    setConfig(prev => ({ ...prev, ...partial }))
  }

  const buildHtml = () => {
    let href = config.href.trim()
    if (href && !/^https?:\/\//i.test(href)) {
      href = `https://${href}`
    }

    const dataAttrs = `data-button="true" data-bg-color="${config.bgColor}" data-text-color="${config.textColor}" data-padding="${config.height}" data-border-radius="${config.round}" data-font-size="${config.fontSize}"`
    const style = `display:inline-block;background-color:${config.bgColor};color:${config.textColor};padding:${config.height};border-radius:${config.round};text-decoration:none;font-weight:600;font-size:${config.fontSize};text-align:center;cursor:pointer;`

    const btnHtml = href
      ? `<a href="${href}" ${dataAttrs} style="${style}" target="_blank" rel="noopener noreferrer">${config.text}</a>`
      : `<span ${dataAttrs} style="${style}">${config.text}</span>`

    return `<div style="text-align:center;margin:1.2em 0;">${btnHtml}</div>`
  }

  const handleInsert = () => {
    if (!config.text.trim()) return
    saveDefaults(config)
    const html = buildHtml()

    if (isEditMode && onUpdate) {
      onUpdate(html)
    } else {
      onInsert(html)
    }
  }

  const previewStyle = {
    display: 'inline-block' as const,
    backgroundColor: config.bgColor,
    color: config.textColor,
    padding: config.height,
    borderRadius: config.round,
    fontWeight: 600,
    fontSize: config.fontSize,
    textAlign: 'center' as const,
  }

  return (
    <div className="border-b border-gray-100 bg-blue-50/30 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-700">
          {isEditMode ? '버튼 수정' : '버튼 추가'}
        </h4>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">버튼 텍스트</Label>
          <Input value={config.text} onChange={e => update({ text: e.target.value })}
            placeholder="버튼 텍스트" className="text-sm h-8" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">링크 URL</Label>
          <Input value={config.href} onChange={e => update({ href: e.target.value })}
            placeholder="https://..." className="text-sm h-8" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <ColorPicker presets={BG_PRESETS} value={config.bgColor} onChange={v => update({ bgColor: v })} label="배경색" />
        <ColorPicker presets={TEXT_PRESETS} value={config.textColor} onChange={v => update({ textColor: v })} label="글자색" />
        <div className="space-y-1">
          <Label className="text-xs">글자크기</Label>
          <div className="flex gap-1">
            {FONT_SIZE_OPTIONS.map(f => (
              <button key={f.value} onClick={() => update({ fontSize: f.value })}
                className={`px-2 py-1 text-xs rounded border transition-colors ${
                  config.fontSize === f.value ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 hover:bg-gray-100'
                }`}>{f.label}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">모서리</Label>
          <div className="flex gap-1">
            {ROUND_OPTIONS.map(r => (
              <button key={r.value} onClick={() => update({ round: r.value })}
                className={`px-2 py-1 text-xs rounded border transition-colors ${
                  config.round === r.value ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 hover:bg-gray-100'
                }`}>{r.label}</button>
            ))}
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">높이</Label>
          <div className="flex gap-1">
            {HEIGHT_OPTIONS.map(h => (
              <button key={h.value} onClick={() => update({ height: h.value })}
                className={`px-2 py-1 text-xs rounded border transition-colors ${
                  config.height === h.value ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 hover:bg-gray-100'
                }`}>{h.label}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-gray-200">
        <div>
          <span className="text-xs text-gray-400 mr-2">미리보기:</span>
          <span style={previewStyle}>{config.text || '버튼'}</span>
        </div>
        <Button size="sm" onClick={handleInsert} disabled={!config.text.trim()}>
          {isEditMode ? '수정' : '추가'}
        </Button>
      </div>
    </div>
  )
}
