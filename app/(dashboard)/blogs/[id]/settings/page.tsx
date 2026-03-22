'use client'

import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Save, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import LayoutTab from '@/components/blogs/LayoutTab'
import type { LayoutConfig } from '@/components/blogs/LayoutTab'
import { FeatureGate } from '@/components/plan/FeatureGate'
import { SNSSettingsPanel } from '@/components/monetize/sns/SNSSettingsPanel'
import { AffiliateSettingsPanel } from '@/components/monetize/affiliate/AffiliateSettingsPanel'
import { LanguageSelector } from '@/components/blogs/settings/language/LanguageSelector'
import { DataSourcePreview } from '@/components/blogs/settings/language/DataSourcePreview'
import { AffiliateDefaultNotice } from '@/components/blogs/settings/language/AffiliateDefaultNotice'
import { BasicInfoForm } from '@/components/blogs/settings/BasicInfoForm'
import { CategoriesManager } from '@/components/blogs/settings/CategoriesManager'
import { AICharacterForm } from '@/components/blogs/settings/AICharacterForm'
import { TABS, type SettingsTab } from '@/components/blogs/settings/constants'
import type { BlogLanguage } from '@/types/monetize'

function BlogSettingsContent({ params }: { params: { id: string } }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabFromUrl = searchParams.get('tab') as SettingsTab | null
  const [activeTab, setActiveTab] = useState<SettingsTab>(
    tabFromUrl && TABS.some(t => t.id === tabFromUrl) ? tabFromUrl : 'basic'
  )
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')

  // Minimal blog data needed for header, layout tab, and language tab
  const [blogName, setBlogName] = useState('')
  const [blogSlug, setBlogSlug] = useState('')
  const [blogCustomDomain, setBlogCustomDomain] = useState<string | null>(null)
  const [blogLanguage, setBlogLanguage] = useState<BlogLanguage>('ko')
  const [layoutConfig, setLayoutConfig] = useState<Partial<LayoutConfig> | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch(`/api/blogs/${params.id}`)
      if (!res.ok) { router.push('/blogs'); return }
      const { data } = await res.json()
      setBlogName(data.name ?? '')
      setBlogSlug(data.slug ?? '')
      setBlogCustomDomain(data.custom_domain ?? null)
      setBlogLanguage(data.language ?? 'ko')
      setLayoutConfig(data.layout_config ?? null)
      setLoading(false)
    }
    fetchData()
  }, [params.id, router])

  const showSuccess = (msg: string) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(''), 3000)
  }

  const handleSaveLanguageSettings = async () => {
    setSaving(true)
    const res = await fetch(`/api/blogs/${params.id}/settings/language`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: blogLanguage }),
    })
    setSaving(false)
    if (res.ok) showSuccess('언어/지역 설정이 저장되었습니다.')
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="h-64 bg-gray-100 rounded" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Link href={`/blogs/${params.id}`}><ArrowLeft className="w-4 h-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">블로그 설정</h1>
            <p className="text-sm text-gray-500">{blogName}</p>
          </div>
        </div>
      </div>

      {/* All-in-One 안내 배너 */}
      <Link
        href="/settings?tab=blog-all"
        className="flex items-center justify-between px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors group"
      >
        <span className="text-sm text-blue-700">
          💡 여러 블로그를 한 곳에서 관리하세요 — <strong>설정 &gt; 블로그 설정</strong>에서 모든 블로그의 설정을 한번에 확인하고 수정할 수 있습니다.
        </span>
        <span className="flex items-center gap-1 text-xs text-blue-600 font-medium shrink-0 ml-3 group-hover:gap-2 transition-all">
          바로가기 <ArrowRight className="w-3.5 h-3.5" />
        </span>
      </Link>

      {/* 성공 토스트 */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-2.5 rounded-lg">
          {success}
        </div>
      )}

      {/* SettingsTabNav */}
      <div className="border-b border-gray-200 overflow-x-auto">
        <div className="flex gap-0 min-w-max">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === t.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ BasicInfoTab ═══ */}
      {activeTab === 'basic' && (
        <BasicInfoForm
          blogId={params.id}
          onLanguageTabClick={() => setActiveTab('language')}
        />
      )}

      {/* ═══ CategoriesTab ═══ */}
      {activeTab === 'categories' && (
        <CategoriesManager blogId={params.id} />
      )}

      {/* ═══ AICharacterTab ═══ */}
      {activeTab === 'ai' && (
        <AICharacterForm blogId={params.id} />
      )}

      {/* ═══ LayoutTab ═══ */}
      {activeTab === 'layout' && (
        <LayoutTab blogId={params.id} blogSlug={blogSlug} customDomain={blogCustomDomain} initialConfig={layoutConfig} onSuccess={showSuccess} />
      )}

      {/* ═══ LanguageTab ═══ */}
      {activeTab === 'language' && (
        <div className="space-y-6">
          <LanguageSelector
            blogId={params.id}
            currentLanguage={blogLanguage}
            onLanguageChange={(lang) => setBlogLanguage(lang)}
          />
          <DataSourcePreview language={blogLanguage} />
          <AffiliateDefaultNotice language={blogLanguage} />
          <Button onClick={handleSaveLanguageSettings} disabled={saving}>
            <Save className="w-4 h-4 mr-1.5" />{saving ? '저장 중...' : '저장'}
          </Button>
        </div>
      )}

      {/* ═══ SNSTab ═══ */}
      {activeTab === 'sns' && (
        <FeatureGate featureKey="sns_auto_deploy" minPlan="pro" featureName="SNS 자동배포">
          <SNSSettingsPanel blogId={params.id} />
        </FeatureGate>
      )}

      {/* ═══ MonetizeTab ═══ */}
      {activeTab === 'monetize' && (
        <FeatureGate featureKey="coupang_affiliate" minPlan="pro" featureName="제휴마케팅 연동">
          <AffiliateSettingsPanel blogId={params.id} />
        </FeatureGate>
      )}
    </div>
  )
}

export default function BlogSettingsPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="h-64 bg-gray-100 rounded" />
      </div>
    }>
      <BlogSettingsContent params={params} />
    </Suspense>
  )
}
