'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Trash2, Info, ChevronDown, ChevronUp, Loader2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { LANGUAGES, COLORS, BLOG_TYPES } from './constants'
import type { BlogLanguage } from '@/types/monetize'

// ─── Domain Setting Sub-Component ───

type DomainStatus = 'idle' | 'checking' | 'connected' | 'misconfigured' | 'pending_verification' | 'not_found' | 'error'

const STATUS_CONFIG: Record<DomainStatus, { color: string; bg: string; border: string; label: string } | null> = {
  idle: null,
  checking: { color: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-200', label: '확인 중...' },
  connected: { color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200', label: '정상 연결됨' },
  misconfigured: { color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', label: 'DNS 설정 오류 - CNAME 또는 A 레코드를 확인하세요' },
  pending_verification: { color: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-200', label: '도메인 소유권 확인 필요' },
  not_found: { color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', label: 'Vercel에 등록되지 않음 - 이 페이지 하단의 "저장" 버튼을 눌러 도메인을 등록하세요' },
  error: { color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', label: '상태 확인 실패' },
}

function DomainSettingSection({ customDomain, setCustomDomain }: { customDomain: string; setCustomDomain: (v: string) => void }) {
  const [showGuide, setShowGuide] = useState(false)
  const [domainStatus, setDomainStatus] = useState<DomainStatus>('idle')
  const [hasAutoChecked, setHasAutoChecked] = useState(false)

  const checkDomainStatus = useCallback(async (domain: string) => {
    if (!domain.trim()) { setDomainStatus('idle'); return }
    setDomainStatus('checking')
    try {
      const res = await fetch(`/api/domains/status?domain=${encodeURIComponent(domain)}`)
      const data = await res.json()
      setDomainStatus(data.status as DomainStatus)
    } catch {
      setDomainStatus('error')
    }
  }, [])

  useEffect(() => {
    if (customDomain && !hasAutoChecked) {
      checkDomainStatus(customDomain)
      setHasAutoChecked(true)
    }
  }, [customDomain, hasAutoChecked, checkDomainStatus])

  const statusConfig = STATUS_CONFIG[domainStatus]

  return (
    <div className="space-y-2">
      <Label>내 도메인 연결</Label>
      <div className="flex gap-2">
        <Input value={customDomain} onChange={e => setCustomDomain(e.target.value)}
          placeholder="myblog.com 또는 blog.mydomain.com" className="flex-1" />
        {customDomain && (
          <Button type="button" variant="outline" size="sm"
            onClick={() => checkDomainStatus(customDomain)}
            disabled={domainStatus === 'checking'}
            className="whitespace-nowrap"
          >
            {domainStatus === 'checking' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : '상태 확인'}
          </Button>
        )}
      </div>
      {statusConfig && (
        <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border ${statusConfig.bg} ${statusConfig.border} ${statusConfig.color}`}>
          {domainStatus === 'checking' && <Loader2 className="w-3 h-3 animate-spin" />}
          {domainStatus === 'connected' && <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />}
          {(domainStatus === 'misconfigured' || domainStatus === 'pending_verification') && <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />}
          {(domainStatus === 'not_found' || domainStatus === 'error') && <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />}
          {statusConfig.label}
        </div>
      )}
      <p className="text-xs text-gray-500">
        가비아, 카페24, GoDaddy 등에서 구매한 도메인을 입력하면 이 블로그의 주소로 사용됩니다.
        도메인이 없으면 비워두세요.
      </p>

      <button
        type="button"
        onClick={() => setShowGuide(!showGuide)}
        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
      >
        <Info className="w-3.5 h-3.5" />
        도메인 연결 방법 (DNS 설정 가이드)
        {showGuide ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {showGuide && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4 text-xs text-gray-700">
          <p className="font-semibold text-sm text-gray-900">도메인을 구매한 사이트에서 DNS 설정이 필요합니다</p>

          <div className="space-y-2">
            <p className="font-medium text-gray-800">myblog.com 같은 루트 도메인을 연결할 때</p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse bg-white rounded">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 px-3 py-1.5 text-left font-medium">타입</th>
                    <th className="border border-gray-200 px-3 py-1.5 text-left font-medium">이름(호스트)</th>
                    <th className="border border-gray-200 px-3 py-1.5 text-left font-medium">값(위치/대상)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-200 px-3 py-1.5 font-mono">A</td>
                    <td className="border border-gray-200 px-3 py-1.5 font-mono">@</td>
                    <td className="border border-gray-200 px-3 py-1.5 font-mono">76.76.21.21</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-gray-500">@ 는 &quot;도메인 자체&quot;를 의미합니다.</p>
          </div>

          <div className="space-y-2">
            <p className="font-medium text-gray-800">blog.mydomain.com 같은 서브도메인을 연결할 때</p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse bg-white rounded">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 px-3 py-1.5 text-left font-medium">타입</th>
                    <th className="border border-gray-200 px-3 py-1.5 text-left font-medium">이름(호스트)</th>
                    <th className="border border-gray-200 px-3 py-1.5 text-left font-medium">값(위치/대상)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-200 px-3 py-1.5 font-mono">CNAME</td>
                    <td className="border border-gray-200 px-3 py-1.5 font-mono">blog</td>
                    <td className="border border-gray-200 px-3 py-1.5 font-mono">cname.vercel-dns.com</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-gray-500">&quot;blog&quot; 자리에 원하는 이름(www, news 등)을 넣습니다.</p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded p-3 space-y-1">
            <p className="font-medium text-amber-800">참고사항</p>
            <ul className="list-disc list-inside text-amber-700 space-y-0.5">
              <li>DNS 설정 후 적용까지 <b>최대 24~48시간</b> 소요 (보통 10분~1시간)</li>
              <li>SSL 인증서(https)는 <b>자동 발급</b>됩니다</li>
            </ul>
          </div>

          <div className="space-y-1">
            <p className="font-medium text-gray-800">업체별 DNS 설정 위치</p>
            <ul className="list-disc list-inside text-gray-600 space-y-0.5">
              <li><b>가비아</b>: My가비아 &gt; 도메인 관리 &gt; DNS 설정</li>
              <li><b>카페24</b>: 나의서비스관리 &gt; 도메인 관리 &gt; DNS 관리</li>
              <li><b>GoDaddy</b>: 내 도메인 &gt; DNS 관리 &gt; 레코드 추가</li>
              <li><b>Cloudflare</b>: 대시보드 &gt; 해당 도메인 &gt; DNS &gt; 레코드</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── BasicInfoForm ───

interface BasicInfoFormProps {
  blogId: string
  showDeleteButton?: boolean
  onLanguageTabClick?: () => void
}

export function BasicInfoForm({ blogId, showDeleteButton = true, onLanguageTabClick }: BasicInfoFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [customDomain, setCustomDomain] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [isActive, setIsActive] = useState(true)
  const [blogType, setBlogType] = useState('')
  const [blogLanguage, setBlogLanguage] = useState<BlogLanguage>('ko')
  const [slug, setSlug] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch(`/api/blogs/${blogId}`)
      if (!res.ok) return
      const { data } = await res.json()
      setName(data.name ?? '')
      setDescription(data.description ?? '')
      setCustomDomain(data.custom_domain ?? '')
      setColor(data.color ?? COLORS[0])
      setIsActive(data.is_active ?? true)
      setBlogType(data.blog_type ?? '')
      setBlogLanguage(data.language ?? 'ko')
      setSlug(data.slug ?? '')
      setLoading(false)
    }
    fetchData()
  }, [blogId])

  const showSuccessMsg = (msg: string) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(''), 3000)
  }

  const handleSave = async () => {
    setSaving(true)
    const res = await fetch(`/api/blogs/${blogId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, customDomain: customDomain || null, color, isActive, blogType: blogType || null }),
    })
    setSaving(false)
    if (res.ok) showSuccessMsg('기본정보가 저장되었습니다.')
  }

  // ─── 2단계 블로그 삭제 ───
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0)
  const [deleteConfirmName, setDeleteConfirmName] = useState('')
  const [deleting, setDeleting] = useState(false)

  const handleDeleteStep1 = () => {
    setDeleteStep(1)
    setDeleteConfirmName('')
  }

  const handleDeleteStep2 = () => {
    setDeleteStep(2)
  }

  const handleDeleteFinal = async () => {
    setDeleting(true)
    const res = await fetch(`/api/blogs/${blogId}`, { method: 'DELETE' })
    setDeleting(false)
    if (res.ok) {
      setDeleteStep(0)
      router.push('/blogs')
    }
  }

  if (loading) {
    return <div className="space-y-4 animate-pulse"><div className="h-8 bg-gray-200 rounded w-48" /><div className="h-32 bg-gray-100 rounded" /></div>
  }

  return (
    <div className="space-y-5">
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-2.5 rounded-lg">{success}</div>
      )}

      <div className="space-y-1.5">
        <Label>블로그 이름 *</Label>
        <Input value={name} onChange={e => setName(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>설명</Label>
        <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="블로그 설명" />
      </div>
      <div className="space-y-1.5">
        <Label>슬러그 (URL)</Label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400 whitespace-nowrap">blog.hub/</span>
          <Input value={slug} readOnly disabled className="bg-gray-50 text-gray-500" />
        </div>
        <p className="text-xs text-gray-400">슬러그는 블로그의 고유 URL 주소로, 생성 후 변경할 수 없습니다.</p>
      </div>
      <div className="space-y-1.5">
        <Label>블로그 유형</Label>
        <select
          value={blogType}
          onChange={e => setBlogType(e.target.value)}
          className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">선택 안함</option>
          {BLOG_TYPES.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <p className="text-xs text-gray-400">Google YMYL 기준 블로그 유형입니다. AI 캐릭터 생성 및 글 작성 시 유형에 맞는 전문성과 톤을 반영합니다.</p>
      </div>
      <div className="space-y-1.5">
        <Label>블로그 언어</Label>
        <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-md px-3 py-2.5 border border-gray-100">
          <span>{LANGUAGES.find(l => l.value === blogLanguage)?.label ?? '한국어'}</span>
          {onLanguageTabClick && (
            <button
              type="button"
              onClick={onLanguageTabClick}
              className="text-blue-600 hover:underline text-xs ml-auto"
            >
              언어/지역 탭에서 변경 →
            </button>
          )}
        </div>
      </div>
      <DomainSettingSection customDomain={customDomain} setCustomDomain={setCustomDomain} />
      <div className="space-y-2">
        <Label>블로그 색상</Label>
        <div className="flex gap-2">
          {COLORS.map(c => (
            <button key={c} type="button" onClick={() => setColor(c)}
              className={`w-8 h-8 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'}`}
              style={{ backgroundColor: c }} />
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Label>활성화</Label>
        <button onClick={() => setIsActive(!isActive)}
          className={`relative w-10 h-6 rounded-full transition-colors ${isActive ? 'bg-blue-600' : 'bg-gray-200'}`}>
          <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${isActive ? 'left-5' : 'left-1'}`} />
        </button>
        <span className="text-sm text-gray-500">{isActive ? '활성' : '비활성'}</span>
      </div>
      <div className="flex justify-between pt-2">
        <Button onClick={handleSave} disabled={saving || !name.trim()}>
          <Save className="w-4 h-4 mr-1.5" />{saving ? '저장 중...' : '저장'}
        </Button>
        {showDeleteButton && (
          <Button variant="outline" className="text-red-500 border-red-200 hover:bg-red-50"
            onClick={handleDeleteStep1}>
            <Trash2 className="w-4 h-4 mr-1.5" />블로그 삭제
          </Button>
        )}
      </div>

      {/* 블로그 삭제 1단계: 블로그명 확인 */}
      <Dialog open={deleteStep === 1} onOpenChange={isOpen => !isOpen && setDeleteStep(0)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              정말 블로그를 삭제하시겠습니까?
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              삭제할 블로그: <strong>{name}</strong>
            </p>
            <div className="space-y-1.5">
              <Label className="text-sm">확인을 위해 블로그 이름을 입력해주세요</Label>
              <Input
                value={deleteConfirmName}
                onChange={e => setDeleteConfirmName(e.target.value)}
                placeholder={name}
              />
            </div>
          </div>
          <DialogFooter className="flex-row gap-2">
            <Button variant="outline" onClick={() => setDeleteStep(0)}>취소</Button>
            <Button
              variant="destructive"
              disabled={deleteConfirmName !== name}
              onClick={handleDeleteStep2}
            >
              다음
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 블로그 삭제 2단계: 최종 경고 */}
      <Dialog open={deleteStep === 2} onOpenChange={isOpen => !isOpen && setDeleteStep(0)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              최종 확인
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800 font-medium mb-2">
                블로그를 삭제하시면 다음 혜택을 누리실 수 없게 됩니다:
              </p>
              <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
                <li>블로그에 등록된 모든 글이 영구 삭제됩니다</li>
                <li>SNS 자동 공유 연동이 해제됩니다</li>
                <li>제휴마케팅 자동 삽입 설정이 삭제됩니다</li>
                <li>AI 캐릭터 설정이 삭제됩니다</li>
                <li>커스텀 도메인 연결이 해제됩니다</li>
              </ul>
            </div>
            <p className="text-sm font-medium text-foreground">
              그래도 삭제하시겠습니까?
            </p>
          </div>
          <DialogFooter className="flex-row gap-2">
            <Button variant="outline" onClick={() => setDeleteStep(0)} disabled={deleting}>취소</Button>
            <Button
              variant="destructive"
              onClick={handleDeleteFinal}
              disabled={deleting}
            >
              {deleting ? '삭제 중...' : '삭제'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
