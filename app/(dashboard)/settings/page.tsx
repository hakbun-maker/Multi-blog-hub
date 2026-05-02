'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { CheckCircle, XCircle, Loader2, Eye, EyeOff, Plus, Trash2, User, Key, Bell, Check, Scissors, CreditCard, Shield, LayoutGrid, AlertTriangle, Lock, TrendingUp, Ticket, DollarSign } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { COUNTRIES } from '@/lib/constants/countries'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { MemoTab } from '@/components/blogs/MemoTab'
import { PlanSettingsTab } from '@/components/plan/PlanSettingsTab'
import { BlogSettingsAllInOne } from '@/components/blogs/settings/BlogSettingsAllInOne'
import { usePlanContext } from '@/components/plan/PlanContext'
import { ApiGuideAccordion } from '@/components/settings/ApiGuideAccordion'
import { ConsentGate } from '@/components/consent/ConsentGate'
import { ConsentManagementSection } from '@/components/settings/ConsentManagementSection'
import { AdsConfigTab } from '@/components/settings/AdsConfigTab'

interface AIKey {
  id: string
  provider: string
  masked_key: string
  is_active: boolean
  created_at: string
  has_secret?: boolean
  has_extra?: boolean
}

interface UserProfile {
  email: string
  name: string | null
  display_name: string | null
  phone: string | null
  country: string | null
}

interface ProviderDef {
  value: string
  label: string
  placeholder: string
  note?: string
  needsSecret?: boolean
  secretPlaceholder?: string
  secretLabel?: string
  needsExtra?: boolean
  extraPlaceholder?: string
  extraLabel?: string
  guide?: string
}

const TEXT_PROVIDERS: ProviderDef[] = [
  {
    value: 'claude',
    label: 'Claude (Anthropic)',
    placeholder: 'sk-ant-api...',
    note: 'AI 글 생성의 핵심 엔진입니다. 블로그 글, AI 캐릭터 생성에 사용됩니다.\n\n[발급 조건] Anthropic 계정 생성 → Console에서 API Key 발급 (무료 크레딧 제공, 이후 종량제)\n[발급 순서] ① console.anthropic.com 가입 ② Settings > API Keys ③ Create Key 클릭 ④ sk-ant-api로 시작하는 키 복사',
    guide: 'https://console.anthropic.com/settings/keys',
  },
  {
    value: 'openai',
    label: 'OpenAI (GPT)',
    placeholder: 'sk-...',
    note: 'GPT 모델 기반 글 생성에 사용됩니다. Claude 대안으로 활용 가능합니다.\n\n[발급 조건] OpenAI 계정 + 결제 수단 등록 필요 (종량제 과금)\n[발급 순서] ① platform.openai.com 가입 ② API Keys 메뉴 ③ Create new secret key ④ sk-로 시작하는 키 복사\n[주의] 키는 생성 시 한 번만 표시됩니다. 반드시 즉시 복사하세요.',
    guide: 'https://platform.openai.com/api-keys',
  },
  {
    value: 'gemini',
    label: 'Google Gemini',
    placeholder: 'AIza...',
    note: 'Google Gemini 모델로 글을 생성합니다. 무료 사용량이 넉넉하여 입문용으로 추천합니다.\n\n[발급 조건] Google 계정만 있으면 무료 발급 가능\n[발급 순서] ① aistudio.google.com 접속 ② Get API Key 클릭 ③ Create API key in new project 선택 ④ AIza로 시작하는 키 복사',
    guide: 'https://aistudio.google.com/app/apikey',
  },
]

const IMAGE_PROVIDERS: ProviderDef[] = [
  {
    value: 'imagen',
    label: 'Google Imagen 3',
    placeholder: 'AIza...',
    note: 'Imagen 3 모델로 블로그 대표 이미지를 자동 생성합니다. Gemini API 키와 동일한 형식입니다.\n\n[발급 조건] Google 계정 + Gemini API 키와 동일 (별도 발급 불필요)\n[발급 순서] Gemini 키를 이미 발급받았다면 같은 키를 입력하세요. 없다면 위 Gemini 가이드를 따라주세요.\n[참고] Imagen은 Gemini API를 통해 호출되므로 별도 키가 필요하지 않습니다.',
    guide: 'https://aistudio.google.com/app/apikey',
  },
]

