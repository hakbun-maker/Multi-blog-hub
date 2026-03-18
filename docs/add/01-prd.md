# 수익화 로켓 PRD (Product Requirements Document)

> 작성일: 2026-03-15 | 프로젝트: Multi Blog Hub — 수익화 로켓 기능 추가

---

## 1. 제품 개요

| 항목 | 내용 |
|------|------|
| **서비스명** | 수익화 로켓 (Monetization Rocket) |
| **소속** | Multi Blog Hub (`/monetize` 탭 내 4개 서브탭) |
| **핵심 가치** | 자는 동안 키워드를 탐색하고, 글을 쓰고, 검수하고, 발행하는 **98% 완전 자동화 수익 파이프라인** |
| **사용자 유일 개입 지점** | ① 키워드 달력 확인/수정 ② 보류 글 검토 & 재승인 |

---

## 2. 해결하는 문제

| 문제 | 현재 상황 | 수익화 로켓 해결 |
|------|----------|-----------------|
| 키워드 발굴이 너무 많은 시간 소요 | 매일 수동으로 네이버·구글 검색 | 네이버 API + Google KWP + DataLab 자동 수집 |
| 일반 SEO만으로는 AI 시대에 한계 | SEO 중심 글쓰기 | SEO + AEO + GEO + REO 통합 자동 글쓰기 |
| 복수 블로그 배분이 비효율적 | 수동으로 블로그 선택 | Intent × 블로그 등급 × 일일 할당량 기반 자동 배분 |
| 수익 현황 파악이 어려움 | AdSense 대시보드 개별 확인 | 통합 수익 인텔리전스 대시보드 |
| 이벤트/계절성 키워드 놓침 | 우연히 발견 | 외부 API 연동 이벤트 키워드 + ANNUAL_EVENTS 자동 탐색 |

---

## 3. 핵심 기능 (7개)

> 기능 1~3: 수익화 로켓 코어 파이프라인 | 기능 4~7: Neurion 확장 기능 (→ `09-neurion-features-spec.md`)

### 기능 1: 완전 자동 파이프라인 🚀

**파이프라인 흐름:**

```
[새벽 6시 cron 실행]
    ↓
[키워드 탐색 — 3가지 모드]
  ① 일반 골드 키워드: 네이버 광고 API + Google KWP → Revenue Score → S/A/B/C/D
  ② 이벤트 키워드: 인터파크/멜론티켓/네이버뉴스API/Google Trends/스포츠연맹
  ③ 계절성 키워드: DataLab 2년 트렌드 + ANNUAL_EVENTS 캘린더
    ↓
[클러스터링 & Intent 분류]
  씨앗 키워드 → 의도별 클러스터(AD/REVIEW/INFO/CRITIC/COMPARE/TREND)
  → 배분 엔진: 블로그 등급 × 유형 × 일일 제한 × 날짜/시간 배분
    ↓
[키워드 달력 등록 → 사용자 확인/수정/삭제]
    ↓
[발행일 도래 시 AI 글쓰기]
  Intent Directive + PASONA 비중 + 페르소나
  → SEO + AEO + GEO + REO + PASONA 통합 프롬프트
  → 섹션 타겟팅 태그 자동 삽입 (AdSense CPC 최적화)
    ↓
[3단계 검수]
  합계 45점↑ → 자동 발행
  미만 → 사용자 검수 대기열
    ↓
[발행 & 성과 추적 → 피드백 루프]
```

### 기능 2: 키워드 달력 & 검수 인터페이스 🔍

- **키워드 달력**: 월별 캘린더, 블록별 키워드/블로그/Intent/PASS·HOLD 상태
- **검수 대기열**: 보류 글 점수 + 미달 사유 + 재생성/직접수정/삭제

### 기능 3: 수익 인텔리전스 대시보드 💰

- 누적 실제 수익 + 예상 수익 복합 그래프 (골드 컬러)
- 블로그별 / 광고별 / 언어별 / 블로그유형별 수익 분석
- Revenue Score 기반 블로그 등급표 (S/A/B/C/D)
- 로켓 상태 위젯 (ON/OFF + 오늘 현황)

---

### 기능 4: 다국어 블로그 자동 발행 🌐 (Neurion #15)

- 블로그별 설정에서 작성 언어 지정 (한국어/영어/일본어)
- AI가 해당 언어로 직접 원고 작성 (번역 아님)
- 언어별 키워드 탐색 소스 자동 전환 (ko: 네이버 광고 API, en: Google KWP, ja: 야후 재팬/구글 JP)
- 스케줄러에서 언어별 발행 주기 및 최적 발행 시간 자동 적용

**세부 사항:** `09-neurion-features-spec.md § 1. 다국어 블로그 자동 발행`

---

### 기능 5: 수익화 가이드 패널 📊 (Neurion #4)

- 대시보드에 아코디언(슬라이드 다운) 방식으로 접힌 상태로 위치
- 목표 월수익 입력 → 필요 블로그 수 / 페르소나 / 글 유형 / 일일 발행 수 역산 출력
- 98% 자동화 기준 — 가용 시간 입력 불필요
- 결과를 Markdown 파일로 다운로드 가능

**세부 사항:** `09-neurion-features-spec.md § 2. 수익화 가이드 패널`

---

### 기능 6: SNS 자동 배포 📱 (Neurion #10)

- 발행된 글 → Instagram / X(Twitter) / Threads 자동 변환 배포
- 플랫폼별 포맷 프롬프트 직접 입력 가능
- 이미지 생성 토글 (DALL-E 3 / Ideogram / Flux) — 최초 선택 후 수동 변경 전까지 고정
- 지원 플랫폼: Instagram Graph API, Twitter API v2, Threads API (Meta Graph API)

