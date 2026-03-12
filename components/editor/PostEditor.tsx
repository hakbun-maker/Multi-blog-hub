'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import CodeExtension from '@tiptap/extension-code'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import TextAlign from '@tiptap/extension-text-align'

// Enter 시 코드 마크가 다음 줄로 이어지지 않도록 inclusive: false 설정
const NonInclusiveCode = CodeExtension.extend({ inclusive: false })
import { useState, useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from 'react'
import {
  Bold, Italic, List, Code,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Type
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ButtonInsertPanel, type ButtonEditData } from './ButtonInsertPanel'
import { ImageInsertPanel } from './ImageInsertPanel'
import { VideoInsertPanel } from './VideoInsertPanel'
import { HrInsertPanel } from './HrInsertPanel'
import { EmojiPickerPanel } from './EmojiPickerPanel'
import { RelatedPostPanel } from './RelatedPostPanel'
import { IframeExtension } from '@/lib/tiptap/iframe-extension'
import { StyledButtonExtension } from '@/lib/tiptap/button-extension'

interface PostEditorProps {
  content?: string
  onChange?: (html: string, text: string) => void
  placeholder?: string
  articleTitle?: string
}

export interface PostEditorRef {
  getHeadings: () => { level: number; text: string }[]
  insertAtH2End: (h2Text: string, html: string) => void
  getEditor: () => ReturnType<typeof useEditor>
}

export const PostEditor = forwardRef<PostEditorRef, PostEditorProps>(
  function PostEditor({ content = '', onChange, placeholder = '본문을 입력하세요...', articleTitle }, ref) {
  const [isHtmlMode, setIsHtmlMode] = useState(false)
  const [htmlValue, setHtmlValue] = useState(content)
  const [showButtonPanel, setShowButtonPanel] = useState(false)
  const [showImagePanel, setShowImagePanel] = useState(false)
  const [showVideoPanel, setShowVideoPanel] = useState(false)
  const [showHrPanel, setShowHrPanel] = useState(false)
  const [showEmojiPanel, setShowEmojiPanel] = useState(false)
  const [showRelatedPostPanel, setShowRelatedPostPanel] = useState(false)
  const [imageEntryTrigger, setImageEntryTrigger] = useState(0)
  const [buttonEditData, setButtonEditData] = useState<ButtonEditData | null>(null)
  const [editingButtonPos, setEditingButtonPos] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const closeAllPanels = useCallback(() => {
    setShowButtonPanel(false)
    setShowImagePanel(false)
    setShowVideoPanel(false)
    setShowHrPanel(false)
    setShowEmojiPanel(false)
    setShowRelatedPostPanel(false)
    setButtonEditData(null)
    setEditingButtonPos(null)
  }, [])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ code: false }),
      NonInclusiveCode,
      Image.configure({ allowBase64: true }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'editor-link',
        },
      }),
      Placeholder.configure({ placeholder }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      IframeExtension,
      StyledButtonExtension,
    ],
    content,
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML()
      const text = ed.getText()
      isInternalUpdate.current = true
      setHtmlValue(html)
      onChange?.(html, text)
    },
    editorProps: {
      handleClick: (view, pos, event) => {
        const node = view.state.doc.nodeAt(pos)
        if (node?.type.name === 'styledButton') {
          event.preventDefault()
          return true
        }
        return false
      },
      handleDoubleClick: (view, pos) => {
        const node = view.state.doc.nodeAt(pos)
        if (node?.type.name === 'styledButton') {
          // closeAllPanels 먼저 호출 후 edit 데이터 설정 (closeAllPanels이 null로 리셋하므로)
          closeAllPanels()
          setButtonEditData({
            text: node.attrs.text,
            href: node.attrs.href,
            bgColor: node.attrs.bgColor,
            textColor: node.attrs.textColor,
            padding: node.attrs.padding,
            borderRadius: node.attrs.borderRadius,
            fontSize: node.attrs.fontSize,
          })
          setEditingButtonPos(pos)
          setShowButtonPanel(true)
          return true
        }
        return false
      },
    },
  })

  // content prop 변경 시 에디터 동기화 (draft 로드 등)
  const isInternalUpdate = useRef(false)
  useEffect(() => {
    if (!editor || isInternalUpdate.current) {
      isInternalUpdate.current = false
      return
    }
    if (content !== editor.getHTML()) {
      editor.commands.setContent(content || '')
      setHtmlValue(content || '')
    }
  }, [content, editor])

  // 에디터 ref 노출
  const getHeadings = useCallback(() => {
    if (!editor) return []
    const headings: { level: number; text: string }[] = []
    editor.state.doc.descendants((node) => {
      if (node.type.name === 'heading') {
        headings.push({ level: node.attrs.level as number, text: node.textContent })
      }
    })
    return headings
  }, [editor])

  const insertAtH2End = useCallback((h2Text: string, html: string) => {
    if (!editor) return

    // 메인 (글 최상단)에 삽입
    if (h2Text === '__main__') {
      let firstH2Pos: number | null = null
      editor.state.doc.descendants((node, pos) => {
        if (firstH2Pos !== null) return false
        if (node.type.name === 'heading' && node.attrs.level === 2) {
          firstH2Pos = pos
          return false
        }
      })
      const insertPos = firstH2Pos ?? 0
      editor.chain().focus().insertContentAt(insertPos, html).run()
      return
    }

    let targetPos: number | null = null
    let foundH2 = false

    editor.state.doc.descendants((node, pos) => {
      if (targetPos !== null) return false
      if (node.type.name === 'heading' && node.attrs.level === 2) {
        if (foundH2) {
          targetPos = pos
          return false
        }
        if (node.textContent === h2Text) {
          foundH2 = true
        }
      }
    })

    if (foundH2 && targetPos === null) {
      targetPos = editor.state.doc.content.size
    }

    if (targetPos !== null) {
      editor.chain().focus().insertContentAt(targetPos, html).run()
    } else {
      editor.chain().focus().insertContentAt(editor.state.doc.content.size, html).run()
    }
  }, [editor])

  useImperativeHandle(ref, () => ({
    getHeadings,
    insertAtH2End,
    getEditor: () => editor,
  }), [editor, getHeadings, insertAtH2End])

  /** HTML 코드를 읽기 쉽게 줄바꿈/들여쓰기 */
  const formatHtml = (html: string): string => {
    // 블록 태그 기준으로 줄바꿈
    const blockTags = /(<\/?(h[1-6]|p|div|ul|ol|li|blockquote|figure|figcaption|nav|table|tr|td|th|thead|tbody|hr|br|img|iframe|pre|section|article)[^>]*>)/gi
    let formatted = html
      .replace(/>\s+</g, '><') // 기존 공백 정리
      .replace(blockTags, '\n$1') // 블록 태그 앞에 줄바꿈
      .replace(/(<\/(?:h[1-6]|p|div|ul|ol|li|blockquote|figure|figcaption|nav|table|tr|td|th|thead|tbody|pre|section|article)>)/gi, '$1\n') // 닫는 태그 뒤에 줄바꿈
    // 연속 줄바꿈 정리
    formatted = formatted.replace(/\n{3,}/g, '\n\n').trim()
    return formatted
  }

  const toggleHtmlMode = () => {
    if (!editor) return
    if (!isHtmlMode) {
      setHtmlValue(formatHtml(editor.getHTML()))
    } else {
      // HTML 모드에서 비주얼로 돌아올 때는 줄바꿈 제거 후 적용
      const cleanHtml = htmlValue.replace(/\n/g, '')
      editor.commands.setContent(cleanHtml)
      onChange?.(cleanHtml, editor.getText())
    }
    setIsHtmlMode(!isHtmlMode)
  }

  const handleHtmlChange = (val: string) => {
    setHtmlValue(val)
    onChange?.(val, '')
  }

  // 이미지 업로드
  const handleImageUpload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      alert('이미지 크기는 5MB 이하만 가능합니다.')
      return
    }
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다.')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload-image', { method: 'POST', body: formData })
      const data = await res.json()
      if (res.ok && data.url) {
        editor?.chain().focus().setImage({ src: data.url, alt: file.name }).run()
      } else {
        const reader = new FileReader()
        reader.onload = () => {
          editor?.chain().focus().setImage({ src: reader.result as string, alt: file.name }).run()
        }
        reader.readAsDataURL(file)
      }
    } catch {
      const reader = new FileReader()
      reader.onload = () => {
        editor?.chain().focus().setImage({ src: reader.result as string, alt: file.name }).run()
      }
      reader.readAsDataURL(file)
    } finally {
      setUploading(false)
    }
  }

  // 영상 HTML 삽입
  const insertVideoHtml = (html: string) => {
    if (!editor) return
    editor.chain().focus().insertContent(html).run()
    setShowVideoPanel(false)
  }

  // 링크 삽입 + OG 프리뷰
  const insertLink = async () => {
    if (!editor) return
    const previousUrl = editor.getAttributes('link').href as string || ''
    const url = prompt('링크 URL:', previousUrl)
    if (url === null) return
    if (url === '') {
      editor.chain().focus().unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()

    try {
      const res = await fetch('/api/link-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const data = await res.json()
      if (res.ok && data.title) {
        const safeTitle = data.title.replace(/</g, '&lt;').replace(/>/g, '&gt;')
        const safeSite = (data.siteName || data.domain || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        const safeUrl = url.replace(/"/g, '&quot;')
        const { from } = editor.state.selection
        const resolvedPos = editor.state.doc.resolve(from)
        const depth = Math.min(resolvedPos.depth, 1) || 1
        const blockAfter = resolvedPos.after(depth)
        editor.chain()
          .insertContentAt(blockAfter, `<p><a href="${safeUrl}" target="_blank" rel="noopener noreferrer"><strong>${safeTitle}</strong></a> · ${safeSite}</p>`)
          .run()
      }
    } catch { /* 링크 프리뷰 실패해도 링크 자체는 정상 동작 */ }
  }

  // 버튼 HTML 삽입
  const insertButtonHtml = (html: string) => {
    if (!editor) return
    editor.chain().focus().insertContent(html).run()
    setShowButtonPanel(false)
  }

  // HR HTML 삽입
  const insertHrHtml = (html: string) => {
    if (!editor) return
    editor.chain().focus().insertContent(html).run()
    setShowHrPanel(false)
  }

  // 버튼 수정 처리 (더블클릭으로 열린 패널에서 수정 완료 시)
  const handleButtonUpdate = (html: string) => {
    if (!editor || editingButtonPos === null) return
    const node = editor.state.doc.nodeAt(editingButtonPos)
    if (node?.type.name === 'styledButton') {
      editor.chain().focus()
        .deleteRange({ from: editingButtonPos, to: editingButtonPos + node.nodeSize })
        .insertContentAt(editingButtonPos, html)
        .run()
    }
    setShowButtonPanel(false)
    setButtonEditData(null)
    setEditingButtonPos(null)
  }

  if (!editor) return null

  const isActive = (name: string, attrs?: Record<string, unknown>) =>
    editor.isActive(name, attrs) ? 'bg-gray-200' : ''

  return (
    <>
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* 툴바 */}
      <div className="flex items-center gap-0.5 p-2 border-b border-gray-100 bg-gray-50 flex-wrap">
        <Button type="button" size="sm" variant="ghost" className={`h-7 px-1.5 text-xs ${isActive('bold')}`}
          onClick={() => editor.chain().focus().toggleBold().run()} title="굵게">
          <Bold className="w-3.5 h-3.5" />
        </Button>
        <Button type="button" size="sm" variant="ghost" className={`h-7 px-1.5 text-xs ${isActive('italic')}`}
          onClick={() => editor.chain().focus().toggleItalic().run()} title="기울임">
          <Italic className="w-3.5 h-3.5" />
        </Button>
        <Button type="button" size="sm" variant="ghost" className={`h-7 px-1.5 text-xs ${isActive('heading', { level: 2 })}`}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="소제목 H2">
          H2
        </Button>
        <Button type="button" size="sm" variant="ghost" className={`h-7 px-1.5 text-xs ${isActive('heading', { level: 3 })}`}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="소제목 H3">
          H3
        </Button>
        <Button type="button" size="sm" variant="ghost" className={`h-7 px-1.5 text-xs ${isActive('paragraph')}`}
          onClick={() => editor.chain().focus().setParagraph().run()} title="기본 글씨">
          <Type className="w-3.5 h-3.5" />
        </Button>
        <Button type="button" size="sm" variant="ghost" className={`h-7 px-1.5 text-xs ${isActive('bulletList')}`}
          onClick={() => editor.chain().focus().toggleBulletList().run()} title="글머리 기호">
          <List className="w-3.5 h-3.5" />
        </Button>
        <Button type="button" size="sm" variant="ghost" className={`h-7 px-1.5 text-xs ${isActive('code')}`}
          onClick={() => editor.chain().focus().toggleCode().run()} title="코드">
          <Code className="w-3.5 h-3.5" />
        </Button>
        {/* 구분선 버튼 - 코드 바로 오른쪽 */}
        <Button type="button" size="sm" variant="ghost"
          className={`h-7 px-2 text-xs gap-1 ${showHrPanel ? 'bg-gray-200' : ''}`}
          onClick={() => { const next = !showHrPanel; closeAllPanels(); setShowHrPanel(next) }}
          title="구분선 삽입">
          ➖ 구분선
        </Button>

        <div className="w-px h-5 bg-gray-200 mx-0.5" />

        {/* 정렬 */}
        <Button type="button" size="sm" variant="ghost" className={`h-7 px-1.5 text-xs ${editor.isActive({ textAlign: 'left' }) ? 'bg-gray-200' : ''}`}
          onClick={() => editor.chain().focus().setTextAlign('left').run()} title="왼쪽 정렬">
          <AlignLeft className="w-3.5 h-3.5" />
        </Button>
        <Button type="button" size="sm" variant="ghost" className={`h-7 px-1.5 text-xs ${editor.isActive({ textAlign: 'center' }) ? 'bg-gray-200' : ''}`}
          onClick={() => editor.chain().focus().setTextAlign('center').run()} title="가운데 정렬">
          <AlignCenter className="w-3.5 h-3.5" />
        </Button>
        <Button type="button" size="sm" variant="ghost" className={`h-7 px-1.5 text-xs ${editor.isActive({ textAlign: 'right' }) ? 'bg-gray-200' : ''}`}
          onClick={() => editor.chain().focus().setTextAlign('right').run()} title="오른쪽 정렬">
          <AlignRight className="w-3.5 h-3.5" />
        </Button>
        <Button type="button" size="sm" variant="ghost" className={`h-7 px-1.5 text-xs ${editor.isActive({ textAlign: 'justify' }) ? 'bg-gray-200' : ''}`}
          onClick={() => editor.chain().focus().setTextAlign('justify').run()} title="균등 정렬">
          <AlignJustify className="w-3.5 h-3.5" />
        </Button>

        <div className="w-px h-5 bg-gray-200 mx-0.5" />

        {/* 미디어 삽입 그룹 */}
        <Button type="button" size="sm" variant="ghost" className={`h-7 px-2 text-xs gap-1 ${isActive('link')}`}
          onClick={insertLink} title="링크 삽입">
          🔗 링크
        </Button>
        <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading} title="이미지 업로드">
          📷 사진
        </Button>
        <Button type="button" size="sm" variant="ghost"
          className={`h-7 px-2 text-xs gap-1 ${showVideoPanel ? 'bg-gray-200' : ''}`}
          onClick={() => { const next = !showVideoPanel; closeAllPanels(); setShowVideoPanel(next) }}
          title="영상 삽입">
          🎬 영상
        </Button>

        <div className="w-px h-5 bg-gray-200 mx-0.5" />

        {/* 특수 기능 버튼 그룹 */}
        <div className="flex items-center gap-0.5 bg-amber-50 border border-amber-300 rounded-lg px-1.5 py-0.5">
          <span className="text-[10px] font-semibold text-amber-600 mr-0.5 select-none">★</span>
          <Button type="button" size="sm" variant="ghost"
            className={`h-7 px-2 text-xs gap-1 ${showButtonPanel ? 'bg-amber-200' : 'hover:bg-amber-100'}`}
            onClick={() => { const next = !showButtonPanel; closeAllPanels(); setShowButtonPanel(next) }}
            title="CTA 버튼 삽입">
            🔘 CTA버튼
          </Button>
          <Button type="button" size="sm" variant="ghost"
            className={`h-7 px-2 text-xs gap-1 ${showRelatedPostPanel ? 'bg-amber-200' : 'hover:bg-amber-100'}`}
            onClick={() => { const next = !showRelatedPostPanel; closeAllPanels(); setShowRelatedPostPanel(next) }}
            title="관련글 삽입">
            📰 관련글
          </Button>
          <Button type="button" size="sm" variant="ghost"
            className={`h-7 px-2 text-xs gap-1 ${showImagePanel ? 'bg-amber-200' : 'hover:bg-amber-100'}`}
            onClick={() => {
              if (showImagePanel) {
                setImageEntryTrigger(prev => prev + 1)
              } else {
                closeAllPanels()
                setShowImagePanel(true)
              }
            }}
            title="AI 이미지 생성">
            🖼️ AI이미지
          </Button>
          <Button type="button" size="sm" variant="ghost"
            className={`h-7 px-2 text-xs gap-1 ${showEmojiPanel ? 'bg-amber-200' : 'hover:bg-amber-100'}`}
            onClick={() => { const next = !showEmojiPanel; closeAllPanels(); setShowEmojiPanel(next) }}
            title="이모티콘 삽입">
            😀 이모티콘
          </Button>
        </div>

        <div className="ml-auto">
          <Button type="button" size="sm" variant="outline" className="h-7 text-xs px-2"
            onClick={toggleHtmlMode}>
            {isHtmlMode ? 'Visual' : '</> HTML'}
          </Button>
        </div>
      </div>

      {/* 숨겨진 파일 입력 */}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) handleImageUpload(file)
          e.target.value = ''
        }} />

      {/* 라인 추가 패널 */}
      {showHrPanel && (
        <HrInsertPanel onInsert={insertHrHtml} onClose={() => setShowHrPanel(false)} />
      )}

      {/* 영상 삽입 패널 */}
      {showVideoPanel && (
        <VideoInsertPanel onInsert={insertVideoHtml} onClose={() => setShowVideoPanel(false)} />
      )}

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

    <ButtonInsertPanel
      isOpen={showButtonPanel}
      onInsert={insertButtonHtml}
      onClose={() => { setShowButtonPanel(false); setButtonEditData(null); setEditingButtonPos(null) }}
      editData={buttonEditData}
      onUpdate={handleButtonUpdate}
    />
    <EmojiPickerPanel
      isOpen={showEmojiPanel}
      onSelect={(emoji) => {
        editor?.chain().focus().insertContent(emoji).run()
      }}
      onClose={() => setShowEmojiPanel(false)}
    />
    <ImageInsertPanel
      isOpen={showImagePanel}
      getHeadings={getHeadings}
      addEntryTrigger={imageEntryTrigger}
      onInsert={(h2Text, html) => {
        insertAtH2End(h2Text, html)
      }}
      onClose={() => setShowImagePanel(false)}
      articleTitle={articleTitle}
      articleContent={htmlValue}
    />
    {/* 관련글 삽입 패널 */}
    <RelatedPostPanel
      isOpen={showRelatedPostPanel}
      onClose={() => setShowRelatedPostPanel(false)}
      onInsert={(h2Text, html) => {
        insertAtH2End(h2Text, html)
        setShowRelatedPostPanel(false)
      }}
      articleContent={htmlValue}
      articleTitle={articleTitle}
      getHeadings={getHeadings}
    />
    </>
  )
})
