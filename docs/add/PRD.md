# PRD — 멀티 블로그 수익화 자동화 플랫폼
**Product Requirements Document v1.1**

---

## 문서 정보

| 항목 | 내용 |
|------|------|
| 버전 | v1.1 (BlogGrade 시스템 전면 추가) |
| 핵심 공식 | **수익 = 트래픽 × CPC × CTR** |
| 설계 철학 | **겉은 90% 자동화, 뒤는 정교한 다층 로직** |
| 기반 전략 | KEYWORD_STRATEGY.MD + PASONA_STRATEGY.MD |

---

## 목차

1. 제품 개요
2. 사용자 및 목표
3. 시스템 아키텍처
4. 기능 명세
   - 4-1. 블로그 네트워크 관리 + **BlogGrade 등급 시스템**
   - 4-2. 키워드 전략 엔진
   - 4-3. 스마트 배분 알고리즘 (BlogGrade × KeywordGrade)
   - 4-4. 콘텐츠 캘린더
   - 4-5. AI 콘텐츠 생성기
   - 4-6. 에디터
   - 4-7. 발행 파이프라인
   - 4-8. 수익 추적 & 피드백 루프
   - 4-9. 대시보드
5. 데이터 모델 (DB 스키마)
6. 외부 API 연동
7. 내부 API 라우트
8. 비기능 요구사항
9. 개발 로드맵
10. 용어 정의

---

## 1. 제품 개요

### 1-1. 한 줄 요약
복수의 주제별 블로그를 운영하면서, 키워드 발굴부터 AI 글 생성·발행·성과 추적까지 전 과정을 자동화하여 Google AdSense 수익을 극대화하는 SaaS 플랫폼.

### 1-2. 핵심 수익 공식

```
수익 = 트래픽 × CPC × CTR

트래픽 → KEYWORD STRATEGY      : 고검색량·저경쟁·계절성 키워드 자동 발굴
CPC    → BLOG CATEGORIZATION   : 카테고리 고정 + BlogGrade 기반 최적 배분
CTR    → PASONA STRUCTURE      : P→A→S→O→N→A + 섹션 타겟팅 태그
```

### 1-3. 설계 철학

> **"사용자가 버튼 하나 누르는 동안, 시스템은 수십 개의 변수를 계산한다."**

| 사용자가 보는 것 | 시스템이 실제로 하는 것 |
|----------------|----------------------|
| 블로그 URL 입력 + 카테고리 선택 | BlogGrade 초기화, 쿼터 세팅, 배분 슬롯 예약 |
| "키워드 분석" 버튼 클릭 | 3개 API 병렬 호출, 5단계 점수 산출, 등급 분류, 클러스터 후보 생성 |
| 캘린더에서 포스트 카드 확인 | BlogGrade × KeywordGrade 매트릭스 배분, 발행일 역산, 쿼터 차감 |
| "발행" 버튼 클릭 | HTML 후처리, 섹션 타겟팅 검증, 광고 슬롯 삽입, 블로그 API 전송, 성과 추적 시작 |
| 주간 알림 수신 | AdSense 데이터 수집, BlogGrade 재산출, 등급 변화 감지, 가중치 보정, 배분 쿼터 재계산 |

---

## 2. 사용자 및 목표

### 2-1. 주 사용자
2~10개 블로그를 운영하며 AdSense 수익을 주요 수입원으로 삼는 개인/소규모 팀.

### 2-2. 성공 지표 (KPI)

| 목표 | 측정 지표 | 목표값 |
|------|---------|------|
| 키워드 발굴 자동화 | 계절성 탐색 자동 실행률 | 100% (월 1회) |
| CPC 최적화 | 블로그별 평균 CPC 향상 | +30% (3개월) |
| CTR 최적화 | PASONA 포스트 CTR | ≥ 3% |
| 발행 자동화 | 인간 개입 없이 발행 비율 | ≥ 70% |
| 수익 예측 정확도 | Revenue Score 오차 | ≤ 25% (6개월) |
| **키워드-블로그 매칭** | **S급 키워드 → S급 블로그 배정률** | **≥ 70%** |

---

## 3. 시스템 아키텍처

```
┌──────────────────────────────────────────────────────────┐
│  Layer 1. 데이터 수집                                     │
│  네이버 광고 API / Google KWP / 네이버 데이터랩            │
└─────────────────────────┬────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────┐
│  Layer 2. 키워드 분석 엔진                                │
│  5단계 점수 산출 / 등급 S~D / 계절성 탐지                 │
└─────────────────────────┬────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────┐
│  Layer 3. 스마트 배분 ★ (v1.1 핵심)                      │
│  BlogGrade 산출 / KeywordGrade × BlogGrade 매트릭스 배분  │
└─────────────────────────┬────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────┐
│  Layer 4. AI 콘텐츠 생성                                  │
│  PASONA 프롬프트 / 섹션 타겟팅 HTML 자동 출력             │
└─────────────────────────┬────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────┐
│  Layer 5. 발행 파이프라인                                 │
│  HTML 후처리 / 광고 슬롯 삽입 / 블로그 API 전송            │
└─────────────────────────┬────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────┐
│  Layer 6. 성과 추적 & 피드백                              │
│  AdSense 수익 연동 / BlogGrade 주간 갱신 / 가중치 자동 보정│
└──────────────────────────────────────────────────────────┘
```

### 기술 스택

| 레이어 | 기술 |
|--------|------|
| Frontend | Next.js 14, Tailwind CSS, shadcn/ui |
| Backend | Next.js Route Handlers (또는 Express) |
| DB | PostgreSQL — Supabase (RLS) |
| AI | Anthropic Claude API (claude-sonnet-4-6) |
| 캐시 | Redis (24h 키워드 점수 캐싱) |
| 배치 | Vercel Cron / GitHub Actions |

---

## 4. 기능 명세

---

### 4-1. 블로그 네트워크 관리

#### 개요
블로그를 등록하고 광고 카테고리를 지정하는 단순한 UI 뒤에서, **BlogGrade 산출 → 키워드 배분 최적화 → 카테고리 일관성 감시 → 주간 자동 등급 갱신**이 동작하는 핵심 제어 모듈.

---

#### FR-B-001 블로그 등록 (사용자 입력 — 2분)

사용자가 하는 것:
- 블로그 이름, URL, 플랫폼(Tistory / WordPress) 입력
- `primaryAdCategory` 1개 선택 (필수)
- `secondaryAdCategory` 선택 (선택, 최대 1개)
- AdSense 슬롯 ID 3개 입력 (slot_top / slot_mid / slot_bottom)

시스템이 자동으로 하는 것:
- `blog_grade = 'new'`, `blog_score = 0` 세팅
- `quota_reset_date = 이번 달 1일` 초기화
- 해당 카테고리 `category_cpc_ceiling` 값 자동 로드
- 배분 대기열에 NEW 슬롯 등록

---

#### FR-B-002 광고 카테고리 등급표

