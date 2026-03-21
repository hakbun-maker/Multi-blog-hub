/**
 * Twitter (X) API v2 Publisher
 * POST https://api.twitter.com/2/tweets
 */

interface TwitterPublishResult {
  postId: string
  text: string
}

export async function publishToTwitter(
  content: string,
  accessToken: string
): Promise<TwitterPublishResult> {
  const res = await fetch('https://api.twitter.com/2/tweets', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ text: content }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(
      `Twitter 게시 실패: ${(err as any).detail || (err as any).title || res.status}`
    )
  }

  const data = await res.json()

  return {
    postId: data.data?.id,
    text: data.data?.text,
  }
}
