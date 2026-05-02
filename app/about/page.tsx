import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Multi Blog Hub — 멀티 블로그 자동화 플랫폼',
  description: 'AI 글 작성, GSC 자동 색인, AdSense 통합 관리까지 — 1인 운영자를 위한 멀티 블로그 도구',
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <main className="max-w-3xl mx-auto px-6 py-16">
        <header className="mb-10">
          <h1 className="text-4xl font-bold mb-3">Multi Blog Hub</h1>
          <p className="text-lg text-gray-600 leading-relaxed">멀티 블로그 자동화 플랫폼</p>
        </header>

        <section className="space-y-4 leading-relaxed mb-10">
          <p>
            Multi Blog Hub는 여러 블로그를 한 곳에서 운영·관리하는 1인 운영자용 도구입니다.
            AI 기반 글 작성, Google Search Console 자동 색인 요청, AdSense 통합 관리, 키워드 발굴까지
            하나의 대시보드에서 처리합니다.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-bold mb-4">주요 기능</h2>
          <ul className="space-y-2 text-gray-700 list-disc list-inside">
            <li><strong>AI 글 작성</strong> — Claude, OpenAI, Gemini 다중 LLM 지원</li>
            <li><strong>Google Search Console 자동 색인</strong> — 글 발행 시 즉시 색인 요청</li>
            <li><strong>AdSense 통합 광고 배치</strong> — 모든 블로그에 한 번 설정으로 적용</li>
            <li><strong>키워드 자동화 파이프라인</strong> — 네이버 광고 API 기반 SEO 점수 산정</li>
            <li><strong>멀티 블로그 일괄 관리</strong></li>
          </ul>
        </section>

        <section className="mb-10 rounded-lg border border-gray-200 bg-gray-50 p-5">
          <p className="text-sm text-gray-700 leading-relaxed">
            본 서비스는 운영자 본인의 운영을 위한 비공개 도구이며, 일반 가입 신청은 받지 않습니다.
          </p>
        </section>

        <section className="text-sm text-gray-500 space-y-1 border-t border-gray-200 pt-6">
          <p>운영: 학분</p>
          <p>문의: leansha@gmail.com</p>
          <div className="mt-4 flex gap-4 text-blue-600">
            <Link href="/privacy" className="hover:underline">개인정보처리방침</Link>
            <Link href="/terms" className="hover:underline">서비스 약관</Link>
          </div>
        </section>
      </main>
    </div>
  )
}