| 등급 | 카테고리 | 한국어 CPC 범위 | category_cpc_ceiling | 섹션 타겟팅 핵심 키워드 |
|------|---------|--------------|---------------------|----------------------|
| S | 법률 | 5,000~20,000원 | 20,000원 | 변호사, 무료상담, 소송, 합의금 |
| S | 금융/대출 | 3,000~15,000원 | 15,000원 | 대출, 금리비교, 한도조회 |
| S | 보험 | 3,000~12,000원 | 12,000원 | 보험비교, 견적, 가입 |
| S | 부동산/투자 | 2,000~10,000원 | 10,000원 | 청약, 세금, 수익률 |
| A | 의료/건강 | 1,000~8,000원 | 8,000원 | 치료비용, 병원추천 |
| A | B2B SaaS | 2,000~10,000원 | 10,000원 | 추천, 비교, 무료체험 |
| A | 자동차 | 1,000~5,000원 | 5,000원 | 보험비교, 할부, 견적 |
| B | 교육/자격증 | 500~3,000원 | 3,000원 | 강의추천, 합격률 |
| B | 여행 | 500~2,000원 | 2,000원 | 패키지, 예약 |
| C | 뷰티/육아 | 200~1,000원 | 1,000원 | 추천, 후기 |
| D | 음식/연예 | 50~300원 | 300원 | — |

---

#### FR-B-003 BlogGrade — 블로그 실적 등급 시스템 ★

구글에는 블로그를 공식 평가하는 점수가 없다. 그러나 구글이 고CPC 광고를 배정할 때 실질적으로 반응하는 신호들은 존재한다. 이 신호들을 내부적으로 수집·가중합산하여 `blog_score`(0~100)를 산출하고, 이를 기반으로 키워드 배분을 자동 최적화한다.

---

##### BlogScore 구성 — 4개 축

**① avg_cpc_krw (가중치 40%) — 구글 실배정 CPC**

```
정의: 구글이 해당 블로그에 실제로 배정한 최근 30일 평균 CPC (원화)
의미: 동일 카테고리라도 블로그별 실측 CPC는 2~5배 차이날 수 있다.
      가장 직접적인 수익 신호. 광고 품질 + 카테고리 일관성 + 콘텐츠 품질의 종합 결과.

산출:
  avg_cpc_krw = SUM(ad_clicks × avg_cpc) / SUM(ad_clicks)  -- 30일 가중평균

점수화:
  cpc_score = LEAST(ROUND((avg_cpc_krw / category_cpc_ceiling) × 100), 100)
  예시) 보험 블로그, 실측 CPC 6,000원:
        cpc_score = ROUND(6000 / 12000 × 100) = 50점

갱신: 매주 월요일 피드백 루프 배치
```

**② page_rpm_krw (가중치 30%) — 페이지 수익 밀도**

```
정의: 1,000 페이지뷰당 수익 (원)
      page_rpm = (30일 총수익 / 30일 총페이지뷰) × 1,000
의미: 트래픽 규모와 무관하게 광고 단가 밀도를 반영.
      트래픽이 적어도 RPM이 높으면 고급 블로그로 평가.
      CPC × CTR × 광고 노출 밀도의 종합 결과값.

점수화:
  rpm_score = LEAST(ROUND((page_rpm_krw / 10000) × 100), 100)
  → RPM 10,000원 = 100점 (한국 블로그 현실적 최고치)
  → RPM 3,000원 = 30점 (평균 수준)

갱신: 매주 월요일
```

**③ monthly_sessions (가중치 20%) — 트래픽 규모**

```
정의: 최근 30일 월간 세션 수
수집: 블로그 플랫폼 통계 API 또는 Google Analytics 연동
      연동 불가 시: post_ad_performance.page_views 합산으로 추정 (정확도 낮음 — 명시)

의미: 트래픽이 많을수록 구글이 블로그의 광고 실적 패턴을 더 빠르게 학습하고
      카테고리를 명확히 인식함. 신규 블로그가 성장 신호로 활용.

점수화:
  session_score = LEAST(ROUND((monthly_sessions / 50000) × 100), 100)
  → 월 5만 세션 = 100점
  → 월 1만 세션 = 20점

갱신: 매주 월요일
```

**④ category_consistency_pct (가중치 10%) — 카테고리 일관성**

```
정의: 최근 30일 발행 포스트 중 primaryAdCategory 해당 포스트 비율
      category_consistency_pct = (primaryAdCategory 포스트 수 / 전체 포스트 수) × 100

의미: 구글이 블로그 주제를 명확히 인식하는 핵심 신호.
      70% 이상이면 안정적으로 해당 카테고리 광고 배정.
      50% 미만이면 광고 품질 혼재 → CPC 저하 유발.

점수화:
  consistency_score = category_consistency_pct  (0~100 직접 사용)

갱신: 포스트 발행/삭제 시 실시간 재계산
```

---

##### BlogScore 최종 산출 공식

```sql
blog_score = ROUND(
  cpc_score         * 0.40 +
  rpm_score         * 0.30 +
  session_score     * 0.20 +
  consistency_score * 0.10
)
```

---

##### BlogGrade 등급 분류표

| 등급 | 점수 조건 | 추가 조건 | 키워드 배정 전략 | 의미 |
|------|---------|---------|----------------|------|
| **S** | blog_score ≥ 70 | avg_cpc ≥ 3,000원 AND rpm ≥ 5,000원 | S/A 키워드 우선 배정 (쿼터 70%) | 구글이 고CPC 광고를 안정 배정 중 |
| **A** | blog_score ≥ 45 | avg_cpc ≥ 1,500원 AND rpm ≥ 2,000원 | A키워드 주 배정 + S키워드 육성 쿼터 20% | 성장 중. 가속 필요 |
| **B** | blog_score ≥ 20 | avg_cpc ≥ 500원 | B/C 키워드 배정 | 기본 동작 중 |
| **NEW** | 발행 포스트 < 10건 OR 데이터 < 30일 | — | C/D 키워드만 | 실적 축적 단계 |
| **경고** | consistency_pct < 50% | — | 키워드 배정 중단 | 카테고리 혼재. 즉시 교정 필요 |

> **등급 갱신**: 매주 월요일 피드백 루프에서 자동 재산출. 사용자 수동 변경 불가.  
> **등급 다운**: 3주 연속 blog_score 하락 시 자동 하락 + 알림.  
> **등급 업**: 조건 충족 즉시 다음 배치 실행 시 승급 + 축하 알림.

---

##### 신규 블로그 자동 성장 경로

```
[등록 → NEW]
  ↓ C/D급 키워드 10~20건 자동 배정 및 발행
  ↓ AdSense 30일 데이터 자동 축적
  ↓ 피드백 루프 — blog_score 첫 산출
  ↓
blog_score ≥ 20 → [B급 자동 승급]
  ↓ B/C 키워드 배정 + 카테고리 일관성 강화 권고
  ↓
blog_score ≥ 45 → [A급 자동 승급]
  ↓ A키워드 주 배정 + S키워드 20% 육성 쿼터 시작
  ↓
blog_score ≥ 70 + CPC/RPM 조건 충족 → [S급 자동 승급]
  ↓ S키워드 70% 우선 배정
```

---

#### FR-B-004 카테고리 일관성 경보 (자동 실시간)

```
consistency_pct ≥ 70% : 정상 (녹색)
consistency_pct 60~69% : 주의 (노란색) + "N건 더 발행하면 안정권"
consistency_pct 50~59% : 경고 (주황색) + 알림 발송
consistency_pct < 50%  : 위험 (빨간색) + 키워드 배분 일시 중단 + 강제 알림
                          "카테고리 혼재로 CPC 저하 위험. 즉시 조치 필요."
```

자동 복구 안내 메시지:
```
"보험 카테고리 포스트 4건만 더 발행하면 일관성 72%로 복구됩니다.
 현재 키워드 풀에 즉시 발행 가능한 보험 키워드 7건이 있습니다."
```

---

### 4-2. 키워드 전략 엔진

#### 4-2-1. 데이터 소스

