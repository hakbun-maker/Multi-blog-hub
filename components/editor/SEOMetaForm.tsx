'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface SEOMetaFormProps {
  seoTitle: string
  seoDescription: string
  onTitleChange: (v: string) => void
  onDescChange: (v: string) => void
}

export function SEOMetaForm({ seoTitle, seoDescription, onTitleChange, onDescChange }: SEOMetaFormProps) {
  return (
    <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <h3 className="text-sm font-semibold text-gray-700">SEO 설정</h3>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs">메타 제목</Label>
          <span className={`text-xs ${seoTitle.length > 60 ? 'text-red-500' : 'text-gray-400'}`}>
            {seoTitle.length}/60
          </span>
        </div>
        <Input value={seoTitle} onChange={e => onTitleChange(e.target.value)}
          placeholder="검색 결과에 표시될 제목" className="text-sm" />
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs">메타 설명</Label>
          <span className={`text-xs ${seoDescription.length > 160 ? 'text-red-500' : 'text-gray-400'}`}>
            {seoDescription.length}/160
          </span>
        </div>
        <textarea
          value={seoDescription}
          onChange={e => onDescChange(e.target.value)}
          placeholder="검색 결과에 표시될 설명"
          rows={2}
          className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
    </div>
  )
}
