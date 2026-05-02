import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'

export const metadata: Metadata = {
  title: '서비스 이용약관 — Multi Blog Hub',
  description: 'Multi Blog Hub 서비스 이용약관',
}

const SECTION_HEADING = 'text-lg font-bold mt-8 mb-3 text-gray-900'
const PARAGRAPH = 'text-sm text-gray-700 leading-relaxed mb-3'
const LIST = 'text-sm text-gray-700 leading-relaxed mb-3 ml-4 list-disc space-y-1'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <main className="max-w-3xl mx-auto px-6 py-16">
        <Link href="/about" className="inline-block mb-6">
          <Image src="/logo.svg" alt="Multi Blog Hub" width={620} height={90} className="h-9 w-auto" priority />
        </Link>
        <header className="mb-8 border-b border-gray-200 pb-6">
          <h1 className="text-3xl font-bold mb-3">서비스 이용약관</h1>
          <p className="text-sm text-gray-500">시행일: 2026년 5월 1일</p>
        </header>

        <p className={PARAGRAPH}>
          본 약관은 학분(이하 &quot;운영자&quot;)이 제공하는 Multi Blog Hub(이하 &quot;서비스&quot;) 이용에 관한 사항을 정합니다.
        </p>

        <h2 className={SECTION_HEADING}>제1조 (목적)</h2>
        <p className={PARAGRAPH}>
          본 약관은 운영자와 이용자 간의 서비스 이용 조건, 권리·의무, 책임 사항을 규정함을 목적으로 합니다.
        </p>

        <h2 className={SECTION_HEADING}>제2조 (정의)</h2>
        <ul className={LIST}>
          <li>&quot;서비스&quot;: Multi Blog Hub 웹 애플리케이션 및 관련 모든 부수 기능</li>
          <li>&quot;이용자&quot;: 본 약관에 동의하고 서비스를 이용하는 자</li>
          <li>&quot;콘텐츠&quot;: 이용자가 서비스 내에서 작성·발행하는 모든 텍스트·이미지·메타데이터</li>
        </ul>

        <h2 className={SECTION_HEADING}>제3조 (약관의 게시 및 개정)</h2>
        <ul className={LIST}>
          <li>본 약관은 서비스 첫 화면 또는 별도의 연결 화면을 통해 게시합니다.</li>
          <li>운영자는 필요 시 약관을 개정할 수 있으며, 중요한 변경의 경우 시행일 7일 전 공지합니다.</li>
          <li>이용자가 변경된 약관 시행 후에도 서비스를 계속 이용하면 변경에 동의한 것으로 봅니다.</li>
        </ul>

        <h2 className={SECTION_HEADING}>제4조 (이용 계약의 성립)</h2>
        <ul className={LIST}>
          <li>이용 계약은 이용자가 본 약관에 동의하고 회원가입 절차를 완료한 시점에 성립합니다.</li>
          <li>운영자는 다음 경우 가입을 거부하거나 사후 해지할 수 있습니다.
            <ul className="ml-5 mt-1 space-y-1">
              <li>- 타인의 정보를 도용한 경우</li>
              <li>- 허위 정보를 제공한 경우</li>
              <li>- 서비스의 기술적 운영을 방해한 이력이 있는 경우</li>
            </ul>
          </li>
        </ul>

        <h2 className={SECTION_HEADING}>제5조 (서비스의 제공 및 변경)</h2>
        <p className={PARAGRAPH}>운영자는 다음 서비스를 제공합니다.</p>
        <ul className={LIST}>
          <li>AI 기반 블로그 글 자동 작성</li>
          <li>멀티 블로그 통합 관리</li>
          <li>Google Search Console 자동 색인 요청</li>
          <li>AdSense 광고 코드 통합 관리</li>
          <li>키워드 자동화 파이프라인</li>
          <li>발행 통계 및 대시보드</li>
        </ul>
        <p className={PARAGRAPH}>
          서비스는 운영상 또는 기술상 필요에 따라 변경·중단될 수 있으며, 이 경우 사전 공지합니다.
        </p>

        <h2 className={SECTION_HEADING}>제6조 (이용자의 의무)</h2>
        <p className={PARAGRAPH}>이용자는 다음 행위를 해서는 안 됩니다.</p>
        <ul className={LIST}>
          <li>타인의 명의·정보를 도용하는 행위</li>
          <li>운영자가 정한 한도를 초과해 서비스 자원을 사용하는 행위</li>
          <li>자동화 도구·봇을 통한 비정상적 접근</li>
          <li>서비스의 안정성을 해치는 행위</li>
          <li>관련 법령 또는 본 약관을 위반하는 행위</li>
          <li>타인의 저작권을 침해하는 콘텐츠를 발행하는 행위</li>
        </ul>

        <h2 className={SECTION_HEADING}>제7조 (콘텐츠의 권리 및 책임)</h2>
        <ul className={LIST}>
          <li>이용자가 작성·발행한 모든 콘텐츠의 저작권은 이용자 본인에게 귀속됩니다.</li>
          <li>콘텐츠로 인한 법적 책임(저작권, 명예훼손, 허위 정보 등)은 작성자 본인이 부담합니다.</li>
          <li>운영자는 서비스 운영 및 홍보 목적으로 콘텐츠의 일부를 무상으로 사용할 수 있으며,
            이용자가 원하지 않을 경우 즉시 사용을 중지합니다.</li>
        </ul>

        <h2 className={SECTION_HEADING}>제8조 (제3자 서비스 연동에 관한 사항)</h2>
        <ul className={LIST}>
          <li>본 서비스는 Google OAuth, AdSense, Search Console, Indexing API,
            Anthropic Claude, OpenAI, Google Gemini 등 외부 API와 연동됩니다.</li>
          <li>외부 서비스의 정책 변경·장애·중단으로 인한 서비스 일시 제한에 대해
            운영자는 직접적인 책임을 지지 않으며, 신속한 복구를 위해 노력합니다.</li>
          <li>외부 서비스의 사용으로 발생하는 별도의 비용(예: AI API 사용료, AdSense 정산 등)은
            이용자 본인이 부담합니다.</li>
        </ul>

        <h2 className={SECTION_HEADING}>제9조 (서비스 이용 제한)</h2>
        <p className={PARAGRAPH}>운영자는 다음 사유 발생 시 사전 통지 없이 서비스 이용을 제한할 수 있습니다.</p>
        <ul className={LIST}>
          <li>본 약관의 의무를 위반한 경우</li>
          <li>서비스의 정상 운영을 방해한 경우</li>
          <li>관련 법령을 위반한 경우</li>
        </ul>

        <h2 className={SECTION_HEADING}>제10조 (계약 해지 및 회원 탈퇴)</h2>
        <ul className={LIST}>
          <li>이용자는 언제든지 서비스 내 [설정] 메뉴 또는 leansha@gmail.com 을 통해 탈퇴할 수 있습니다.</li>
          <li>탈퇴 시 회원 정보 및 발행 콘텐츠는 본 약관 및 개인정보처리방침에 따라 처리됩니다.</li>
        </ul>

        <h2 className={SECTION_HEADING}>제11조 (면책)</h2>
        <ul className={LIST}>
          <li>운영자는 천재지변, 통신망 장애, 외부 서비스 정책 변경 등 운영자의 통제를 벗어난 사유로 인한 서비스 중단에 대해 책임을 지지 않습니다.</li>
          <li>AI가 생성한 콘텐츠의 정확성·신뢰성에 대해 운영자는 보증하지 않으며, 최종 검수 책임은 이용자에게 있습니다.</li>
          <li>광고 수익은 AdSense 등 외부 광고 서비스의 정책에 따르며, 운영자는 수익을 보장하지 않습니다.</li>
        </ul>

        <h2 className={SECTION_HEADING}>제12조 (분쟁 해결 및 준거법)</h2>
        <ul className={LIST}>
          <li>본 약관의 해석 및 분쟁 해결은 대한민국 법령에 따릅니다.</li>
          <li>분쟁이 발생할 경우 운영자와 이용자는 성실한 협의를 통해 해결하며,
            협의가 이루어지지 않을 때에는 관할 법원의 판결에 따릅니다.</li>
        </ul>

        <h2 className={SECTION_HEADING}>부칙</h2>
        <p className={PARAGRAPH}>본 약관은 2026년 5월 1일부터 시행합니다.</p>
        <ul className={LIST}>
          <li>운영자: 학분</li>
          <li>연락처: leansha@gmail.com</li>
        </ul>

        <footer className="mt-12 pt-6 border-t border-gray-200 flex gap-4 text-sm text-blue-600">
          <Link href="/about" className="hover:underline">홈</Link>
          <Link href="/privacy" className="hover:underline">개인정보처리방침</Link>
        </footer>
      </main>
    </div>
  )
}