| 소스 | API | 수집 데이터 | 역할 |
|------|-----|-----------|------|
| 네이버 광고 API | `api.naver.com/keywordstool` | PC/모바일 검색량, 경쟁도, 노출순위 | 트래픽 점수 |
| Google KWP | `googleads.googleapis.com` | avg_monthly_searches, CPC(micros), competition | 수익 점수 (핵심) |
| 네이버 데이터랩 | `openapi.naver.com/v1/datalab/search` | 24개월 상대 검색량 지수 (0~100) | 계절성 점수 |

#### 4-2-2. 5단계 점수 체계

**① Traffic Score (0~100)**
```
volume = (naverPc + naverMobile) × 0.7 + googleMonthly × 0.3  [한국어]
       = googleMonthly                                          [영어]
Traffic Score = LEAST((volume / 10000) × 100, 100)
```

**② Revenue Score (0~100) ★ 핵심**
```
estimatedClicks  = googleMonthly × 0.025 × 0.03
estimatedRevenue = estimatedClicks × avgCpcKrw × 0.68
Revenue Score    = LEAST((estimatedRevenue / 100000) × 100, 100)
→ 월 10만원 기대수익 = 100점
```

**③ Difficulty Score (0~100) — 낮을수록 유리**
```
naverScore   = { low:20, mid:50, high:80 }[compIdx]
googleScore  = { LOW:20, MEDIUM:50, HIGH:80 }[competition]
depthPenalty = LEAST(plAvgDepth × 2, 20)
Difficulty   = ROUND((naverScore + googleScore) / 2 + depthPenalty)
```

**④ Seasonal Bonus (0~30)**
```
계절성 판정: max(trendHistory) > avg(trendHistory) × 2.5
피크 1개월 전: +30 / 2개월 전: +15 / 당월: +5
```

**⑤ Opportunity Score (0~100) — 최종**
```
base = Traffic×0.25 + Revenue×0.40 + (1 - Difficulty/100)×0.25 + trendIndex/100×0.10
Opportunity Score = LEAST(ROUND(base×100) + SeasonalBonus, 100)
```

#### 4-2-3. 키워드 등급 분류

| 등급 | 분류 조건 | 배정 전략 |
|------|---------|---------|
| **S — 수익 황금** | Revenue ≥ 60 AND Difficulty ≤ 40 | BlogGrade S 블로그 70% 배정 |
| **A — 트래픽 황금** | Traffic ≥ 60 AND Difficulty ≤ 40 | A급 블로그 주 배정 |
| **B — 계절 황금** | SeasonalBonus ≥ 20 AND Opportunity ≥ 50 | 피크 3~4주 전 집중 발행 |
| **C — 도전** | (Revenue ≥ 40 OR Traffic ≥ 40) AND Difficulty > 40 | 장기 육성 |
| **D — 틈새** | Revenue < 30 AND Difficulty ≤ 30 | 롱테일 묶음만 |
| **제외** | Revenue < 20 AND Difficulty > 60 | 풀 자동 삭제 |

#### 4-2-4. 계절성 자동 발굴 파이프라인 (월 1회 자동)

```
Step 1. ANNUAL_EVENTS에서 +1, +2개월 이벤트 추출
Step 2. Claude API → 이벤트별 롱테일 키워드 20개 생성
Step 3. 네이버 광고 API → 검색량 + 경쟁도 수집
Step 4. 데이터랩 API → 24개월 트렌드 + YoY 성장률
Step 5. SeasonalBonus > 0 OR YoY > 20% → 필터링
Step 6. keyword_pool 자동 적재
Step 7. 스마트 배분 알고리즘 자동 실행 → BlogGrade 기반 블로그 배정

발행일 자동 계산:
  publishDate = peakDate(이벤트 월 15일) - 21일
  (색인 2주 + 순위 안정화 1주)
```

**ANNUAL_EVENTS 캘린더 (하드코딩 72개)**
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

#### 4-2-5. 롱테일 클러스터 생성

```
그룹화 알고리즘:
  1. 키워드 앞 2단어 공유 → 동일 클러스터
  2. 임베딩 코사인 유사도 > 0.75 → 동일 클러스터
  3. 클러스터 내 Opportunity Score 1위 = 메인 키워드
  4. 클러스터 타입: revenue / traffic / seasonal 자동 분류
  5. 메인 1개 + 롱테일 4~8개 = 1 포스트
```

---

### 4-3. 스마트 배분 알고리즘 ★ (v1.1 핵심)

키워드 등급과 BlogGrade를 교차 매칭하여, **수익 극대화와 블로그 육성을 동시에 달성**하는 자동 배분 로직. 사용자는 결과만 본다.

#### 4-3-1. KeywordGrade × BlogGrade 배분 매트릭스

```
          S급 블로그   A급 블로그   B급 블로그   NEW 블로그
S급 키워드    70%         20%          8%          2%
A급 키워드    30%         50%         20%          0%
B급 키워드     0%         20%         60%         20%
C급 키워드     0%          0%         30%         70%
D급 키워드     0%          0%         10%         90%
```

> **설계 의도**:  
> - S급 키워드 70%는 S급 블로그에 → 수익 극대화  
> - 나머지 30%는 하위 등급에 → 성장 가속 (S급 키워드로 등급을 올리는 선순환)  
> - D급 키워드는 NEW 블로그 전용 → 신규 블로그 실적 씨앗  
> - B급 이상 블로그에 C/D 키워드 배정 금지 → 카테고리 일관성 보호

#### 4-3-2. 배분 실행 알고리즘 (순서대로)

```
STEP 1. 카테고리 필터
  cluster.adCategory == blog.primaryAdCategory 인 블로그만 후보군 추출

STEP 2. 경고 등급 제외
  blog_grade == 'warning' → 후보군에서 즉시 제거

STEP 3. 등급 매트릭스 적용
  KeywordGrade 기준 BlogGrade별 허용 비율 확인
  허용 비율 0% → 후보군에서 제거

STEP 4. 월간 쿼터 확인
  blog.monthly_s_keyword_count >= QUOTA_LIMIT[blog_grade] → 제거
  쿼터 한도:
    S급: 월 40건 (S키워드)
    A급: 월 20건 (S키워드 육성 쿼터)
    B급: 월  8건 (S키워드 테스트 쿼터)
    NEW: 월  2건 (S키워드 씨앗 쿼터)

STEP 5. 내부 경쟁 방지
  동일/유사 키워드가 이미 배정된 블로그 → 제거
  (keyword_clusters.blog_id 기반 유사도 체크)

STEP 6. 일일 발행 한도 확인
  블로그 일일 한도 초과 시 → 다음 가용일로 스케줄 이동

STEP 7. 최종 선택
  남은 후보 중 blog_score 내림차순 정렬 → 1위 선택
  동점이면 avg_cpc_krw 높은 블로그 우선

STEP 8. 배정 및 기록
  cluster.blog_id = selectedBlog.id
  cluster.assigned_blog_grade = selectedBlog.blog_grade  (이력 보존)
  cluster.scheduled_date = 계산된 발행일
  blog.monthly_s_keyword_count += 1  (S급 키워드인 경우)
```

#### 4-3-3. 배분 불가 예외 처리

```
후보 블로그가 0개인 경우:
  → 카테고리 일치 블로그 자체가 없음: 대시보드 알림 "해당 카테고리 블로그 없음"
  → 모든 블로그 경고 등급: "카테고리 일관성 복구 후 배분 재시작"
  → 쿼터 전부 소진: 다음 달 1일 쿼터 초기화 대기 큐에 적재
  → 발행 한도 초과: 가장 빠른 가용일로 자동 이동 (최대 14일 이내)
```

#### 4-3-4. 배분 성과 모니터링

