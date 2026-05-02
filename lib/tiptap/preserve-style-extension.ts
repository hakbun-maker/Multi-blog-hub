/**
 * Tiptap에 인라인 `style` attribute를 보존하는 styled extension 모음.
 *
 * 기본 Tiptap StarterKit은 schema에 정의되지 않은 attribute를 strip하므로,
 * AI가 생성한 인라인 디자인이 에디터에 setContent로 들어오면 사라진다.
 *
 * `addGlobalAttributes` 방식이 일부 노드(heading 등)에서 정상 동작하지 않아,
 * 각 extension을 개별로 확장해 `style` attribute의 parse/render를 명시한다.
 *
 * 사용법:
 *   StarterKit.configure({
 *     heading: false, paragraph: false, bulletList: false,
 *     orderedList: false, listItem: false, blockquote: false,
 *     horizontalRule: false, bold: false, code: false,
 *   }),
 *   StyledHeading, StyledParagraph, StyledBulletList,
 *   StyledOrderedList, StyledListItem, StyledBlockquote,
 *   StyledHorizontalRule, StyledBold,
 *   StyledTable, StyledTableRow, StyledTableHeader, StyledTableCell,
 */

import Heading from '@tiptap/extension-heading'
import Paragraph from '@tiptap/extension-paragraph'
import BulletList from '@tiptap/extension-bullet-list'
import OrderedList from '@tiptap/extension-ordered-list'
import ListItem from '@tiptap/extension-list-item'
import Blockquote from '@tiptap/extension-blockquote'
import HorizontalRule from '@tiptap/extension-horizontal-rule'
import Bold from '@tiptap/extension-bold'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'

const styleAttribute = {
  default: null as string | null,
  parseHTML: (element: HTMLElement): string | null => element.getAttribute('style'),
  renderHTML: (attributes: { style?: string | null }): Record<string, string> => {
    if (!attributes.style) return {}
    return { style: attributes.style }
  },
}

export const StyledHeading = Heading.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: styleAttribute,
    }
  },
})

export const StyledParagraph = Paragraph.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: styleAttribute,
    }
  },
})

export const StyledBulletList = BulletList.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: styleAttribute,
    }
  },
})

export const StyledOrderedList = OrderedList.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: styleAttribute,
    }
  },
})

export const StyledListItem = ListItem.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: styleAttribute,
    }
  },
})

export const StyledBlockquote = Blockquote.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: styleAttribute,
    }
  },
})

export const StyledHorizontalRule = HorizontalRule.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: styleAttribute,
    }
  },
})

export const StyledBold = Bold.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: styleAttribute,
    }
  },
})

export const StyledTable = Table.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: styleAttribute,
    }
  },
})

export const StyledTableRow = TableRow.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: styleAttribute,
    }
  },
})

export const StyledTableHeader = TableHeader.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: styleAttribute,
    }
  },
})

export const StyledTableCell = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: styleAttribute,
    }
  },
})
