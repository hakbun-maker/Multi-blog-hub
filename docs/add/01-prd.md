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
| 일반 SEO만으로는 AI 시대에 한계 | SEO 중심 글쓰기 | 4-Layer 전략(PASONA×Intent + SEO+AEO/GEO + 문맥광고 + REO) 자동 글쓰기 |
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
  → 배분 엔진: BlogGrade × KeywordGrade(1차) + Intent × BlogGrade 적합도(2차) + 쿼터 + 날짜/시간 배분
    ↓
[키워드 달력 등록 → 사용자 확인/수정/삭제]
    ↓
[발행일 도래 시 AI 글쓰기]
  4-Layer 전략 적용:
  → L1: PASONA × Intent (글의 뼈대)
  → L2: SEO + AEO/GEO (발견 최적화 + FAQ 아코디언 + JSON-LD Schema)
  → L3: 문맥광고 (광고 섹션 태그 자동 삽입, AdSense CPC 최적화)
    ↓
[품질 검수 — 키워드 유형별 분기]
  골드/시즌 → 검수 A (발견17 + 설득18 + 수익15 = 50점)
  이벤트 → 검수 B (이벤트 고유35 + 공통 기술15 = 50점)
  합계 45점↑ → 자동 발행 / 미만 → 사용자 검수 대기열
    ↓
[발행 & 성과 추적 → 피드백 루프]
```

### 기능 2: 키워드 달력 & 검수 인터페이스 🔍

- **키워드 달력**: 월별 캘린더, 블록별 키워드/블로그/Intent/PASS·HOLD 상태
- **검수 대기열**: 보류 글 점수 + 미달 사유 + 재생성/직접수정/삭제

### 기능 3: 수익 인텔리전스 대시보드 💰

- 누적 실제 수익 + 예상 수익 복합 그래프 (골드 컬러)
- 블로그별 / 광고별 / 언어별 / 블로그유형별 수익 분석
- Revenue Score + REO(E-E-A-T) 기반 블로그 등급표 (S/A/B/C/D) — REO는 블로그 단위 장기 신뢰
- 로켓 상태 위젯 (ON/OFF + 오늘 현황)

---

### 기능 1-1: 배분 엔진 — Intent × BlogGrade 매칭 로직 ★

> 상세: `08-strategy-engine-spec.md` 엔진 1, `PRD.md` 4-3 참조

#### Intent Priority Score (IPS)

같은 KeywordGrade라도 Intent에 따라 CPC 잠재력이 다르므로, 배분 우선순위에 Intent 가중치를 적용한다.

| Intent | IPS | CPC 잠재력 | 적합 블로그 등급 |
|--------|-----|-----------|----------------|
| AD | 1.0 | 매우 높음 (구매 직전) | S > A |
| COMPARE | 0.9 | 매우 높음 (비교 후 구매) | S > A |
| REVIEW | 0.7 | 높음 (구매 판단 참고) | A > S |
| CRITIC | 0.5 | 중간 (신중한 탐색) | A > B |
| INFO | 0.4 | 중간, 트래픽 높음 | B > A |
| TREND | 0.2 | 낮음, 트래픽용 | B > NEW |

배분 우선순위 = KeywordGrade 순위 × IPS
→ S급+AD(1.0)가 S급+TREND(0.2)보다 먼저 S급 블로그 쿼터를 선점

#### Intent × BlogGrade 적합도 매트릭스

KeywordGrade 매트릭스(1차) 통과 후, Intent 적합도(2차)로 재정렬 + 부적합 제거:

```
          S급 블로그    A급 블로그    B급 블로그    NEW 블로그
