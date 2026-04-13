/**
 * 에이전트 공통 유틸 — 중복 코드 제거
 */
import type { IntentType } from '@/types/monetize'

/** 경쟁도 문자열 → 숫자 변환 (모든 에이전트 공통) */
export function competitionToNum(compIdx: string): number {
  return compIdx === '높음' ? 80 : compIdx === '낮음' ? 20 : 50
}

/** 이벤트 카테고리 추론 (Event Discovery + Planner 공통) */
export function inferEventCategory(title: string): string {
  if (/콘서트|공연|뮤지컬|팬미팅|가수|아이돌/.test(title)) return 'concert'
  if (/야구|축구|농구|KBO|K리그|경기/.test(title)) return 'sports'
  if (/축제|페스티벌|코첼라/.test(title)) return 'festival'
  if (/전시|박람회|미술/.test(title)) return 'exhibition'
  return 'other'
}

/** 이벤트 D-Day 단계 설정 (Event Discovery + Planner 공통) */
export const EVENT_PHASES: Record<string, { dDayOffset: number; intentType: IntentType; suffix: string }[]> = {
  concert: [
    { dDayOffset: -30, intentType: 'INFO', suffix: '정보총정리' },
    { dDayOffset: -14, intentType: 'COMPARE', suffix: '좌석추천가격비교' },
    { dDayOffset: -7, intentType: 'AD', suffix: '준비물주변맛집' },
    { dDayOffset: 1, intentType: 'REVIEW', suffix: '후기현장리뷰' },
  ],
  sports: [
    { dDayOffset: -7, intentType: 'INFO', suffix: '경기일정정보' },
    { dDayOffset: -1, intentType: 'COMPARE', suffix: '승부예측분석' },
    { dDayOffset: 1, intentType: 'REVIEW', suffix: '경기결과하이라이트' },
  ],
  festival: [
    { dDayOffset: -21, intentType: 'INFO', suffix: '일정프로그램안내' },
    { dDayOffset: -7, intentType: 'AD', suffix: '입장권교통편준비' },
    { dDayOffset: 1, intentType: 'REVIEW', suffix: '축제후기현장' },
  ],
  exhibition: [
    { dDayOffset: -14, intentType: 'INFO', suffix: '전시정보관람포인트' },
    { dDayOffset: -3, intentType: 'AD', suffix: '티켓예매할인' },
    { dDayOffset: 1, intentType: 'REVIEW', suffix: '관람후기' },
  ],
  other: [
    { dDayOffset: -7, intentType: 'INFO', suffix: '정보' },
    { dDayOffset: 1, intentType: 'REVIEW', suffix: '후기' },
  ],
}
