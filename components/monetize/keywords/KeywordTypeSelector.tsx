'use client'

import type { KeywordType } from '@/types/monetize'
import { Gem, Calendar, Sun } from 'lucide-react'

interface KeywordTypeSelectorProps {
  activeTab: KeywordType
  onTabChange: (tab: KeywordType) => void
}

const tabs: { id: KeywordType; label: string; icon: any; description: string }[] = [
  { id: 'gold', label: '골드 키워드', icon: Gem, description: '높은 수익성' },
  { id: 'event', label: '이벤트 키워드', icon: Calendar, description: 'D-Day 기반' },
  { id: 'seasonal', label: '시즌 키워드', icon: Sun, description: '계절/월별' },
]

export function KeywordTypeSelector({ activeTab, onTabChange }: KeywordTypeSelectorProps) {
  return (
    <div className="flex gap-2">
      {tabs.map(tab => {
        const Icon = tab.icon
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? 'bg-orange-50 text-orange-700 border border-orange-200'
                : 'text-gray-600 hover:bg-gray-50 border border-transparent'
            }`}
          >
            <Icon className="w-4 h-4" />
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
