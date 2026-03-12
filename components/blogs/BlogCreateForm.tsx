'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const COLORS = [
  '#3b82f6','#8b5cf6','#10b981','#f59e0b',
  '#ef4444','#06b6d4','#84cc16','#f97316',
]

type DomainType = 'subdomain' | 'custom'

export function BlogCreateForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [aiProvider, setAiProvider] = useState('claude')
  const [domainType, setDomainType] = useState<DomainType>('subdomain')
  const [customDomain, setCustomDomain] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showDnsGuide, setShowDnsGuide] = useState(false)

  const handleNameChange = (v: string) => {
    setName(v)
    if (!slug) {
      setSlug(v.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const body: Record<string, string> = { name, slug, description, color, aiProvider }
    if (domainType === 'custom' && customDomain.trim()) {
      body.customDomain = customDomain.trim()
    } else {
      body.subdomain = slug
    }

    const res = await fetch('/api/blogs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()

    if (res.ok) {
      router.push(`/blogs/${data.data.id}`)
      router.refresh()
    } else {
      setError(data.error || '블로그 생성에 실패했습니다.')
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-xl">
      <div className="space-y-1.5">
        <Label htmlFor="name">블로그 이름 *</Label>
        <Input id="name" value={name} onChange={e => handleNameChange(e.target.value)}
          placeholder="내 여행 블로그" required />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="slug">슬러그 (URL) *</Label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400 whitespace-nowrap">blog.hub/</span>
          <Input id="slug" value={slug} onChange={e => setSlug(e.target.value)}
            placeholder="my-travel-blog" required
            pattern="[a-z0-9-]+" title="영소문자, 숫자, 하이픈만 가능" />
        </div>
        <p className="text-xs text-gray-400">
          블로그의 고유 식별자입니다. 영소문자, 숫자, 하이픈(-)만 사용 가능합니다.
          생성 후 변경할 수 없으니 신중하게 입력해주세요.
        </p>
      </div>

      {/* ─── 도메인 설정 ─── */}
      <div className="space-y-3">
        <Label>도메인 방식</Label>
        <div className="flex gap-2">
          {(['subdomain', 'custom'] as DomainType[]).map(t => (
            <button key={t} type="button" onClick={() => setDomainType(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                domainType === t
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400'
              }`}>
              {t === 'subdomain' ? '기본 (서브도메인)' : '내 도메인 연결'}
            </button>
          ))}
        </div>

        {domainType === 'subdomain' && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
            {slug && (
              <p className="text-sm font-medium text-gray-700">
                {slug}.blog-hub.vercel.app
              </p>
            )}
            <p className="text-xs text-gray-500">
              별도 도메인 없이 바로 사용할 수 있는 무료 주소입니다.
              블로그 허브에서 제공하는 서브도메인(하위 주소)으로 자동 생성됩니다.
            </p>
            <p className="text-xs text-gray-400">
              나중에 설정에서 내 도메인을 추가로 연결할 수 있습니다.
            </p>
          </div>
        )}

        {domainType === 'custom' && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Input value={customDomain} onChange={e => setCustomDomain(e.target.value)}
                placeholder="myblog.com 또는 blog.mydomain.com" />
              <p className="text-xs text-gray-500">
                이미 보유한 도메인 주소를 입력하세요.
                <br />
                (예: <b>myblog.com</b>, <b>blog.mydomain.com</b>)
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-blue-800">도메인 연결이란?</p>
                  <p className="text-xs text-blue-700">
                    가비아, 카페24, GoDaddy 등에서 구매한 도메인을 이 블로그의 주소로 사용하는 것입니다.
                    방문자가 내 도메인으로 접속하면 이 블로그가 보이게 됩니다.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowDnsGuide(!showDnsGuide)}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium underline underline-offset-2"
              >
                {showDnsGuide ? '도메인 연결 방법 접기' : '도메인 연결 방법 보기 (DNS 설정 가이드)'}
              </button>

              {showDnsGuide && (
                <div className="bg-white rounded-lg p-4 space-y-4 text-xs text-gray-700 border border-blue-100">
                  <p className="font-semibold text-sm text-gray-900">도메인을 구매한 사이트에서 DNS 설정을 해야 합니다</p>

                  <div className="space-y-2">
                    <p className="font-medium text-gray-800">방법 1: myblog.com 같은 루트 도메인을 연결할 때</p>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
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
                    <p className="text-gray-500">@ 는 &quot;도메인 자체&quot;를 뜻합니다. A 레코드는 도메인을 IP 주소로 연결합니다.</p>
                  </div>

                  <div className="space-y-2">
                    <p className="font-medium text-gray-800">방법 2: blog.mydomain.com 같은 서브도메인을 연결할 때</p>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
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
                    <p className="text-gray-500">&quot;blog&quot; 부분에 원하는 이름을 넣으면 됩니다. CNAME은 도메인을 다른 도메인으로 연결합니다.</p>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded p-3 space-y-1">
                    <p className="font-medium text-amber-800">DNS 설정 후 주의사항</p>
                    <ul className="list-disc list-inside text-amber-700 space-y-0.5">
                      <li>설정 후 적용까지 <b>최대 24~48시간</b> 걸릴 수 있습니다 (보통 10분~1시간)</li>
                      <li>SSL(https) 인증서는 도메인 연결 후 <b>자동으로 발급</b>됩니다</li>
                      <li>기존에 같은 도메인으로 다른 서비스를 운영 중이면 <b>충돌</b>할 수 있습니다</li>
                    </ul>
                  </div>

                  <div className="space-y-1">
                    <p className="font-medium text-gray-800">주요 도메인 업체별 DNS 설정 위치</p>
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
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">설명</Label>
        <Input id="description" value={description} onChange={e => setDescription(e.target.value)}
          placeholder="블로그에 대한 간단한 설명" />
      </div>

      <div className="space-y-2">
        <Label>블로그 색상</Label>
        <div className="flex gap-2 flex-wrap">
          {COLORS.map(c => (
            <button key={c} type="button" onClick={() => setColor(c)}
              className={`w-8 h-8 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'}`}
              style={{ backgroundColor: c }} />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>AI 공급자</Label>
        <div className="flex gap-2">
          {['claude', 'openai', 'gemini'].map(p => (
            <button key={p} type="button" onClick={() => setAiProvider(p)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                aiProvider === p
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400'
              }`}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? '생성 중...' : '블로그 생성'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>취소</Button>
      </div>
    </form>
  )
}
