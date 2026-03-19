'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ApiKeyRow, type ApiKeyRecord } from './ApiKeyRow'
import {
  ApiKeyRegisterForm,
  type ProviderConfig,
} from './ApiKeyRegisterForm'

interface ApiKeySectionProps {
  title: string
  description?: string
  providers: ProviderConfig[]
  keys: ApiKeyRecord[]
  onTest: (keyId: string) => Promise<void>
  onDelete: (keyId: string) => Promise<void>
  onToggle: (keyId: string, currentActive: boolean) => Promise<void>
  onSave: (data: {
    provider: string
    apiKey: string
    apiSecret?: string
  }) => Promise<void>
  isImageCategory?: boolean
}

export function ApiKeySection({
  title,
  description,
  providers,
  keys,
  onTest,
  onDelete,
  onToggle,
  onSave,
  isImageCategory = false,
}: ApiKeySectionProps) {
  const registeredProviders = keys.map(k => k.provider)

  // 현재 카테고리의 키만 필터링
  const categoryKeys = keys.filter(k =>
    providers.some(p => p.provider === k.provider)
  )

  const getProviderLabel = (provider: string) => {
    return providers.find(p => p.provider === provider)?.label || provider
  }

  return (
    <div className="space-y-4">
      {/* 등록된 키 목록 */}
      {categoryKeys.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{title}</CardTitle>
            {description && (
              <p className="text-sm text-muted-foreground mt-1">
                {description}
              </p>
            )}
          </CardHeader>
          <CardContent>
            {categoryKeys.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                등록된 API 키가 없습니다.
              </p>
            ) : (
              <div className="space-y-3">
                {categoryKeys.map(key => (
                  <ApiKeyRow
                    key={key.id}
                    keyData={key}
                    onTest={() => onTest(key.id)}
                    onDelete={() => onDelete(key.id)}
                    onToggle={() => onToggle(key.id, key.is_active)}
                    providerLabel={getProviderLabel(key.provider)}
                    isImageProvider={isImageCategory}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 새 키 추가 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {title} - API 키 추가
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ApiKeyRegisterForm
            providers={providers}
            existingProviders={registeredProviders}
            onSave={onSave}
          />
        </CardContent>
      </Card>
    </div>
  )
}
