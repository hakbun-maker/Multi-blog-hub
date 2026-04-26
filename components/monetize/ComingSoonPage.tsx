import { Rocket, Sparkles } from 'lucide-react'

/**
 * 수익화 로켓 메뉴 — 전체 준비중 안내 (PoC 단계 차단용)
 * 사이드바 클릭 시 진입 시도되어도 콘텐츠 대신 이 화면이 표시됨
 */
export function ComingSoonPage({ title }: { title?: string }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="max-w-md w-full text-center space-y-4 px-6 py-12 rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50/60 to-yellow-50/40">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-orange-100">
          <Rocket className="w-7 h-7 text-orange-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {title ? `${title} — 준비중입니다` : '준비중입니다'}
          </h1>
          <p className="text-sm text-gray-500 mt-2 leading-relaxed">
            수익화 로켓 기능은 현재 정식 출시 전 점검·보완 중입니다.
            <br />
            준비가 완료되는 대로 안내드릴게요.
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 text-xs text-orange-600 bg-white px-3 py-1.5 rounded-full border border-orange-200">
          <Sparkles className="w-3.5 h-3.5" />
          기대해 주세요
        </div>
      </div>
    </div>
  )
}
