'use client'

import { useState, useCallback } from 'react'

export interface Category {
  id: string
  blog_id: string
  name: string
  slug: string
  sort_order: number
  created_at: string
}

export function useCategories(blogId?: string) {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)

  const fetchCategories = useCallback(async () => {
    if (!blogId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/categories?blogId=${blogId}`)
      const json = await res.json()
      if (res.ok) setCategories(json.data ?? [])
    } finally {
      setLoading(false)
    }
  }, [blogId])

  const createCategory = async (name: string) => {
    if (!blogId) return null
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blogId, name }),
    })
    const json = await res.json()
    if (res.ok) {
      setCategories(prev => [...prev, json.data])
      return json.data as Category
    }
    return null
  }

  const updateCategory = async (id: string, patch: { name?: string; sortOrder?: number }) => {
    const res = await fetch(`/api/categories/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    const json = await res.json()
    if (res.ok) {
      setCategories(prev => prev.map(c => c.id === id ? json.data : c))
    }
    return res.ok
  }

  const deleteCategory = async (id: string, targetCategoryId?: string) => {
    const url = targetCategoryId
      ? `/api/categories/${id}?targetCategoryId=${targetCategoryId}`
      : `/api/categories/${id}`
    const res = await fetch(url, { method: 'DELETE' })
    if (res.ok) {
      setCategories(prev => prev.filter(c => c.id !== id))
      return { ok: true as const }
    }
    const json = await res.json()
    return { ok: false as const, error: json.error as string, postCount: json.postCount as number | undefined }
  }

  return { categories, loading, fetchCategories, createCategory, updateCategory, deleteCategory }
}