매주 피드백 루프에서 자동 생성:
```
[이번 주 배분 성과 리포트]
S급 키워드 → S급 블로그 배정률: 73%  ✅ (목표 70% 초과)
A급 키워드 → A급 블로그 배정률: 51%  ✅
등급 불일치 배정: 3건  (S키워드 → B블로그)
  → 불일치 배정 예상 수익 손실: 약 12,000원/월
  → 원인: 보험 카테고리 S급 블로그 쿼터 소진
  → 권장: 보험 카테고리 블로그 추가 등록
```

---

### 4-4. 콘텐츠 캘린더

**FR-C-001 자동 캘린더 생성**
```
발행 우선순위:
  S급 키워드:  priority 100
  B급 계절성: priority  90  (타이밍이 S보다 중요)
  A급 키워드:  priority  70
  C급 키워드:  priority  40
  D급 키워드:  priority  10
  
정렬: priority DESC → scheduledDate ASC
```

**FR-C-002 캘린더 뷰**
- 월간 뷰: 날짜별 예정 포스트 수 + 등급 색상
- 주간 뷰: 블로그별 타임라인
- 포스트 카드: 키워드 등급 배지 + **BlogGrade 배지** + 블로그명 + 예상 수익

**FR-C-003 수동 조정**
- 드래그앤드롭 발행일 변경
- 블로그 재배정 — BlogGrade 부적합 이동 시 경고 표시
- 취소/보류

**FR-C-004 오늘의 발행 큐**
- scheduledDate = today 자동 노출
- "AI 생성 시작" / 일괄 자동 발행 버튼

---

### 4-5. AI 콘텐츠 생성기

#### PASONA 출력 구조 (HTML)

```html
<!-- google_ad_section_start(weight=ignore) -->
[P: 독자 문제 묘사 200자]
[A: 1인칭 공감 경험담 150자]
<!-- google_ad_section_end -->

<!-- google_ad_section_start -->
[S: 핵심 해결 방향 H2 포함 600자+ / adKeywords 포함 필수]
[O: 더 나은 선택지 200자]
<!-- google_ad_section_end -->

<!-- google_ad_section_start(weight=ignore) -->
[N: 긴박감 100자]
[A: CTA 100자]
<!-- google_ad_section_end -->
```

**핵심 제약**:
- S단계에서 완전한 해결책 금지 (광고가 해결책)
- S단계 H2에 adKeywords 필수
- "광고", "클릭하세요" 금지
- 전체 분량 1,800~2,200자

#### 글 유형 (PasonaType)

| 유형 | 설명 | 제목 패턴 | CPC 특성 |
|------|------|---------|---------|
| `compare` | 비교글 | "[A] vs [B] 솔직 비교" | 최고 (구매 의도 최고) |
| `solve` | 문제해결글 | "[문제] 해결 방법" | 높음 |
| `cost` | 비용탐색글 | "[서비스] 비용 얼마?" | 최고 (구매 직전) |

#### BlogGrade별 AI 프롬프트 조정

```
S급 블로그 배정 글:
  → 심층 전문성 강조, adKeywords 밀도 높임, 비교/수치 데이터 풍부하게
  → 독자: 구체적 구매/계약 결심 직전 단계 타겟

A급 블로그 배정 글:
  → 균형 잡힌 정보성, 중간 수준 전문성

B/NEW 블로그 배정 글:
  → 접근성 높은 일반 독자 타겟, 기초 설명 포함
```

#### AI 생성 인풋 구조

```typescript
interface AIGenerateInput {
  mainKeyword: string
  relatedKeywords: string[]       // 롱테일 4~8개
  adCategory: string              // primaryAdCategory
  blogGrade: 'S' | 'A' | 'B' | 'NEW'
  pasonaType: 'compare' | 'solve' | 'cost'
  targetLength: number            // 기본 2000
}
```

#### 카테고리별 adKeywords

| 카테고리 | S단계 삽입 키워드 |
|---------|-----------------|
| insurance | 실비보험 비교, 보험료 견적, 무료 비교, 보장 내용, 가입 방법 |
| finance | 대출 금리 비교, 한도 조회, 낮은 금리, 무료 상담 |
| legal | 변호사 무료 상담, 소송 비용, 합의 방법 |
| medical | 치료 비용, 전문의 추천, 효과적인 치료 |
| realestate | 청약 전략, 세금 절약, 투자 수익률 |
| automobile | 자동차 보험 비교, 할부 조건, 신차 혜택 |
| education | 강의 추천, 합격률 비교, 수강료 |
| travel | 패키지 가격 비교, 최저가 예약 |

---

### 4-6. 에디터

#### 광고 최적화 툴바

```
[B / I / U / H1 / H2 ...]  |  [📢 PASONA]  [🎯 타겟 ON]  [🚫 무시]  [🏷️ 카테고리 ▼]
```

| 버튼 | 동작 | 에디터 시각화 |
|------|------|------------|
| 📢 PASONA | PASONA 6단계 + 섹션 태그 전체 삽입 | — |
| 🎯 타겟 ON | section_start 태그 삽입 | 연두색 배경 #ECFDF5 |
| 🚫 무시 | weight=ignore 태그로 감쌈 | 회색 배경 #F1F5F9 |
| 🏷️ 카테고리 | 카테고리 선택 → adKeywords 힌트 패널 | 우측 슬라이딩 패널 |

#### SEO 점수 패널 (실시간)
- 메인 키워드 포함 횟수 및 밀도
- 롱테일 키워드 / adKeywords 체크리스트
- 현재 자수 / 목표 자수

#### 발행 전 검증 (통과해야 발행 버튼 활성화)
- section_start 태그 존재
- S단계 H2에 adKeywords 1개 이상
- H2에 메인 키워드 포함
- 분량 1,800~2,200자 충족

---

### 4-7. 발행 파이프라인

#### HTML 후처리 (자동)

```
Step 1. 섹션 태그 검증
  google_ad_section 태그 없으면 자동 삽입
  H2 패턴("비교/방법/추천/비용/해결/확인") 탐지 → section_start 자동 삽입

Step 2. 광고 슬롯 삽입
  section_start 직후 첫 </h2> 뒤에 adsense_slot_mid 코드 삽입

Step 3. 헤더/푸터 처리
  블로그 헤더/푸터 영역 → weight=ignore 자동 처리
```

#### 블로그 API 연동
- Tistory: OAuth2 + `/apis/post/write`
- WordPress: Application Password + `wp-json/wp/v2/posts`
- 발행 성공: `status='published'`, `published_url` 저장, 성과 추적 시작
- 발행 실패: 재시도 큐 (최대 3회, 지수 백오프)

---

### 4-8. 수익 추적 & 피드백 루프

#### 데이터 수집 (일별 자동)
- AdSense API: page_views, impressions, clicks, ctr, avg_cpc, revenue
- 포스트 단위 URL 매핑 → post_ad_performance 적재

#### 주간 피드백 배치 (매주 월요일 자동)

