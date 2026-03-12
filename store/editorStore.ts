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

export type PipelineStep = 'idle' | 'keywords' | 'writing' | 'images' | 'meta' | 'done' | 'error'

export interface BlogPipelineState {
  blogId: string
  blogName: string
  step: PipelineStep
  stepMessage: string
  title: string
  htmlContent: string
  tags: string[]
  seoMeta: { title: string; description: string }
  error?: string
}

interface EditorStore {
  // AI 생성 모드
  keywords: string[]
  relatedKeywords: string[]
  selectedBlogIds: string[]
  imageCount: number
  isGenerating: boolean
  generatedPosts: GeneratedPostResult[]

  // 파이프라인 상태 (블로그별)
  pipelineStates: Record<string, BlogPipelineState>
  pipelineGlobalStep: PipelineStep
  autoPublish: boolean

  // 직접 작성 모드 (현재 편집 중인 글)
  currentPostId: string | null
  title: string
  content: string
  htmlContent: string
  selectedBlogId: string | null
  tags: string[]
  seoMeta: { title: string; description: string }

  // Actions
  setKeywords: (kws: string[]) => void
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
  setPipelineState: (blogId: string, state: Partial<BlogPipelineState>) => void
  setPipelineGlobalStep: (step: PipelineStep) => void
  setAutoPublish: (v: boolean) => void
  resetPipeline: () => void
  resetEditor: () => void
}

export const useEditorStore = create<EditorStore>((set) => ({
  keywords: [],
  relatedKeywords: [],
  selectedBlogIds: [],
  imageCount: 1,
  isGenerating: false,
  generatedPosts: [],
  pipelineStates: {},
  pipelineGlobalStep: 'idle',
  autoPublish: typeof window !== 'undefined' ? localStorage.getItem('ai_auto_publish') === 'true' : false,
  currentPostId: null,
  title: '',
  content: '',
  htmlContent: '',
  selectedBlogId: null,
  tags: [],
  seoMeta: { title: '', description: '' },

  setKeywords: (keywords) => set({ keywords }),
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
  setPipelineState: (blogId, partial) => set((s) => ({
    pipelineStates: {
      ...s.pipelineStates,
      [blogId]: { ...s.pipelineStates[blogId], ...partial },
    },
  })),
  setPipelineGlobalStep: (pipelineGlobalStep) => set({ pipelineGlobalStep }),
  setAutoPublish: (autoPublish) => {
    if (typeof window !== 'undefined') localStorage.setItem('ai_auto_publish', String(autoPublish))
    set({ autoPublish })
  },
  resetPipeline: () => set({ pipelineStates: {}, pipelineGlobalStep: 'idle', isGenerating: false }),
  resetEditor: () => set({
    title: '', content: '', htmlContent: '', tags: [],
    seoMeta: { title: '', description: '' }, currentPostId: null, selectedBlogId: null,
  }),
}))
