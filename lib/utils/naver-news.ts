import { decrypt } from './encryption'

export interface NewsArticle {
  title: string
  description: string
  link: string
  pubDate: string
}

/**
 * 네이버 뉴스 API로 키워드 기반 기사 검색
 * 서버 사이드에서 사용 (API 라우트, 수익화 파이프라인 등)
 */
export async function fetchNaverNews(
  clientId: string,
  clientSecret: string,
  keywords: string[],
  maxArticles = 5,
): Promise<NewsArticle[]> {
  const allArticles: NewsArticle[] = []
  const seenTitles = new Set<string>()

  for (const keyword of keywords) {
    try {
      const res = await fetch(
        `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(keyword)}&display=10&sort=sim`,
        {
          headers: {
            'X-Naver-Client-Id': clientId,
            'X-Naver-Client-Secret': clientSecret,
          },
        }
      )
      if (!res.ok) continue

      const data = await res.json()
      for (const item of data.items ?? []) {
        const cleanTitle = (item.title as string).replace(/<[^>]*>/g, '').trim()
        if (seenTitles.has(cleanTitle)) continue
        seenTitles.add(cleanTitle)

        allArticles.push({
          title: cleanTitle,
          description: (item.description as string).replace(/<[^>]*>/g, '').trim(),
          link: item.originallink || item.link,
          pubDate: item.pubDate,
        })
      }
    } catch {
      // 개별 키워드 검색 실패는 무시
    }
  }

  return allArticles.slice(0, maxArticles)
}

/**
 * Supabase에서 네이버 검색 API 키를 조회하고 뉴스 기사를 가져오는 헬퍼
 * newsArticles가 없을 경우 빈 배열을 반환 (graceful fallback)
 */
export async function fetchNaverNewsForUser(
  supabase: any,
  userId: string,
  keywords: string[],
): Promise<NewsArticle[]> {
  try {
    const { data: apiKeys } = await supabase
      .from('ai_api_keys')
      .select('encrypted_key, encrypted_secret')
      .eq('user_id', userId)
      .eq('provider', 'naver_search')
      .eq('is_active', true)
      .single()

    if (!apiKeys?.encrypted_key || !apiKeys?.encrypted_secret) return []

    const clientId = decrypt(apiKeys.encrypted_key)
    const clientSecret = decrypt(apiKeys.encrypted_secret)

    return await fetchNaverNews(clientId, clientSecret, keywords)
  } catch {
    return []
  }
}
