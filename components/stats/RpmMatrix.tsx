'use client'

import { useMemo } from 'react'

interface RpmCell {
  blogId: string
  blogName: string
  categoryId: string | null
  categoryName: string
  rpm: number
  revenue: number
  views: number
}

interface RpmMatrixProps {
  cells: RpmCell[]
  loading: boolean
}

export function RpmMatrix({ cells, loading }: RpmMatrixProps) {
  const { blogs, cats, matrix, maxRpm } = useMemo(() => {
    const blogMap = new Map<string, string>()  // blogId → name
    const catMap = new Map<string, string>()   // catKey → name
    for (const c of cells) {
      blogMap.set(c.blogId, c.blogName)
      const catKey = c.categoryId ?? '__none__'
      catMap.set(catKey, c.categoryName)
    }
    const blogList = Array.from(blogMap.entries()).map(([id, name]) => ({ id, name }))
    const catList = Array.from(catMap.entries()).map(([id, name]) => ({ id, name }))

    const m = new Map<string, RpmCell>()
    for (const c of cells) {
      m.set(`${c.blogId}::${c.categoryId ?? '__none__'}`, c)
    }
    const max = cells.reduce((acc, c) => Math.max(acc, c.rpm), 0)
    return { blogs: blogList, cats: catList, matrix: m, maxRpm: max }
  }, [cells])

  if (loading) {
    return <div className="h-48 bg-gray-100 rounded animate-pulse" />
  }

  if (cells.length === 0) {
    return (
      <div className="border border-gray-100 rounded-lg p-8 text-center text-sm text-gray-400">
        RPM 매트릭스 데이터가 아직 없습니다.
      </div>
    )
  }

  // 색상 — 셀 RPM이 maxRpm 대비 차지하는 비율로 진하기 결정
  const getColor = (rpm: number): string => {
    if (rpm === 0) return '#f9fafb'
    if (maxRpm === 0) return '#f9fafb'
    const ratio = rpm / maxRpm
    // 0~1 → blue 50~700
    if (ratio < 0.2) return '#dbeafe'
    if (ratio < 0.4) return '#bfdbfe'
    if (ratio < 0.6) return '#93c5fd'
    if (ratio < 0.8) return '#60a5fa'
    return '#3b82f6'
  }

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto border border-gray-100 rounded-lg">
        <table className="w-full text-xs">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-2 py-2 text-left text-gray-500 font-medium sticky left-0 bg-gray-50 min-w-[100px]">카테고리 ＼ 블로그</th>
              {blogs.map(b => (
                <th key={b.id} className="px-2 py-2 text-center text-gray-500 font-medium min-w-[80px] truncate" title={b.name}>
                  {b.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cats.map(cat => (
              <tr key={cat.id} className="border-t border-gray-100">
                <td className="px-2 py-2 text-gray-700 font-medium sticky left-0 bg-white truncate" title={cat.name}>{cat.name}</td>
                {blogs.map(b => {
                  const cell = matrix.get(`${b.id}::${cat.id}`)
                  if (!cell || cell.rpm === 0) {
                    return <td key={b.id} className="px-2 py-2 text-center text-gray-300">—</td>
                  }
                  return (
                    <td
                      key={b.id}
                      className="px-2 py-2 text-center font-medium tabular-nums"
                      style={{ backgroundColor: getColor(cell.rpm) }}
                      title={`${cat.name} × ${b.name}\nRPM: $${cell.rpm.toFixed(2)}\n수익: $${cell.revenue.toFixed(2)}\n조회: ${cell.views.toLocaleString()}`}
                    >
                      ${cell.rpm.toFixed(2)}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-2 text-[10px] text-gray-400">
        <span>RPM 진하기:</span>
        <span className="px-2 py-0.5 rounded" style={{ backgroundColor: '#dbeafe' }}>낮음</span>
        <span className="px-2 py-0.5 rounded" style={{ backgroundColor: '#93c5fd' }}>중간</span>
        <span className="px-2 py-0.5 rounded text-white" style={{ backgroundColor: '#3b82f6' }}>높음</span>
        <span className="ml-auto">셀에 마우스 올리면 상세</span>
      </div>
    </div>
  )
}
