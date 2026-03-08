import { Node, mergeAttributes } from '@tiptap/core'

export const IframeExtension = Node.create({
  name: 'iframe',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      src: { default: null },
      frameborder: { default: '0' },
      allow: {
        default:
          'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share',
      },
      allowfullscreen: { default: 'true' },
    }
  },

  parseHTML() {
    return [{ tag: 'iframe' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      {
        class: 'video-embed',
        style:
          'position:relative;padding-bottom:56.25%;height:0;overflow:hidden;margin:1.5em auto;border-radius:8px;max-width:640px;',
      },
      [
        'iframe',
        mergeAttributes(HTMLAttributes, {
          style:
            'position:absolute;top:0;left:0;width:100%;height:100%;border:0;border-radius:8px;',
        }),
      ],
    ]
  },
})
