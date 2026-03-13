const VERCEL_API = 'https://api.vercel.com'
const VERCEL_TOKEN = process.env.VERCEL_TOKEN
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID

export interface VercelDomainStatus {
  name: string
  verified: boolean
  configured: boolean  // DNS가 Vercel을 가리키는지
  error?: string
}

function headers() {
  return {
    Authorization: `Bearer ${VERCEL_TOKEN}`,
    'Content-Type': 'application/json',
  }
}

/** Vercel 프로젝트에 도메인 등록 */
export async function addVercelDomain(domain: string): Promise<{ ok: boolean; error?: string }> {
  if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID) {
    return { ok: false, error: 'VERCEL_TOKEN 또는 VERCEL_PROJECT_ID 환경변수가 설정되지 않았습니다.' }
  }

  const res = await fetch(`${VERCEL_API}/v9/projects/${VERCEL_PROJECT_ID}/domains`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ name: domain }),
  })

  const data = await res.json()

  // 409: 이미 이 프로젝트에 등록된 경우 → 성공으로 처리
  if (res.status === 409) return { ok: true }

  if (!res.ok) {
    return { ok: false, error: data?.error?.message ?? `Vercel API 오류 (${res.status})` }
  }

  return { ok: true }
}

/** Vercel 프로젝트에서 도메인 제거 */
export async function removeVercelDomain(domain: string): Promise<{ ok: boolean; error?: string }> {
  if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID) {
    return { ok: false, error: 'VERCEL_TOKEN 또는 VERCEL_PROJECT_ID 환경변수가 설정되지 않았습니다.' }
  }

  const res = await fetch(
    `${VERCEL_API}/v9/projects/${VERCEL_PROJECT_ID}/domains/${domain}`,
    { method: 'DELETE', headers: headers() }
  )

  // 404: 이미 없는 도메인 → 성공으로 처리
  if (res.status === 404) return { ok: true }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    return { ok: false, error: data?.error?.message ?? `Vercel API 오류 (${res.status})` }
  }

  return { ok: true }
}

/** 도메인 연결 상태 확인 */
export async function getVercelDomainStatus(domain: string): Promise<VercelDomainStatus> {
  if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID) {
    return { name: domain, verified: false, configured: false, error: '환경변수 미설정' }
  }

  const res = await fetch(
    `${VERCEL_API}/v9/projects/${VERCEL_PROJECT_ID}/domains/${domain}`,
    { headers: headers() }
  )

  if (res.status === 404) {
    return { name: domain, verified: false, configured: false, error: 'Vercel에 등록되지 않음' }
  }

  if (!res.ok) {
    return { name: domain, verified: false, configured: false, error: `API 오류 (${res.status})` }
  }

  const data = await res.json()

  return {
    name: domain,
    verified: data.verified === true,
    configured: data.verified === true,  // verified면 DNS도 연결된 상태
    error: data.verified ? undefined : 'DNS 전파 중 (최대 48시간)',
  }
}
