'use client'

import { useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import type { ConsentType } from '@/types/consent'
import { REQUIRED_AT_SIGNUP, OPTIONAL_AT_SIGNUP, CONSENT_LABELS } from '@/lib/consent/constants'
import { ConsentFullTextModal } from './ConsentFullTextModal'

interface ConsentCheckboxGroupProps {
  onConsentChange: (consents: Record<ConsentType, boolean>) => void
  disabled?: boolean
}

export function ConsentCheckboxGroup({ onConsentChange, disabled }: ConsentCheckboxGroupProps) {
  const [allChecked, setAllChecked] = useState(false)
  const [checked, setChecked] = useState<Record<ConsentType, boolean>>({
    tos: false,
    privacy: false,
    marketing: false,
    api_key_storage: false,
    automation: false,
    sns_oauth_instagram: false,
    sns_oauth_twitter: false,
    sns_oauth_threads: false,
    affiliate_marketing: false,
    adsense_oauth: false,
  })

  const [openFullTextModal, setOpenFullTextModal] = useState<ConsentType | null>(null)

  const signupConsents = [...REQUIRED_AT_SIGNUP, ...OPTIONAL_AT_SIGNUP]

  const handleToggleAll = (value: boolean) => {
    const newChecked = { ...checked }
    signupConsents.forEach(type => {
      newChecked[type] = value
    })
    setChecked(newChecked)
    setAllChecked(value)
    onConsentChange(newChecked)
  }

  const handleToggleIndividual = (consentType: ConsentType, value: boolean) => {
    const newChecked = { ...checked, [consentType]: value }
    setChecked(newChecked)

    // Check if all signup consents are now checked
    const allSignupChecked = signupConsents.every(type => newChecked[type])
    setAllChecked(allSignupChecked)

    onConsentChange(newChecked)
  }

  return (
    <div className="space-y-4">
      {/* 전체 동의 */}
      <div className="flex items-center gap-3 border rounded-lg p-3 bg-muted/50">
        <Checkbox
          id="all-consent"
          checked={allChecked}
          onCheckedChange={handleToggleAll}
          disabled={disabled}
          className="h-5 w-5"
        />
        <Label
          htmlFor="all-consent"
          className="font-semibold cursor-pointer flex-1"
        >
          전체 동의
        </Label>
      </div>

      {/* 개별 동의 항목 */}
      <div className="space-y-3 ml-4">
        {signupConsents.map(consentType => {
          const isRequired = REQUIRED_AT_SIGNUP.includes(consentType)
          return (
            <div key={consentType} className="flex items-center gap-3">
              <Checkbox
                id={`consent-${consentType}`}
                checked={checked[consentType] ?? false}
                onCheckedChange={value => handleToggleIndividual(consentType, value === true)}
                disabled={disabled || isRequired}
              />
              <Label
                htmlFor={`consent-${consentType}`}
                className="flex-1 cursor-pointer text-sm flex items-center gap-2"
              >
                {CONSENT_LABELS[consentType]}
                {isRequired && <span className="text-red-500 font-semibold">*</span>}
              </Label>
              <button
                type="button"
                onClick={() => setOpenFullTextModal(consentType)}
                className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
              >
                전문 보기
              </button>
              <ConsentFullTextModal
                consentType={consentType}
                open={openFullTextModal === consentType}
                onOpenChange={isOpen => setOpenFullTextModal(isOpen ? consentType : null)}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