```
[A. 키워드 가중치 보정]
  1. 지난 7일 actual_revenue vs Revenue Score 예측값 비교
  2. 오차율 = |actual - predicted| / predicted
  3. 오차율 > 20% 키워드 패턴 추출
  4. 가중치 ±10% 점진적 보정
  5. 높은 CTR pasonaType → 발행 비중 자동 증가

[B. BlogGrade 자동 갱신] ★
  6.  블로그별 최근 30일 AdSense 데이터 집계
      avg_cpc_krw    = 30일 가중평균 CPC
      page_rpm_krw   = (총수익 / 총페이지뷰) × 1,000

  7.  category_consistency_pct 재계산
      = (최근 30일 primaryAdCategory 포스트 수 / 전체) × 100

  8.  blog_score 재산출
      cpc_score         = LEAST((avg_cpc_krw / category_cpc_ceiling) × 100, 100)
      rpm_score         = LEAST((page_rpm_krw / 10000) × 100, 100)
      session_score     = LEAST((monthly_sessions / 50000) × 100, 100)
      consistency_score = category_consistency_pct
      blog_score        = ROUND(cpc×0.4 + rpm×0.3 + session×0.2 + consistency×0.1)

  9.  blog_grade 재분류
      score≥70 AND cpc≥3000 AND rpm≥5000 → 'S'
      score≥45 AND cpc≥1500 AND rpm≥2000 → 'A'
      score≥20 AND cpc≥500               → 'B'
      posts<10 OR adsense_days<30         → 'NEW'
      consistency<50%                     → 'warning'

  10. 등급 변화 감지 → 알림 발송
      prev_grade != new_grade:
        승급: "A 블로그가 B→A급 승급! S키워드 육성 쿼터 20% 배정 시작"
        강등: "C 블로그 주의 — 카테고리 일관성 저하로 B→경고 등급"

  11. 다음 주 배분 쿼터 재계산
      각 등급별 가용 블로그 목록 갱신
      pending 클러스터 재배분 실행

[C. BlogGrade 성과 리포트 생성]
  12. BlogGrade × KeywordGrade 배정 성과 집계
      등급별 평균 RPM, 평균 CPC, 배정률 계산
      불일치 배정 건수 + 예상 손실 수익 산출
      권장 액션 자동 생성
```

#### PASONA 유형별 성과 분석
- compare / solve / cost 유형별 평균 CTR, CPC, 총 수익 비교
- 높은 성과 유형 → 다음 발행 계획에 자동 반영

---

### 4-9. 대시보드

**FR-D-001 수익 요약 카드**
- 오늘 / 이번 주 / 이번 달 수익 + 전월 대비 증감률

**FR-D-002 블로그별 수익 그래프**
- 최근 30일 일별 수익 라인 차트 (블로그별 색상)

**FR-D-003 키워드 성과 TOP 10**
- 수익 기여 상위 10개 + Revenue Score 예측 vs 실제 오차율

**FR-D-004 BlogGrade 현황 패널 ★**
- 전체 블로그 등급 분포 (S/A/B/NEW/경고 개수 + 비율)
- 블로그별 blog_score 게이지 + 전주 대비 ±N점
- **승급 임박 하이라이트**: "A 블로그 — blog_score 64/70, 승급까지 6점"
- 경고 블로그 + 즉각 조치 가이드 ("일관성 복구 시 자동 해제")

**FR-D-005 배분 효율 지표 ★**
- S키워드 → S블로그 배정률 (목표 70% 대비)
- 불일치 배정 건수 + 예상 수익 손실
- 쿼터 소진 현황 (이번 달 남은 슬롯)

**FR-D-006 시스템 상태**
- 마지막 계절성 탐색 / 피드백 루프 / BlogGrade 갱신 시각
- API 할당량 잔여량

---

## 5. 데이터 모델 (DB 스키마)

```sql
-- ═══════════════════════════════════════════════
-- blogs: BlogGrade 컬럼 포함 (v1.1)
-- ═══════════════════════════════════════════════
CREATE TABLE blogs (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID REFERENCES auth.users(id),
  name                      TEXT NOT NULL,
  url                       TEXT NOT NULL,
  platform                  TEXT,              -- 'tistory'|'wordpress'|'other'
  primary_ad_category       TEXT NOT NULL,     -- 'insurance'|'finance'|'legal'|...
  secondary_ad_category     TEXT,
  adsense_slot_top          TEXT,
  adsense_slot_mid          TEXT,
  adsense_slot_bottom       TEXT,
  ads_txt_verified          BOOLEAN DEFAULT FALSE,

  -- BlogGrade 4개 축 지표 (피드백 루프 자동 갱신)
  avg_cpc_krw               INTEGER DEFAULT 0,   -- 실측 평균 CPC (원)
  page_rpm_krw              INTEGER DEFAULT 0,   -- 실측 RPM (원)
  monthly_sessions          INTEGER DEFAULT 0,   -- 월간 세션 수
  category_consistency_pct  INTEGER DEFAULT 0,   -- 일관성 % (0~100)

  -- BlogGrade 등급 산출 결과
  blog_score                INTEGER DEFAULT 0,   -- 0~100 종합 점수
  blog_grade                TEXT DEFAULT 'new',  -- 'S'|'A'|'B'|'new'|'warning'
  prev_blog_grade           TEXT,                -- 이전 등급 (변화 감지용)
  grade_updated_at          DATE,                -- 마지막 등급 산출일

  -- 배분 쿼터 추적
  monthly_s_keyword_count   INTEGER DEFAULT 0,   -- 이번 달 S키워드 배정 수
  monthly_a_keyword_count   INTEGER DEFAULT 0,   -- 이번 달 A키워드 배정 수
  quota_reset_date          DATE,                -- 쿼터 초기화일 (매월 1일)

  created_at                TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════
-- blog_grade_history: 등급 변화 이력
-- ═══════════════════════════════════════════════
CREATE TABLE blog_grade_history (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_id                   UUID REFERENCES blogs(id),
  measured_date             DATE NOT NULL,
  blog_score                INTEGER,
  blog_grade                TEXT,
  avg_cpc_krw               INTEGER,
  page_rpm_krw              INTEGER,
  monthly_sessions          INTEGER,
  category_consistency_pct  INTEGER,
  cpc_score                 INTEGER,
  rpm_score                 INTEGER,
  session_score             INTEGER,
  consistency_score         INTEGER,
  created_at                TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════
-- keyword_searches
-- ═══════════════════════════════════════════════
CREATE TABLE keyword_searches (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES auth.users(id),
  keyword             TEXT NOT NULL,
  is_korean           BOOLEAN DEFAULT TRUE,
  naver_pc_volume     INTEGER,
  naver_mobile_volume INTEGER,
  google_volume       INTEGER,
  avg_cpc_krw         INTEGER,
  traffic_score       INTEGER,       -- 0~100
  revenue_score       INTEGER,       -- 0~100 ★
  difficulty_score    INTEGER,       -- 0~100
  seasonal_bonus      INTEGER,       -- 0~30
  trend_index         INTEGER,
  opportunity_score   INTEGER,       -- 0~100 최종
  grade               TEXT,          -- 'S'|'A'|'B'|'C'|'D'|'excluded'
  trend_history       INTEGER[],     -- 24개월 지수 배열
  yoy_growth          DECIMAL(4,2),
  peak_month          INTEGER,       -- 트래픽 피크 월 (1~12)
  cluster_id          UUID,
  blog_id             UUID REFERENCES blogs(id),
  scheduled_date      DATE,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════
-- keyword_clusters
-- ═══════════════════════════════════════════════
CREATE TABLE keyword_clusters (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID REFERENCES auth.users(id),
  main_keyword              TEXT NOT NULL,
  related_keywords          TEXT[],
  cluster_type              TEXT,          -- 'revenue'|'traffic'|'seasonal'
  ad_category               TEXT,
  total_estimated_revenue   INTEGER,       -- 월 예상 수익 (원)
  total_volume              INTEGER,
  suggested_title           TEXT,
  pasona_type               TEXT,          -- 'compare'|'solve'|'cost'
  keyword_grade             TEXT,          -- 'S'|'A'|'B'|'C'|'D'
  blog_id                   UUID REFERENCES blogs(id),
  assigned_blog_grade       TEXT,          -- 배정 시점 BlogGrade 기록 (성과 분석용)
  scheduled_date            DATE,
  status                    TEXT DEFAULT 'pending',
  created_at                TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════
-- posts
-- ═══════════════════════════════════════════════
CREATE TABLE posts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID REFERENCES auth.users(id),
  cluster_id            UUID REFERENCES keyword_clusters(id),
  blog_id               UUID REFERENCES blogs(id),
  title                 TEXT NOT NULL,
  content_html          TEXT,             -- PASONA + 섹션 타겟팅 태그 포함
  pasona_type           TEXT,
  ad_category           TEXT,
  blog_grade_at_publish TEXT,             -- 발행 시점 BlogGrade 기록
  status                TEXT DEFAULT 'draft',
  published_url         TEXT,
  published_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════
-- post_ad_performance: 포스트별 광고 성과 (일별)
-- ═══════════════════════════════════════════════
CREATE TABLE post_ad_performance (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id         UUID REFERENCES posts(id),
  blog_id         UUID REFERENCES blogs(id),
  measured_date   DATE NOT NULL,
  page_views      INTEGER DEFAULT 0,
  ad_impressions  INTEGER DEFAULT 0,
  ad_clicks       INTEGER DEFAULT 0,
  ctr             DECIMAL(5,4),
  avg_cpc_krw     INTEGER,
  revenue_krw     INTEGER DEFAULT 0,
  pasona_type     TEXT,
  ad_category     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════
-- keyword_performance: 키워드 성과 (피드백 루프)
-- ═══════════════════════════════════════════════
CREATE TABLE keyword_performance (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword_id         UUID REFERENCES keyword_searches(id),
  post_id            UUID REFERENCES posts(id),
  measured_at        DATE NOT NULL,
  actual_impressions INTEGER DEFAULT 0,
  actual_clicks      INTEGER DEFAULT 0,
  actual_revenue     INTEGER DEFAULT 0,
  search_rank        INTEGER,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════
-- 분석 뷰
-- ═══════════════════════════════════════════════

-- BlogGrade × KeywordGrade 배정 성과 (배분 전략 최적화 핵심 데이터)
CREATE VIEW grade_matching_performance AS
SELECT
  p.blog_grade_at_publish   AS blog_grade,
  kc.keyword_grade          AS keyword_grade,
  COUNT(DISTINCT p.id)      AS post_count,
  ROUND(AVG(pap.avg_cpc_krw))    AS avg_cpc,
  ROUND(AVG(pap.ctr)::NUMERIC, 4) AS avg_ctr,
  ROUND(AVG(pap.revenue_krw))    AS avg_daily_revenue,
  SUM(pap.revenue_krw)           AS total_revenue
FROM posts p
JOIN keyword_clusters kc        ON p.cluster_id = kc.id
JOIN post_ad_performance pap    ON pap.post_id = p.id
WHERE p.blog_grade_at_publish IS NOT NULL
GROUP BY p.blog_grade_at_publish, kc.keyword_grade
ORDER BY avg_cpc DESC;

-- PASONA 유형별 성과
CREATE VIEW pasona_performance_summary AS
SELECT
  pasona_type,
  ad_category,
  ROUND(AVG(ctr)::NUMERIC, 4)  AS avg_ctr,
  ROUND(AVG(avg_cpc_krw))      AS avg_cpc,
  SUM(revenue_krw)             AS total_revenue,
  COUNT(*)                     AS post_count
FROM post_ad_performance
GROUP BY pasona_type, ad_category
ORDER BY avg_ctr DESC;
```

