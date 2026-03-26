'use client'

import { useEffect } from 'react'

interface TrackingConfig {
  ga4_id?: string
  gsc_code?: string
  naver_code?: string
  kakao_pixel?: string
  custom_head?: string
  custom_body?: string
  adsense_pub_id?: string
}

export default function BlogTrackingScripts({ tracking, adsensePubId }: {
  tracking: TrackingConfig
  adsensePubId?: string
}) {
  useEffect(() => {
    const injected: HTMLElement[] = []

    if (tracking.ga4_id) {
      const s1 = document.createElement('script')
      s1.src = `https://www.googletagmanager.com/gtag/js?id=${tracking.ga4_id}`
      s1.async = true
      document.head.appendChild(s1)
      injected.push(s1)

      const s2 = document.createElement('script')
      s2.innerHTML = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${tracking.ga4_id}');`
      document.head.appendChild(s2)
      injected.push(s2)
    }

    if (tracking.naver_code) {
      const meta = document.createElement('meta')
      meta.name = 'naver-site-verification'
      meta.content = tracking.naver_code
      document.head.appendChild(meta)
      injected.push(meta)
    }

    if (tracking.kakao_pixel) {
      const s = document.createElement('script')
      s.innerHTML = `!function(e,t){if(!e.kakaoPixel){var n=function(){n.q.push(arguments)};n.q=[],e.kakaoPixel=n;var a=t.createElement("script");a.async=1,a.src="//t1.daumcdn.net/kas/static/kp.js";var i=t.getElementsByTagName("script")[0];i.parentNode.insertBefore(a,i)}}(window,document);kakaoPixel('${tracking.kakao_pixel}');kakaoPixel('${tracking.kakao_pixel}').pageView();`
      document.head.appendChild(s)
      injected.push(s)
    }

    if (tracking.custom_head) {
      const div = document.createElement('div')
      div.innerHTML = tracking.custom_head
      Array.from(div.children).forEach(child => {
        document.head.appendChild(child)
        injected.push(child as HTMLElement)
      })
    }

    const pubId = adsensePubId || tracking.adsense_pub_id
    if (pubId) {
      const normalizedId = pubId.startsWith('ca-pub-') ? pubId : `ca-${pubId}`
      const s = document.createElement('script')
      s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${normalizedId}`
      s.async = true
      s.crossOrigin = 'anonymous'
      document.head.appendChild(s)
      injected.push(s)
    }

    return () => {
      injected.forEach(el => {
        try { el.parentNode?.removeChild(el) } catch { /* ignore */ }
      })
    }
  }, [])

  if (tracking.custom_body) {
    return <div dangerouslySetInnerHTML={{ __html: tracking.custom_body }} />
  }
  return null
}