const KEYWORD_PROVIDERS: ProviderDef[] = [
  {
    value: 'naver_ad',
    label: '네이버 광고 API',
    placeholder: 'API 키 입력',
    needsSecret: true,
    secretPlaceholder: '시크릿 키 입력',
    secretLabel: 'API Secret',
    needsExtra: true,
    extraPlaceholder: '광고 계정 Customer ID (숫자)',
    extraLabel: 'Customer ID',
    note: '네이버 검색광고 키워드 도구 데이터를 조회합니다. 월간 검색량, 경쟁도, 클릭 단가(CPC) 분석에 필수입니다.\n\n[발급 조건] 네이버 검색광고 계정 필요 (사업자등록번호 또는 개인 가입 가능). 광고 집행 없이도 API 키 발급 가능\n[발급 순서] ① searchad.naver.com 가입 ② 도구 > API 사용 관리 ③ API 키 신청 ④ API License (키) + Secret Key 복사\n[Customer ID 확인] 네이버 검색광고 로그인 → 좌측 상단 광고 계정 이름 옆 숫자가 Customer ID입니다.\n[주의] API 키, Secret, Customer ID 세 가지 모두 입력해야 합니다.',
    guide: 'https://manage.searchad.naver.com',
  },
  {
    value: 'naver_search',
    label: '네이버 검색 API',
    placeholder: 'Client ID',
    needsSecret: true,
    secretPlaceholder: 'Client Secret',
    secretLabel: 'Client Secret',
    note: '네이버 검색 트렌드, 연관 키워드, 블로그 검색, 뉴스 기사 데이터를 분석합니다.\nAI 글 생성 시 "전문글 작성" 모드를 켜면 키워드 관련 최신 뉴스 기사를 검색하여 AI가 전문성 있는 글을 작성하는 데 활용됩니다.\n\n[발급 조건] 네이버 개발자 계정 (일반 네이버 계정으로 가입 가능, 무료)\n[발급 순서] ① developers.naver.com 가입 ② Application > 애플리케이션 등록 ③ 사용 API: 검색 선택 ④ Client ID + Client Secret 복사\n[참고] 일일 25,000건 무료 호출 가능합니다.',
    guide: 'https://developers.naver.com/apps',
  },
  {
    value: 'google_kwp',
    label: 'Google Keyword Planner',
    placeholder: 'Developer Token',
    needsSecret: true,
    secretPlaceholder: 'OAuth Client ID:Client Secret (콜론으로 구분)',
    secretLabel: 'OAuth Client ID:Secret',
    needsExtra: true,
    extraPlaceholder: 'Refresh Token',
    extraLabel: 'OAuth Refresh Token',
    note: 'Google Ads 키워드 플래너로 글로벌 검색량을 분석합니다. 해외 블로그 운영 시 필수입니다.\n\n[필요 항목] 4가지 모두 필요합니다:\n① Developer Token (Google Ads에서 발급)\n② OAuth Client ID + Client Secret (Google Cloud Console에서 발급)\n③ OAuth Refresh Token (인증 플로우로 획득)\n④ Google Ads Customer ID (계정 상단 xxx-xxx-xxxx)\n\n[STEP 1] Google Ads 계정 생성\nads.google.com → 계정 생성 (결제수단 등록 필요, 광고 집행은 불필요)\n계정 생성 후 상단의 Customer ID(xxx-xxx-xxxx) 메모\n\n[STEP 2] Developer Token 발급\nGoogle Ads 로그인 → 도구(렌치 아이콘) → Admin → API Center\n또는 직접 URL: ads.google.com/aw/apicenter\nDeveloper Token 신청 (처음에는 Test Account → Basic Access 승인 신청, 2~7일 소요)\n\n[STEP 3] Google Cloud에서 OAuth 2.0 설정\nconsole.cloud.google.com → 프로젝트 생성\n→ "Google Ads API" 사용 설정 (APIs & Services > Enable APIs)\n→ OAuth 동의 화면 구성\n→ 사용자 인증 정보 > OAuth 2.0 Client ID 생성 (유형: 웹 애플리케이션)\n→ Client ID와 Client Secret 복사\n\n[STEP 4] Refresh Token 획득\nOAuth 2.0 플로우로 Google 계정 인증 후 Refresh Token 획득\nscope: googleapis.com/auth/adwords\n\n[주의] Test Account에서는 실제 데이터가 제한됩니다. 정밀 검색량을 원하면 소액이라도 광고 캠페인 운영을 권장합니다.\nAPI 호출 자체는 무료이며, 개인도 발급 가능합니다 (사업자 불필요).',
    guide: 'https://ads.google.com/aw/apicenter',
  },
]

const MONETIZE_PROVIDERS: ProviderDef[] = [
  {
    value: 'coupang',
    label: '쿠팡파트너스',
    placeholder: 'Access Key',
    needsSecret: true,
    secretPlaceholder: 'Secret Key',
    secretLabel: 'Secret Key',
    note: '쿠팡 상품 링크를 자동 삽입하여 구매 시 수수료 수익(3~7%)을 창출합니다.\n\n[발급 조건] 쿠팡파트너스 가입 + 웹사이트/블로그 URL 등록 + 심사 승인 필요 (보통 1~3일)\n[발급 순서] ① partners.coupang.com 가입 ② 미디어(블로그 URL) 등록 및 심사 대기 ③ 승인 후 "도구" > "Open API" 메뉴 진입 ④ Access Key + Secret Key 발급 및 복사\n[주의] 반드시 블로그/웹사이트가 실제 운영 중이어야 심사 통과됩니다. 컨텐츠가 없는 빈 사이트는 거절될 수 있습니다.\n[수익 구조] 방문자가 쿠팡 링크를 클릭하고 24시간 내 구매 시 수수료 적립',
    guide: 'https://partners.coupang.com',
  },
  {
    value: 'amazon',
    label: 'Amazon Associates',
    placeholder: 'Access Key',
    needsSecret: true,
    secretPlaceholder: 'Secret Key',
    secretLabel: 'Secret Key',
    note: '아마존 상품 링크를 통한 해외 제휴 수익(1~10%)을 창출합니다. 영어/글로벌 블로그에 적합합니다.\n\n[발급 조건] Amazon Associates 가입 + 웹사이트 등록 + 180일 내 3건 이상 판매 달성 필요 (미달성 시 계정 해지)\n[발급 순서] ① affiliate-program.amazon.com 가입 ② 프로필 및 웹사이트 정보 입력 ③ 승인 후 Tools > Product Advertising API ④ Add Credentials로 Access Key + Secret Key 발급\n[주의] 가입 후 180일 내 최소 3건 판매가 이루어져야 계정이 유지됩니다. API 키는 판매 실적과 별도로 바로 발급 가능합니다.\n[수익 구조] 카테고리별 1~10% 수수료. 전자기기(3~4%), 패션(7~10%), 도서(4.5%)',
    guide: 'https://affiliate-program.amazon.com',
  },
]

