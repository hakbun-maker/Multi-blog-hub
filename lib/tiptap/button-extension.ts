import { Node, mergeAttributes } from '@tiptap/core'

/**
 * 스타일 버튼 TipTap 확장
 * - 배경색 + 글자색 지원
 * - 가운데 정렬 div로 감싸서 출력
 * - 에디터에서 더블클릭 시 수정 이벤트 발생
 */
export const StyledButtonExtension = Node.create({
  name: 'styledButton',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      text: { default: '버튼' },
      href: { default: '' },
      bgColor: { default: '#dc2626' },
      textColor: { default: '#ffffff' },
      padding: { default: '12px 24px' },
      borderRadius: { default: '8px' },
      fontSize: { default: '12px' },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div',
        getAttrs: (dom) => {
          const el = dom as HTMLElement
          const btn = el.querySelector('a[data-button], span[data-button]')
          if (!btn) return false
          return {
            text: btn.textContent || '버튼',
            href: btn.getAttribute('href') || '',
            bgColor: btn.getAttribute('data-bg-color') || '#dc2626',
            textColor: btn.getAttribute('data-text-color') || '#ffffff',
            padding: btn.getAttribute('data-padding') || '12px 24px',
            borderRadius: btn.getAttribute('data-border-radius') || '8px',
            fontSize: btn.getAttribute('data-font-size') || '12px',
          }
        },
      },
      {
        tag: 'a[data-button]',
        getAttrs: (dom) => {
          const el = dom as HTMLElement
          return {
            text: el.textContent || '버튼',
            href: el.getAttribute('href') || '',
            bgColor: el.getAttribute('data-bg-color') || '#dc2626',
            textColor: el.getAttribute('data-text-color') || '#ffffff',
            padding: el.getAttribute('data-padding') || '12px 24px',
            borderRadius: el.getAttribute('data-border-radius') || '8px',
            fontSize: el.getAttribute('data-font-size') || '12px',
          }
        },
      },
      {
        tag: 'span[data-button]',
        getAttrs: (dom) => {
          const el = dom as HTMLElement
          return {
            text: el.textContent || '버튼',
            href: '',
            bgColor: el.getAttribute('data-bg-color') || '#dc2626',
            textColor: el.getAttribute('data-text-color') || '#ffffff',
            padding: el.getAttribute('data-padding') || '12px 24px',
            borderRadius: el.getAttribute('data-border-radius') || '8px',
            fontSize: el.getAttribute('data-font-size') || '12px',
          }
        },
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    const { text, href, bgColor, textColor, padding, borderRadius, fontSize } = HTMLAttributes
    const style = [
      'display:inline-block',
      `background-color:${bgColor}`,
      `color:${textColor}`,
      `padding:${padding}`,
      `border-radius:${borderRadius}`,
      'text-decoration:none',
      'font-weight:600',
      `font-size:${fontSize || '12px'}`,
      'text-align:center',
      'cursor:pointer',
    ].join(';')

    const tag = href ? 'a' : 'span'
    const attrs: Record<string, string> = {
      style,
      'data-button': 'true',
      'data-bg-color': bgColor,
      'data-text-color': textColor,
      'data-padding': padding,
      'data-border-radius': borderRadius,
      'data-font-size': fontSize || '12px',
    }

    if (href) {
      attrs.href = href
      attrs.target = '_blank'
      attrs.rel = 'noopener noreferrer'
    }

    return ['div', { style: 'text-align:center;margin:1.2em 0;' },
      [tag, mergeAttributes(attrs), text]
    ]
  },
})
