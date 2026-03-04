import { create } from 'zustand'

export interface GeneratedPostResult {
  blogId: string
  blogName: string
  success: boolean
  title?: string
  content?: string
  htmlContent?: string
  tags?: string[]
  seoMeta?: { title: string; description: string }
  error?: string
}

interface EditorStore {
  // AI 생성 모드
  keyword: string
  relatedKeywords: string[]
  selectedBlogIds: string[]
  imageCount: number
  isGenerating: boolean
  generatedPosts: GeneratedPostResult[]

  // 직접 작성 모드 (현재 편집 중인 글)
  currentPostId: string | null
  title: string
  content: string
  htmlContent: string
  selectedBlogId: string | null
  tags: string[]
  seoMeta: { title: string; description: string }

  // Actions
  setKeyword: (k: string) => void
  setRelatedKeywords: (kws: string[]) => void
  toggleBlogId: (id: string) => void
  setImageCount: (n: number) => void
  setIsGenerating: (v: boolean) => void
  setGeneratedPosts: (posts: GeneratedPostResult[]) => void
  setTitle: (t: string) => void
  setContent: (c: string) => void
  setHtmlContent: (h: string) => void
  setSelectedBlogId: (id: string | null) => void
  setTags: (tags: string[]) => void
  setSeoMeta: (meta: { title: string; description: string }) => void
  setCurrentPostId: (id: string | null) => void
  resetEditor: () => void
}

export const useEditorStore = create<EditorStore>((set) => ({
  keyword: '',
  relatedKeywords: [],
  selectedBlogIds: [],
  imageCount: 0,
  isGenerating: false,
  generatedPosts: [],
  currentPostId: null,
  title: '',
  content: '',
  htmlContent: '',
  selectedBlogId: null,
  tags: [],
  seoMeta: { title: '', description: '' },

  setKeyword: (keyword) => set({ keyword }),
  setRelatedKeywords: (relatedKeywords) => set({ relatedKeywords }),
  toggleBlogId: (id) => set((s) => ({
    selectedBlogIds: s.selectedBlogIds.includes(id)
      ? s.selectedBlogIds.filter((b) => b !== id)
      : [...s.selectedBlogIds, id],
  })),
  setImageCount: (imageCount) => set({ imageCount }),
  setIsGenerating: (isGenerating) => set({ isGenerating }),
  setGeneratedPosts: (generatedPosts) => set({ generatedPosts }),
  setTitle: (title) => set({ title }),
  setContent: (content) => set({ content }),
  setHtmlContent: (htmlContent) => set({ htmlContent }),
  setSelectedBlogId: (selectedBlogId) => set({ selectedBlogId }),
  setTags: (tags) => set({ tags }),
  setSeoMeta: (seoMeta) => set({ seoMeta }),
  setCurrentPostId: (currentPostId) => set({ currentPostId }),
  resetEditor: () => set({
    title: '', content: '', htmlContent: '', tags: [],
    seoMeta: { title: '', description: '' }, currentPostId: null, selectedBlogId: null,
  }),
}))
