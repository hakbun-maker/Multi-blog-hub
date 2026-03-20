'use client'

import { useEffect, useState, useCallback } from 'react'
import { Save, Sparkles, RotateCw, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { CHARACTER_CATEGORIES, ALL_FIELD_KEYS } from './constants'

interface AICharacterFormProps {
  blogId: string
}

export function AICharacterForm({ blogId }: AICharacterFormProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')

  const [aiProvider, setAiProvider] = useState<'claude' | 'gemini'>('gemini')
  const [characterConfig, setCharacterConfig] = useState<Record<string, string>>({})
  const [characterPrompt, setCharacterPrompt] = useState('')
  const [generatingAll, setGeneratingAll] = useState(false)
  const [regeneratingField, setRegeneratingField] = useState<string | null>(null)

  // Blog info for AI generation context
  const [blogName, setBlogName] = useState('')
  const [blogDescription, setBlogDescription] = useState('')
  const [blogType, setBlogType] = useState('')
  const [categoryNames, setCategoryNames] = useState<string[]>([])

  useEffect(() => {
    const fetchData = async () => {
      const [blogRes, catRes] = await Promise.all([
        fetch(`/api/blogs/${blogId}`),
        fetch(`/api/categories?blogId=${blogId}`),
      ])
      if (!blogRes.ok) return

      const { data: blogData } = await blogRes.json()
      setAiProvider(blogData.ai_provider ?? 'gemini')
      setBlogName(blogData.name ?? '')
      setBlogDescription(blogData.description ?? '')
      setBlogType(blogData.blog_type ?? '')

      const aiConfig = blogData.ai_character_config ?? {}
      const config: Record<string, string> = {}
      for (const key of ALL_FIELD_KEYS) {
        if (aiConfig[key]) config[key] = aiConfig[key]
      }
      setCharacterConfig(config)
      setCharacterPrompt(aiConfig._userPrompt ?? '')

      if (catRes.ok) {
        const catData = await catRes.json()
        setCategoryNames((catData.data ?? []).map((c: { name: string }) => c.name))
      }

      setLoading(false)
    }
    fetchData()
  }, [blogId])

  const showSuccessMsg = (msg: string) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(''), 3000)
  }

  const updateCharField = useCallback((key: string, value: string) => {
    setCharacterConfig(prev => ({ ...prev, [key]: value }))
  }, [])

  const getBlogInfo = () => ({
    name: blogName,
    description: blogDescription,
    blogType,
    categories: categoryNames,
  })

  const handleGenerateAll = async () => {
    setGeneratingAll(true)
    try {
      const res = await fetch('/api/ai/generate-character', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blogId, provider: aiProvider, blogInfo: getBlogInfo(), userPrompt: characterPrompt || undefined }),
      })
      const data = await res.json()
      if (data.character) {
        setCharacterConfig(prev => {
          const merged = { ...prev }
          for (const [k, v] of Object.entries(data.character)) {
            if (typeof v === 'string' && v.trim()) merged[k] = v.trim()
          }
          return merged
        })
        showSuccessMsg('AI 캐릭터가 생성되었습니다. 확인 후 저장해주세요.')
      } else {
        alert(data.error ?? 'AI 생성에 실패했습니다.')
      }
    } catch {
      alert('AI 생성 중 오류가 발생했습니다.')
    }
    setGeneratingAll(false)
  }

  const handleRegenerateField = async (fieldKey: string) => {
    setRegeneratingField(fieldKey)
    try {
      const res = await fetch('/api/ai/generate-character', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blogId,
          provider: aiProvider,
          fieldKey,
          existingConfig: characterConfig,
          blogInfo: getBlogInfo(),
          userPrompt: characterPrompt || undefined,
        }),
      })
      const data = await res.json()
      if (data.value) {
        updateCharField(fieldKey, data.value)
      } else {
        alert(data.error ?? '재생성에 실패했습니다.')
      }
    } catch {
      alert('재생성 중 오류가 발생했습니다.')
    }
    setRegeneratingField(null)
  }

  const handleSave = async () => {
    setSaving(true)
    const res = await fetch(`/api/blogs/${blogId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        aiProvider,
        aiCharacterConfig: { ...characterConfig, _userPrompt: characterPrompt },
      }),
    })
    setSaving(false)
    if (res.ok) showSuccessMsg('AI 캐릭터 설정이 저장되었습니다.')
  }

  if (loading) {
    return <div className="space-y-4 animate-pulse"><div className="h-8 bg-gray-200 rounded w-48" /><div className="h-32 bg-gray-100 rounded" /></div>
  }

  return (
    <div className="space-y-6">
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-2.5 rounded-lg">{success}</div>
      )}

      {/* AI 캐릭터 설정 요청 프롬프트 */}
      <div className="space-y-2">
        <Label>AI 캐릭터 설정 요청 프롬프트</Label>
        <textarea
          value={characterPrompt}
          onChange={e => setCharacterPrompt(e.target.value)}
          rows={3}
          placeholder="원하는 캐릭터를 대략적으로 설명하세요. 예: 30대 직장인 여성, 재테크에 관심 많고 친근한 말투로 실전 경험 위주의 글을 쓰는 캐릭터"
          className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
        />
        <p className="text-xs text-gray-500">아래 &quot;AI 캐릭터 일괄 생성&quot; 시 이 내용을 참고하여 캐릭터가 생성됩니다.</p>
      </div>

      {/* AI 공급자 선택 + 일괄 생성 버튼 */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-4">
        <div className="space-y-2">
          <Label>AI 공급자</Label>
          <div className="flex gap-2">
            {(['claude', 'gemini'] as const).map(p => (
              <button key={p} type="button" onClick={() => setAiProvider(p)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                  aiProvider === p ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400'
                }`}>
                {p === 'claude' ? 'Claude' : 'Gemini'}
              </button>
            ))}
          </div>
        </div>
        <Button
          onClick={handleGenerateAll}
          disabled={generatingAll}
          className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white"
        >
          {generatingAll ? (
            <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />캐릭터 생성 중...</>
          ) : (
            <><Sparkles className="w-4 h-4 mr-1.5" />AI 캐릭터 일괄 생성</>
          )}
        </Button>
      </div>

      {!blogType && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm px-4 py-2.5 rounded-lg">
          기본정보 탭에서 &quot;블로그 유형&quot;을 먼저 설정하면, AI가 유형에 맞는 캐릭터를 더 정확하게 생성합니다.
        </div>
      )}

      {/* 카테고리별 필드 렌더링 */}
      {CHARACTER_CATEGORIES.map((category) => (
        <div key={category.title} className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2">
            {category.title}
          </h3>
          <div className="space-y-3">
            {category.fields.map((field) => {
              const value = characterConfig[field.key] ?? ''
              const isRegenerating = regeneratingField === field.key

              return (
                <div key={field.key} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm">{field.label}</Label>
                      <p className="text-xs text-gray-400">{field.description}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-purple-500 hover:text-purple-700 hover:bg-purple-50"
                      disabled={isRegenerating || generatingAll}
                      onClick={() => handleRegenerateField(field.key)}
                      title="AI로 이 항목만 재생성"
                    >
                      {isRegenerating ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <RotateCw className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  </div>

                  {field.type === 'select' ? (
                    <select
                      value={field.options?.includes(value) ? value : ''}
                      onChange={e => updateCharField(field.key, e.target.value)}
                      className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">{field.placeholder}</option>
                      {field.options?.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                      {value && !field.options?.includes(value) && (
                        <option value={value}>{value} (AI 생성)</option>
                      )}
                    </select>
                  ) : (
                    <textarea
                      value={value}
                      onChange={e => updateCharField(field.key, e.target.value)}
                      rows={field.type === 'textarea' ? 3 : 1}
                      placeholder={field.placeholder}
                      className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed min-h-[38px]"
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}

      <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
        <Save className="w-4 h-4 mr-1.5" />{saving ? '저장 중...' : 'AI 캐릭터 저장'}
      </Button>
    </div>
  )
}
