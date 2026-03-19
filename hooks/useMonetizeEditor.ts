'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Grade, IntentType } from '@/types/monetize'

interface EditContext {
  keyword: string
  keywordGrade?: Grade
  intentType?: IntentType | null
  blogName: string
  content: string
  score?: number
}

interface UseMonetizeEditorReturn extends EditContext {
  setContent: (content: string) => void
  loading: boolean
  error: string | null
}

export function useMonetizeEditor(postId: string): UseMonetizeEditorReturn {
  const [keyword, setKeyword] = useState('')
  const [keywordGrade, setKeywordGrade] = useState<Grade | undefined>()
  const [intentType, setIntentType] = useState<IntentType | null | undefined>()
  const [blogName, setBlogName] = useState('')
  const [content, setContent] = useState('')
  const [score, setScore] = useState<number | undefined>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchEditContext()
  }, [postId])

  const fetchEditContext = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Try primary endpoint first
      let res = await fetch(`/api/writing/edit-context/${postId}`)

      // Fallback to draft endpoint if primary fails
      if (!res.ok) {
        res = await fetch(`/api/monetize/writing/draft/${postId}`)
      }

      if (!res.ok) {
        throw new Error('Edit context not found')
      }

      const json = await res.json()
      const data = json.data

      setKeyword(data.keyword || '')
      setKeywordGrade(data.keywordGrade || data.grade)
      setIntentType(data.intentType || null)
      setBlogName(data.blogName || '')
      setContent(data.content || data.contentDraft || '')
      setScore(data.score || data.qualityScore?.totalScore)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load editor context')
      // Set minimal defaults on error
      setBlogName('Unknown Blog')
      setKeyword('Unknown Keyword')
    } finally {
      setLoading(false)
    }
  }, [postId])

  return {
    keyword,
    keywordGrade,
    intentType,
    blogName,
    content,
    setContent,
    score,
    loading,
    error,
  }
}
