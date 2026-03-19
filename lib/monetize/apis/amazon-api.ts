export type AmazonCountry = 'US' | 'JP' | 'DE' | 'BR' | 'ES' | 'UK'

export interface AmazonProduct {
  id: string
  name: string
  price: number
  rating: number
  reviewCount: number
  imageUrl: string
  url: string
}

export interface AmazonSearchOptions {
  associatesTag: string
  query: string
  country?: AmazonCountry
  limit?: number
}

const COUNTRY_ENDPOINTS: Record<AmazonCountry, string> = {
  US: 'https://pa-api.amazon.com/paapi5/searchitems',
  JP: 'https://pa-api.amazon.co.jp/paapi5/searchitems',
  DE: 'https://pa-api.amazon.de/paapi5/searchitems',
  BR: 'https://pa-api.amazon.com.br/paapi5/searchitems',
  ES: 'https://pa-api.amazon.es/paapi5/searchitems',
  UK: 'https://pa-api.amazon.co.uk/paapi5/searchitems',
}

const COUNTRY_HOSTS: Record<AmazonCountry, string> = {
  US: 'webservices.amazon.com',
  JP: 'webservices.amazon.co.jp',
  DE: 'webservices.amazon.de',
  BR: 'webservices.amazon.com.br',
  ES: 'webservices.amazon.es',
  UK: 'webservices.amazon.co.uk',
}

/**
 * Amazon Product Advertising API wrapper
 * Supports multi-country: US/JP/DE/BR/ES/UK
 */
export class AmazonAPI {
  private accessKey: string
  private secretKey: string
  private baseUrl: string
  private host: string

  constructor(accessKey: string, secretKey: string, country: AmazonCountry = 'US') {
    this.accessKey = accessKey
    this.secretKey = secretKey
    this.baseUrl = COUNTRY_ENDPOINTS[country]
    this.host = COUNTRY_HOSTS[country]
  }

  /**
   * Search products on Amazon
   */
  async searchProducts(options: AmazonSearchOptions): Promise<AmazonProduct[]> {
    const { associatesTag, query, limit = 10 } = options

    try {
      const payload = {
        Keywords: query,
        SearchIndex: 'All',
        ItemCount: Math.min(limit, 10),
        Resources: [
          'Images.Primary.Medium',
          'ItemInfo.Title',
          'ItemInfo.ByLineInfo',
          'Offers.Listings.Price',
          'CustomerReviews.Count',
          'CustomerReviews.StarRating',
        ],
      }

      const res = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-amz-json-1.1',
          'X-Amz-Target': 'AWSIEServiceV20110801.SearchItems',
          // Note: Real implementation requires AWS Signature v4 signing
          // This is a simplified version for demonstration
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        throw new Error(`Amazon API error: ${res.status}`)
      }

      const data = await res.json()
      const items = ((data as any).SearchResult?.Items || []) as any[]

      return items
        .map((item) => {
          const info = item.ItemInfo
          const offer = item.Offers?.Listings?.[0]

          return {
            id: item.ASIN,
            name: info?.Title?.DisplayValue || 'Unknown Product',
            price: parseFloat(offer?.Price?.DisplayPrice?.slice(1) || '0'),
            rating: info?.ByLineInfo?.Contributors?.[0]?.Value || 0,
            reviewCount: item.CustomerReviews?.Count?.Value || 0,
            imageUrl: item.Images?.Primary?.Medium?.URL || '',
            url: `https://amazon.com/dp/${item.ASIN}?tag=${associatesTag}`,
          }
        })
        .filter((p) => p.imageUrl) // Only return products with images
        .slice(0, limit)
    } catch (error: any) {
      console.error('Amazon search error:', error.message)
      return []
    }
  }

  /**
   * Generate affiliate link for a product
   */
  generateAffiliateLink(productId: string, associatesTag: string): string {
    return `https://amazon.com/dp/${productId}?tag=${associatesTag}`
  }

  /**
   * Get product details
   */
  async getProductDetail(asin: string, associatesTag: string): Promise<AmazonProduct | null> {
    try {
      const payload = {
        ItemIds: [asin],
        Resources: [
          'Images.Primary.Medium',
          'ItemInfo.Title',
          'ItemInfo.ByLineInfo',
          'Offers.Listings.Price',
          'CustomerReviews.Count',
          'CustomerReviews.StarRating',
        ],
      }

      const res = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-amz-json-1.1',
          'X-Amz-Target': 'AWSIEServiceV20110801.GetItems',
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) return null

      const data = await res.json()
      const item = ((data as any).ItemsResult?.Items?.[0]) as any

      if (!item) return null

      const info = item.ItemInfo
      const offer = item.Offers?.Listings?.[0]

      return {
        id: item.ASIN,
        name: info?.Title?.DisplayValue || 'Unknown Product',
        price: parseFloat(offer?.Price?.DisplayPrice?.slice(1) || '0'),
        rating: info?.ByLineInfo?.Contributors?.[0]?.Value || 0,
        reviewCount: item.CustomerReviews?.Count?.Value || 0,
        imageUrl: item.Images?.Primary?.Medium?.URL || '',
        url: `https://amazon.com/dp/${item.ASIN}?tag=${associatesTag}`,
      }
    } catch (error: any) {
      console.error('Amazon detail fetch error:', error.message)
      return null
    }
  }
}

/**
 * Factory function for AmazonAPI
 */
export function createAmazonAPI(accessKey: string, secretKey: string, country: AmazonCountry = 'US'): AmazonAPI {
  return new AmazonAPI(accessKey, secretKey, country)
}
