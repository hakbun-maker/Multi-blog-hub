'use client'

import { X } from 'lucide-react'

interface HrInsertPanelProps {
  onInsert: (html: string) => void
  onClose: () => void
}

const HR_STYLES = [
  {
    label: '기본 실선',
    preview: 'border-t-2 border-gray-300',
    html: '<hr style="border:none;border-top:2px solid #d1d5db;margin:1.5em 0;" />',
  },
  {
    label: '가는 실선',
    preview: 'border-t border-gray-300',
    html: '<hr style="border:none;border-top:1px solid #d1d5db;margin:1.5em 0;" />',
  },
  {
    label: '굵은 실선',
    preview: 'border-t-4 border-gray-400',
    html: '<hr style="border:none;border-top:4px solid #9ca3af;margin:1.5em 0;" />',
  },
  {
    label: '점선',
    preview: 'border-t-2 border-dashed border-gray-300',
    html: '<hr style="border:none;border-top:2px dashed #d1d5db;margin:1.5em 0;" />',
  },
  {
    label: '짧은 가운데 라인',
    preview: '',
    customPreview: true,
    html: '<div style="text-align:center;margin:1.5em 0;"><hr style="border:none;border-top:2px solid #d1d5db;width:40%;display:inline-block;" /></div>',
  },
  {
    label: '세 점',
    preview: '',
    customPreview: true,
    html: '<p style="text-align:center;font-size:1.5em;letter-spacing:0.5em;color:#9ca3af;margin:1em 0;">···</p>',
  },
  {
    label: '별 세 개',
    preview: '',
    customPreview: true,
    html: '<p style="text-align:center;font-size:1.2em;letter-spacing:0.5em;color:#9ca3af;margin:1em 0;">✦ ✦ ✦</p>',
  },
  {
    label: '그라데이션',
    preview: '',
    customPreview: true,
    html: '<hr style="border:none;height:2px;background:linear-gradient(to right,transparent,#9ca3af,transparent);margin:1.5em 0;" />',
  },
]

export function HrInsertPanel({ onInsert, onClose }: HrInsertPanelProps) {
  return (
    <div className="border-b border-gray-100 bg-gray-50/50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-700">라인 추가</h4>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {HR_STYLES.map((hr, i) => (
          <button
            key={i}
            onClick={() => onInsert(hr.html)}
            className="flex flex-col items-start gap-1.5 p-3 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50/50 transition-colors text-left"
          >
            <span className="text-xs text-gray-500">{hr.label}</span>
            <div className="w-full">
              {hr.customPreview ? (
                hr.label === '짧은 가운데 라인' ? (
                  <div className="text-center"><div className="inline-block w-2/5 border-t-2 border-gray-300" /></div>
                ) : hr.label === '세 점' ? (
                  <p className="text-center text-lg tracking-widest text-gray-400">···</p>
                ) : hr.label === '별 세 개' ? (
                  <p className="text-center text-sm tracking-widest text-gray-400">✦ ✦ ✦</p>
                ) : hr.label === '그라데이션' ? (
                  <div className="h-0.5" style={{ background: 'linear-gradient(to right,transparent,#9ca3af,transparent)' }} />
                ) : null
              ) : (
                <div className={`w-full ${hr.preview}`} />
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