AD        ★★★ 최적    ★★ 양호      ★ 가능       ✗ 부적합
COMPARE   ★★★ 최적    ★★ 양호      ★ 가능       ✗ 부적합
REVIEW    ★★ 양호     ★★★ 최적     ★ 가능       ✗ 부적합
CRITIC    ★ 가능      ★★★ 최적     ★★ 양호      ✗ 부적합
INFO      ★ 가능      ★★ 양호      ★★★ 최적     ★ 가능
TREND     ✗ 부적합    ★ 가능       ★★★ 최적     ★★ 양호
```

핵심 제약:
- **S급 블로그에 TREND 배정 금지**: 저CPC 콘텐츠가 카테고리 일관성(consistency_pct)을 훼손
- **NEW 블로그에 AD/COMPARE/REVIEW/CRITIC 배정 금지**: 신뢰도 부족으로 전환율 낮음
- **AD/COMPARE는 S급 우선**: 구매 의도 키워드는 고CPC 광고가 안정 배정된 블로그에서 극대화
- **INFO/TREND는 B/NEW급 최적**: 트래픽 유입형 콘텐츠로 하위 등급 블로그의 session_score 성장 가속

#### Intent × BlogGrade 프롬프트 전략 (24종)

배분 후 AI 글쓰기 시, Intent와 BlogGrade를 교차한 프롬프트 전략을 적용:

```
S급+AD:      전문가 추천 톤, adKeywords 고밀도, 가격 비교표, CTA 강력
S급+COMPARE: 데이터 중심 비교, 표/차트, 중립+결론 명확
A급+REVIEW:  균형 잡힌 리뷰, 일상 경험 중심, 공감 강화
A급+CRITIC:  우려 정리, 주의점 나열, 대안 간략 제시
B급+INFO:    쉬운 설명, 초보자 가이드, 검색량 높은 기본 정보
B급+TREND:   트렌드 요약, 시의성 강조, 빠른 발행 우선
NEW+INFO:    가장 기초적 설명, 검색 유입 극대화, 실적 씨앗
NEW+TREND:   최신 트렌드 요약, 낮은 경쟁 롱테일 타겟
```

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

| 전략 (Layer) | 적용 위치 | 출처 |
|------|----------|------|
| **L1** PASONA × Intent 가중치 | 파이프라인 — 글쓰기 골격 | 08-strategy-engine-spec.md §전략3 |
| **L2** SEO (온페이지 최적화) | 파이프라인 — 프롬프트 + 후처리 | 08-strategy-engine-spec.md §전략4 |
| **L2** AEO/GEO (AI 검색 최적화) | 파이프라인 — FAQ 아코디언 + JSON-LD Schema | 08-strategy-engine-spec.md §전략5 |
| **L3** 문맥광고 (섹션 타겟팅) | 파이프라인 — 후처리 광고 태그 삽입 | 08-strategy-engine-spec.md §글 구조 표준 |
| **L4** REO (E-E-A-T 브랜드 신뢰) | 블로그 등급 평가 (월 1회, 글별 X) | 08-strategy-engine-spec.md §전략6 |
| 키워드 클러스터링 × Intent 분류 | 파이프라인 — 클러스터링 단계 | 08-strategy-engine-spec.md §전략2 |
| Revenue Score 체계 (S/A/B/C/D) | 키워드 탐색기 + 블로그 등급표 | 08-strategy-engine-spec.md §전략1 |
| 이벤트 기반 씨앗 키워드 | 키워드 탐색기 — 이벤트 모드 | 08-strategy-engine-spec.md §엔진3 |
| 계절성 키워드 (ANNUAL_EVENTS) | 키워드 탐색기 — 계절성 모드 | 08-strategy-engine-spec.md §엔진3 |
| 복수 블로그 배치 전략 | 배분 엔진 | 08-strategy-engine-spec.md §엔진1 |
| **Intent × BlogGrade 적합도 배분** | **배분 엔진 — 2차 필터** | **08-strategy-engine-spec.md §엔진1 (IPS + 적합도 매트릭스)** |
| **Intent × BlogGrade 프롬프트 매트릭스** | **AI 글쓰기 — 24종 전략** | **PRD.md 4-5 / 01-prd.md 기능 1-1** |
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

**플랫폼 제공 API** (무료, `.env.local`):
- Meta Developer App — Instagram Graph + Threads API (OAuth App)
- X Developer App — Twitter API v2 (OAuth App, Free 플랜)

**블로거 제공 API** (사용자 발급, `blog_settings` DB 저장):
- AI 글쓰기: Claude / GPT-4o / Gemini (택1, 사용자 API 키)
- 키워드 탐색: 네이버 광고 API, Google Ads API (KWP), 네이버 DataLab API
- 이미지 생성: Google Imagen 3 (사용자 API 키)
- 수익화: 쿠팡파트너스 ID, Amazon Associates ID

**선택 외부 API**: 인터파크/멜론티켓 RSS, Google Trends API, 각 스포츠연맹 크롤링

---

## 7. 동의서 및 법적 고지 체계

> 상세: `docs/동의서/00-동의서-수집구조-가이드.md` 참조

### 계층형 동의 (Layered Consent) 구조

사용자 이탈 방지와 법적 안전성을 위해, 기능 최초 사용 시점에 필요한 동의만 수집합니다.

| 수집 시점 | 동의서 | consent_type | UI 방식 |
|----------|--------|-------------|---------|
| **회원가입** | 서비스 이용약관 | `tos` | 체크박스 (필수) |
| **회원가입** | 개인정보 처리방침 | `privacy` | 체크박스 (필수) |
| **API 키 최초 등록** | API 키 위탁 보관 동의 | `api_key_storage` | 인라인 패널 |
| **수익화 로켓 활성화** | 자동화 처리 동의 | `automation` | 전체 화면 모달 |
| **SNS 연결** | SNS 연동 동의 (플랫폼별) | `sns_oauth_{platform}` | OAuth 직전 모달 |
| **제휴마케팅 설정** | 제휴마케팅 고지 및 동의 | `affiliate_marketing` | 인라인 패널 |
| **AdSense 연결** | AdSense 데이터 연동 동의 | `adsense_oauth` | OAuth 직전 모달 |
| **블로그 플랫폼 연결** | 블로그 플랫폼 연동 동의 | `blog_platform_{platform}` | OAuth 직전 모달 |

### 동의 이력 관리

- DB: `user_consents` 테이블 (user_id, consent_type, consent_version, agreed_at, ip_address, method)
- 약관 개정 시: 다음 로그인에서 변경 내용 요약 + 재동의 모달
- 동의 철회 시: 관련 기능 자동 중단 + 데이터 삭제 (연쇄 처리)
- 보관: 동의 이력 3년 보관 (전자상거래법)
