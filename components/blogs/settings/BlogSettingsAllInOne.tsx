'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Save, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TABS, type SettingsTab } from './constants'
import { BasicInfoForm } from './BasicInfoForm'
import { CategoriesManager } from './CategoriesManager'
import { AICharacterForm } from './AICharacterForm'
import LayoutTab from '@/components/blogs/LayoutTab'
import { LanguageSelector } from '@/components/blogs/settings/language/LanguageSelector'
import { DataSourcePreview } from '@/components/blogs/settings/language/DataSourcePreview'
import { AffiliateDefaultNotice } from '@/components/blogs/settings/language/AffiliateDefaultNotice'
import { FeatureGate } from '@/components/plan/FeatureGate'
import { SNSSettingsPanel } from '@/components/monetize/sns/SNSSettingsPanel'
import { AffiliateSettingsPanel } from '@/components/monetize/affiliate/AffiliateSettingsPanel'
import type { BlogLanguage } from '@/types/monetize'

interface BlogSummary {
  id: string
  name: string
  color: string
  language: BlogLanguage
  slug: string
  layout_config: Record<string, unknown> | null
}

// Language tab needs local state for save
function LanguageTabContent({ blogId, initialLanguage }: { blogId: string; initialLanguage: BlogLanguage }) {
  const [language, setLanguage] = useState<BlogLanguage>(initialLanguage)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')

  const handleSave = async () => {
    setSaving(true)
    const res = await fetch(`/api/blogs/${blogId}/settings/language`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language }),
    })
    setSaving(false)
    if (res.ok) {
      setSuccess('언어/지역 설정이 저장되었습니다.')
      setTimeout(() => setSuccess(''), 3000)
    }
  }

  return (
    <div className="space-y-6">
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-2.5 rounded-lg">{success}</div>
      )}
      <LanguageSelector blogId={blogId} currentLanguage={language} onLanguageChange={setLanguage} />
      <DataSourcePreview language={language} />
      <AffiliateDefaultNotice language={language} />
      <Button onClick={handleSave} disabled={saving}>
        <Save className="w-4 h-4 mr-1.5" />{saving ? '저장 중...' : '저장'}
      </Button>
    </div>
  )
}

export function BlogSettingsAllInOne() {
  const [blogs, setBlogs] = useState<BlogSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<SettingsTab>('basic')
  const [selectedBlogId, setSelectedBlogId] = useState<string | null>(null)

  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        const res = await fetch('/api/blogs')
        if (!res.ok) return
        const { data } = await res.json()
        setBlogs(data ?? [])
        if (data?.length > 0) {
          setSelectedBlogId(data[0].id)
        }
      } finally {
        setLoading(false)
      }
    }
    fetchBlogs()
  }, [])

  const selectedBlog = blogs.find(b => b.id === selectedBlogId)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (blogs.length === 0) {
    return (
      <div className="text-center py-12 space-y-4">
        <p className="text-gray-500">등록된 블로그가 없습니다.</p>
        <Button asChild variant="outline">
          <Link href="/blogs">블로그 추가하러 가기</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Level 2: 블로그 선택 (먼저 블로그를 고르고 → 설정 탭 선택) */}
      <div className="overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {blogs.map(blog => (
            <button
              key={blog.id}
              onClick={() => setSelectedBlogId(blog.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all ${
                selectedBlogId === blog.id
                  ? 'text-white shadow-sm'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
              style={selectedBlogId === blog.id
                ? { backgroundColor: blog.color, borderColor: blog.color }
                : { borderColor: blog.color + '40' }
              }
            >
              <span className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: selectedBlogId === blog.id ? 'white' : blog.color }}
                />
                {blog.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Level 3: 설정 유형 서브탭 */}
      <div className="border-b border-gray-200 overflow-x-auto">
        <div className="flex gap-0 min-w-max">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === t.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* 선택된 블로그 설정 폼 렌더링 */}
      {selectedBlogId && (
        <div className="max-w-2xl">
          {activeTab === 'basic' && (
            <BasicInfoForm
              key={selectedBlogId}
              blogId={selectedBlogId}
              showDeleteButton={false}
            />
          )}

          {activeTab === 'categories' && (
            <CategoriesManager key={selectedBlogId} blogId={selectedBlogId} />
          )}

          {activeTab === 'ai' && (
            <AICharacterForm key={selectedBlogId} blogId={selectedBlogId} />
          )}

          {activeTab === 'layout' && selectedBlog && (
            <LayoutTab
              key={selectedBlogId}
              blogId={selectedBlogId}
              blogSlug={selectedBlog.slug}
              initialConfig={selectedBlog.layout_config as Record<string, unknown> | null}
              onSuccess={() => {}}
              onConfigSaved={(cfg) => {
                setBlogs(prev => prev.map(b => b.id === selectedBlogId ? { ...b, layout_config: cfg as unknown as Record<string, unknown> } : b))
              }}
            />
          )}

          {activeTab === 'language' && selectedBlog && (
            <LanguageTabContent
              key={selectedBlogId}
              blogId={selectedBlogId}
              initialLanguage={selectedBlog.language ?? 'ko'}
            />
          )}

          {activeTab === 'sns' && (
            <FeatureGate featureKey="sns_auto_deploy" minPlan="pro" featureName="SNS 자동배포">
              <SNSSettingsPanel key={selectedBlogId} blogId={selectedBlogId} />
            </FeatureGate>
          )}

          {activeTab === 'monetize' && (
            <FeatureGate featureKey="coupang_affiliate" minPlan="pro" featureName="제휴마케팅 연동">
              <AffiliateSettingsPanel key={selectedBlogId} blogId={selectedBlogId} />
            </FeatureGate>
          )}
        </div>
      )}
    </div>
  )
}
