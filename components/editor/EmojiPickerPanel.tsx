'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

interface EmojiPickerPanelProps {
  onSelect: (emoji: string) => void
  onClose: () => void
}

const EMOJI_CATEGORIES: { name: string; emojis: string[] }[] = [
  {
    name: '표정',
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂',
      '🙂', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗',
      '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭',
      '🤫', '🤔', '😐', '😑', '😶', '😏', '😒', '🙄',
      '😬', '😮', '😯', '😲', '😳', '🥺', '😢', '😭',
      '😤', '😠', '😡', '🤬', '😈', '👿', '💀', '☠️',
      '😱', '😨', '😰', '😥', '😓', '🤯', '😴', '🥱',
    ],
  },
  {
    name: '손/사람',
    emojis: [
      '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏',
      '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆',
      '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜',
      '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💪',
      '🦾', '🦿', '🦵', '🦶', '👀', '👁️', '👅', '👄',
    ],
  },
  {
    name: '하트/기호',
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍',
      '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘',
      '💝', '💟', '⭐', '🌟', '✨', '💫', '🔥', '💥',
      '💢', '💦', '💨', '🕳️', '💣', '💬', '💭', '💤',
      '✅', '❌', '❓', '❗', '⚠️', '🔴', '🟠', '🟡',
      '🟢', '🔵', '🟣', '⚫', '⚪', '🟤', '🔶', '🔷',
    ],
  },
  {
    name: '자연/동물',
    emojis: [
      '🌈', '☀️', '🌤️', '⛅', '🌥️', '☁️', '🌧️', '⛈️',
      '🌩️', '❄️', '🌊', '🌸', '🌺', '🌻', '🌹', '🌷',
      '🍀', '🌿', '🍃', '🌲', '🌳', '🌴', '🐶', '🐱',
      '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯',
      '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦',
      '🦋', '🐝', '🐞', '🦀', '🐬', '🐳', '🦈', '🐙',
    ],
  },
  {
    name: '음식',
    emojis: [
      '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓',
      '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝',
      '🍅', '🥑', '🌶️', '🌽', '🥕', '🧄', '🧅', '🥔',
      '🍞', '🥐', '🥖', '🧁', '🍰', '🎂', '🍩', '🍪',
      '🍕', '🍔', '🍟', '🌭', '🥪', '🌮', '🍣', '🍱',
      '☕', '🍵', '🧃', '🥤', '🍺', '🍷', '🥂', '🍸',
    ],
  },
  {
    name: '활동/물건',
    emojis: [
      '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🎱', '🏓',
      '🎯', '🎮', '🕹️', '🎲', '🧩', '🎭', '🎨', '🎬',
      '🎤', '🎧', '🎵', '🎶', '🎹', '🎸', '🎺', '🥁',
      '📱', '💻', '🖥️', '⌨️', '🖱️', '💾', '📷', '🔍',
      '💡', '🔔', '📌', '📎', '✏️', '📝', '📚', '📖',
      '🏠', '🏢', '🏫', '🏥', '⛪', '🕌', '🗼', '🗽',
    ],
  },
  {
    name: '교통/여행',
    emojis: [
      '🚗', '🚕', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒',
      '✈️', '🚀', '🛸', '🚁', '⛵', '🚢', '🚂', '🚆',
      '🚲', '🛴', '🏍️', '🛵', '🚍', '🚃', '🚄', '🚅',
      '🗺️', '🧭', '🏔️', '⛰️', '🌋', '🗻', '🏕️', '🏖️',
      '🏝️', '🏞️', '🎡', '🎢', '🎠', '⛲', '⛺', '🌁',
    ],
  },
]

export function EmojiPickerPanel({ onSelect, onClose }: EmojiPickerPanelProps) {
  const [activeCategory, setActiveCategory] = useState(0)

  return (
    <div className="border-b border-gray-100 bg-white p-3 space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-700">이모티콘 선택</h4>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 카테고리 탭 */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {EMOJI_CATEGORIES.map((cat, i) => (
          <Button key={cat.name} type="button" size="sm" variant="ghost"
            className={`h-7 px-2 text-xs shrink-0 ${activeCategory === i ? 'bg-blue-100 text-blue-700' : ''}`}
            onClick={() => setActiveCategory(i)}>
            {cat.emojis[0]} {cat.name}
          </Button>
        ))}
      </div>

      {/* 이모지 그리드 */}
      <div className="grid grid-cols-8 gap-0.5 max-h-48 overflow-y-auto">
        {EMOJI_CATEGORIES[activeCategory].emojis.map((emoji, i) => (
          <button key={i}
            onClick={() => onSelect(emoji)}
            className="w-8 h-8 flex items-center justify-center text-lg hover:bg-gray-100 rounded transition-colors"
            title={emoji}>
            {emoji}
          </button>
        ))}
      </div>
    </div>
  )
}
