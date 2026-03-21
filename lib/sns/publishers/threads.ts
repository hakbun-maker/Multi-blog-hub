/**
 * Threads API Publisher
 * Meta Threads API — Container 생성 → 게시 2단계 프로세스
 */

interface ThreadsPublishResult {
  postId: string
}

export async function publishToThreads(
  content: string,
  imageUrl: string | null,
  accessToken: string
): Promise<ThreadsPublishResult> {
  // Step 1: 사용자 ID 조회
  const meRes = await fetch(
    `https://graph.threads.net/v1.0/me?fields=id&access_token=${accessToken}`
  )
  if (!meRes.ok) {
    throw new Error('Threads 사용자 정보 조회 실패')
  }
  const meData = await meRes.json()
  const userId = meData.id

  // Step 2: Media Container 생성
  const containerBody: Record<string, string> = {
    media_type: imageUrl ? 'IMAGE' : 'TEXT',
    text: content,
    access_token: accessToken,
  }
  if (imageUrl) {
    containerBody.image_url = imageUrl
  }

  const containerRes = await fetch(
    `https://graph.threads.net/v1.0/${userId}/threads`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(containerBody),
    }
  )

  if (!containerRes.ok) {
    const err = await containerRes.json().catch(() => ({}))
    throw new Error(
      `Threads 컨테이너 생성 실패: ${(err as any).error?.message || containerRes.status}`
    )
  }

  const containerData = await containerRes.json()
  const containerId = containerData.id

  // Step 3: Publish
  const publishRes = await fetch(
    `https://graph.threads.net/v1.0/${userId}/threads_publish`,
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
    throw new Error(
      `Threads 게시 실패: ${(err as any).error?.message || publishRes.status}`
    )
  }

  const publishData = await publishRes.json()

  return {
    postId: publishData.id,
  }
}
