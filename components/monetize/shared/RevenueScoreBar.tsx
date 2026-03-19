export function RevenueScoreBar({ score, maxScore = 100 }: { score: number; maxScore?: number }) {
  const percentage = Math.min(Math.max((score / maxScore) * 100, 0), 100)
  const color = percentage >= 90 ? 'bg-amber-500' : percentage >= 75 ? 'bg-blue-500' : percentage >= 60 ? 'bg-green-500' : percentage >= 45 ? 'bg-gray-400' : 'bg-red-400'

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${percentage}%` }} />
      </div>
      <span className="text-xs font-medium text-gray-600 w-8 text-right">{Math.round(score)}</span>
    </div>
  )
}