---

## 6. 외부 API 연동

| API | 엔드포인트 | 인증 | 수집 항목 | Rate Limit |
|-----|---------|------|---------|-----------|
| 네이버 광고 | `api.naver.com/keywordstool` | HMAC-SHA256 | 검색량, 경쟁도, 노출순위 | 100개/요청, 초당 10회 |
| Google KWP | `googleads.googleapis.com` | OAuth2 + Dev Token | avg_searches, CPC(micros), competition | DataForSEO 대체 가능 |
| 네이버 데이터랩 | `openapi.naver.com/v1/datalab/search` | Client ID + Secret | 24개월 상대 검색량 (0~100) | 일 1,000회 |
| Claude API | `api.anthropic.com/v1/messages` | API Key | PASONA 구조 HTML 생성 | claude-sonnet-4-6 |
| AdSense API | `adsense.googleapis.com` | OAuth2 | 수익, CTR, CPC, 노출수 | 일별 수집 |

### 환경변수

```env
NAVER_ADS_API_KEY=          NAVER_ADS_SECRET_KEY=         NAVER_ADS_CUSTOMER_ID=
NAVER_CLIENT_ID=            NAVER_CLIENT_SECRET=
GOOGLE_ADS_DEVELOPER_TOKEN= GOOGLE_ADS_CLIENT_ID=         GOOGLE_ADS_CLIENT_SECRET=
GOOGLE_ADS_REFRESH_TOKEN=   GOOGLE_ADS_CUSTOMER_ID=
ANTHROPIC_API_KEY=
USD_TO_KRW=1380
DATABASE_URL=
```

---

## 7. 내부 API 라우트

| 엔드포인트 | 메서드 | 설명 | Phase |
|-----------|--------|------|-------|
| `/api/blogs` | GET/POST | 블로그 목록 조회 / 등록 | 1 |
| `/api/blogs/:id` | GET/PUT/DELETE | 블로그 상세/수정/삭제 | 1 |
| `/api/blogs/:id/grade` | GET | BlogGrade 현황 + 이력 | 5 |
| `/api/blogs/grade/recalculate` | POST | BlogGrade 수동 재산출 트리거 | 5 |
| `/api/keywords/search` | GET | 키워드 점수 즉시 조회 | 1 |
| `/api/keywords/pool` | GET/POST | 키워드 풀 조회 / 추가 | 1 |
| `/api/keywords/analyze` | POST | 배치 분석 (다수 키워드) | 2 |
| `/api/keywords/seasonal` | GET | 계절성 키워드 자동 추천 | 3 |
| `/api/keywords/trend` | GET | 데이터랩 트렌드 + YoY | 3 |
| `/api/keywords/cluster` | POST | 롱테일 클러스터 생성 | 4 |
| `/api/keywords/distribute` | POST | BlogGrade 매트릭스 자동 배분 | 4 |
| `/api/keywords/schedule` | GET/POST | 캘린더 조회 / 생성 | 5 |
| `/api/keywords/performance` | POST | 성과 수집 (피드백 루프) | 6 |
| `/api/posts/generate` | POST | PASONA AI 글 생성 | 4 |
| `/api/posts/publish` | POST | HTML 후처리 + 발행 | 5 |
| `/api/posts/:id` | GET/PUT | 포스트 조회 / 수정 | 4 |
| `/api/analytics/dashboard` | GET | 통합 대시보드 데이터 | 6 |
| `/api/analytics/feedback` | POST | 피드백 루프 배치 실행 (BlogGrade 갱신 포함) | 6 |
| `/api/analytics/grade-report` | GET | BlogGrade × KeywordGrade 성과 리포트 | 6 |

---

## 8. 비기능 요구사항

