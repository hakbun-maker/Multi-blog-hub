import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'

export const metadata: Metadata = {
  title: '개인정보처리방침 — Multi Blog Hub',
  description: 'Multi Blog Hub 개인정보처리방침',
}

const SECTION_HEADING = 'text-lg font-bold mt-8 mb-3 text-gray-900'
const PARAGRAPH = 'text-sm text-gray-700 leading-relaxed mb-3'
const LIST = 'text-sm text-gray-700 leading-relaxed mb-3 ml-4 list-disc space-y-1'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <main className="max-w-3xl mx-auto px-6 py-16">
        <Link href="/about" className="inline-block mb-6">
          <Image src="/logo.svg" alt="Multi Blog Hub" width={620} height={90} className="h-9 w-auto" priority />
        </Link>
        <header className="mb-8 border-b border-gray-200 pb-6">
          <h1 className="text-3xl font-bold mb-3">개인정보처리방침</h1>
          <p className="text-sm text-gray-500">시행일: 2026년 5월 1일</p>
        </header>

        <p className={PARAGRAPH}>
          학분(이하 &quot;운영자&quot;)은 Multi Blog Hub(이하 &quot;서비스&quot;) 이용자의 개인정보를 중요시하며,
          개인정보보호법 등 관련 법령을 준수하기 위해 다음과 같이 개인정보처리방침을 수립·공개합니다.
        </p>

        <h2 className={SECTION_HEADING}>제1조 (수집하는 개인정보의 항목 및 수집 방법)</h2>
        <p className={PARAGRAPH}>운영자는 서비스 제공을 위해 다음 정보를 수집합니다.</p>
        <p className="text-sm font-semibold text-gray-800 mb-1 mt-3">1. 회원가입 및 본인 인증 시</p>
        <ul className={LIST}>
          <li>이메일 주소</li>
          <li>표시 이름(닉네임)</li>
          <li>국가, 휴대전화 번호 (선택)</li>
        </ul>
        <p className="text-sm font-semibold text-gray-800 mb-1 mt-3">2. Google 계정 연동 시 (OAuth)</p>
        <ul className={LIST}>
          <li>연동 Google 계정 이메일</li>
          <li>Google OAuth 액세스 토큰 및 리프레시 토큰 (암호화 저장)</li>
          <li>Google Search Console 권한 범위(Scope) 정보</li>
        </ul>
        <p className="text-sm font-semibold text-gray-800 mb-1 mt-3">3. 제3자 AI API 키 입력 시</p>
        <ul className={LIST}>
          <li>Anthropic Claude / OpenAI / Google Gemini API 키 (암호화 저장)</li>
          <li>본 키는 운영자 본인의 사용량 과금에만 사용됩니다.</li>
        </ul>
        <p className="text-sm font-semibold text-gray-800 mb-1 mt-3">4. 서비스 이용 과정에서 자동 수집</p>
        <ul className={LIST}>
          <li>발행한 블로그 글의 제목·본문·태그·메타데이터</li>
          <li>키워드 분석 데이터, 발행 일시, 접속 기기·브라우저 정보</li>
          <li>광고 노출 및 클릭 통계(AdSense 연동 시)</li>
        </ul>

        <h2 className={SECTION_HEADING}>제2조 (개인정보의 처리 목적)</h2>
        <p className={PARAGRAPH}>운영자는 수집한 개인정보를 다음 목적에만 사용합니다.</p>
        <ul className={LIST}>
          <li>회원 식별 및 본인 확인</li>
          <li>Google Search Console 자동 색인 요청 (Indexing API 호출)</li>
          <li>Google Search Console 사이트 등록·검증·사이트맵 제출</li>
          <li>AdSense 광고 코드 및 슬롯 ID의 사용자 단위 통합 관리</li>
          <li>AI를 통한 블로그 글 자동 생성</li>
          <li>발행 글의 통계 분석 및 대시보드 표시</li>
          <li>부정 이용 방지 및 시스템 안정 운영</li>
        </ul>

        <h2 className={SECTION_HEADING}>제3조 (개인정보의 보유 및 이용 기간)</h2>
        <p className={PARAGRAPH}>
          원칙적으로 개인정보 수집·이용 목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다.
          다만, 다음 사유에 해당하는 경우 명시한 기간 동안 보관합니다.
        </p>
        <ul className={LIST}>
          <li>회원 정보: 회원 탈퇴 시까지</li>
          <li>OAuth 토큰: 사용자가 연결을 해제하거나 탈퇴할 때까지</li>
          <li>발행 글: 사용자가 직접 삭제하거나 탈퇴할 때까지</li>
          <li>관련 법령에 의한 보관 의무가 있는 경우 해당 기간</li>
        </ul>

        <h2 className={SECTION_HEADING}>제4조 (개인정보의 제3자 제공)</h2>
        <p className={PARAGRAPH}>
          운영자는 이용자의 개인정보를 외부에 제공하지 않습니다. 다만, 서비스 제공을 위해 아래 외부 서비스에
          필요한 데이터가 전송됩니다.
        </p>
        <ul className={LIST}>
          <li><strong>Google LLC</strong>: OAuth 인증, Search Console API, Indexing API → 전송 항목: OAuth 토큰, 사이트 URL, 발행 글 URL</li>
          <li><strong>Anthropic, OpenAI, Google AI</strong>: AI 글 작성 API → 전송 항목: 사용자가 입력한 키워드 및 글 작성 컨텍스트</li>
          <li><strong>Supabase Inc.</strong>: 데이터베이스·인증 인프라</li>
          <li><strong>Vercel Inc.</strong>: 애플리케이션 호스팅</li>
        </ul>
        <p className={PARAGRAPH}>위 외부 서비스는 각자의 개인정보처리방침 및 약관에 따라 데이터를 처리합니다.</p>

        <h2 className={SECTION_HEADING}>제5조 (개인정보 처리의 위탁)</h2>
        <p className={PARAGRAPH}>운영자는 데이터 저장 및 처리를 위해 아래 업체에 일부 업무를 위탁합니다.</p>
        <ul className={LIST}>
          <li>Supabase Inc.: 회원 인증, 데이터베이스 관리</li>
          <li>Vercel Inc.: 애플리케이션 서버 호스팅</li>
          <li>Google LLC: Indexing API, Search Console API 호출 처리</li>
        </ul>

        <h2 className={SECTION_HEADING}>제6조 (이용자 및 법정대리인의 권리·의무 및 그 행사 방법)</h2>
        <p className={PARAGRAPH}>이용자는 언제든지 다음 권리를 행사할 수 있습니다.</p>
        <ul className={LIST}>
          <li>개인정보 열람·정정·삭제 요청</li>
          <li>처리 정지 및 동의 철회</li>
          <li>외부 서비스(Google 등) 연결 해제</li>
        </ul>
        <p className={PARAGRAPH}>
          권리 행사는 서비스 내 [설정] 메뉴를 통하거나 leansha@gmail.com 으로 요청 가능하며,
          운영자는 정당한 사유가 없는 한 지체 없이 처리합니다.
        </p>

        <h2 className={SECTION_HEADING}>제7조 (개인정보의 안전성 확보 조치)</h2>
        <p className={PARAGRAPH}>운영자는 개인정보 보호를 위해 다음 조치를 적용합니다.</p>
        <ul className={LIST}>
          <li>OAuth 토큰 및 AI API 키 AES-256-GCM 암호화 저장</li>
          <li>HTTPS 전송 구간 암호화</li>
          <li>Supabase Row Level Security (RLS)로 사용자별 데이터 격리</li>
          <li>정기 보안 점검 및 의존성 업데이트</li>
        </ul>

        <h2 className={SECTION_HEADING}>제8조 (개인정보 보호책임자)</h2>
        <ul className={LIST}>
          <li>책임자: 학분</li>
          <li>연락처: leansha@gmail.com</li>
        </ul>
        <p className={PARAGRAPH}>본 방침은 변경될 수 있으며, 변경 시 본 페이지를 통해 공지합니다.</p>

        <footer className="mt-12 pt-6 border-t border-gray-200 flex gap-4 text-sm text-blue-600">
          <Link href="/about" className="hover:underline">홈</Link>
          <Link href="/terms" className="hover:underline">서비스 약관</Link>
        </footer>
      </main>
    </div>
  )
}
