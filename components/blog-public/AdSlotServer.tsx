'use client'

import { useEffect, useRef } from 'react'

export default function AdSlotServer({ code, className }: { code: string; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!code || !containerRef.current) return
    const container = containerRef.current
    container.innerHTML = `<style>.ad-wrap *{max-width:100%!important;box-sizing:border-box!important;}</style><div class="ad-wrap">${code}</div>`

    const scripts = container.querySelectorAll('script')
    scripts.forEach(oldScript => {
      const newScript = document.createElement('script')
      Array.from(oldScript.attributes).forEach(attr => {
        newScript.setAttribute(attr.name, attr.value)
      })
      newScript.textContent = oldScript.textContent
      oldScript.parentNode?.replaceChild(newScript, oldScript)
    })
  }, [code])

  if (!code) return null
  return <div ref={containerRef} className={`relative overflow-hidden ${className ?? ''}`} style={{ maxWidth: '100%', width: '100%', minHeight: '90px' }} />
}
