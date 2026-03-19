'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronDown, ExternalLink, AlertCircle } from 'lucide-react'
import { API_GUIDE_CONTENTS } from '@/lib/constants/api-guide-contents'

interface ApiGuideAccordionProps {
  provider: string
  label?: string
}

export function ApiGuideAccordion({ provider, label }: ApiGuideAccordionProps) {
  const [isOpen, setIsOpen] = useState(false)
  const guide = API_GUIDE_CONTENTS[provider]

  if (!guide) {
    return null
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/50 hover:bg-muted transition-colors"
      >
        <div className="text-left">
          <h4 className="font-medium text-sm">{label || guide.title}</h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            {guide.cost}
          </p>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="px-4 py-4 bg-background space-y-4 border-t">
          {/* 가입 링크 */}
          <div>
            <a
              href={guide.signupUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-medium"
            >
              {guide.title} 가입하기
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>

          {/* 단계별 가이드 */}
          <div>
            <h5 className="text-sm font-medium mb-2">단계별 가이드</h5>
            <ol className="space-y-2">
              {guide.steps.map((step, index) => (
                <li
                  key={index}
                  className="text-sm text-muted-foreground flex gap-3"
                >
                  <span className="font-medium text-primary shrink-0">
                    {index + 1}.
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* 비용 정보 */}
          <div className="bg-muted/50 rounded-lg p-3">
            <h5 className="text-sm font-medium mb-1">비용 정보</h5>
            <p className="text-xs text-muted-foreground">{guide.cost}</p>
          </div>

          {/* 경고 사항 */}
          {guide.warnings.length > 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-950 rounded-lg p-3 border border-yellow-200 dark:border-yellow-800">
              <div className="flex gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-sm font-medium text-yellow-900 dark:text-yellow-100 mb-1">
                    주의사항
                  </h5>
                  <ul className="text-xs text-yellow-800 dark:text-yellow-200 space-y-1">
                    {guide.warnings.map((warning, index) => (
                      <li key={index} className="flex gap-2">
                        <span className="shrink-0">•</span>
                        <span>{warning}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
