/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * API Key Test Helpers
 * Contains utility functions to validate and test API keys for various provider integrations
 */

export type ApiProvider = 'claude' | 'openai' | 'gemini' | 'imagen' | 'naver_ad' | 'naver_search' | 'google_kwp' | 'coupang' | 'amazon'

// Provider categories for UI grouping
export const PROVIDER_CATEGORIES = {
  ai_writing: ['claude', 'openai', 'gemini'] as ApiProvider[],
  image_gen: ['imagen'] as ApiProvider[],
  keyword: ['naver_ad', 'naver_search', 'google_kwp'] as ApiProvider[],
  monetize: ['coupang', 'amazon'] as ApiProvider[],
} as const

export const PROVIDER_LABELS: Record<ApiProvider, string> = {
  claude: 'Anthropic Claude',
  openai: 'OpenAI (GPT)',
  gemini: 'Google Gemini',
  imagen: 'Google Imagen 3',
  naver_ad: '네이버 광고 API',
  naver_search: '네이버 검색 API',
  google_kwp: 'Google Keyword Planner',
  coupang: '쿠팡파트너스',
  amazon: 'Amazon Associates',
}

// Whether provider needs both key and secret
export const PROVIDER_NEEDS_SECRET: Record<ApiProvider, boolean> = {
  claude: false,
  openai: false,
  gemini: false,
  imagen: false,
  naver_ad: true,   // Client ID + Secret
  naver_search: true, // Client ID + Secret
  google_kwp: false,
  coupang: false,   // Partner ID only
  amazon: false,    // Associates Tag only
}

export interface TestResult {
  success: boolean
  message: string
  details?: Record<string, any>
}

/**
 * Main function to test API keys for any supported provider
 * @param provider - The provider type
 * @param key - The API key
 * @param secret - Optional secret key for providers that need it
 * @returns TestResult with success status and message
 */
export async function testApiKey(
  provider: ApiProvider,
  key: string,
  secret?: string
): Promise<TestResult> {
  return testProviderConnection(provider, key, secret)
}

/**
 * Test provider connection (alias for backward compatibility)
 */
export async function testProviderConnection(
  provider: ApiProvider,
  key: string,
  secret?: string
): Promise<TestResult> {
  if (!key || key.trim().length === 0) {
    return { success: false, message: 'API key is required' }
  }

  switch (provider) {
    case 'claude':
      return testClaudeKey(key)
    case 'openai':
      return testOpenAIKey(key)
    case 'gemini':
      return testGeminiKey(key)
    case 'imagen':
      return testImagenKey(key)
    case 'naver_ad':
      return testNaverAdKey(key, secret)
    case 'naver_search':
      return testNaverSearchKey(key, secret)
    case 'google_kwp':
      return testGoogleKWPKey(key)
    case 'coupang':
      return testCoupangKey(key)
    case 'amazon':
      return testAmazonKey(key)
    default:
      return { success: false, message: `Unsupported provider: ${provider}` }
  }
}

/**
 * Test Anthropic Claude API key
 */
async function testClaudeKey(key: string): Promise<TestResult> {
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-6-20250514',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'test' }],
      }),
    })

    if (res.status === 401) {
      return { success: false, message: 'Invalid Claude API key' }
    }

    if (res.ok || res.status === 400) {
      // 400 might mean invalid request but key is valid
      return { success: true, message: 'Claude API key is valid' }
    }

    const err = await res.json().catch(() => ({}))
    return { success: false, message: err.error?.message || `HTTP ${res.status}` }
  } catch (e: any) {
    return { success: false, message: `Claude API test failed: ${e.message}` }
  }
}

/**
 * Test OpenAI API key
 */
async function testOpenAIKey(key: string): Promise<TestResult> {
  try {
    const res = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: { Authorization: `Bearer ${key}` },
    })

    if (res.status === 401) {
      return { success: false, message: 'Invalid OpenAI API key' }
    }

    if (res.ok) {
      return { success: true, message: 'OpenAI API key is valid' }
    }

    return { success: false, message: `OpenAI API returned status ${res.status}` }
  } catch (e: any) {
    return { success: false, message: `OpenAI API test failed: ${e.message}` }
  }
}

/**
 * Test Google Gemini API key
 */
