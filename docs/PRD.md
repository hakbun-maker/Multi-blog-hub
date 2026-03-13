# PRD — 멀티 블로그 수익화 자동화 플랫폼
**Product Requirements Document v1.0**

---

## 문서 정보

| 항목 | 내용 |
|------|------|
| 제품명 | 멀티 블로그 수익화 자동화 플랫폼 (Multi-Blog Revenue Platform) |
| 버전 | v1.0 |
| 상태 | 기획 확정 |
| 핵심 공식 | **수익 = 트래픽 × CPC × CTR** |
| 기반 전략 | KEYWORD_STRATEGY.MD + PASONA_STRATEGY.MD |

---

## 목차

1. [제품 개요](#1-제품-개요)
2. [사용자 및 목표](#2-사용자-및-목표)
3. [시스템 아키텍처](#3-시스템-아키텍처)
4. [기능 명세 — 모듈별](#4-기능-명세--모듈별)
   - 4-1. 블로그 네트워크 관리
   - 4-2. 키워드 전략 엔진
   - 4-3. 콘텐츠 캘린더
   - 4-4. AI 콘텐츠 생성기
   - 4-5. 에디터
   - 4-6. 발행 파이프라인
   - 4-7. 수익 추적 & 피드백 루프
   - 4-8. 대시보드
5. [데이터 모델 (DB 스키마)](#5-데이터-모델-db-스키마)
6. [외부 API 연동](#6-외부-api-연동)
7. [내부 API 라우트](#7-내부-api-라우트)
8. [비기능 요구사항](#8-비기능-요구사항)
9. [개발 로드맵 (Phase)](#9-개발-로드맵-phase)
10. [용어 정의](#10-용어-정의)

---

## 1. 제품 개요

### 1-1. 한 줄 요약
> 복수의 주제별 블로그를 운영하면서, 키워드 발굴부터 AI 글 생성·발행·성과 추적까지 전 과정을 자동화하여 Google AdSense 수익을 극대화하는 SaaS 플랫폼.

### 1-2. 핵심 수익 공식
```
수익 = 트래픽 × CPC × CTR

트래픽 → KEYWORD STRATEGY   : 고검색량·저경쟁·계절성 키워드 자동 발굴
CPC    → BLOG CATEGORIZATION : 블로그별 광고 카테고리 고정 → 고CPC 광고 배정 유도
CTR    → PASONA STRUCTURE    : P→A→S→O→N→A 심리 구조 + 섹션 타겟팅 태그
```

### 1-3. 제품이 해결하는 문제
- 수동 키워드 조사에 매주 수십 시간 소요
- 블로그 주제가 뒤섞여 구글이 낮은 CPC 광고를 배정
- 글 구조가 광고 클릭을 유도하지 못해 CTR이 낮음
- 여러 블로그의 성과를 한 곳에서 추적하기 어려움
- 계절성 키워드를 놓쳐 트래픽 피크를 활용하지 못함

---

## 2. 사용자 및 목표

### 2-1. 주 사용자
- **블로그 수익화 운영자**: 2~10개 블로그를 운영하며 AdSense 수익을 주요 수입원으로 삼는 개인 또는 소규모 팀.

### 2-2. 사용자 목표

| 목표 | 성공 지표 |
|------|----------|
| 키워드 발굴 자동화 | 월 1회 자동 계절성 탐색 실행률 100% |
| CPC 최적화 | 블로그별 평균 CPC 30% 이상 향상 (3개월 후) |
| CTR 최적화 | PASONA 구조 적용 포스트의 CTR ≥ 3% |
| 발행 자동화 | 인간 개입 없이 발행 처리 비율 ≥ 70% |
| 수익 예측 정확도 | Revenue Score 예측 vs 실제 오차 ≤ 25% (6개월 후) |

---

## 3. 시스템 아키텍처

### 3-1. 전체 레이어

```
┌─────────────────────────────────────────────────────┐
│  Layer 1. 데이터 수집                                │
│  네이버 광고 API  /  Google KWP  /  네이버 데이터랩   │
└───────────────────────┬─────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│  Layer 2. 키워드 분석 엔진                           │
│  5단계 점수 산출  /  등급 분류(S~D)  /  계절성 탐지   │
└───────────────────────┬─────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│  Layer 3. 클러스터링 & 배분                          │
│  롱테일 클러스터 생성  /  블로그 배분  /  발행일 계산  │
└───────────────────────┬─────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│  Layer 4. AI 콘텐츠 생성                             │
│  PASONA 프롬프트  /  섹션 타겟팅 HTML 출력            │
└───────────────────────┬─────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│  Layer 5. 발행 파이프라인                            │
│  HTML 후처리  /  광고 슬롯 삽입  /  블로그 API 전송   │
└───────────────────────┬─────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│  Layer 6. 성과 추적 & 피드백 루프                    │
│  AdSense 수익 연동  /  예측 보정  /  가중치 자동 조정 │
└─────────────────────────────────────────────────────┘
```

### 3-2. 기술 스택 권장

| 레이어 | 기술 |
|--------|------|
| Frontend | Next.js 14 (App Router), Tailwind CSS, shadcn/ui |
| Backend API | Next.js Route Handlers (또는 Node.js + Express) |
| DB | PostgreSQL (Supabase 권장) |
| AI | Anthropic Claude API (claude-sonnet-4-6) |
| 캐시 | Redis (키워드 점수 캐싱, API 호출 제한 대응) |
| 배치 | Cron Job (Vercel Cron 또는 GitHub Actions) |
| 인증 | Supabase Auth |

---

## 4. 기능 명세 — 모듈별

---

### 4-1. 블로그 네트워크 관리

#### 개요
여러 블로그를 등록하고, 각 블로그에 광고 카테고리를 고정 지정하여 구글이 일관된 고CPC 광고를 배정하게 유도하는 핵심 설정 모듈.

#### 핵심 원칙
> 블로그 70% 이상의 포스트가 동일 카테고리일 때 구글이 고CPC 광고를 안정적으로 배정한다.

#### 기능 요구사항

**FR-B-001 블로그 등록**
- 블로그 이름, URL, 플랫폼(Tistory/WordPress/기타) 입력
- 블로그당 `primaryAdCategory` 1개 필수 지정
- `secondaryAdCategory` 선택 지정 (최대 1개)
- AdSense 슬롯 ID 3개 등록: `slot_top`, `slot_mid`, `slot_bottom`
- ads.txt 등록 여부 체크박스

**FR-B-002 광고 카테고리 등급표**

| 등급 | 카테고리 | 한국어 CPC 범위 |
|------|---------|--------------|
| S | 법률 | 5,000~20,000원 |
| S | 금융/대출 | 3,000~15,000원 |
| S | 보험 | 3,000~12,000원 |
| S | 부동산/투자 | 2,000~10,000원 |
| A | 의료/건강 | 1,000~8,000원 |
| A | B2B SaaS | 2,000~10,000원 |
| A | 자동차 | 1,000~5,000원 |
| B | 교육/자격증 | 500~3,000원 |
| B | 여행 | 500~2,000원 |
| C | 뷰티/육아 | 200~1,000원 |
| D | 음식/연예 | 50~300원 |

**FR-B-003 블로그 카테고리 일관성 경보**
- 포스트의 카테고리 분포를 분석하여 primaryAdCategory 비율이 70% 미만이면 경고 배지 표시
- 권장 조치 메시지 자동 생성

**FR-B-004 블로그 목록 대시보드**
- 블로그별 카드: 이름, 카테고리 등급(S/A/B), 월 수익, 평균 CPC, 발행 포스트 수, ads.txt 상태

---

### 4-2. 키워드 전략 엔진

#### 개요
3개의 외부 API 데이터를 결합하여 5단계 점수 체계로 키워드를 평가하고, 자동으로 수익 등급을 분류하여 키워드 풀에 적재하는 핵심 엔진.

#### 4-2-1. 데이터 소스

| 소스 | API | 수집 데이터 | 역할 |
|------|-----|-----------|------|
| 네이버 광고 API | `api.naver.com/keywordstool` | PC/모바일 검색량, 경쟁도(low/mid/high), 평균 노출 순위 | 트래픽 점수 |
| Google Keyword Planner | `googleads.googleapis.com` | avg_monthly_searches, CPC(micros), competition | 수익 점수 (핵심) |
| 네이버 데이터랩 | `openapi.naver.com/v1/datalab/search` | 2년치 상대 검색량 지수(0~100), 기기/성별/연령 분포 | 계절성 점수 |

#### 4-2-2. 5단계 점수 체계

**① Traffic Score (0~100)** — 방문자 추정
```
한국어 키워드:
  volume = (naverPc + naverMobile) × 0.7 + googleMonthly × 0.3
영어 키워드:
  volume = googleMonthly
Traffic Score = min((volume / 10,000) × 100, 100)
```

**② Revenue Score (0~100)** — 수익 잠재력 ★핵심 지표
```
estimatedClicks = googleMonthly × 0.025 × 0.03
estimatedRevenue = estimatedClicks × avgCpcKrw × 0.68
Revenue Score = min((estimatedRevenue / 100,000) × 100, 100)
→ 월 10만원 기대수익 = 100점
```

**③ Difficulty Score (0~100)** — SEO 난이도 (낮을수록 좋음)
```
naverScore  = { low: 20, mid: 50, high: 80 }[compIdx]
googleScore = { LOW: 20, MEDIUM: 50, HIGH: 80 }[competition]
depthPenalty = min(plAvgDepth × 2, 20)
Difficulty = round((naverScore + googleScore) / 2 + depthPenalty)
```

**④ Seasonal Bonus (0~30)** — 계절성 보너스
```
조건: max(trendHistory) > avg(trendHistory) × 2.5  →  계절성 키워드로 판정
피크 1개월 전: +30점  /  2개월 전: +15점  /  당월: +5점
```

**⑤ Opportunity Score (0~100)** — 최종 기회 점수
```
base = Traffic × 0.25 + Revenue × 0.40 + (1 - Difficulty/100) × 0.25 + trendIndex/100 × 0.10
Opportunity Score = min(round(base × 100) + SeasonalBonus, 100)
```

#### 4-2-3. 키워드 등급 분류

| 등급 | 조건 | 전략 |
|------|------|------|
| **S — 수익 황금** | Revenue ≥ 60 AND Difficulty ≤ 40 | 최우선 발행, S급 블로그 배정 |
| **A — 트래픽 황금** | Traffic ≥ 60 AND Difficulty ≤ 40 | 볼륨 극대화, A급 블로그 배정 |
| **B — 계절 황금** | SeasonalBonus ≥ 20 AND Opportunity ≥ 50 | 피크 3~4주 전 집중 발행 |
| **C — 도전** | (Revenue ≥ 40 OR Traffic ≥ 40) AND Difficulty > 40 | 장기 육성, 내부 링크 집중 |
| **D — 틈새** | Revenue < 30 AND Difficulty ≤ 30 | 롱테일 묶음으로만 활용 |
| **제외** | Revenue < 20 AND Difficulty > 60 | 풀에서 자동 삭제 |

#### 4-2-4. 계절성 키워드 자동 발굴 파이프라인

**실행 주기**: 월 1회 자동 (매월 1일 00:00)

**처리 흐름**:
```
Step 1. ANNUAL_EVENTS 캘린더에서 targetMonth(+1, +2개월) 이벤트 추출
Step 2. Claude API → 각 이벤트별 롱테일 키워드 20개 생성
Step 3. 네이버 광고 API → 검색량 + 경쟁도 수집
Step 4. 데이터랩 API → 24개월 트렌드 + YoY 성장률 계산
Step 5. SeasonalBonus > 0 OR YoY > 20% → 필터링
Step 6. keyword_pool 테이블에 grade와 함께 자동 적재
```

**ANNUAL_EVENTS 캘린더** (하드코딩):
```
1월: 수능결과, 대학원서, 설날선물, 새해다이어트, 연말정산
2월: 발렌타인데이, 졸업선물, 화이트데이준비, 봄맞이다이어트
3월: 입학선물, 봄패션, 봄나들이, 미세먼지마스크
4월: 벚꽃명소, 봄여행지, 어린이날선물준비, 황사대비
5월: 어버이날선물, 스승의날, 어린이날선물, 가정의달여행
6월: 여름다이어트, 에어컨추천, 여름패션, 장마대비
7월: 여름휴가여행지, 피서지추천, 썬크림추천, 수영복추천
8월: 추석선물준비, 개학준비, 가을다이어트, 태풍대비
9월: 추석선물, 가을여행지, 단풍명소, 운동화추천
10월: 핼러윈, 단풍절정, 겨울패션준비, 독감예방접종
11월: 수능선물, 블랙프라이데이, 김장재료, 겨울코트추천
12월: 크리스마스선물, 연말회식, 연말여행, 새해계획
```

**최적 발행일 자동 계산**:
```
peakDate = 해당 연도의 peakMonth 15일
publishDate = peakDate - 21일  (색인 2주 + 순위 안정화 1주)
```

#### 4-2-5. 롱테일 클러스터 생성

**기본 원칙**: S/A급 메인 키워드 1개 + 연관 롱테일 4~8개를 하나의 포스트로 묶음

**그룹화 알고리즘**:
1. 키워드 앞 2단어 공유 → 동일 클러스터
2. 임베딩 코사인 유사도 > 0.75 → 동일 클러스터
3. 각 클러스터에서 Opportunity Score 1위 = 메인 키워드
4. 클러스터 타입 분류: `revenue` / `traffic` / `seasonal`

#### 4-2-6. 블로그 배분 알고리즘

```
1. 클러스터의 adCategory와 blog.primaryAdCategory 일치 여부 확인
2. 이미 동일/유사 키워드가 배정된 블로그 제외 (내부 경쟁 방지)
3. Revenue Score가 높은 클러스터 → 평균 CPC가 높은 블로그에 우선 배정
4. 블로그 일일 발행 한도 초과 시 → 다음 적합 블로그로 이동
```

#### 4-2-7. 키워드 탐색기 (수동 탐색)

**FR-K-001**: 키워드 직접 입력 → 즉시 5단계 점수 산출 및 등급 표시
**FR-K-002**: 연관 키워드 자동 추천 (네이버 광고 API relKeyword 활용)
**FR-K-003**: 키워드 풀에 수동 추가/삭제
**FR-K-004**: 키워드 풀 필터링: 등급별, 블로그별, 날짜별, 카테고리별

---

### 4-3. 콘텐츠 캘린더

#### 개요
키워드 클러스터를 기반으로 블로그별 발행 일정을 자동 생성하고 관리하는 모듈.

#### 기능 요구사항

**FR-C-001 자동 캘린더 생성**
- 발행 우선순위 결정:
  - S등급: priority 100
  - B등급 (계절성): priority 90 ← 타이밍이 S보다 중요
  - A등급: priority 70
  - C등급: priority 40
  - D등급: priority 10
- 블로그별 일일 발행 한도 설정 (기본: 1~3건/일)
- priority DESC → scheduledDate ASC 순으로 정렬 배치

**FR-C-002 캘린더 뷰**
- 월간 캘린더 뷰: 날짜별 예정 포스트 수 표시
- 주간 캘린더 뷰: 블로그별 예정 포스트 타임라인
- 포스트 카드: 메인 키워드, 등급 배지, 블로그명, 예상 수익

**FR-C-003 캘린더 수동 조정**
- 드래그 앤 드롭으로 발행일 변경
- 블로그 재배정 (다른 블로그로 이동)
- 개별 포스트 발행 취소/보류

**FR-C-004 오늘의 발행 큐**
- `scheduledDate = today`인 클러스터 자동 노출
- "AI 생성 시작" 버튼으로 에디터로 이동
- 일괄 자동 발행 실행 버튼

---

### 4-4. AI 콘텐츠 생성기

#### 개요
PASONA 구조와 섹션 타겟팅 태그가 자동 포함된 HTML 글을 AI가 생성하는 모듈.

#### 4-4-1. PASONA 시스템 프롬프트

**글 구조 (HTML 출력 형식)**:
```html
<!-- google_ad_section_start(weight=ignore) -->
[P 단계: 독자의 문제를 구체적으로 묘사. 200자 이내.]
[A 단계: 1인칭 공감 경험담. 150자 이내.]
<!-- google_ad_section_end -->

<!-- google_ad_section_start -->
[S 단계: 핵심 해결 방향. H2 소제목 포함. 600자 이상.
 adKeywords를 소제목과 본문에 자연스럽게 포함.]
[O 단계: 더 나은 선택지 제시. 200자 이내.]
<!-- google_ad_section_end -->

<!-- google_ad_section_start(weight=ignore) -->
[N 단계: 긴박감 조성. 100자 이내.]
[A 단계: 명확한 CTA. 100자 이내.]
<!-- google_ad_section_end -->
```

**핵심 제약 규칙**:
- S단계에서 완전한 해결책 제공 금지 (광고가 해결책이어야 함)
- S단계 H2 소제목에 adKeywords 포함 필수
- 광고 직접 언급 금지 / "클릭하세요" 표현 금지
- 전체 분량: 1,800~2,200자

#### 4-4-2. 글 유형 (PasonaType)

| 유형 | 설명 | 제목 패턴 | CPC 특성 |
|------|------|---------|---------|
| `compare` | 비교글 | "[A] vs [B] 솔직 비교" / "TOP N 추천" | 최고 (구매 의도 높음) |
| `solve` | 문제해결글 | "[문제 상황] 해결 방법" | 높음 |
| `cost` | 비용탐색글 | "[서비스] 비용 얼마?" | 최고 (구매 결심 직전) |

#### 4-4-3. 카테고리별 adKeywords

| 카테고리 | S단계 삽입 키워드 |
|---------|-----------------|
| insurance | 실비보험 비교, 보험료 견적, 무료 비교, 보장 내용, 가입 방법 |
| finance | 대출 금리 비교, 한도 조회, 낮은 금리, 무료 상담, 신청 방법 |
| legal | 변호사 무료 상담, 법적 해결, 소송 비용, 합의 방법 |
| medical | 치료 비용, 전문의 추천, 효과적인 치료, 병원 선택 |
| realestate | 청약 전략, 세금 절약, 투자 수익률, 매매 타이밍 |
| automobile | 자동차 보험 비교, 할부 조건, 견적 받기, 신차 혜택 |
| education | 강의 추천, 합격률 비교, 수강료, 자격증 취득 |
| travel | 패키지 가격 비교, 최저가 예약, 여행 일정 |

#### 4-4-4. AI 생성 인풋 구조

```typescript
interface AIGenerateInput {
  mainKeyword: string          // 클러스터 메인 키워드
  relatedKeywords: string[]    // 롱테일 클러스터 키워드 4~8개
  adCategory: string           // 블로그의 primaryAdCategory
  blogCategory: string         // 블로그 주제명
  pasonaType: 'compare' | 'solve' | 'cost'
  targetLength: number         // 목표 자수 (기본: 2000)
}
```

**FR-AI-001**: 자동 생성 — 캘린더 큐에서 자동 트리거 (scheduledDate = today)
**FR-AI-002**: 수동 생성 — 사용자가 키워드/유형을 선택 후 즉시 생성
**FR-AI-003**: 재생성 — 기존 글 내용 유지하고 일부 섹션만 재생성
**FR-AI-004**: 글 유형 자동 추천 — 메인 키워드 분석 후 compare/solve/cost 중 최적 유형 제안

---

### 4-5. 에디터

#### 개요
AI 생성 HTML을 검토하고 PASONA 구조를 수동으로 조정할 수 있는 리치 텍스트 에디터.

#### 4-5-1. 광고 최적화 툴바 버튼 그룹

```
[기존 툴바: B / I / U / H1 / H2 ...]  |  [📢 PASONA]  [🎯 타겟 ON]  [🚫 무시]  [🏷️ 카테고리 ▼]
```

**📢 PASONA 구조 삽입 (FR-E-001)**
- 클릭 시 커서 위치에 PASONA 6단계 템플릿 전체 삽입
- 섹션 타겟팅 태그 포함된 HTML 구조 삽입

**🎯 타겟 ON (FR-E-002)**
- 선택 텍스트 또는 커서 위치에 `<!-- google_ad_section_start -->` 삽입
- 에디터에서 연두색(#ECFDF5) 배경으로 시각화

**🚫 무시 (FR-E-003)**
- 선택 텍스트를 `<!-- google_ad_section_start(weight=ignore) -->` 로 감쌈
- 에디터에서 회색(#F1F5F9) 배경으로 시각화

**🏷️ 광고 카테고리 드롭다운 (FR-E-004)**
- 카테고리 선택 시 우측 슬라이딩 힌트 패널 표시
- 힌트 패널 내용:
  - S단계 추천 키워드 목록 (클릭 시 클립보드 복사)
  - H2 추천 소제목 3개
  - 예상 CPC 범위

#### 4-5-2. 에디터 시각화

에디터에서 섹션 태그 대신 색상 배경으로 구역 표시:
- 🚫 회색 배경: `weight=ignore` 구간 (P, A, N, A 단계)
- 🎯 연두색 배경: `section_start` 구간 (S, O 단계 — 고CPC 광고 배정 구간)
- 연두색 구간 내 광고 슬롯 위치 미리보기 표시

**FR-E-005 SEO 점수 패널**
- 우측 패널에 실시간 표시:
  - 메인 키워드 포함 횟수 및 밀도
  - 롱테일 키워드 포함 여부 체크리스트
  - adKeywords 포함 여부 체크리스트
  - 예상 분량 대비 현재 분량 (1,800~2,200자 권장)

**FR-E-006 발행 전 검증 체크리스트**
- `section_start` 태그 존재 여부
- S단계에 adKeywords 1개 이상 포함 여부
- H2 소제목에 메인 키워드 포함 여부
- 분량 범위 충족 여부 (1,800~2,200자)

---

### 4-6. 발행 파이프라인

#### 개요
에디터 완성 글을 HTML 후처리하고 블로그 API로 전송하는 모듈.

#### 4-6-1. HTML 후처리 (발행 전 자동 실행)

**Step 1. 섹션 타겟팅 태그 검증 및 보완**
- `google_ad_section` 태그가 없으면 자동 삽입
- H2 태그 패턴 분석: "비교/방법/추천/비용/해결/선택/확인" 키워드가 있는 H2 직전에 `section_start` 자동 삽입

**Step 2. 광고 슬롯 자동 삽입**
```
google_ad_section_start 직후 첫 번째 </h2> 뒤에 AdSense 슬롯 코드 삽입
슬롯 ID = 해당 블로그의 adsense_slot_mid
```

**Step 3. 헤더/푸터 무시 태그 처리**
- 블로그 헤더/푸터 영역에 `weight=ignore` 자동 처리

#### 4-6-2. 블로그 플랫폼 API 연동

**FR-P-001 Tistory 연동**
- OAuth2 인증
- 포스트 작성 API (`/apis/post/write`)
- 카테고리 자동 매핑

**FR-P-002 WordPress 연동**
- REST API (`wp-json/wp/v2/posts`)
- Application Password 인증
- 카테고리/태그 자동 생성

**FR-P-003 발행 결과 처리**
- 성공 시: `status = 'published'`, `published_url` 저장
- 실패 시: 재시도 큐에 추가 (최대 3회)
- 발행 완료 시 성과 추적 자동 시작

---

### 4-7. 수익 추적 & 피드백 루프

#### 개요
실제 AdSense 수익을 Revenue Score 예측값과 비교하여 점수 체계의 가중치를 자동 보정하는 자기개선 모듈.

#### 4-7-1. 성과 데이터 수집

**FR-T-001 AdSense API 연동**
- 일별 수집: page_views, ad_impressions, ad_clicks, ctr, avg_cpc, revenue
- 포스트 단위 URL 기반 매핑

**FR-T-002 주간 피드백 배치 (매주 월요일 실행)**
```
Step 1. 지난 7일 actual_revenue vs Revenue Score 기반 예측값 비교
Step 2. 오차율 = |actual - predicted| / predicted
Step 3. 오차율 > 20%인 키워드 패턴 추출
Step 4. 해당 패턴의 점수 가중치 조정 (최대 ±10%씩 점진적 보정)
Step 5. 높은 CTR 패턴 → 해당 pasonaType 글 비중 자동 증가 권고
Step 6. 낮은 CTR 블로그 → 광고 카테고리 재설정 권고 알림
```

**FR-T-003 PASONA 유형별 성과 분석**
- compare / solve / cost 유형별 평균 CTR, 평균 CPC, 총 수익 비교
- 높은 성과 유형 → 다음 발행 계획에 자동 반영

---

### 4-8. 대시보드

#### 개요
전체 블로그 네트워크의 수익 현황을 한눈에 파악하는 통합 뷰.

#### 기능 요구사항

**FR-D-001 수익 요약 카드**
- 오늘 / 이번 주 / 이번 달 총 수익 (원)
- 전월 대비 증감률 및 방향 화살표

**FR-D-002 블로그별 수익 그래프**
- 최근 30일 일별 수익 라인 차트
- 블로그별 색상 구분

**FR-D-003 키워드 성과 TOP 10**
- 이번 달 수익 기여 상위 10개 키워드
- Revenue Score 예측 vs 실제 오차율 표시

**FR-D-004 예정 발행 현황**
- 오늘/이번 주 발행 예정 포스트 수
- 계절성 키워드 피크 임박 알림 (D-14, D-7)

**FR-D-005 시스템 상태 표시**
- 마지막 계절성 탐색 실행 시각
- API 할당량 잔여량 (네이버/구글)
- 피드백 루프 마지막 실행 및 보정 내역

---

## 5. 데이터 모델 (DB 스키마)

```sql
-- 블로그 테이블
CREATE TABLE blogs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID REFERENCES auth.users(id),
  name                  TEXT NOT NULL,
  url                   TEXT NOT NULL,
  platform              TEXT,                    -- 'tistory' | 'wordpress' | 'other'
  primary_ad_category   TEXT NOT NULL,           -- 'insurance' | 'finance' | 'legal' | ...
  secondary_ad_category TEXT,
  adsense_slot_top      TEXT,
  adsense_slot_mid      TEXT,
  adsense_slot_bottom   TEXT,
  ads_txt_verified      BOOLEAN DEFAULT FALSE,
  avg_cpc_krw           INTEGER DEFAULT 0,       -- 실측 평균 CPC (피드백 루프 업데이트)
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- 키워드 검색/분석 결과
CREATE TABLE keyword_searches (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID REFERENCES auth.users(id),
  keyword               TEXT NOT NULL,
  is_korean             BOOLEAN DEFAULT TRUE,
  naver_pc_volume       INTEGER,
  naver_mobile_volume   INTEGER,
  google_volume         INTEGER,
  avg_cpc_krw           INTEGER,
  traffic_score         INTEGER,                 -- 0~100
  revenue_score         INTEGER,                 -- 0~100 ★핵심
  difficulty_score      INTEGER,                 -- 0~100
  seasonal_bonus        INTEGER,                 -- 0~30
  trend_index           INTEGER,                 -- 현재 데이터랩 지수
  opportunity_score     INTEGER,                 -- 0~100 최종 점수
  grade                 TEXT,                    -- 'S'|'A'|'B'|'C'|'D'|'excluded'
  trend_history         INTEGER[],               -- 24개월 데이터랩 지수 배열
  yoy_growth            DECIMAL(4,2),            -- 전년 동기 대비 성장률
  peak_month            INTEGER,                 -- 트래픽 피크 예상 월 (1~12)
  cluster_id            UUID,
  blog_id               UUID REFERENCES blogs(id),
  scheduled_date        DATE,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- 키워드 클러스터 (롱테일 묶음)
CREATE TABLE keyword_clusters (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID REFERENCES auth.users(id),
  main_keyword             TEXT NOT NULL,
  related_keywords         TEXT[],
  cluster_type             TEXT,                 -- 'revenue'|'traffic'|'seasonal'
  ad_category              TEXT,                 -- 해당 카테고리
  total_estimated_revenue  INTEGER,              -- 월 예상 수익 (원)
  total_volume             INTEGER,
  suggested_title          TEXT,
  pasona_type              TEXT,                 -- 'compare'|'solve'|'cost'
  blog_id                  UUID REFERENCES blogs(id),
  scheduled_date           DATE,
  status                   TEXT DEFAULT 'pending', -- 'pending'|'generating'|'published'
  created_at               TIMESTAMPTZ DEFAULT NOW()
);

-- 발행 포스트
CREATE TABLE posts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id),
  cluster_id      UUID REFERENCES keyword_clusters(id),
  blog_id         UUID REFERENCES blogs(id),
  title           TEXT NOT NULL,
  content_html    TEXT,                          -- PASONA + 섹션 타겟팅 태그 포함 HTML
  pasona_type     TEXT,
  ad_category     TEXT,
  status          TEXT DEFAULT 'draft',          -- 'draft'|'ready'|'published'|'failed'
  published_url   TEXT,
  published_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 포스트 광고 성과 (일별)
CREATE TABLE post_ad_performance (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id         UUID REFERENCES posts(id),
  blog_id         UUID REFERENCES blogs(id),
  measured_date   DATE NOT NULL,
  page_views      INTEGER DEFAULT 0,
  ad_impressions  INTEGER DEFAULT 0,
  ad_clicks       INTEGER DEFAULT 0,
  ctr             DECIMAL(5,4),                  -- 실제 CTR
  avg_cpc_krw     INTEGER,                       -- 실제 CPC (원)
  revenue_krw     INTEGER DEFAULT 0,             -- 일 수익 (원)
  pasona_type     TEXT,
  ad_category     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 키워드 성과 추적 (피드백 루프)
CREATE TABLE keyword_performance (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword_id       UUID REFERENCES keyword_searches(id),
  post_id          UUID REFERENCES posts(id),
  measured_at      DATE NOT NULL,
  actual_impressions INTEGER DEFAULT 0,
  actual_clicks    INTEGER DEFAULT 0,
  actual_revenue   INTEGER DEFAULT 0,            -- 실제 수익 (원)
  search_rank      INTEGER,                      -- 구글 검색 순위
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- PASONA 유형별 성과 집계 뷰
CREATE VIEW pasona_performance_summary AS
SELECT
  pasona_type,
  ad_category,
  AVG(ctr)             AS avg_ctr,
  AVG(avg_cpc_krw)     AS avg_cpc,
  SUM(revenue_krw)     AS total_revenue,
  COUNT(*)             AS post_count
FROM post_ad_performance
GROUP BY pasona_type, ad_category
ORDER BY avg_ctr DESC;
```

---

## 6. 외부 API 연동

### 6-1. 네이버 검색광고 API

| 항목 | 내용 |
|------|------|
| 엔드포인트 | `https://api.naver.com/keywordstool` |
| 인증 | 고객 ID + API Key + Secret (HMAC-SHA256 서명) |
| 제한 | 최대 100개/요청, 초당 10회 |
| 수집 항목 | relKeyword, monthlyPcQcCnt, monthlyMobileQcCnt, compIdx, plAvgDepth |

### 6-2. Google Ads API (Keyword Planner)

| 항목 | 내용 |
|------|------|
| 엔드포인트 | `googleads.googleapis.com` |
| 인증 | OAuth2 + Developer Token + Customer ID |
| 대안 | DataForSEO API (인증 간단, 유료) |
| 수집 항목 | avg_monthly_searches, competition, low/high_top_of_page_bid_micros |
| CPC 변환 | micros ÷ 1,000,000 = USD → × USD_TO_KRW = 원화 |

### 6-3. 네이버 데이터랩 API

| 항목 | 내용 |
|------|------|
| 엔드포인트 | `https://openapi.naver.com/v1/datalab/search` |
| 인증 | Client ID + Client Secret |
| 제한 | 일 1,000회 |
| 수집 항목 | 최대 3년치 기간별 상대 검색량 (0~100 지수) |

### 6-4. 환경변수

```env
# 네이버 검색광고 API
NAVER_ADS_API_KEY=
NAVER_ADS_SECRET_KEY=
NAVER_ADS_CUSTOMER_ID=

# 네이버 데이터랩
NAVER_CLIENT_ID=
NAVER_CLIENT_SECRET=

# Google Ads API
GOOGLE_ADS_DEVELOPER_TOKEN=
GOOGLE_ADS_CLIENT_ID=
GOOGLE_ADS_CLIENT_SECRET=
GOOGLE_ADS_REFRESH_TOKEN=
GOOGLE_ADS_CUSTOMER_ID=

# 환율 (주기적 갱신)
USD_TO_KRW=1380

# AI
ANTHROPIC_API_KEY=

# DB
DATABASE_URL=
```

---

## 7. 내부 API 라우트

| 엔드포인트 | 메서드 | 설명 | 우선순위 |
|-----------|--------|------|---------|
| `/api/blogs` | GET / POST | 블로그 목록 조회 / 등록 | Phase 1 |
| `/api/blogs/:id` | GET / PUT / DELETE | 블로그 상세 / 수정 / 삭제 | Phase 1 |
| `/api/keywords/search` | GET | 키워드 점수 즉시 조회 (네이버 + 구글 실시간) | Phase 1 |
| `/api/keywords/pool` | GET / POST | 키워드 풀 조회 / 추가 | Phase 1 |
| `/api/keywords/analyze` | POST | 배치 분석 (여러 키워드 동시 처리) | Phase 2 |
| `/api/keywords/seasonal` | GET | 다음 달 계절성 키워드 자동 추천 | Phase 3 |
| `/api/keywords/trend` | GET | 데이터랩 트렌드 + YoY 성장률 | Phase 3 |
| `/api/keywords/cluster` | POST | 롱테일 클러스터 생성 | Phase 4 |
| `/api/keywords/distribute` | POST | 클러스터 → 블로그 자동 배분 | Phase 4 |
| `/api/keywords/schedule` | GET / POST | 콘텐츠 캘린더 조회 / 생성 | Phase 5 |
| `/api/keywords/performance` | POST | 성과 데이터 수집 (피드백 루프) | Phase 6 |
| `/api/posts/generate` | POST | PASONA 구조 AI 글 생성 | Phase 4 |
| `/api/posts/publish` | POST | HTML 후처리 + 블로그 API 발행 | Phase 5 |
| `/api/posts/:id` | GET / PUT | 포스트 조회 / 수정 | Phase 4 |
| `/api/analytics/dashboard` | GET | 대시보드 통합 수익 데이터 | Phase 6 |
| `/api/analytics/feedback` | POST | 피드백 루프 배치 실행 | Phase 6 |

---

## 8. 비기능 요구사항

### 8-1. 성능

| 항목 | 요구사항 |
|------|---------|
| 키워드 점수 조회 응답 | ≤ 3초 (캐시 히트 시 ≤ 500ms) |
| AI 글 생성 응답 | ≤ 30초 (스트리밍 권장) |
| 발행 API 호출 | ≤ 10초 |
| 계절성 탐색 배치 | ≤ 10분 (월 1회) |
| 키워드 캐시 유효기간 | 24시간 (점수 데이터) |

### 8-2. 보안

- API 키는 서버 환경변수에만 저장 (클라이언트 노출 금지)
- 사용자별 데이터 완전 격리 (user_id 기반 Row Level Security)
- AdSense 슬롯 ID는 암호화 저장 권장

### 8-3. 확장성

- 블로그 수 제한: 초기 10개 / 플랜 업그레이드 시 무제한
- 키워드 풀 용량: 사용자당 최대 10,000개
- 포스트 저장: 무제한 (S3/Supabase Storage 활용)

---

## 9. 개발 로드맵 (Phase)

| Phase | 주요 작업 | 수익 임팩트 | 예상 기간 |
|-------|---------|-----------|---------|
| **Phase 1** | 네이버 광고 API 연동, 블로그 등록/관리 기본 UI | ★★★★☆ | 1~2주 |
| **Phase 2** | Google KWP 연동 → Revenue Score 산출 | ★★★★★ | 2~3주 |
| **Phase 3** | 데이터랩 연동 → 계절성 자동 탐색 파이프라인 | ★★★★★ | 2주 |
| **Phase 4** | AI PASONA 프롬프트 + 섹션 타겟팅 자동 포함 | ★★★★★ | 3~5일 ⚡ |
| **Phase 5** | 블로그 primaryAdCategory 필드 + 배분 로직 | ★★★★★ | 3~5일 ⚡ |
| **Phase 6** | DB 스키마 확장 + 클러스터링 로직 | ★★★★☆ | 1~2주 |
| **Phase 7** | 에디터 툴바 (🎯/🚫 버튼) + PASONA 템플릿 | ★★★★☆ | 1주 |
| **Phase 8** | 발행 파이프라인 (HTML 후처리 + 광고 슬롯 자동 삽입) | ★★★★☆ | 1주 |
| **Phase 9** | 콘텐츠 캘린더 UI + 에디터 자동 키워드 로드 | ★★★★☆ | 1~2주 |
| **Phase 10** | AdSense API 연동 + 성과 대시보드 | ★★★★★ | 2~3주 |
| **Phase 11** | 피드백 루프 (실적 기반 가중치 자동 보정) | ★★★★★ | 2~3주 |

> **⚡ Phase 4+5**: AI 프롬프트 수정 + DB 필드 1개 추가만으로 CPC·CTR 동시 개선 가능. 가장 먼저 적용 권장.

---

## 10. 용어 정의

| 용어 | 정의 |
|------|------|
| Revenue Score | 구글 CPC × 검색량 × CTR 기반 월 예상 수익을 0~100으로 정규화한 수익 잠재력 지표 |
| Opportunity Score | Traffic(25%) + Revenue(40%) + Difficulty역(25%) + Trend(10%) + SeasonalBonus의 최종 합산 점수 |
| primaryAdCategory | 블로그에 고정 지정된 주 광고 카테고리. 구글이 이 카테고리 기반으로 광고를 배정함 |
| PASONA | Problem-Affinity-Solution-Offer-Narrow-Action의 6단계 카피라이팅 프레임워크 |
| 섹션 타겟팅 | `<!-- google_ad_section_start -->` HTML 주석으로 구글 봇에게 광고 카테고리 결정 구간을 알리는 기술 |
| 롱테일 클러스터 | 의미적으로 연관된 롱테일 키워드 4~8개 + 메인 키워드를 하나의 포스트로 묶은 단위 |
| 피드백 루프 | 실제 AdSense 수익 vs Revenue Score 예측을 비교하여 가중치를 자동 보정하는 자기개선 메커니즘 |
| adKeywords | 각 광고 카테고리별로 S단계 소제목/본문에 삽입해야 하는 고CPC 트리거 키워드 목록 |
| YoY Growth | 전년 동기 대비 검색량 성장률. 20% 이상이면 성장 키워드로 분류 |
| PasonaType | 글 유형: compare(비교), solve(문제해결), cost(비용탐색) |
