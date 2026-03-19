'use client'

import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { GradeBadge } from '@/components/monetize/shared/GradeBadge'
import type { Grade, IntentType } from '@/types/monetize'

interface MonetizeEditorHeaderProps {
  keyword: string
  keywordGrade?: Grade
  intentType?: IntentType | null
  blogName: string
}

export function MonetizeEditorHeader({ keyword, keywordGrade, intentType, blogName }: MonetizeEditorHeaderProps) {
  const router = useRouter()

  return (
    <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
      <button onClick={() => router.push('/monetize/writing')} className="text-gray-400 hover:text-gray-600">
        <ArrowLeft className="w-5 h-5" />
      </button>
      <div className="flex items-center gap-2 flex-1">
        <span className="font-semibold text-gray-900">{keyword}</span>
        {keywordGrade && <GradeBadge grade={keywordGrade} />}
        {intentType && (
          <span className="px-2 py-0.5 text-xs font-medium bg-orange-50 text-orange-700 rounded">{intentType}</span>
        )}
      </div>
      <span className="text-sm text-gray-500">{blogName}</span>
    </div>
  )
}
