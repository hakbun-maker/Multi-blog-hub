/**
 * SNS OAuth 2.0 설정
 * 각 플랫폼별 OAuth 엔드포인트 및 스코프 정의
 */

export type SNSPlatform = 'instagram' | 'twitter' | 'threads'

interface OAuthConfig {
  authorizeUrl: string
  tokenUrl: string
  scopes: string[]
  clientIdEnv: string
  clientSecretEnv: string
}

export const OAUTH_CONFIGS: Record<SNSPlatform, OAuthConfig> = {
  instagram: {
    authorizeUrl: 'https://www.facebook.com/v21.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v21.0/oauth/access_token',
    scopes: ['instagram_basic', 'instagram_content_publish', 'pages_show_list'],
    clientIdEnv: 'META_APP_ID',
    clientSecretEnv: 'META_APP_SECRET',
  },
  twitter: {
    authorizeUrl: 'https://twitter.com/i/oauth2/authorize',
    tokenUrl: 'https://api.twitter.com/2/oauth2/token',
    scopes: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'],
    clientIdEnv: 'TWITTER_CLIENT_ID',
    clientSecretEnv: 'TWITTER_CLIENT_SECRET',
  },
  threads: {
    authorizeUrl: 'https://threads.net/oauth/authorize',
    tokenUrl: 'https://graph.threads.net/oauth/access_token',
    scopes: ['threads_basic', 'threads_content_publish'],
    clientIdEnv: 'THREADS_APP_ID',
    clientSecretEnv: 'THREADS_APP_SECRET',
  },
}

export function getOAuthCredentials(platform: SNSPlatform) {
  const config = OAUTH_CONFIGS[platform]
  const clientId = process.env[config.clientIdEnv]
  const clientSecret = process.env[config.clientSecretEnv]

  if (!clientId || !clientSecret) {
    throw new Error(
      `${platform} OAuth 환경변수가 설정되지 않았습니다: ${config.clientIdEnv}, ${config.clientSecretEnv}`
    )
  }

  return { clientId, clientSecret, config }
}

export function getRedirectUri(platform: SNSPlatform) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return `${baseUrl}/api/oauth/${platform}/callback`
}