**세부 사항:** `09-neurion-features-spec.md § 3. SNS 자동 배포`

---

### 기능 7: 쿠팡파트너스 자동 삽입 🛍️ (Neurion #13)

- 설정에서 쿠팡파트너스 파트너 ID 등록
- AI 글쓰기 PASONA O(Offer) 섹션에 관련 상품 자동 추천 + 제휴 링크 삽입
- 클릭/전환 추적을 위한 `affiliate_clicks` 로그 기록

**세부 사항:** `09-neurion-features-spec.md § 4. 쿠팡파트너스 자동 삽입`

---

## 4. 사용자 스토리

```
As a 블로그 수익화 운영자,
I want 새벽에 자동으로 키워드가 탐색되고 글이 발행되기를 원한다,
so that 별도 시간 투자 없이 수익이 꾸준히 발생한다.

As a 다중 블로그 운영자,
I want 각 블로그 특성에 맞게 키워드가 자동 배분되기를 원한다,
so that 블로그 주제 일관성이 유지되어 구글 CPC가 높아진다.

As a 수익 최적화 운영자,
I want 블로그별·광고별·언어별 수익 분석 데이터를 원한다,
so that 데이터 기반으로 전략을 조정할 수 있다.
```

---

## 5. 통합 전략 (docs/add 기반)

| 전략 | 적용 위치 | 출처 |
|------|----------|------|
| 키워드 클러스터링 × Intent 분류 | 파이프라인 — 클러스터링 단계 | blog_automation_strategy_v2.md |
| Revenue Score 체계 (S/A/B/C/D) | 키워드 탐색기 + 블로그 등급표 | KEYWORD_STRATEGY.MD |
| PASONA × SEO/AEO/GEO 글쓰기 | 파이프라인 — 글쓰기 단계 | blog_automation_strategy_v2.md + PASONA_STRATEGY.MD |
| 섹션 타겟팅 (AdSense CPC 최적화) | 파이프라인 — 글쓰기 단계 | PASONA_STRATEGY.MD |
| REO (E-E-A-T + GEO 최적화) | 3단계 검수 + 글쓰기 프롬프트 | REO 기반 보고서.md |
| 이벤트 기반 씨앗 키워드 | 키워드 탐색기 — 이벤트 모드 | blog_automation_strategy_v2.md |
| 계절성 키워드 (ANNUAL_EVENTS) | 키워드 탐색기 — 계절성 모드 | KEYWORD_STRATEGY.MD |
| 복수 블로그 배치 전략 | 배분 엔진 | blog_automation_strategy_v2.md |
| 다국어 발행 (언어별 데이터소스 매핑) | 기능 4 — 다국어 블로그 자동 발행 | 09-neurion-features-spec.md §1 |
| 수익화 역산 가이드 (목표 → 전략 출력) | 기능 5 — 수익화 가이드 패널 | 09-neurion-features-spec.md §2 |
| SNS 포맷 자동 변환 (플랫폼별 프롬프트) | 기능 6 — SNS 자동 배포 | 09-neurion-features-spec.md §3 |
| 쿠팡파트너스 PASONA O섹션 자동 삽입 | 기능 7 — 쿠팡파트너스 자동 삽입 | 09-neurion-features-spec.md §4 |

---

## 5-1. 플랜별 기능 접근 권한 (구현 완료)

> 상세: `docs/add/11-price.md` — 5단계 요금제 기능 매트릭스 참조

| 기능 | Lite | Basic | Pro | Growth | Scale |
|------|:----:|:-----:|:---:|:------:|:-----:|
| 일반 글쓰기 | 월20건 | 무제한 | 무제한 | 무제한 | 무제한 |
| 에디터 전체 | ✗ | ✓ | ✓ | ✓ | ✓ |
| 키워드탐색기 | ✗ | ✗ | ✓ | ✓ | ✓ |
| 스케줄러 | ✗ | ✗ | ✓ | ✓ | ✓ |
| 수익 대시보드 | ✗ | ✗ | 열람 | ✓ | ✓ |
| 자동 글쓰기 파이프라인 | ✗ | ✗ | ✗ | ✓ | ✓ |
| SNS 자동배포 | ✗ | ✗ | ✗ | ✓ | ✓ |
| 쿠팡파트너스 | ✗ | ✗ | ✗ | ✓ | ✓ |
| 다국어 | ✗ | ✗ | ✗ | ✓ | ✓ |

---

## 6. MVP 범위

| Phase | 기능 |
|-------|------|
| MVP Phase 0 | **요금제(Plan Tier) 시스템** — DB + 설정 UI + 기능 잠금 + 업셀 (구현 완료) |
| MVP Phase 1 | 완전 자동 파이프라인 (백엔드 엔진) + 키워드 달력 |
| MVP Phase 2 | 검수 인터페이스 + 수익 대시보드 |
| MVP Phase 3 | 다국어 블로그 자동 발행 (기능 4) + 수익화 가이드 패널 (기능 5) |
| MVP Phase 4 | SNS 자동 배포 (기능 6) + 쿠팡파트너스 자동 삽입 (기능 7) |
| MVP Phase 5 | 피드백 루프 자동화 + A/B 글 테스트 |

**필수 외부 API**: 네이버 광고 API, Google Ads API (KWP), 네이버 DataLab API
**선택 외부 API**: 인터파크/멜론티켓 RSS, Google Trends API, 각 스포츠연맹 크롤링

**Neurion 확장 API** (Phase 3~4):
- Instagram Graph API (SNS 발행)
- Twitter API v2 (X 발행)
- Threads API / Meta Graph API (Threads 발행)
- DALL-E 3 / Ideogram / Flux (이미지 생성, 선택)
- 쿠팡파트너스 API (제휴 링크 생성)
