import type { BlogLanguage } from '@/types/monetize'
import { LANGUAGE_DEFAULT_AFFILIATE } from '@/lib/monetize/constants'
import { Info } from 'lucide-react'

export function AffiliateDefaultNotice({ language }: { language: BlogLanguage }) {
  const platform = LANGUAGE_DEFAULT_AFFILIATE[language]
  const platformLabel = platform === 'coupang' ? '쿠팡파트너스' : 'Amazon Associates'

  return (
    <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
      <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <span>
        선택한 언어의 기본 제휴 플랫폼은 <strong>{platformLabel}</strong>입니다. 블로그 수익화 설정에서 변경할 수 있습니다.
      </span>
    </div>
  )
}
