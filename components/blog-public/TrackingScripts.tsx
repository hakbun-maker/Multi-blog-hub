'use client'

import Script from 'next/script'

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
  const pubId = adsensePubId || tracking.adsense_pub_id
  const normalizedPubId = pubId ? (pubId.startsWith('ca-pub-') ? pubId : `ca-${pubId}`) : null

  return (
    <>
      {/* GA4 */}
      {tracking.ga4_id && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${tracking.ga4_id}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${tracking.ga4_id}');`}
          </Script>
        </>
      )}

      {/* Naver verification (meta tag - rendered in head via metadata, this is fallback) */}
      {tracking.naver_code && (
        <Script id="naver-verify" strategy="afterInteractive">
          {`(function(){var m=document.createElement('meta');m.name='naver-site-verification';m.content='${tracking.naver_code}';document.head.appendChild(m);})();`}
        </Script>
      )}

      {/* Kakao Pixel */}
      {tracking.kakao_pixel && (
        <Script id="kakao-pixel" strategy="lazyOnload">
          {`!function(e,t){if(!e.kakaoPixel){var n=function(){n.q.push(arguments)};n.q=[],e.kakaoPixel=n;var a=t.createElement("script");a.async=1,a.src="//t1.daumcdn.net/kas/static/kp.js";var i=t.getElementsByTagName("script")[0];i.parentNode.insertBefore(a,i)}}(window,document);kakaoPixel('${tracking.kakao_pixel}');kakaoPixel('${tracking.kakao_pixel}').pageView();`}
        </Script>
      )}

      {/* AdSense */}
      {normalizedPubId && (
        <Script
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${normalizedPubId}`}
          strategy="lazyOnload"
          crossOrigin="anonymous"
        />
      )}

      {/* Custom head scripts */}
      {tracking.custom_head && (
        <Script id="custom-head" strategy="afterInteractive">
          {`(function(){var d=document.createElement('div');d.innerHTML=${JSON.stringify(tracking.custom_head)};Array.from(d.children).forEach(function(c){document.head.appendChild(c);});})();`}
        </Script>
      )}

      {/* Custom body */}
      {tracking.custom_body && (
        <div dangerouslySetInnerHTML={{ __html: tracking.custom_body }} />
      )}
    </>
  )
}
