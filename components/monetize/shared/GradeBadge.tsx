import type { Grade } from '@/types/monetize'

const GRADE_COLORS: Record<Grade, string> = {
  S: 'bg-amber-100 text-amber-800 border-amber-300',
  A: 'bg-blue-100 text-blue-800 border-blue-300',
  B: 'bg-green-100 text-green-800 border-green-300',
  C: 'bg-gray-100 text-gray-800 border-gray-300',
  D: 'bg-red-100 text-red-800 border-red-300',
}

export function GradeBadge({ grade, size = 'sm' }: { grade: Grade; size?: 'sm' | 'md' }) {
  const sizeClass = size === 'md' ? 'px-2.5 py-1 text-sm' : 'px-1.5 py-0.5 text-xs'
  return (
    <span className={`inline-flex items-center font-bold rounded border ${GRADE_COLORS[grade]} ${sizeClass}`}>
      {grade}
    </span>
  )
}
