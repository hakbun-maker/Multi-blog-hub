import { Rocket } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export default function MonetizePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">수익화 글 작성</h1>
        <p className="text-sm text-gray-500 mt-0.5">수익화 전략이 반영된 글을 자동으로 작성하고 배포합니다.</p>
      </div>
      <Card className="shadow-none border border-gray-200">
        <CardContent className="p-12 text-center">
          <Rocket className="w-12 h-12 text-orange-300 mx-auto mb-4" />
          <p className="font-medium text-gray-600 mb-1">수익화 글 작성</p>
          <p className="text-sm text-gray-400">키워드 분석 → 스케줄 배분 → 수익화 전략 글 자동 작성 기능이 구현될 예정입니다.</p>
        </CardContent>
      </Card>
    </div>
  )
}