const SNS_PROVIDERS: ProviderDef[] = [
  {
    value: 'threads',
    label: 'Threads',
    placeholder: 'Threads Long-Lived Access Token',
    note: 'Meta Threads API로 발행글을 자동 배포합니다 (텍스트 + 이미지 1장).\n\n[발급 조건] Meta for Developers 계정 + Threads 앱 등록 + Threads 비즈니스 계정 연결\n[발급 순서]\n① developers.facebook.com 가입\n② "내 앱" → "앱 만들기" → 사용 사례: Threads 선택\n③ 좌측 메뉴 "Threads API" → 권한 추가: threads_basic, threads_content_publish\n④ "사용자 토큰 생성기"에서 본인 Threads 계정 인증\n⑤ Short-Lived Token 획득 → "Long-Lived Token으로 교환"\n⑥ AIza... 형태가 아닌 EAAJ... / IGAAxxx... 로 시작하는 긴 토큰 복사\n[유효기간] Long-Lived Token은 60일 유효. 만료 전 자동 갱신 로직이 동작합니다.\n[참고] Threads는 별도 Client ID/Secret 없이 Access Token 1개만으로 게시 가능합니다.',
    guide: 'https://developers.facebook.com/docs/threads/get-started',
  },
]

const EVENT_PROVIDERS: ProviderDef[] = [
  {
    value: 'google_trends',
    label: 'Google Trends',
    placeholder: 'SerpAPI Key (선택 사항)',
    note: 'Google 급상승 검색어를 자동으로 수집합니다. API 키 없이도 Google Trends RSS 피드로 기본 기능이 동작합니다.\n\n[발급 조건] 고급 기능 사용 시 SerpAPI 계정 필요 (무료 플랜 제공)\n[발급 순서] ① serpapi.com 가입 ② Dashboard에서 API Key 복사 ③ 위 입력란에 붙여넣기\n[참고] API 키 미등록 시에도 기본 트렌드 수집이 가능합니다.',
    guide: 'https://serpapi.com/google-trends-api',
  },
  {
    value: 'interpark',
    label: '인터파크 티켓',
    placeholder: 'API Key (선택 사항)',
    note: '공연/콘서트 일정을 자동으로 수집합니다. 현재 네이버 검색을 통해 인터파크 공연 정보를 수집하므로 별도 API 키 없이도 기본 기능이 동작합니다.\n\n[발급 조건] 인터파크 Open API는 별도 제휴 계약 필요\n[참고] 향후 직접 크롤링 기능이 추가될 예정입니다.',
    guide: 'https://ticket.interpark.com/',
  },
]

const ALL_PROVIDERS: ProviderDef[] = [...TEXT_PROVIDERS, ...IMAGE_PROVIDERS, ...KEYWORD_PROVIDERS, ...MONETIZE_PROVIDERS, ...SNS_PROVIDERS, ...EVENT_PROVIDERS]

const PROVIDER_CATEGORY_LABEL: Record<string, { label: string; badge: string }> = {
  text: { label: '텍스트 생성', badge: 'default' },
  image: { label: '이미지 생성', badge: 'outline' },
  keyword: { label: '키워드 분석', badge: 'secondary' },
  monetize: { label: '수익화', badge: 'destructive' },
  sns: { label: 'SNS 자동배포', badge: 'default' },
  event: { label: '이벤트 소스', badge: 'secondary' },
}

function getProviderCategory(provider: string): string {
  if (TEXT_PROVIDERS.some(p => p.value === provider)) return 'text'
  if (IMAGE_PROVIDERS.some(p => p.value === provider)) return 'image'
  if (KEYWORD_PROVIDERS.some(p => p.value === provider)) return 'keyword'
  if (MONETIZE_PROVIDERS.some(p => p.value === provider)) return 'monetize'
  if (SNS_PROVIDERS.some(p => p.value === provider)) return 'sns'
  if (EVENT_PROVIDERS.some(p => p.value === provider)) return 'event'
  return 'text'
}

