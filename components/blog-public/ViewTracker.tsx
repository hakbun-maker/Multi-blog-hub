'use client'

import { useEffect } from 'react'

interface Props {
  postId: string
}

export default function ViewTracker({ postId }: Props) {
  useEffect(() => {
    if (!postId) return

    const sessionKey = `bh:viewed:${postId}`
    if (sessionStorage.getItem(sessionKey)) return

    const visitorKey = 'bh:visitor'
    const isNewVisitor = !localStorage.getItem(visitorKey)
    if (isNewVisitor) {
      localStorage.setItem(visitorKey, String(Date.now()))
    }

    sessionStorage.setItem(sessionKey, '1')

    const send = () => {
      try {
        const blob = new Blob(
          [JSON.stringify({ postId, isNewVisitor })],
          { type: 'application/json' },
        )
        const sent = navigator.sendBeacon?.('/api/public/track-view', blob)
        if (sent) return
      } catch {}
      fetch('/api/public/track-view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, isNewVisitor }),
        keepalive: true,
      }).catch(() => {})
    }

    const t = window.setTimeout(send, 1500)
    return () => window.clearTimeout(t)
  }, [postId])

  return null
}
