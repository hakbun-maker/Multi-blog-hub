'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { useState } from 'react'
import { Bold, Italic, List, Link2, Image as ImageIcon, Code, Heading2, Heading3 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PostEditorProps {
  content?: string
  onChange?: (html: string, text: string) => void
  placeholder?: string
}

export function PostEditor({ content = '', onChange, placeholder = '본문을 입력하세요...' }: PostEditorProps) {
  const [isHtmlMode, setIsHtmlMode] = useState(false)
  const [htmlValue, setHtmlValue] = useState(content)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder }),
    ],
    content,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      const text = editor.getText()
      setHtmlValue(html)
      onChange?.(html, text)
    },
  })

  const toggleHtmlMode = () => {
    if (!editor) return
    if (!isHtmlMode) {
      setHtmlValue(editor.getHTML())
    } else {
      editor.commands.setContent(htmlValue)
      onChange?.(htmlValue, editor.getText())
    }
    setIsHtmlMode(!isHtmlMode)
  }

  const handleHtmlChange = (val: string) => {
    setHtmlValue(val)
    onChange?.(val, '')
  }

  if (!editor) return null

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* 툴바 */}
      <div className="flex items-center gap-1 p-2 border-b border-gray-100 bg-gray-50 flex-wrap">
        <Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0"
          onClick={() => editor.chain().focus().toggleBold().run()}
          data-active={editor.isActive('bold')}>
          <Bold className="w-3.5 h-3.5" />
        </Button>
        <Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0"
          onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="w-3.5 h-3.5" />
        </Button>
        <Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 className="w-3.5 h-3.5" />
        </Button>
        <Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
          <Heading3 className="w-3.5 h-3.5" />
        </Button>
        <Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0"
          onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List className="w-3.5 h-3.5" />
        </Button>
        <Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
          <Code className="w-3.5 h-3.5" />
        </Button>
        <Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0"
          onClick={() => {
            const url = prompt('링크 URL:')
            if (url) editor.chain().focus().setLink({ href: url }).run()
          }}>
          <Link2 className="w-3.5 h-3.5" />
        </Button>
        <Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0"
          onClick={() => {
            const url = prompt('이미지 URL:')
            if (url) editor.chain().focus().setImage({ src: url }).run()
          }}>
          <ImageIcon className="w-3.5 h-3.5" />
        </Button>
        <div className="ml-auto">
          <Button type="button" size="sm" variant="outline" className="h-7 text-xs px-2"
            onClick={toggleHtmlMode}>
            {isHtmlMode ? '비주얼' : 'HTML'}
          </Button>
        </div>
      </div>

      {/* 에디터 영역 */}
      {isHtmlMode ? (
        <textarea
          value={htmlValue}
          onChange={e => handleHtmlChange(e.target.value)}
          className="w-full min-h-[400px] p-4 text-sm font-mono text-gray-700 resize-none focus:outline-none"
          placeholder="HTML 코드를 입력하세요..."
        />
      ) : (
        <EditorContent
          editor={editor}
          className="prose prose-sm max-w-none p-4 min-h-[400px] focus:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[380px]"
        />
      )}
    </div>
  )
}