function SettingsPageInner() {
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') ?? 'account')
  const { planId, refetch: refetchPlan } = usePlanContext()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [aiKeys, setAIKeys] = useState<AIKey[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // 프로필 폼
  const [name, setName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [phone, setPhone] = useState('')
  const [country, setCountry] = useState('KR')
  const [authProvider, setAuthProvider] = useState<string>('email')

  // 비밀번호 변경 폼
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  // AI 키 폼
  const [selectedProvider, setSelectedProvider] = useState<string>('claude')
  const [newKey, setNewKey] = useState('')
  const [newSecret, setNewSecret] = useState('')
  const [newExtra, setNewExtra] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [showSecret, setShowSecret] = useState(false)
  const [showExtra, setShowExtra] = useState(false)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({})
  const [addingKey, setAddingKey] = useState(false)
  const [addResult, setAddResult] = useState<{ ok: boolean; message: string } | null>(null)

  // 계정 삭제 2단계
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0)
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('')
  const [deletingAccount, setDeletingAccount] = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [profileRes, keysRes] = await Promise.all([
        fetch('/api/me'),
        fetch('/api/ai-keys'),
      ])
      const [p, k] = await Promise.all([profileRes.json(), keysRes.json()])
      if (p.data) {
        setProfile(p.data)
        setName(p.data.name ?? '')
        setDisplayName(p.data.display_name ?? '')
        setPhone(p.data.phone ?? '')
        setCountry(p.data.country ?? 'KR')
      }
      if (p.auth_provider) {
        setAuthProvider(p.auth_provider)
      }
      setAIKeys(k.data ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  async function saveProfile() {
    setSaving(true)
    try {
      await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, display_name: displayName, phone, country }),
      })
      setProfile(p => p ? { ...p, name, display_name: displayName, phone, country } : p)
    } finally {
      setSaving(false)
    }
  }

  async function changePassword() {
    setPasswordError('')
    setPasswordSuccess(false)

    if (!newPassword) {
      setPasswordError('새 비밀번호를 입력해주세요.')
      return
    }
    if (newPassword.length < 6) {
      setPasswordError('비밀번호는 최소 6자 이상이어야 합니다.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('비밀번호가 일치하지 않습니다.')
      return
    }

    setPasswordSaving(true)
    try {
      const res = await fetch('/api/me/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      })
      if (res.ok) {
        setPasswordSuccess(true)
        setNewPassword('')
        setConfirmPassword('')
      } else {
        const data = await res.json()
        setPasswordError(data.error || '비밀번호 변경에 실패했습니다.')
      }
    } finally {
      setPasswordSaving(false)
    }
  }

  async function addKey() {
    if (!newKey.trim()) return
    const providerDef = ALL_PROVIDERS.find(p => p.value === selectedProvider)
    if (providerDef?.needsSecret && !newSecret.trim()) {
      setAddResult({ ok: false, message: `${providerDef.secretLabel ?? 'Secret'}을 입력해주세요.` })
      return
    }
    if (providerDef?.needsExtra && !newExtra.trim()) {
      setAddResult({ ok: false, message: `${providerDef.extraLabel ?? 'Customer ID'}를 입력해주세요.` })
      return
    }
    setAddingKey(true)
    setAddResult(null)
    try {
      const body: Record<string, string> = { provider: selectedProvider, apiKey: newKey.trim() }
      if (newSecret.trim()) body.apiSecret = newSecret.trim()
      if (newExtra.trim()) body.apiExtra = newExtra.trim()
      const res = await fetch('/api/ai-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (res.ok) {
        setNewKey('')
        setNewSecret('')
        setNewExtra('')
        setAddResult({ ok: true, message: `${providerDef?.label ?? selectedProvider} 키가 성공적으로 등록되었습니다.` })
        fetchAll()
      } else {
        setAddResult({ ok: false, message: json.error ?? '등록에 실패했습니다.' })
      }
    } catch {
      setAddResult({ ok: false, message: '네트워크 오류가 발생했습니다.' })
    } finally {
      setAddingKey(false)
    }
  }

  async function testKey(id: string) {
    setTestingId(id)
    try {
      const res = await fetch(`/api/ai-keys/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test' }),
      })
      const json = await res.json()
      setTestResults(prev => ({
        ...prev,
        [id]: { success: json.success ?? false, message: json.message ?? '' },
      }))
    } catch {
      setTestResults(prev => ({
        ...prev,
        [id]: { success: false, message: '네트워크 오류' },
      }))
    } finally {
      setTestingId(null)
    }
  }

  async function toggleKey(id: string, currentActive: boolean) {
    try {
      const res = await fetch(`/api/ai-keys/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentActive }),
      })
      if (res.ok) {
        setAIKeys(prev => prev.map(k => k.id === id ? { ...k, is_active: !currentActive } : k))
      }
    } catch { /* ignore */ }
  }

  async function deleteKey(id: string) {
    if (!confirm('이 API 키를 삭제하시겠습니까?')) return
    await fetch(`/api/ai-keys/${id}`, { method: 'DELETE' })
    fetchAll()
  }

  function providerLabel(p: string) {
    return ALL_PROVIDERS.find(pr => pr.value === p)?.label ?? p
  }

  function getCategoryBadge(p: string) {
    const cat = getProviderCategory(p)
    const info = PROVIDER_CATEGORY_LABEL[cat]
    return info ?? PROVIDER_CATEGORY_LABEL.text
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">설정</h1>
        <p className="text-muted-foreground text-sm">계정 및 API 키를 관리합니다</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="overflow-x-auto -mx-1 px-1">
            <TabsList className="min-w-max">
              <TabsTrigger value="account" className="flex items-center gap-1.5 whitespace-nowrap">
                <User className="h-3.5 w-3.5" /> 계정
              </TabsTrigger>
              <TabsTrigger value="ai-keys" className="flex items-center gap-1.5 whitespace-nowrap">
                <Key className="h-3.5 w-3.5" /> API 키 관리
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-1.5 whitespace-nowrap">
                <Bell className="h-3.5 w-3.5" /> 알림
              </TabsTrigger>
              <TabsTrigger value="snippets" className="flex items-center gap-1.5 whitespace-nowrap">
                <Scissors className="h-3.5 w-3.5" /> 스니펫 관리
              </TabsTrigger>
              <TabsTrigger value="consent" className="flex items-center gap-1.5 whitespace-nowrap">
                <Shield className="h-3.5 w-3.5" /> 동의 관리
              </TabsTrigger>
              <TabsTrigger value="blog-all" className="flex items-center gap-1.5 whitespace-nowrap">
                <LayoutGrid className="h-3.5 w-3.5" /> 블로그 설정
              </TabsTrigger>
              <TabsTrigger value="ads" className="flex items-center gap-1.5 whitespace-nowrap">
                <DollarSign className="h-3.5 w-3.5" /> 광고 배치
              </TabsTrigger>
              <TabsTrigger value="plan" className="flex items-center gap-1.5 whitespace-nowrap">
                <CreditCard className="h-3.5 w-3.5" /> 요금제
              </TabsTrigger>
            </TabsList>
          </div>

          {/* 계정 탭 */}
          <TabsContent value="account" className="mt-6 space-y-4">
            {/* 카드 1: 프로필 정보 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">프로필</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>이메일</Label>
                  <Input value={profile?.email ?? ''} disabled className="bg-muted" />
                  <p className="text-xs text-muted-foreground">이메일은 변경할 수 없습니다.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>이름</Label>
                    <Input
                      placeholder="실명 입력"
                      value={name}
                      onChange={e => setName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>표시 이름</Label>
                    <Input
                      placeholder="대시보드에 표시될 이름"
                      value={displayName}
                      onChange={e => setDisplayName(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">대시보드 헤더에 표시됩니다.</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>연락처</Label>
                    <Input
                      type="tel"
                      placeholder="010-0000-0000"
                      value={phone}
                      onChange={e => {
                        const digits = e.target.value.replace(/\D/g, '').slice(0, 11)
                        const formatted = digits.length <= 3
                          ? digits
                          : digits.length <= 7
                            ? `${digits.slice(0, 3)}-${digits.slice(3)}`
                            : `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
                        setPhone(formatted)
                      }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>국가</Label>
                    <Select value={country} onValueChange={setCountry}>
                      <SelectTrigger>
                        <SelectValue placeholder="국가 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRIES.map(c => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={saveProfile} disabled={saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  저장
                </Button>
              </CardContent>
            </Card>

            {/* 카드 2: 로그인 정보 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  로그인 정보
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>로그인 방법</Label>
                  <div className="flex items-center gap-2">
                    {authProvider === 'google' ? (
                      <Badge variant="secondary" className="flex items-center gap-1.5 px-3 py-1">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        Google 계정으로 로그인됨
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="flex items-center gap-1.5 px-3 py-1">
                        이메일 / 비밀번호
                      </Badge>
                    )}
                  </div>
                </div>

                {authProvider !== 'google' && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">비밀번호 변경</Label>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">새 비밀번호</Label>
                        <Input
                          type="password"
                          placeholder="새 비밀번호 (최소 6자)"
                          value={newPassword}
                          onChange={e => { setNewPassword(e.target.value); setPasswordError(''); setPasswordSuccess(false) }}
                          autoComplete="new-password"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">새 비밀번호 확인</Label>
                        <Input
                          type="password"
                          placeholder="새 비밀번호를 다시 입력"
                          value={confirmPassword}
                          onChange={e => { setConfirmPassword(e.target.value); setPasswordError(''); setPasswordSuccess(false) }}
                          autoComplete="new-password"
                        />
                        {confirmPassword && newPassword !== confirmPassword && (
                          <p className="text-xs text-red-500">비밀번호가 일치하지 않습니다.</p>
                        )}
                      </div>
                      {passwordError && <p className="text-sm text-red-500">{passwordError}</p>}
                      {passwordSuccess && <p className="text-sm text-green-600">비밀번호가 변경되었습니다.</p>}
                      <Button
                        onClick={changePassword}
                        disabled={passwordSaving || !newPassword || newPassword !== confirmPassword}
                        variant="outline"
                      >
                        {passwordSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        비밀번호 변경
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* 카드 3: 위험 구역 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base text-destructive">위험 구역</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">계정 삭제</p>
                    <p className="text-xs text-muted-foreground mt-0.5">모든 데이터가 영구적으로 삭제됩니다.</p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => { setDeleteStep(1); setDeleteConfirmEmail('') }}
                  >
                    계정 삭제
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* API 키 관리 탭 */}
          <TabsContent value="ai-keys" className="mt-6 space-y-4">
            {/* 등록된 키 목록 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">등록된 API 키</CardTitle>
              </CardHeader>
              <CardContent>
                {aiKeys.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">등록된 API 키가 없습니다.</p>
                ) : (
                  <div className="space-y-3">
                    {aiKeys.map(key => {
                      const result = testResults[key.id]
                      const catInfo = getCategoryBadge(key.provider)
                      return (
                        <div key={key.id} className={`p-3 border rounded-lg ${!key.is_active ? 'opacity-60' : ''}`}>
                          {/* 상단: 제공자명 + 배지 */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium">{providerLabel(key.provider)}</span>
                            <Badge variant={catInfo.badge as 'default' | 'outline' | 'secondary' | 'destructive'} className="text-[10px] px-1.5 py-0">
                              {catInfo.label}
                            </Badge>
                            {key.has_secret && (
                              <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">시크릿 포함</span>
                            )}
                          </div>
                          {/* 중단: 마스킹 키 */}
                          <p className="text-xs text-muted-foreground font-mono mt-1">{key.masked_key}</p>
                          {/* 하단: 액션 버튼 */}
                          <div className="flex items-center gap-2 mt-2">
                            <Switch
                              checked={key.is_active}
                              onCheckedChange={() => toggleKey(key.id, key.is_active)}
                            />
                            <span className="text-xs text-muted-foreground">
                              {key.is_active ? '활성' : '비활성'}
                            </span>
                            <div className="flex-1" />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => testKey(key.id)}
                              disabled={testingId === key.id}
                            >
                              {testingId === key.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : '테스트'}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => deleteKey(key.id)}>
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                          {result && (
                            <div className={`flex items-center gap-1.5 mt-2 text-xs px-2.5 py-1.5 rounded ${
                              result.success
                                ? 'bg-green-50 text-green-700 border border-green-200'
                                : 'bg-red-50 text-red-700 border border-red-200'
                            }`}>
                              {result.success
                                ? <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                                : <XCircle className="h-3.5 w-3.5 shrink-0" />}
                              {result.message}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 새 키 추가 — 4카테고리 (동의 필요) */}
            <ConsentGate consentType="api_key_storage" ui="inline_panel">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">API 키 추가</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 텍스트 생성 AI */}
                <div className="space-y-2">
                  <Label>텍스트 생성 AI</Label>
                  <div className="flex gap-2 flex-wrap">
                    {TEXT_PROVIDERS.map(p => {
                      const registered = aiKeys.some(k => k.provider === p.value)
                      return (
                        <button
                          key={p.value}
                          onClick={() => { setSelectedProvider(p.value); setNewKey(''); setNewSecret(''); setNewExtra('') }}
                          className={`relative px-3 py-1.5 rounded-lg text-sm border transition-colors flex items-center gap-1.5 ${
                            selectedProvider === p.value
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'border-border hover:bg-muted'
                          }`}
                        >
                          {p.label}
                          {registered && (
                            <Check className={`h-3.5 w-3.5 ${selectedProvider === p.value ? 'text-primary-foreground' : 'text-green-500'}`} />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* 이미지 생성 AI */}
                <div className="space-y-2">
                  <Label>이미지 생성 AI</Label>
                  <div className="flex gap-2 flex-wrap">
                    {IMAGE_PROVIDERS.map(p => {
                      const registered = aiKeys.some(k => k.provider === p.value)
                      return (
                        <button
                          key={p.value}
                          onClick={() => { setSelectedProvider(p.value); setNewKey(''); setNewSecret(''); setNewExtra('') }}
                          className={`px-3 py-1.5 rounded-lg text-sm border transition-colors flex items-center gap-1.5 ${
                            selectedProvider === p.value
                              ? 'bg-violet-600 text-white border-violet-600'
                              : 'border-border hover:bg-muted'
                          }`}
                        >
                          {p.label}
                          {registered && (
                            <Check className={`h-3.5 w-3.5 ${selectedProvider === p.value ? 'text-white' : 'text-green-500'}`} />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* 키워드 분석 도구 */}
                <div className="space-y-2">
                  <Label>키워드 분석 도구</Label>
                  <p className="text-xs text-muted-foreground">검색량, 경쟁도, CPC 데이터를 분석하여 고수익 키워드를 발굴합니다.</p>
                  <div className="flex gap-2 flex-wrap">
                    {KEYWORD_PROVIDERS.map(p => {
                      const registered = aiKeys.some(k => k.provider === p.value)
                      return (
                        <button
                          key={p.value}
                          onClick={() => { setSelectedProvider(p.value); setNewKey(''); setNewSecret(''); setNewExtra('') }}
                          className={`px-3 py-1.5 rounded-lg text-sm border transition-colors flex items-center gap-1.5 ${
                            selectedProvider === p.value
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'border-border hover:bg-muted'
                          }`}
                        >
                          {p.label}
                          {registered && (
                            <Check className={`h-3.5 w-3.5 ${selectedProvider === p.value ? 'text-white' : 'text-green-500'}`} />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* 수익화 제휴 */}
                <div className="space-y-2">
                  <Label>수익화 (제휴 마케팅)</Label>
                  <p className="text-xs text-muted-foreground">블로그 글에 제휴 상품 링크를 자동 삽입하여 추가 수익을 창출합니다.</p>
                  <div className="flex gap-2 flex-wrap">
                    {MONETIZE_PROVIDERS.map(p => {
                      const registered = aiKeys.some(k => k.provider === p.value)
                      return (
                        <button
                          key={p.value}
                          onClick={() => { setSelectedProvider(p.value); setNewKey(''); setNewSecret(''); setNewExtra('') }}
                          className={`px-3 py-1.5 rounded-lg text-sm border transition-colors flex items-center gap-1.5 ${
                            selectedProvider === p.value
                              ? 'bg-orange-600 text-white border-orange-600'
                              : 'border-border hover:bg-muted'
                          }`}
                        >
                          {p.label}
                          {registered && (
                            <Check className={`h-3.5 w-3.5 ${selectedProvider === p.value ? 'text-white' : 'text-green-500'}`} />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* SNS 자동배포 */}
                <div className="space-y-2">
                  <Label>SNS 자동배포</Label>
                  <p className="text-xs text-muted-foreground">발행한 글을 SNS에 자동으로 배포합니다. 외부 백링크 확보로 도메인 신뢰도가 빠르게 오릅니다.</p>
                  <div className="flex gap-2 flex-wrap">
                    {SNS_PROVIDERS.map(p => {
                      const registered = aiKeys.some(k => k.provider === p.value)
                      return (
                        <button
                          key={p.value}
                          onClick={() => { setSelectedProvider(p.value); setNewKey(''); setNewSecret(''); setNewExtra('') }}
                          className={`px-3 py-1.5 rounded-lg text-sm border transition-colors flex items-center gap-1.5 ${
                            selectedProvider === p.value
                              ? 'bg-pink-600 text-white border-pink-600'
                              : 'border-border hover:bg-muted'
                          }`}
                        >
                          {p.label}
                          {registered && (
                            <Check className={`h-3.5 w-3.5 ${selectedProvider === p.value ? 'text-white' : 'text-green-500'}`} />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* 이벤트 소스 (EVENT) */}
                <div className="space-y-2">
                  <Label>이벤트 소스 (EVENT)</Label>
                  <p className="text-xs text-muted-foreground">트렌드 및 공연/콘서트 일정 데이터를 자동 수집합니다. API 키 없이도 기본 기능이 동작합니다.</p>
                  <div className="flex gap-2 flex-wrap">
                    {EVENT_PROVIDERS.map(p => {
                      const registered = aiKeys.some(k => k.provider === p.value)
                      const IconComponent = p.value === 'google_trends' ? TrendingUp : Ticket
                      return (
                        <button
                          key={p.value}
                          onClick={() => { setSelectedProvider(p.value); setNewKey(''); setNewSecret(''); setNewExtra('') }}
                          className={`px-3 py-1.5 rounded-lg text-sm border transition-colors flex items-center gap-1.5 ${
                            selectedProvider === p.value
                              ? 'bg-cyan-600 text-white border-cyan-600'
                              : 'border-border hover:bg-muted'
                          }`}
                        >
                          <IconComponent className="h-3.5 w-3.5" />
                          {p.label}
                          {registered && (
                            <Check className={`h-3.5 w-3.5 ${selectedProvider === p.value ? 'text-white' : 'text-green-500'}`} />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <Separator />

                {/* 선택된 프로바이더 정보 */}
                {(() => {
                  const providerDef = ALL_PROVIDERS.find(p => p.value === selectedProvider)
                  if (!providerDef) return null
                  return (
                    <div className="space-y-3">
                      {providerDef.note && (
                        <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 whitespace-pre-line leading-relaxed">
                          {providerDef.note}
                          {providerDef.guide && (
                            <div className="mt-2">
                              <a href={providerDef.guide} target="_blank" rel="noopener noreferrer"
                                className="text-blue-600 hover:underline font-medium">
                                공식 사이트에서 발급하기 →
                              </a>
                            </div>
                          )}
                        </div>
                      )}

                      <ApiGuideAccordion provider={providerDef.value} label={`${providerDef.label} 발급 가이드`} />

                      <div className="space-y-1.5">
                        <Label>API 키</Label>
                        <div className="relative">
                          <Input
                            type={showKey ? 'text' : 'password'}
                            placeholder={providerDef.placeholder}
                            value={newKey}
                            onChange={e => setNewKey(e.target.value)}
                            className="pr-10 font-mono text-sm"
                          />
                          <button
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            onClick={() => setShowKey(s => !s)}
                          >
                            {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      {providerDef.needsSecret && (
                        <div className="space-y-1.5">
                          <Label>{providerDef.secretLabel ?? 'API Secret'}</Label>
                          <div className="relative">
                            <Input
                              type={showSecret ? 'text' : 'password'}
                              placeholder={providerDef.secretPlaceholder ?? 'Secret 입력'}
                              value={newSecret}
                              onChange={e => setNewSecret(e.target.value)}
                              className="pr-10 font-mono text-sm"
                            />
                            <button
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                              onClick={() => setShowSecret(s => !s)}
                            >
                              {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                      )}

                      {providerDef.needsExtra && (
                        <div className="space-y-1.5">
                          <Label>{providerDef.extraLabel ?? 'Customer ID'}</Label>
                          <div className="relative">
                            <Input
                              type={showExtra ? 'text' : 'password'}
                              placeholder={providerDef.extraPlaceholder ?? 'Customer ID 입력'}
                              value={newExtra}
                              onChange={e => setNewExtra(e.target.value)}
                              className="pr-10 font-mono text-sm"
                            />
                            <button
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                              onClick={() => setShowExtra(s => !s)}
                            >
                              {showExtra ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            네이버 검색광고 로그인 후 좌측 상단에 표시되는 광고 계정 번호입니다.
                          </p>
                        </div>
                      )}

                      <p className="text-xs text-muted-foreground">
                        키는 AES-256-GCM으로 암호화되어 안전하게 저장됩니다.
                      </p>
                    </div>
                  )
                })()}

                <Button onClick={addKey} disabled={addingKey || !newKey.trim()}>
                  {addingKey ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  API 키 등록
                </Button>

                {addResult && (
                  <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${
                    addResult.ok
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    {addResult.ok
                      ? <CheckCircle className="h-4 w-4 shrink-0" />
                      : <XCircle className="h-4 w-4 shrink-0" />}
                    {addResult.message}
                  </div>
                )}
              </CardContent>
            </Card>
            </ConsentGate>
          </TabsContent>

          {/* 알림 탭 */}
          <TabsContent value="notifications" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">알림 설정</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { label: '스케줄러 실행 완료', desc: '자동화 작업이 완료되면 알림을 받습니다.' },
                    { label: '스케줄러 실행 실패', desc: '자동화 작업이 실패하면 알림을 받습니다.' },
                    { label: '키워드 풀 고갈', desc: '사용 가능한 키워드가 없을 때 알림을 받습니다.' },
                  ].map((item, i) => (
                    <div key={i}>
                      {i > 0 && <Separator className="mb-4" />}
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{item.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                        </div>
                        <Badge variant="secondary">준비 중</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 스니펫 관리 탭 */}
          <TabsContent value="snippets" className="mt-6">
            <MemoTab />
          </TabsContent>
          {/* 동의 관리 탭 */}
          <TabsContent value="consent" className="mt-6">
            <ConsentManagementSection />
          </TabsContent>

          <TabsContent value="blog-all" className="mt-6">
            <BlogSettingsAllInOne />
          </TabsContent>

          <TabsContent value="ads" className="mt-6">
            <AdsConfigTab />
          </TabsContent>

          <TabsContent value="plan" className="mt-6">
            <PlanSettingsTab currentPlanId={planId} onPlanChange={refetchPlan} />
          </TabsContent>
        </Tabs>
      )}

      {/* 계정 삭제 2단계 다이얼로그 */}
      <Dialog open={deleteStep > 0} onOpenChange={isOpen => { if (!isOpen) setDeleteStep(0) }}>
        <DialogContent className="max-w-sm">
          {deleteStep === 1 && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  정말 계정을 삭제하시겠습니까?
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  확인을 위해 이메일 주소를 입력해주세요.
                </p>
                <Input
                  placeholder={profile?.email ?? '이메일 입력'}
                  value={deleteConfirmEmail}
                  onChange={e => setDeleteConfirmEmail(e.target.value)}
                />
              </div>
              <DialogFooter className="flex-row gap-2">
                <Button variant="outline" onClick={() => setDeleteStep(0)}>취소</Button>
                <Button
                  variant="destructive"
                  disabled={deleteConfirmEmail !== profile?.email}
                  onClick={() => setDeleteStep(2)}
                >
                  다음
                </Button>
              </DialogFooter>
            </>
          )}
          {deleteStep === 2 && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  최종 확인
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <p className="text-sm">
                  계정을 삭제하시면 다음 혜택들을 더 이상 이용할 수 없습니다:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
                  <li>등록된 모든 블로그 및 게시물 데이터</li>
                  <li>AI 캐릭터 및 키워드 분석 데이터</li>
                  <li>저장된 API 키 및 연동 설정</li>
                  <li>수익화 설정 및 SNS 연동</li>
                  <li>스케줄러 자동화 설정</li>
                </ul>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-800 font-medium">이 작업은 되돌릴 수 없습니다.</p>
                </div>
              </div>
              <DialogFooter className="flex-row gap-2">
                <Button variant="outline" onClick={() => setDeleteStep(0)} disabled={deletingAccount}>취소</Button>
                <Button
                  variant="destructive"
                  disabled={deletingAccount}
                  onClick={async () => {
                    setDeletingAccount(true)
                    try {
                      const res = await fetch('/api/me', { method: 'DELETE' })
                      if (!res.ok) throw new Error('삭제 실패')
                      window.location.href = '/login'
                    } catch {
                      setDeletingAccount(false)
                    }
                  }}
                >
                  {deletingAccount ? (
                    <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />삭제 중...</>
                  ) : '계정 삭제'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
      <SettingsPageInner />
    </Suspense>
  )
}
