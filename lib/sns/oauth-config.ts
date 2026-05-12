/**
 * Threads OAuth 2.0 설정.
 * Instagram·Twitter는 deprecated — Threads만 유지.
 */

export type SNSPlatform = 'threads'

interface OAuthConfig {
  authorizeUrl: string
  tokenUrl: string
  longLivedTokenUrl: string  // short-lived → long-lived 교환
  refreshTokenUrl: string    // long-lived 갱신
  scopes: string[]
  clientIdEnv: string
  clientSecretEnv: string
}

export const OAUTH_CONFIGS: Record<SNSPlatform, OAuthConfig> = {
  threads: {
    authorizeUrl: 'https://threads.net/oauth/authorize',
    tokenUrl: 'https://graph.threads.net/oauth/access_token',
    longLivedTokenUrl: 'https://graph.threads.net/access_token',
    refreshTokenUrl: 'https://graph.threads.net/refresh_access_token',
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
      `${platform} OAuth 환경변수가 설정되지 않았습니다: ${config.clientIdEnv}, ${config.clientSecretEnv}`,
    )
  }

  return { clientId, clientSecret, config }
}

export function getRedirectUri(platform: SNSPlatform) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return `${baseUrl}/api/oauth/${platform}/callback`
}
