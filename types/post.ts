export type PostStatus = 'draft' | 'published' | 'scheduled'

export interface SEOMeta {
  metaTitle: string
  metaDesc: string
  ogImage: string
}

export interface Post {
  id: string
  blogId: string
  userId: string
  title: string
  content: string
  htmlContent: string
  status: PostStatus
  keywords: string[]
  tags: string[]
  seoMeta: SEOMeta
  viewCount: number
  publishedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface ApiResponse<T> {
  data: T | null
  error: string | null
}