| 항목 | 요구사항 |
|------|---------|
| 키워드 점수 조회 | ≤ 3초 (캐시 히트 ≤ 500ms) |
| AI 글 생성 | ≤ 30초 (스트리밍 권장) |
| 블로그 발행 API | ≤ 10초 |
| 계절성 탐색 배치 | ≤ 10분 (월 1회) |
| BlogGrade 전체 재산출 | ≤ 2분 (주 1회) |
| 키워드 캐시 유효기간 | 24시간 |
| 데이터 격리 | Supabase RLS (user_id 기반) |
| API 키 보안 | 서버 환경변수만 (클라이언트 노출 금지) |
| 블로그 수 한도 | 초기 10개 / 업그레이드 시 무제한 |
| 키워드 풀 용량 | 사용자당 최대 10,000개 |

---

## 9. 개발 로드맵

| Phase | 주요 작업 | 수익 임팩트 | 기간 |
|-------|---------|-----------|------|
| **1** | 네이버 광고 API 연동, 블로그 등록 UI | ★★★★☆ | 1~2주 |
| **2** | Google KWP → Revenue Score | ★★★★★ | 2~3주 |
| **3** | 데이터랩 → 계절성 파이프라인 | ★★★★★ | 2주 |
| **4 ⚡** | AI PASONA 프롬프트 + 섹션 타겟팅 자동 포함 | ★★★★★ | 3~5일 |
| **5 ⚡** | BlogGrade 4개 지표 + 배분 매트릭스 로직 | ★★★★★ | 3~5일 |
| **6** | DB 스키마 + 클러스터링 + 스마트 배분 | ★★★★☆ | 1~2주 |
| **7** | 에디터 툴바 + PASONA 템플릿 | ★★★★☆ | 1주 |
| **8** | 발행 파이프라인 + 광고 슬롯 자동 삽입 | ★★★★☆ | 1주 |
| **9** | 콘텐츠 캘린더 UI | ★★★★☆ | 1~2주 |
| **10** | AdSense API + BlogGrade 자동 갱신 배치 | ★★★★★ | 2~3주 |
| **11** | 피드백 루프 + BlogGrade 리포트 대시보드 | ★★★★★ | 2~3주 |

> **⚡ Phase 4+5**: `blogs` 테이블에 BlogGrade 컬럼 추가 + AI 프롬프트 수정만으로 CPC·CTR·배분 정확도 동시 개선 시작. 가장 빠른 수익 개선 경로.

---

## 10. 용어 정의

| 용어 | 정의 |
|------|------|
| Revenue Score | 구글 CPC × 검색량 × CTR 기반 월 예상 수익을 0~100 정규화한 수익 잠재력 지표 |
| Opportunity Score | Traffic(25%)+Revenue(40%)+Difficulty역(25%)+Trend(10%)+SeasonalBonus 최종 합산 |
| primaryAdCategory | 블로그에 고정 지정한 주 광고 카테고리. 구글이 이 카테고리 기반으로 광고 배정 |
| BlogGrade | 실제 AdSense 성과(CPC·RPM·트래픽·카테고리 일관성) 기반 자동 산출 블로그 등급 (S/A/B/NEW/경고) |
| blog_score | BlogGrade 산출용 0~100 종합 점수. 4개 축 가중합 |
| category_cpc_ceiling | BlogGrade CPC 점수 정규화 기준값. 해당 카테고리 S급 CPC 상한 |
| page_rpm | 1,000 페이지뷰당 수익. 트래픽 규모와 무관한 광고 단가 밀도 지표 |
| 배분 매트릭스 | KeywordGrade × BlogGrade 조합별 키워드 배정 비율표 |
| 배분 쿼터 | 등급별 월간 키워드 배정 한도 (S블로그: S키워드 월 40건 등) |
| PASONA | Problem-Affinity-Solution-Offer-Narrow-Action. 6단계 카피라이팅 프레임 |
| 섹션 타겟팅 | `<!-- google_ad_section_start -->` HTML 주석으로 구글 봇에 광고 결정 구간 지정 |
| 롱테일 클러스터 | 의미 연관 롱테일 4~8개 + 메인 키워드를 하나의 포스트로 묶은 단위 |
| 피드백 루프 | 실제 수익 vs 예측 비교 → 가중치 자동 보정 + BlogGrade 갱신하는 자기개선 메커니즘 |
| adKeywords | 카테고리별 S단계에 삽입할 고CPC 트리거 키워드 목록 |
| assigned_blog_grade | 클러스터 배정 시점의 BlogGrade 기록. 성과 분석(grade_matching_performance)에 활용 |
| grade_matching_performance | BlogGrade × KeywordGrade 조합별 실제 성과 집계 뷰. 배분 전략 최적화 근거 데이터 |
| PasonaType | 글 유형: compare(비교) / solve(문제해결) / cost(비용탐색) |
| YoY Growth | 전년 동기 대비 검색량 성장률. 20% 이상 → 성장 키워드 |

---

---

## 11. BlogGrade 심화 로직 (v1.2 추가)

> "겉으로 조작하는 건 90% 자동화, 뒤에선 아주아주 정교한 로직"

---

### 11-1. BlogScore 보정 계수 — 단순 평균이 아닌 이유

4개 축 가중합만으로는 **이상치 블로그**가 과대평가된다.  
예: 트래픽만 많고 CPC가 극도로 낮은 블로그가 B급을 받아 A급 키워드를 받는 문제.  
따라서 다음 **보정 계수**를 blog_score에 곱한다.

```
blog_score_raw = ROUND(cpc×0.4 + rpm×0.3 + session×0.2 + consistency×0.1)

■ 보정 계수 1 — CPC 페널티 (핵심)
  avg_cpc_krw < 500원  → ×0.60   (S급 진입 사실상 불가)
  avg_cpc_krw < 1,000원 → ×0.80
  avg_cpc_krw ≥ 3,000원 → 보정 없음

■ 보정 계수 2 — 일관성 페널티
  consistency_pct < 50% → ×0.0   (경고: 점수 무력화)
  consistency_pct < 60% → ×0.60
  consistency_pct < 70% → ×0.85
  consistency_pct ≥ 70% → 보정 없음

■ 보정 계수 3 — 데이터 신뢰도 (신생 블로그 과대평가 방지)
  adsense_days < 14일  → ×0.30   (데이터 부족)
  adsense_days < 30일  → ×0.60
  adsense_days ≥ 30일  → 보정 없음

blog_score = LEAST(ROUND(blog_score_raw × 보정1 × 보정2 × 보정3), 100)
```

---

### 11-2. 등급 안정성 장치 — 요동 방지

매주 AdSense 데이터 변동으로 등급이 매주 오르락내리락하면 배분이 불안정해진다.

```
■ 등급 승급 조건 (엄격)
  blog_score가 등급 임계값 이상인 상태를 2주 연속 유지해야 승급
  + 추가 조건 (avg_cpc / rpm) 동시 충족 필요
  → 일시적 트래픽 급증으로 인한 허수 승급 방지

■ 등급 강등 조건 (관대)
  blog_score가 임계값 미만인 상태를 3주 연속 유지해야 강등
  → 일시적 데이터 공백(AdSense API 지연 등)으로 인한 허수 강등 방지

■ 구현 컬럼
  blogs.above_threshold_weeks  INTEGER DEFAULT 0  -- 임계값 초과 연속 주수
  blogs.below_threshold_weeks  INTEGER DEFAULT 0  -- 임계값 미만 연속 주수

■ 피드백 루프 로직
  if new_score >= threshold:
    above_threshold_weeks += 1
    below_threshold_weeks = 0
    if above_threshold_weeks >= 2 AND 추가 조건 충족:
      → 승급 실행
  else:
    below_threshold_weeks += 1
    above_threshold_weeks = 0
    if below_threshold_weeks >= 3:
      → 강등 실행
```

---

### 11-3. 쿼터 시스템 세부 설계

