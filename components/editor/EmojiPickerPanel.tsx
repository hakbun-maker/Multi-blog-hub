'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

interface EmojiPickerPanelProps {
  isOpen: boolean
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

export function EmojiPickerPanel({ isOpen, onSelect, onClose }: EmojiPickerPanelProps) {
  const [activeCategory, setActiveCategory] = useState(0)

  return (
    <>
      {isOpen && <div className="fixed inset-0 z-40 bg-black/10" onClick={onClose} />}
      <div
        className={`fixed top-0 right-0 h-full bg-white shadow-2xl border-l border-gray-200 z-50 flex flex-col transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ width: 'min(380px, 92vw)' }}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-yellow-50 flex-shrink-0">
          <h3 className="text-sm font-semibold text-yellow-800">이모티콘 선택</h3>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* 스크롤 콘텐츠 */}
        <div className="overflow-y-auto flex-1 p-4 space-y-3">
          {/* 카테고리 탭 */}
          <div className="flex flex-wrap gap-1">
            {EMOJI_CATEGORIES.map((cat, i) => (
              <Button key={cat.name} type="button" size="sm" variant="ghost"
                className={`h-7 px-2 text-xs ${activeCategory === i ? 'bg-blue-100 text-blue-700' : ''}`}
                onClick={() => setActiveCategory(i)}>
                {cat.emojis[0]} {cat.name}
              </Button>
            ))}
          </div>

          {/* 이모지 그리드 */}
          <div className="grid grid-cols-8 gap-0.5">
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
      </div>
    </>
  )
}
