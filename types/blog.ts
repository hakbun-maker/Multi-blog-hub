import type { AICharacterConfig } from '@/lib/ai/adapter'

export type AIProvider = 'claude' | 'openai' | 'gemini'

export interface Blog {
  id: string
  userId: string
  name: string
  slug: string
  customDomain: string | null
  subdomain: string | null
  description: string | null
  aiCharacterConfig: AICharacterConfig
  aiProvider: AIProvider
  isActive: boolean
  color: string
  createdAt: Date
}

export interface ApiResponse<T> {
  data: T | null
  error: string | null
}