쿼터는 **"좋은 키워드를 낭비 없이 쓰는 것"**이 목적이다.  
S급 블로그 40건 제한은 S키워드 희소성을 유지하고, 하위 등급 블로그의 성장 기회를 보장한다.

```
■ 월간 쿼터 한도
  등급      S키워드  A키워드  B키워드  C/D키워드
  S급       40건    無제한   無제한    0건
  A급       20건    30건    無제한    0건
  B급        8건    15건     30건    無제한
  NEW        2건     0건      5건    無제한

■ 쿼터 초기화
  매월 1일 00:00 UTC → 전체 monthly_*_keyword_count = 0

■ 쿼터 소진 시 처리
  당월 쿼터 소진 → 해당 등급 키워드 배정 건 → pending 큐 적재
  → 다음 달 1일 쿼터 초기화 후 자동 배정 재시도

■ 조기 소진 알림
  쿼터 80% 소진 시 → "이번 달 S키워드 쿼터 32/40 소진. 신규 S키워드 8건만 배정 가능합니다."

■ 쿼터 예외 — 계절성 긴급 배정
  SeasonalBonus = 30 (피크 1개월 전) 키워드는 쿼터 소진과 무관하게 +3건 긴급 배정 허용
  → 계절성 피크를 절대 놓치지 않는 안전망
```

---

### 11-4. 배분 매트릭스 자기진화 (v1.2 핵심)

초기에는 `S×S=70%`처럼 고정 비율로 시작하지만,  
**grade_matching_performance** 뷰 데이터가 쌓이면 배분 비율을 자동으로 조정한다.

```
■ 진화 조건 (피드백 루프 배치 내 실행)
  grade_matching_performance 뷰에 각 조합별 post_count ≥ 20건 데이터 존재 시 활성화

■ 진화 로직
  for each (blog_grade, keyword_grade) combination:
    actual_avg_cpc = grade_matching_performance.avg_cpc
    baseline_cpc   = 해당 blog_grade의 avg_cpc_krw 평균

    ratio = actual_avg_cpc / baseline_cpc

    if ratio > 1.2:   → 이 조합이 예상보다 20% 이상 고성과
      배분 비율 +5%p 조정 (상한: +15%p)
    if ratio < 0.8:   → 이 조합이 예상보다 20% 이상 저성과
      배분 비율 -5%p 조정 (하한: -10%p)

■ 안전장치
  조정 후 각 열(keyword_grade별)의 합계가 100%가 되도록 나머지 셀 자동 비례 조정
  조정 기록 → distribution_matrix_history 테이블 저장 (감사 이력)
  급격한 변동 방지: 주당 최대 ±5%p까지만 조정

■ 사용자 노출
  대시보드 > 배분 효율 패널에 현재 매트릭스 표시 (읽기 전용)
  수동 개입 불가 (완전 자동)
```

---

### 11-5. 블로그 건강 종합 진단 — HealthCheck

blog_score 외에, 매주 피드백 루프에서 아래 **이상 패턴 5가지**를 자동 감지한다.

```
■ 패턴 1 — CPC 급락 감지
  이번 주 avg_cpc < 2주 전 avg_cpc × 0.70
  → 원인 추정: 카테고리 혼재 / 어뷰징 의심 광고 / 구글 알고리즘 변화
  → 알림: "보험 블로그 CPC 30% 급락. 카테고리 일관성 즉시 점검 필요"
  → 해당 블로그 S키워드 신규 배정 일시 중단 (2주)

■ 패턴 2 — CTR 이상 저하
  블로그 전체 평균 CTR < 0.3% (3주 연속)
  → PASONA 구조 준수 여부 점검 알림
  → AI 글 재생성 권고

■ 패턴 3 — RPM 정체
  page_rpm 4주 연속 ±5% 이내 변동
  → "CPC 천장 도달 가능성. primaryAdCategory 상위 등급 변경 검토 권고"

■ 패턴 4 — 트래픽만 증가하고 CPC 하락
  monthly_sessions 주간 +20% 이상 증가
  AND avg_cpc_krw 동시 하락 (-10% 이상)
  → 저품질 트래픽 유입 의심
  → 알림: "트래픽 증가에도 CPC 하락 중. 유입 키워드 검토 권고"

■ 패턴 5 — 발행 정체
  최근 14일 발행 포스트 수 = 0
  AND keyword_pool 잔여 클러스터 존재
  → 알림: "발행 공백 2주 지속. 미발행 클러스터 N건 처리 필요"
```

---

### 11-6. DB 추가 컬럼 (v1.2)

```sql
-- blogs 테이블 추가 컬럼
ALTER TABLE blogs ADD COLUMN
  above_threshold_weeks   INTEGER DEFAULT 0,  -- 승급 안정성 카운터
  below_threshold_weeks   INTEGER DEFAULT 0,  -- 강등 안정성 카운터
  adsense_days            INTEGER DEFAULT 0,  -- AdSense 데이터 축적 일수
  health_flags            TEXT[],             -- 이상 패턴 감지 플래그 배열
  health_checked_at       TIMESTAMPTZ;        -- 마지막 헬스체크 시각

-- distribution_matrix 테이블 (배분 매트릭스 이력)
CREATE TABLE distribution_matrix_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id),
  blog_grade      TEXT NOT NULL,    -- 'S'|'A'|'B'|'NEW'
  keyword_grade   TEXT NOT NULL,    -- 'S'|'A'|'B'|'C'|'D'
  ratio_pct       INTEGER NOT NULL, -- 배분 비율 (0~100)
  prev_ratio_pct  INTEGER,
  reason          TEXT,             -- 조정 근거 (성과 데이터 기반)
  applied_at      TIMESTAMPTZ DEFAULT NOW()
);

-- blog_health_log 테이블 (이상 패턴 감지 이력)
CREATE TABLE blog_health_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_id     UUID REFERENCES blogs(id),
  pattern     TEXT NOT NULL,  -- 'cpc_drop'|'ctr_low'|'rpm_stall'|'traffic_cpc_diverge'|'publish_stall'
  severity    TEXT,           -- 'info'|'warning'|'critical'
  detail      JSONB,          -- 구체적 수치 데이터
  resolved_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 11-7. 피드백 루프 최종 실행 순서 (v1.2 완전판)

```
매주 월요일 02:00 UTC 자동 실행

[STEP 1] AdSense 일별 데이터 수집 (모든 블로그)
[STEP 2] post_ad_performance 테이블 적재
[STEP 3] 키워드 가중치 보정 (오차율 > 20% 패턴 ±10%)
[STEP 4] PASONA 유형별 성과 집계 → 발행 비중 자동 조정
[STEP 5] 블로그별 30일 집계 (avg_cpc / rpm / sessions / consistency)
[STEP 6] 보정 계수 3개 적용 → blog_score 재산출
[STEP 7] 승급/강등 안정성 카운터 업데이트 (11-2 로직)
[STEP 8] blog_grade 변경 여부 판정 → 변경 시 알림 발송
[STEP 9] blog_grade_history 이력 저장
[STEP 10] 블로그 HealthCheck 5개 패턴 스캔 → blog_health_log 적재
[STEP 11] 배분 매트릭스 자기진화 판정 (post_count ≥ 20 조합만)
[STEP 12] distribution_matrix_history 저장
[STEP 13] pending 클러스터 재배분 실행 (쿼터 초기화 반영)
[STEP 14] 배분 성과 리포트 생성 (불일치 건수 + 예상 손실 수익)
[STEP 15] 사용자 주간 요약 알림 발송

총 소요 시간 목표: ≤ 5분
```