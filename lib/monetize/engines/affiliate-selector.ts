import type { IntentType } from '@/types/monetize'

export interface Product {
  id: string
  name: string
  price: number
  rating: number
  reviewCount: number
  imageUrl?: string
  url?: string
}

export interface SelectedProduct {
  productId: string
  productName: string
  affiliateUrl: string
  imageUrl?: string
  position: 'before' | 'after' | 'inline'
}

export interface ProductSelectionParams {
  keyword: string
  intentType: IntentType
  adCategory: string | null
  candidates: Product[]
  maxProducts: number
  aiApiKey: string
  aiModel?: string
}

/**
 * AI product selector for PASONA O-section auto-insert
 * Intent rules: AD/REVIEW/COMPARE → always insert
 *               INFO/TREND → AI judges
 *               CRITIC → never insert
 */
export async function selectProducts(params: ProductSelectionParams): Promise<SelectedProduct[]> {
  const { intentType, candidates, maxProducts, aiApiKey, aiModel = 'claude-sonnet-4-20250514' } = params

  // Intent-based filtering
  if (intentType === 'CRITIC') {
    return [] // Never insert products for critic posts
  }

  if (['AD', 'REVIEW', 'COMPARE'].includes(intentType)) {
    // Always insert for these intents
    return selectBestProducts(candidates, maxProducts)
  }

  // For INFO/TREND, use AI judgment
  if (['INFO', 'TREND'].includes(intentType)) {
    const shouldInsert = await judgeInsertionRelevance(params, aiApiKey, aiModel)
    if (!shouldInsert) return []
    return selectBestProducts(candidates, maxProducts)
  }

  return []
}

function selectBestProducts(candidates: Product[], maxProducts: number): SelectedProduct[] {
  // Score each product
  const scored = candidates
    .map((product) => ({
      product,
      score: calculateProductScore(product),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, maxProducts)

  return scored.map((item, index) => ({
    productId: item.product.id,
    productName: item.product.name,
    affiliateUrl: `affiliate://${item.product.id}`, // Will be replaced by actual affiliate service
    imageUrl: item.product.imageUrl,
    position: index === 0 ? 'after' : 'inline', // First product after content, others inline
  }))
}

function calculateProductScore(product: Product): number {
  // Weighted score: rating (40%) + reviewCount (35%) + price relevance (25%)
  const ratingScore = (product.rating / 5) * 40
  const reviewScore = Math.min(product.reviewCount / 1000, 1) * 35
  const priceScore = product.price > 0 && product.price < 1000000 ? 25 : 0

  return ratingScore + reviewScore + priceScore
}

async function judgeInsertionRelevance(
  params: ProductSelectionParams,
  apiKey: string,
  model: string,
): Promise<boolean> {
  const { keyword, adCategory, candidates } = params

  const prompt = `당신은 콘텐츠 마케팅 전문가입니다.

키워드: "${keyword}"
카테고리: ${adCategory || '일반'}
이용 가능한 제품:
${candidates.slice(0, 5).map((p) => `- ${p.name} (평점: ${p.rating}, 리뷰: ${p.reviewCount})`).join('\n')}

요청: 이 글에 제품을 삽입하는 것이 독자 경험을 해치지 않을지 판단하세요.

답변:
- "삽입 적절" 또는 "삽입 부적절"만 반환하세요.`.trim()

  try {
    const response = await callClaudeAPI(apiKey, model, prompt)
    return response.includes('적절')
  } catch {
    // Default to false on error
    return false
  }
}

export function buildAffiliateHtml(products: SelectedProduct[]): string {
  if (products.length === 0) return ''

  const beforeProducts = products.filter((p) => p.position === 'before')
  const afterProducts = products.filter((p) => p.position === 'after')
  const inlineProducts = products.filter((p) => p.position === 'inline')

  let html = ''

  if (beforeProducts.length > 0) {
    html += '<div class="affiliate-section before">\n'
    beforeProducts.forEach((product) => {
      html += buildProductCard(product)
    })
    html += '</div>\n'
  }

  if (afterProducts.length > 0) {
    html += '<div class="affiliate-section after">\n'
    afterProducts.forEach((product) => {
      html += buildProductCard(product)
    })
    html += '</div>\n'
  }

  if (inlineProducts.length > 0) {
    html += '<div class="affiliate-section inline">\n'
    inlineProducts.forEach((product) => {
      html += buildProductCard(product)
    })
    html += '</div>\n'
  }

  return html
}

function buildProductCard(product: SelectedProduct): string {
  return `<div class="affiliate-card">
  ${product.imageUrl ? `<img src="${escapeHtml(product.imageUrl)}" alt="${escapeHtml(product.productName)}" class="product-image" />` : ''}
  <div class="product-info">
    <h4>${escapeHtml(product.productName)}</h4>
    <a href="${escapeHtml(product.affiliateUrl)}" class="btn-affiliate">상품 보기</a>
  </div>
</div>
`
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }
  return text.replace(/[&<>"']/g, (m) => map[m])
}

async function callClaudeAPI(apiKey: string, model: string, prompt: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(`Claude API error: ${res.status} - ${(errorData as any).error?.message || 'Unknown'}`)
  }

  const data = await res.json()
  return (data as any).content?.[0]?.text || ''
}