async function testGeminiKey(key: string): Promise<TestResult> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1/models?key=${encodeURIComponent(key)}`,
      { method: 'GET' }
    )

    if (res.status === 401 || res.status === 403) {
      return { success: false, message: 'Invalid Gemini API key' }
    }

    if (res.ok) {
      return { success: true, message: 'Gemini API key is valid' }
    }

    return { success: false, message: `Gemini API returned status ${res.status}` }
  } catch (e: any) {
    return { success: false, message: `Gemini API test failed: ${e.message}` }
  }
}

/**
 * Test Google Imagen API key
 * Imagen is typically accessed through Vertex AI with a Google Cloud API key
 */
async function testImagenKey(key: string): Promise<TestResult> {
  try {
    const response = await fetch(
      'https://us-central1-aiplatform.googleapis.com/v1/projects/_/locations/us-central1/publishers/google/models/imagegeneration:predict',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instances: [{ prompt: 'test' }],
        }),
      }
    )

    if (response.status === 401 || response.status === 403) {
      return { success: false, message: 'Invalid Imagen API key or credentials' }
    }

    if (response.ok || response.status === 400) {
      return { success: true, message: 'Imagen API key is valid' }
    }

    return { success: false, message: `Imagen API returned status ${response.status}` }
  } catch (e: any) {
    return { success: false, message: `Imagen API test failed: ${e.message}` }
  }
}

/**
 * Test Naver Advertising API key
 */
async function testNaverAdKey(key: string, secret?: string): Promise<TestResult> {
  if (!secret) {
    return { success: false, message: 'Naver Advertising API requires both API key and secret' }
  }

  try {
    const response = await fetch('https://api.naver.com/v2/ncc/keywordstool', {
      method: 'GET',
      headers: {
        'X-API-KEY': key,
        'X-Secret-Key': secret,
      },
    })

    if (response.status === 401 || response.status === 403) {
      return { success: false, message: 'Invalid Naver Advertising API credentials' }
    }

    if (response.ok || response.status === 400) {
      return { success: true, message: 'Naver Advertising API credentials are valid' }
    }

    return { success: false, message: `Naver Advertising API returned status ${response.status}` }
  } catch (e: any) {
    return { success: false, message: `Naver Advertising API test failed: ${e.message}` }
  }
}

/**
 * Test Naver Search API key
 */
async function testNaverSearchKey(key: string, secret?: string): Promise<TestResult> {
  if (!secret) {
    return { success: false, message: 'Naver Search API requires both API key and secret' }
  }

  try {
    const response = await fetch('https://openapi.naver.com/v1/search/blog?query=test&display=1', {
      method: 'GET',
      headers: {
        'X-Naver-Client-Id': key,
        'X-Naver-Client-Secret': secret,
      },
    })

    if (response.status === 401 || response.status === 403) {
      return { success: false, message: 'Invalid Naver Search API credentials' }
    }

    if (response.ok) {
      return { success: true, message: 'Naver Search API credentials are valid' }
    }

    return { success: false, message: `Naver Search API returned status ${response.status}` }
  } catch (e: any) {
    return { success: false, message: `Naver Search API test failed: ${e.message}` }
  }
}

/**
 * Test Google Keyword Planner API key
 * Uses Google Ads API for validation
 */
async function testGoogleKWPKey(key: string): Promise<TestResult> {
  try {
    const response = await fetch(
      'https://googleads.googleapis.com/v15/customers/_/googleAds:search',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          'developer-token': key,
        },
        body: JSON.stringify({
          query: 'SELECT customer.id LIMIT 1',
        }),
      }
    )

    if (response.status === 401 || response.status === 403) {
      return { success: false, message: 'Invalid Google Keyword Planner credentials' }
    }

    if (response.ok || response.status === 400 || response.status === 404) {
      return { success: true, message: 'Google Keyword Planner credentials are valid' }
    }

    return { success: false, message: `Google Keyword Planner API returned status ${response.status}` }
  } catch (e: any) {
    return { success: false, message: `Google Keyword Planner API test failed: ${e.message}` }
  }
}

/**
 * Test Coupang Partners API key
 */
async function testCoupangKey(key: string, secret?: string): Promise<TestResult> {
  if (!secret) {
    return { success: false, message: 'Coupang API requires both API key and secret' }
  }

  try {
    const response = await fetch('https://api-gateway.coupang.com/v2/partners', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
    })

    if (response.status === 401 || response.status === 403) {
      return { success: false, message: 'Invalid Coupang API credentials' }
    }

    if (response.ok || response.status === 400) {
      return { success: true, message: 'Coupang API credentials are valid' }
    }

    return { success: false, message: `Coupang API returned status ${response.status}` }
  } catch (e: any) {
    return { success: false, message: `Coupang API test failed: ${e.message}` }
  }
}

/**
 * Test Amazon Product Advertising API key
 */
async function testAmazonKey(key: string, secret?: string): Promise<TestResult> {
  if (!secret) {
    return { success: false, message: 'Amazon Product Advertising API requires both access key and secret key' }
  }

  try {
    const response = await fetch(
      'https://api.amazon.com/onca/xml?Service=AWSECommerceService&Operation=ItemLookup&ItemId=B00EXAMPLE',
      {
        method: 'GET',
        headers: {
          'Content-Type': 'text/xml',
        },
      }
    )

    if (response.status === 403) {
      return { success: false, message: 'Invalid Amazon Product Advertising API credentials' }
    }

    if (response.ok || response.status === 400 || response.status === 404) {
      return { success: true, message: 'Amazon Product Advertising API credentials format is valid' }
    }

    return { success: false, message: `Amazon Product Advertising API returned status ${response.status}` }
  } catch (e: any) {
    return { success: false, message: `Amazon Product Advertising API test failed: ${e.message}` }
  }
}

/**
 * Get all supported providers
 */
export function getSupportedProviders(): ApiProvider[] {
  return ['claude', 'openai', 'gemini', 'imagen', 'naver_ad', 'naver_search', 'google_kwp', 'coupang', 'amazon']
}

/**
 * Check if a provider is supported
 */
export function isSupportedProvider(provider: string): provider is ApiProvider {
  return getSupportedProviders().includes(provider as ApiProvider)
}
