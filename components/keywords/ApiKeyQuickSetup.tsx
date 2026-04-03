'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { CheckCircle, XCircle, ExternalLink, Loader2, KeyRound } from 'lucide-react'
import Link from 'next/link'

interface ApiKeyStatus {
  provider: string
  is_active: boolean
}

interface ApiKeyInfo {
  provider: string
  label: string
  description: string
  required: boolean
  guideUrl: string
  siteName: string
  fields: string
}

const API_KEY_INFO: ApiKeyInfo[] = [
  {
    provider: 'naver_ad',
    label: '네이버 광고 API',
    description: '월간 검색량, 경쟁도, CPC 분석의 핵심 데이터 소스',
    required: true,
    guideUrl: 'https://manage.searchad.naver.com',
    siteName: 'searchad.naver.com',
    fields: 'API Key + Secret Key + Customer ID',
  },
  {
    provider: 'naver_search',
    label: '네이버 검색 API',
    description: '트렌드 분석, 이벤트/공연/경기 키워드 자동 수집',
    required: true,
    guideUrl: 'https://developers.naver.com/apps',
    siteName: 'developers.naver.com',
    fields: 'Client ID + Client Secret',
  },
  {
    provider: 'google_kwp',
    label: 'Google Keyword Planner',
    description: '글로벌 검색량 분석 (해외 블로그 운영 시 필수)',
    required: false,
    guideUrl: 'https://ads.google.com/aw/apicenter',
    siteName: 'ads.google.com',
    fields: 'Developer Token',
  },
  {
    provider: 'google_trends',
    label: 'Google Trends (SerpAPI)',
    description: '급상승 검색어 수집 강화 (없어도 RSS로 기본 동작)',
    required: false,
    guideUrl: 'https://serpapi.com/google-trends-api',
    siteName: 'serpapi.com',
    fields: 'API Key',
  },
]

interface ApiKeyQuickSetupProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ApiKeyQuickSetup({ open, onOpenChange }: ApiKeyQuickSetupProps) {
  const [registeredKeys, setRegisteredKeys] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch('/api/ai-keys')
      .then(res => res.json())
      .then(json => {
        const providers = new Set<string>(
          (json.data ?? [])
            .filter((k: ApiKeyStatus) => k.is_active)
            .map((k: ApiKeyStatus) => k.provider)
        )
        setRegisteredKeys(providers)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [open])

  const requiredKeys = API_KEY_INFO.filter(k => k.required)
  const optionalKeys = API_KEY_INFO.filter(k => !k.required)
  const requiredRegistered = requiredKeys.filter(k => registeredKeys.has(k.provider)).length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-orange-500" />
            키워드 탐색 API 키 설정
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="space-y-5">
            {/* Status summary */}
            <div className={`p-3 rounded-lg text-sm ${requiredRegistered === requiredKeys.length ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}`}>
              {requiredRegistered === requiredKeys.length
                ? '필수 API 키가 모두 등록되어 있습니다. 키워드 탐색을 시작하세요!'
                : `필수 API 키 ${requiredRegistered}/${requiredKeys.length}개 등록됨. 미등록 키를 등록해야 정확한 분석이 가능합니다.`
              }
            </div>

            {/* Required keys */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">필수 API 키</h3>
              <div className="space-y-2">
                {requiredKeys.map(info => (
                  <ApiKeyRow key={info.provider} info={info} registered={registeredKeys.has(info.provider)} />
                ))}
              </div>
            </div>

            {/* Optional keys */}
            <div>
              <h3 className="text-sm font-semibold text-gray-500 mb-2">선택 API 키</h3>
              <div className="space-y-2">
                {optionalKeys.map(info => (
                  <ApiKeyRow key={info.provider} info={info} registered={registeredKeys.has(info.provider)} />
                ))}
              </div>
            </div>

            {/* Action */}
            <div className="pt-2 border-t">
              <Link href="/settings?tab=api">
                <Button variant="outline" className="w-full gap-2">
                  <KeyRound className="w-4 h-4" />
                  설정 페이지에서 API 키 등록/관리
                </Button>
              </Link>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function ApiKeyRow({ info, registered }: { info: ApiKeyInfo; registered: boolean }) {
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${registered ? 'border-green-200 bg-green-50/50' : 'border-gray-200 bg-gray-50/50'}`}>
      <div className="mt-0.5">
        {registered ? (
          <CheckCircle className="w-4 h-4 text-green-500" />
        ) : (
          <XCircle className="w-4 h-4 text-gray-300" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900">{info.label}</span>
          {info.required && !registered && (
            <span className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-600 rounded font-medium">필수</span>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-0.5">{info.description}</p>
        <p className="text-[10px] text-gray-400 mt-1">필요 항목: {info.fields}</p>
      </div>
      <a
        href={info.guideUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 whitespace-nowrap mt-0.5"
      >
        {info.siteName}
        <ExternalLink className="w-3 h-3" />
      </a>
    </div>
  )
}
