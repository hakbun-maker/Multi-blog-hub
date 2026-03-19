export interface CoupangProduct {
  id: string
  name: string
  price: number
  rating: number
  reviewCount: number
  imageUrl: string
  isRocketDelivery: boolean
}

export interface CoupangSearchOptions {
  affiliateId: string
  query: string
  limit?: number
  minRating?: number
  minReviews?: number
}

/**
 * Coupang Partners API wrapper
 * Filters: review 100+, rating 4.0+, rocket delivery preferred
 */
export class CoupangAPI {
  private apiKey: string
  private baseUrl = 'https://api.coupang.com/v2'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  /**
   * Search products on Coupang
   */
  async searchProducts(options: CoupangSearchOptions): Promise<CoupangProduct[]> {
    const { affiliateId, query, limit = 10, minRating = 4.0, minReviews = 100 } = options

    try {
      // Coupang Partners API endpoint
      const searchUrl = new URL(`${this.baseUrl}/providers/affiliate/v6/products/search`)
      searchUrl.searchParams.append('keyword', query)
      searchUrl.searchParams.append('limit', limit.toString())
      searchUrl.searchParams.append('partnerCode', affiliateId)

      const res = await fetch(searchUrl.toString(), {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      })

      if (!res.ok) {
        throw new Error(`Coupang API error: ${res.status}`)
      }

      const data = await res.json()
      const products = ((data as any).data?.products || []) as any[]

      // Filter by rating, reviews, and rocket delivery
      return products
        .filter((p) => {
          const rating = p.rating || 0
          const reviews = p.reviewCount || 0
          return rating >= minRating && reviews >= minReviews
        })
        .map((p) => ({
          id: p.productId || p.id,
          name: p.productName || p.name,
          price: p.price || 0,
          rating: p.rating || 0,
          reviewCount: p.reviewCount || 0,
          imageUrl: p.imageUrl || '',
          isRocketDelivery: p.isRocketDelivery || false,
        }))
        .sort((a, b) => (b.isRocketDelivery ? 1 : 0) - (a.isRocketDelivery ? 1 : 0)) // Rocket delivery first
        .slice(0, limit)
    } catch (error: any) {
      console.error('Coupang search error:', error.message)
      return []
    }
  }

  /**
   * Generate affiliate link for a product
   */
  generateAffiliateLink(productId: string, affiliateId: string, subId?: string): string {
    const baseLink = `https://link.coupang.com/re/AFFPRT?lptag=${affiliateId}&pageKey=`
    const params = new URLSearchParams({
      itemId: productId,
      subId: subId || 'default',
    })

    return `${baseLink}${params.toString()}`
  }

  /**
   * Get product details
   */
  async getProductDetail(productId: string): Promise<CoupangProduct | null> {
    try {
      const url = `${this.baseUrl}/providers/affiliate/v6/products/${productId}`

      const res = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      })

      if (!res.ok) return null

      const data = await res.json()
      const p = (data as any).data

      return {
        id: p.productId || p.id,
        name: p.productName || p.name,
        price: p.price || 0,
        rating: p.rating || 0,
        reviewCount: p.reviewCount || 0,
        imageUrl: p.imageUrl || '',
        isRocketDelivery: p.isRocketDelivery || false,
      }
    } catch (error: any) {
      console.error('Coupang detail fetch error:', error.message)
      return null
    }
  }
}

/**
 * Factory function for CoupangAPI
 */
export function createCoupangAPI(apiKey: string): CoupangAPI {
  return new CoupangAPI(apiKey)
}
