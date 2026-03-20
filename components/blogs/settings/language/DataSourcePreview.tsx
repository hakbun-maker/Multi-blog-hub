import type { BlogLanguage } from '@/types/monetize'
import { Database, TrendingUp, ShoppingBag, Clock } from 'lucide-react'

interface DataSourceConfig {
  keyword: { primary: string; secondary?: string }
  trend: string
  affiliate: string
  timezone: string
  publishTime: string
}

const DATA_SOURCE_MAP: Record<BlogLanguage, DataSourceConfig> = {
  ko: {
    keyword: { primary: '네이버 광고 API', secondary: '네이버 검색 API' },
    trend: '네이버 DataLab',
    affiliate: '쿠팡파트너스',
    timezone: 'KST',
    publishTime: '06:00',
  },
  en: {
    keyword: { primary: 'Google Keyword Planner (US)' },
    trend: 'Google Trends',
    affiliate: 'Amazon Associates (US)',
    timezone: 'PST',
    publishTime: '09:00',
  },
  ja: {
    keyword: { primary: 'Google Keyword Planner (JP)' },
    trend: 'Google Trends',
    affiliate: 'Amazon Associates (JP)',
    timezone: 'JST',
    publishTime: '07:00',
  },
  de: {
    keyword: { primary: 'Google Keyword Planner (DE)' },
    trend: 'Google Trends',
    affiliate: 'Amazon Associates (DE)',
    timezone: 'CET',
    publishTime: '07:00',
  },
  pt_br: {
    keyword: { primary: 'Google Keyword Planner (BR)' },
    trend: 'Google Trends',
    affiliate: 'Amazon Associates (BR)',
    timezone: 'BRT',
    publishTime: '08:00',
  },
  es: {
    keyword: { primary: 'Google Keyword Planner (ES)' },
    trend: 'Google Trends',
    affiliate: 'Amazon Associates (ES)',
    timezone: 'CET',
    publishTime: '08:00',
  },
}

const ROWS: { icon: React.ElementType; label: string; getValue: (c: DataSourceConfig) => string }[] = [
  { icon: Database, label: '키워드 소스', getValue: c => c.keyword.secondary ? `${c.keyword.primary} / ${c.keyword.secondary}` : c.keyword.primary },
  { icon: TrendingUp, label: '트렌드 소스', getValue: c => c.trend },
  { icon: ShoppingBag, label: '기본 제휴 플랫폼', getValue: c => c.affiliate },
  { icon: Clock, label: '기본 발행 시간', getValue: c => `${c.publishTime} (${c.timezone})` },
]

export function DataSourcePreview({ language }: { language: BlogLanguage }) {
  const config = DATA_SOURCE_MAP[language] ?? DATA_SOURCE_MAP.ko

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">데이터 소스 매핑</label>
      <p className="text-xs text-gray-500">선택한 언어에 따라 자동으로 적용되는 데이터 소스입니다. (읽기 전용)</p>
      <div className="rounded-lg border border-gray-200 bg-gray-50 divide-y divide-gray-200">
        {ROWS.map(row => {
          const Icon = row.icon
          return (
            <div key={row.label} className="flex items-center gap-3 px-4 py-2.5">
              <Icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="text-sm text-gray-500 w-28 flex-shrink-0">{row.label}</span>
              <span className="text-sm font-medium text-gray-800">{row.getValue(config)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
