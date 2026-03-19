'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { CheckCircle, XCircle, Loader2, Trash2 } from 'lucide-react'

export interface ApiKeyRecord {
  id: string
  provider: string
  masked_key: string
  is_active: boolean
  created_at: string
  has_secret?: boolean
}

interface ApiKeyRowProps {
  keyData: ApiKeyRecord
  onTest: () => void | Promise<void>
  onDelete: () => void | Promise<void>
  onToggle: () => void | Promise<void>
  providerLabel?: string
  isImageProvider?: boolean
}

export function ApiKeyRow({
  keyData,
  onTest,
  onDelete,
  onToggle,
  providerLabel,
  isImageProvider = false,
}: ApiKeyRowProps) {
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{
    success: boolean
    message: string
  } | null>(null)
  const [toggling, setToggling] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      await onTest()
    } catch (error) {
      setTestResult({
        success: false,
        message:
          error instanceof Error ? error.message : '테스트 중 오류가 발생했습니다.',
      })
    } finally {
      setTesting(false)
    }
  }

  const handleToggle = async () => {
    setToggling(true)
    try {
      await onToggle()
    } catch (error) {
      console.error('Toggle failed:', error)
    } finally {
      setToggling(false)
    }
  }

  const handleDelete = async () => {
    if (
      !confirm(
        `${providerLabel || keyData.provider} API 키를 삭제하시겠습니까?`
      )
    )
      return
    setDeleting(true)
    try {
      await onDelete()
    } catch (error) {
      console.error('Delete failed:', error)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div
      className={`p-3 border rounded-lg transition-opacity ${
        !keyData.is_active ? 'opacity-60' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        {/* 왼쪽: 제공자 정보 및 마스킹된 키 */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {providerLabel || keyData.provider}
            </span>
            <Badge variant={isImageProvider ? 'outline' : 'default'}>
              {isImageProvider ? '이미지 생성' : '텍스트 생성'}
            </Badge>
            {keyData.has_secret && (
              <Badge variant="secondary" className="text-xs">
                시크릿 포함
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground font-mono mt-0.5 break-all">
            {keyData.masked_key}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            등록일: {new Date(keyData.created_at).toLocaleDateString('ko-KR')}
          </p>
        </div>

        {/* 오른쪽: 액션 버튼 */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          {/* 활성/비활성 토글 */}
          <div className="flex items-center gap-1.5">
            <Switch
              checked={keyData.is_active}
              onCheckedChange={handleToggle}
              disabled={toggling}
            />
            <span className="text-xs text-muted-foreground w-10 text-right">
              {keyData.is_active ? '활성' : '비활성'}
            </span>
          </div>

          {/* 테스트 버튼 */}
          <Button
            size="sm"
            variant="outline"
            onClick={handleTest}
            disabled={testing || !keyData.is_active}
            title={!keyData.is_active ? '활성화된 키만 테스트할 수 있습니다.' : ''}
          >
            {testing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              '테스트'
            )}
          </Button>

          {/* 삭제 버튼 */}
          <Button
            size="sm"
            variant="outline"
            onClick={handleDelete}
            disabled={deleting}
          >
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      </div>

      {/* 테스트 결과 표시 */}
      {testResult && (
        <div
          className={`flex items-center gap-1.5 mt-2 text-xs px-2.5 py-1.5 rounded ${
            testResult.success
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {testResult.success ? (
            <CheckCircle className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <XCircle className="h-3.5 w-3.5 shrink-0" />
          )}
          {testResult.message}
        </div>
      )}
    </div>
  )
}
