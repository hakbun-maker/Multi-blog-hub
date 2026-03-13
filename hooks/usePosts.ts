'use client'

import { useState, useCallback } from 'react'

export interface Post {
  id: string
  blog_id: string
  user_id: string
  title: string
  slug: string
  content_html: string
  status: string
  source_type: string
  keyword: string
  focus_keyword: string
  seo_title: string
  meta_description: string
  reference_links: string
  published_at: string | null
  created_at: string
}

export function usePosts(blogId?: string) {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    const url = blogId ? `/api/posts?blogId=${blogId}` : '/api/posts'
    const res = await fetch(url)
    const data = await res.json()
    if (res.ok) setPosts(data.data ?? [])
    else setError(data.error)
    setLoading(false)
  }, [blogId])

  const deletePost = async (id: string) => {
    await fetch(`/api/posts/${id}`, { method: 'DELETE' })
    setPosts(prev => prev.filter(p => p.id !== id))
  }

  return { posts, loading, error, fetchPosts, deletePost }
}
