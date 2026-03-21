/**
 * Instagram Graph API Publisher
 * Instagram은 이미지가 필수 — Container 생성 → 게시 2단계 프로세스
 */

interface InstagramPublishResult {
  postId: string
  permalink?: string
}

export async function publishToInstagram(
  content: string,
  imageUrl: string | null,
  accessToken: string
): Promise<InstagramPublishResult> {
  if (!imageUrl) {
    throw new Error('Instagram 게시에는 이미지가 필수입니다.')
  }

  // Step 1: Instagram 비즈니스 계정 ID 조회
  const accountRes = await fetch(
    `https://graph.facebook.com/v21.0/me/accounts?fields=instagram_business_account&access_token=${accessToken}`
  )
  if (!accountRes.ok) {
    throw new Error('Instagram 비즈니스 계정 조회 실패')
  }

  const accountData = await accountRes.json()
  const igAccount = accountData.data?.[0]?.instagram_business_account?.id
  if (!igAccount) {
    throw new Error('Instagram 비즈니스 계정을 찾을 수 없습니다. 비즈니스/크리에이터 계정인지 확인해주세요.')
  }

  // Step 2: Media Container 생성
  const containerRes = await fetch(
    `https://graph.facebook.com/v21.0/${igAccount}/media`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url: imageUrl,
        caption: content,
        access_token: accessToken,
      }),
    }
  )

  if (!containerRes.ok) {
    const err = await containerRes.json().catch(() => ({}))
    throw new Error(`Instagram 미디어 컨테이너 생성 실패: ${(err as any).error?.message || containerRes.status}`)
  }

  const containerData = await containerRes.json()
  const containerId = containerData.id

  // Step 3: Media Publish
  const publishRes = await fetch(
    `https://graph.facebook.com/v21.0/${igAccount}/media_publish`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: containerId,
        access_token: accessToken,
      }),
    }
  )

  if (!publishRes.ok) {
    const err = await publishRes.json().catch(() => ({}))
    throw new Error(`Instagram 게시 실패: ${(err as any).error?.message || publishRes.status}`)
  }

  const publishData = await publishRes.json()

  return {
    postId: publishData.id,
  }
}
