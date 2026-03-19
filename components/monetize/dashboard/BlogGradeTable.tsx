'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { GradeBadge } from '@/components/monetize/shared/GradeBadge'
import { Loader2, ArrowUpDown } from 'lucide-react'
import type { Grade } from '@/types/monetize'

interface BlogGrade {
  blogId: string
  blogName: string
  grade: Grade
  monthlyRevenue: number
  postCount: number
  rpm: number
}

type SortKey = 'grade' | 'monthlyRevenue' | 'postCount' | 'rpm'

export function BlogGradeTable() {
  const [data, setData] = useState<BlogGrade[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('monthlyRevenue')
  const [sortDesc, setSortDesc] = useState(true)

  useEffect(() => {
    const fetchBlogGrades = async () => {
      try {
        const response = await fetch('/api/monetize/dashboard')
        if (!response.ok) throw new Error('Failed to fetch blog grades')
        const result = await response.json()
        setData(result.blogGrades || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setIsLoading(false)
      }
    }

    fetchBlogGrades()
  }, [])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDesc(!sortDesc)
    } else {
      setSortKey(key)
      setSortDesc(true)
    }
  }

  const sortedData = [...data].sort((a, b) => {
    let aVal: any = a[sortKey]
    let bVal: any = b[sortKey]

    // Grade comparison
    if (sortKey === 'grade') {
      const gradeOrder = { S: 5, A: 4, B: 3, C: 2, D: 1 }
      aVal = gradeOrder[aVal as Grade]
      bVal = gradeOrder[bVal as Grade]
    }

    if (aVal < bVal) return sortDesc ? 1 : -1
    if (aVal > bVal) return sortDesc ? -1 : 1
    return 0
  })

  const SortHeader = ({ label, sortBy }: { label: string; sortBy: SortKey }) => (
    <button
      onClick={() => handleSort(sortBy)}
      className="flex items-center gap-1 hover:text-gray-700 transition-colors"
    >
      {label}
      {sortKey === sortBy && <ArrowUpDown className="w-4 h-4" />}
    </button>
  )

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>블로그별 등급</CardTitle>
          <CardDescription>블로그별 수익 및 성과 현황</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-12">
          <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>블로그별 등급</CardTitle>
          <CardDescription>블로그별 수익 및 성과 현황</CardDescription>
        </CardHeader>
        <CardContent className="text-center text-red-600 py-12">
          {error}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>블로그별 등급</CardTitle>
        <CardDescription>블로그별 수익 및 성과 현황</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">블로그명</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">
                  <SortHeader label="등급" sortBy="grade" />
                </th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">
                  <SortHeader label="월간수익" sortBy="monthlyRevenue" />
                </th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">
                  <SortHeader label="게시글수" sortBy="postCount" />
                </th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">
                  <SortHeader label="RPM" sortBy="rpm" />
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedData.length > 0 ? (
                sortedData.map((blog) => (
                  <tr key={blog.blogId} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 font-medium text-gray-900">{blog.blogName}</td>
                    <td className="py-3 px-4 text-center">
                      <GradeBadge grade={blog.grade} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-right text-gray-900 font-medium">
                      ₩{(blog.monthlyRevenue / 1000).toFixed(0)}K
                    </td>
                    <td className="py-3 px-4 text-right text-gray-600">{blog.postCount}</td>
                    <td className="py-3 px-4 text-right text-gray-600">
                      ₩{Math.round(blog.rpm).toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400">
                    블로그 데이터가 없습니다
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
