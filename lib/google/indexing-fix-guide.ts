/**
 * GSC URL Inspection의 coverageState/verdict별 수정 가이드.
 * 사용자가 거부 사유를 보고 어떤 행동을 해야 할지 안내.
 *
 * 출처:
 *  - https://support.google.com/webmasters/answer/7440203 (인덱싱 보고서)
 *  - https://developers.google.com/search/docs/crawling-indexing/url-inspection
 */

export type IndexingState = 'indexed' | 'pending' | 'not_indexed' | 'unknown'

export interface FixGuide {
  state: IndexingState
  severity: 'info' | 'warning' | 'error'
  reasonShort: string
  reasonDetail: string
  fixAction: string  // 사용자가 즉시 할 수 있는 액션
  canRetry: boolean  // 콘텐츠 수정 없이 재요청만 해도 될지
}

/**
 * coverageState 문자열을 받아 가이드 반환.
 * 매칭 안 되는 경우 일반적인 안내.
 */
export function getFixGuide(
  verdict: string | null,
  coverageState: string | null,
): FixGuide {
  // verdict 우선 분류
  if (verdict === 'PASS' || verdict === 'PARTIAL') {
    return {
      state: 'indexed',
      severity: 'info',
      reasonShort: '색인됨',
      reasonDetail: 'Google이 이 페이지를 색인했고 검색 결과에 노출 가능한 상태입니다.',
      fixAction: '추가 작업 필요 없음',
      canRetry: false,
    }
  }

  if (verdict === 'NEUTRAL') {
    return {
      state: 'pending',
      severity: 'info',
      reasonShort: '검토 중',
      reasonDetail: 'Google이 페이지를 발견했으나 아직 색인 여부를 결정하지 않았습니다. 보통 며칠 내 PASS 또는 FAIL로 바뀝니다.',
      fixAction: '며칠 기다린 후 재검사. 1주일 이상 NEUTRAL 유지 시 콘텐츠 보강 고려.',
      canRetry: true,
    }
  }

  // coverageState 키워드 매칭 (FAIL 또는 미정의 verdict)
  const cs = (coverageState ?? '').toLowerCase()

  if (cs.includes('crawled') && cs.includes('not indexed')) {
    return {
      state: 'not_indexed',
      severity: 'warning',
      reasonShort: '크롤링됨 — 색인 거부',
      reasonDetail: 'Googlebot이 페이지를 다녀갔지만 색인 가치가 없다고 판단했습니다. 가장 흔한 거부 사유로, 보통 콘텐츠 품질·독창성·깊이 부족이 원인입니다.',
      fixAction: '콘텐츠 보강 — 1) 1차 데이터(통계·인용·표) 추가 2) 다른 글과 차별화 포인트 강화 3) 분량 1500자 이상 4) 내부 링크 보강. 수정 후 재요청.',
      canRetry: false,
    }
  }

  if (cs.includes('discovered') && cs.includes('not indexed')) {
    return {
      state: 'not_indexed',
      severity: 'warning',
      reasonShort: '발견됨 — 미크롤링',
      reasonDetail: 'Google이 sitemap에서 URL을 발견했지만 아직 크롤링하지 않았습니다. 사이트 권위도 부족이 주 원인입니다.',
      fixAction: '내부/외부 링크 보강 — 다른 글에서 이 글로 링크 추가, 외부 백링크 확보. 사이트맵 재제출은 효과 미미.',
      canRetry: true,
    }
  }

  if (cs.includes('duplicate') && cs.includes('without user-selected canonical')) {
    return {
      state: 'not_indexed',
      severity: 'warning',
      reasonShort: '중복 콘텐츠 — canonical 미지정',
      reasonDetail: '비슷한 페이지가 여러 개인데 어느 게 원본인지 명시가 안 됐습니다. Google이 자동으로 다른 페이지를 선택해 색인했습니다.',
      fixAction: '1) 정말 중복이면 글 통합 또는 삭제 2) 별개 글이면 콘텐츠 더 차별화 3) <link rel="canonical"> 태그 명시',
      canRetry: false,
    }
  }

  if (cs.includes('duplicate') && cs.includes('google chose different')) {
    return {
      state: 'not_indexed',
      severity: 'warning',
      reasonShort: '중복 — Google이 다른 canonical 선택',
      reasonDetail: '사이트가 지정한 canonical과 Google 판단이 다릅니다. 이 페이지는 색인 안 되고 다른 페이지가 색인됨.',
      fixAction: 'Google이 선택한 페이지가 더 권위 있게 보이는 이유 분석 → 이 페이지의 콘텐츠/링크 보강',
      canRetry: false,
    }
  }

  if (cs.includes('alternate') && cs.includes('canonical')) {
    return {
      state: 'indexed',
      severity: 'info',
      reasonShort: '대체 페이지 (정상)',
      reasonDetail: 'canonical 태그로 다른 페이지를 가리키는 정상 동작. 이 URL이 색인 안 되는 게 의도된 결과입니다.',
      fixAction: '추가 작업 필요 없음. canonical 의도된 게 맞으면 무시.',
      canRetry: false,
    }
  }

  if (cs.includes('soft 404')) {
    return {
      state: 'not_indexed',
      severity: 'error',
      reasonShort: 'Soft 404',
      reasonDetail: 'HTTP 200 응답이지만 콘텐츠가 비어있거나 "찾을 수 없음" 류 메시지가 있어 Google이 404로 판단.',
      fixAction: '콘텐츠가 정상적으로 로드되는지 확인. 페이지가 없는 거면 sitemap에서 제거 또는 글 삭제.',
      canRetry: false,
    }
  }

  if (cs.includes('not found') || cs.includes('404')) {
    return {
      state: 'not_indexed',
      severity: 'error',
      reasonShort: '페이지 찾을 수 없음 (404)',
      reasonDetail: 'URL에 접근 시 404 응답. 페이지가 없거나 접근 불가능한 상태.',
      fixAction: '페이지 복원 또는 글 삭제. sitemap에서 자동 제거됨.',
      canRetry: false,
    }
  }

  if (cs.includes('redirect')) {
    return {
      state: 'not_indexed',
      severity: 'warning',
      reasonShort: '리디렉션 페이지',
      reasonDetail: '이 URL이 다른 곳으로 리디렉션되어 색인 안 됨.',
      fixAction: '리디렉션 의도되었으면 무시. 의도 안 됐으면 redirect 제거.',
      canRetry: false,
    }
  }

  if (cs.includes('noindex')) {
    return {
      state: 'not_indexed',
      severity: 'error',
      reasonShort: 'noindex 태그',
      reasonDetail: 'meta robots 또는 X-Robots-Tag 헤더에 noindex가 있어 색인 차단됨.',
      fixAction: '글 페이지의 <head>에서 noindex 제거. 코드 검토 필요.',
      canRetry: false,
    }
  }

  if (cs.includes('blocked by robots')) {
    return {
      state: 'not_indexed',
      severity: 'error',
      reasonShort: 'robots.txt 차단',
      reasonDetail: 'robots.txt가 이 URL의 크롤링을 차단합니다.',
      fixAction: 'robots.txt 수정 — 이 경로의 Disallow 규칙 제거.',
      canRetry: false,
    }
  }

  if (cs.includes('server error') || cs.includes('5xx')) {
    return {
      state: 'not_indexed',
      severity: 'error',
      reasonShort: '서버 오류 (5xx)',
      reasonDetail: 'Googlebot이 페이지에 접근 시 서버가 5xx 응답. 사이트 가용성 문제.',
      fixAction: '서버 로그 확인, 응답 시간/에러율 점검. 일시적이면 재요청으로 회복 가능.',
      canRetry: true,
    }
  }

  if (cs.includes('blocked due to access forbidden') || cs.includes('403')) {
    return {
      state: 'not_indexed',
      severity: 'error',
      reasonShort: '접근 차단 (403)',
      reasonDetail: 'Googlebot이 페이지 접근 시 403 응답. 인증 필요하거나 IP 차단됨.',
      fixAction: '공개 페이지가 403 반환하지 않도록 점검.',
      canRetry: true,
    }
  }

  // verdict가 FAIL인데 coverageState 매칭 안 되는 경우
  if (verdict === 'FAIL') {
    return {
      state: 'not_indexed',
      severity: 'warning',
      reasonShort: '색인 거부',
      reasonDetail: coverageState ?? 'Google이 색인을 거부했으나 사유가 명시되지 않았습니다.',
      fixAction: '콘텐츠 보강 후 재요청 또는 GSC URL 검사 도구에서 직접 확인.',
      canRetry: false,
    }
  }

  // verdict가 null이거나 알 수 없는 상태
  return {
    state: 'unknown',
    severity: 'info',
    reasonShort: '검사 안 됨',
    reasonDetail: '아직 GSC URL Inspection 검사를 실행하지 않았거나, 검사 중 오류가 발생했습니다.',
    fixAction: '"색인·사이트맵 일괄 적용" 버튼을 눌러 검사를 실행하세요.',
    canRetry: true,
  }
}
