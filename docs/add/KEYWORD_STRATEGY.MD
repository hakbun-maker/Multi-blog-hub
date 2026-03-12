# SEO 키워드 전략 - 수익 최적화 개발 가이드

> **핵심 목표**: 애드센스 수익 극대화
> 수익 = 트래픽 × CPC × CTR
> 세 변수를 동시에 최적화하는 키워드를 발굴하고, 적기에 발행하는 것이 전략의 전부다.

---

## 1. 데이터 소스 및 역할 분담

### 1순위: 네이버 광고 API — 한국어 트래픽 볼륨
- **목적**: 한국어 키워드의 월간 검색량 + 경쟁도
- **API**: 네이버 검색광고 API (`https://api.naver.com/keywordstool`)
- **제공 데이터**:
  - `monthlyPcQcCnt`: PC 월간 검색량
  - `monthlyMobileQcCnt`: 모바일 월간 검색량
  - `compIdx`: 경쟁도 (low / mid / high)
  - `plAvgDepth`: 평균 노출 순위
- **인증**: 네이버 광고 계정 고객 ID + API 키
- **제한**: 최대 100개/요청, 초당 10회

```typescript
// lib/api/naver-ads.ts
interface NaverKeywordStat {
  relKeyword: string
  monthlyPcQcCnt: number | '<10'
  monthlyMobileQcCnt: number | '<10'
  compIdx: 'low' | 'mid' | 'high'
  plAvgDepth: number
}
```

### 2순위: Google Keyword Planner API — 애드센스 수익의 핵심
- **목적**: CPC (클릭당 단가) + 구글 검색량 → 수익 잠재력 산출
- **왜 수익의 핵심인가**: 애드센스는 구글 트래픽에 붙은 광고에서 발생. 같은 검색량이라도 CPC가 10배 차이나면 수익이 10배 차이남
- **API**: Google Ads API (`googleads.googleapis.com`)
- **제공 데이터**:
  - `avg_monthly_searches`: 월간 평균 검색량
  - `competition`: LOW / MEDIUM / HIGH
  - `low_top_of_page_bid_micros`: CPC 하한 (÷ 1,000,000 = USD)
  - `high_top_of_page_bid_micros`: CPC 상한
- **인증**: Google Ads 계정 + OAuth2 + Developer Token
- **대안**: `DataForSEO API` (유료, 인증 간단)
- **중요**: CPC 데이터는 광고주가 해당 키워드에 입찰하는 금액 → 높을수록 애드센스 수익도 높음

```typescript
// lib/api/google-kwp.ts
interface GoogleKeywordStat {
  keyword: string
  avgMonthlySearches: number
  competition: 'LOW' | 'MEDIUM' | 'HIGH'
  lowCpcMicros: number   // ÷ 1_000_000 = USD
  highCpcMicros: number
  avgCpcKrw: number      // 원화 환산 평균 CPC
}
```

### 3순위: 네이버 데이터랩 API — 트렌드 및 계절성 감지
- **목적**: 시간대별 검색 트렌드 → 계절성 키워드 발굴 + 발행 타이밍 최적화
- **API**: `https://openapi.naver.com/v1/datalab/search`
- **제공 데이터**:
  - 최대 3년치 기간별 상대 검색량 (0~100 지수)
  - 기기 유형별 (PC / 모바일)
  - 성별 / 연령대별 분포
- **인증**: 네이버 개발자센터 Client ID + Secret
- **제한**: 일 1,000회

---

## 2. 수익 중심 점수 체계

> **핵심 설계 원칙**: 트래픽 추정과 수익 잠재력을 분리한다.
> 트래픽이 많아도 CPC가 낮으면 수익이 작다. 반대로 트래픽이 적어도 CPC가 높으면 수익이 크다.

### 2-1. 트래픽 점수 (Traffic Score, 0~100)
방문자 수를 추정하는 지표. 네이버 비중이 높은 이유는 한국 검색 점유율(네이버 ~65%) 때문.

```typescript
function calcTrafficScore(
  naverPc: number,
  naverMobile: number,
  googleMonthly: number,
  isKorean: boolean
): number {
  let volume: number
  if (isKorean) {
    // 한국어: 네이버 검색량 기준, 구글은 보조
    volume = (naverPc + naverMobile) * 0.7 + googleMonthly * 0.3
  } else {
    // 영어: 구글 전체 반영
    volume = googleMonthly
  }
  return Math.min((volume / 10000) * 100, 100)
}
```

### 2-2. 수익 잠재력 점수 (Revenue Score, 0~100)
애드센스 수익에 직결되는 지표. 구글 CPC와 구글 검색량만으로 산출.
**네이버 트래픽도 AdSense 수익에 기여하지만, CPC 데이터는 구글 기준이 유일하게 신뢰 가능하므로 구글 데이터 100% 사용.**

```typescript
function calcRevenueScore(
  googleMonthly: number,  // 구글 월간 검색량
  avgCpcKrw: number,      // 평균 CPC (원)
): number {
  // 월 예상 클릭 수 = 검색량 × 구글 평균 CTR 2.5% × AdSense CTR 3%
  const estimatedClicks = googleMonthly * 0.025 * 0.03
  // 월 예상 수익 (원)
  const estimatedRevenue = estimatedClicks * avgCpcKrw * 0.68  // AdSense 수익 배분율 68%
  // 월 10만원 = 100점 기준으로 정규화
  return Math.min((estimatedRevenue / 100000) * 100, 100)
}
```

### 2-3. SEO 난이도 점수 (Difficulty Score, 0~100)
낮을수록 좋음. 경쟁이 적을수록 적은 노력으로 상위 노출 가능.

```typescript
function calcDifficulty(
  naverCompIdx: 'low' | 'mid' | 'high',
  googleComp: 'LOW' | 'MEDIUM' | 'HIGH',
  plAvgDepth: number
): number {
  const naverScore = { low: 20, mid: 50, high: 80 }[naverCompIdx]
  const googleScore = { LOW: 20, MEDIUM: 50, HIGH: 80 }[googleComp]
  const depthPenalty = Math.min(plAvgDepth * 2, 20)
  return Math.round((naverScore + googleScore) / 2 + depthPenalty)
}
```

### 2-4. 계절성 보너스 점수 (Seasonal Bonus, 0~30)
적기에 발행한 계절성 키워드는 단기간에 폭발적인 트래픽을 만든다.

```typescript
function calcSeasonalBonus(
  trendHistory: number[],  // 12개월 데이터랩 지수
  currentMonth: number     // 현재 월 (1~12)
): number {
  const avg = trendHistory.reduce((a, b) => a + b, 0) / 12
  const peakMonth = trendHistory.indexOf(Math.max(...trendHistory))
  const monthsUntilPeak = (peakMonth - (currentMonth - 1) + 12) % 12

  // 계절성 판단: 최고값이 평균의 2.5배 초과
  if (Math.max(...trendHistory) < avg * 2.5) return 0

  // 피크 3~6주 전일 때 최고 보너스 (색인 반영 시간 고려)
  if (monthsUntilPeak === 1) return 30   // 한 달 전 → 최고 타이밍
  if (monthsUntilPeak === 2) return 15   // 두 달 전 → 준비 단계
  if (monthsUntilPeak === 0) return 5    // 이번 달 → 늦었지만 유효
  return 0
}
```

### 2-5. 최종 기회 점수 (Opportunity Score, 0~100)
수익 최적화를 위해 Revenue Score와 Difficulty에 가장 높은 가중치 부여.

```typescript
function calcOpportunityScore(params: {
  trafficScore: number    // 0~100
  revenueScore: number    // 0~100
  difficulty: number      // 0~100 (낮을수록 좋음)
  trendIndex: number      // 0~100 (데이터랩 현재 지수)
  seasonalBonus: number   // 0~30
}): number {
  const {
    trafficScore, revenueScore, difficulty, trendIndex, seasonalBonus
  } = params

  const base =
    trafficScore  * 0.25 +          // 트래픽 (25%) — 방문자 추정
    revenueScore  * 0.40 +          // 수익성 (40%) ← 핵심 지표
    (1 - difficulty / 100) * 0.25 + // 공략 가능성 (25%)
    (trendIndex / 100)    * 0.10    // 현재 트렌드 모멘텀 (10%)

  // 계절성 보너스 가산 후 100 cap
  return Math.min(Math.round(base * 100 + seasonalBonus), 100)
}
```

---

## 3. 키워드 매트릭스 (수익 중심 재정의)

기존 볼륨/난이도 2축에서 **수익성**을 추가한 3축 분류.

| 등급 | 조건 | 전략 | 예시 |
|------|------|------|------|
| **S — 수익 황금** | Revenue Score ≥60 + Difficulty ≤40 | 최우선 발행, 롱테일 클러스터 풀 활용 | "보험 비교", "펀드 추천" |
| **A — 트래픽 황금** | Traffic Score ≥60 + Difficulty ≤40 | 볼륨으로 광고 노출 극대화 | "강아지 사료 추천" |
| **B — 계절 황금** | Seasonal Bonus ≥20 + Opportunity ≥50 | 피크 3~4주 전 발행 집중 | "수능 선물 추천" |
| **C — 도전** | Revenue or Traffic 높음 + Difficulty >40 | 장기 육성, 내부 링크 집중 | "다이어트 방법" |
| **D — 틈새** | Revenue Score <30 + Difficulty ≤30 | 롱테일 묶음으로만 활용 | "특정 브랜드 후기" |
| **제외** | Revenue Score <20 + Difficulty >60 | 풀에서 삭제 | — |

```typescript
type KeywordGrade = 'S' | 'A' | 'B' | 'C' | 'D' | 'excluded'

function gradeKeyword(
  revenueScore: number,
  trafficScore: number,
  difficulty: number,
  seasonalBonus: number,
  opportunityScore: number
): KeywordGrade {
  if (revenueScore >= 60 && difficulty <= 40) return 'S'
  if (trafficScore >= 60 && difficulty <= 40) return 'A'
  if (seasonalBonus >= 20 && opportunityScore >= 50) return 'B'
  if ((revenueScore >= 40 || trafficScore >= 40) && difficulty > 40) return 'C'
  if (revenueScore < 30 && difficulty <= 30) return 'D'
  if (revenueScore < 20 && difficulty > 60) return 'excluded'
  return 'D'
}
```

---

## 4. 계절성 키워드 발굴 전략

### 4-1. 한국 고정 이벤트 캘린더

시스템에 하드코딩하여 매월 자동으로 관련 키워드를 AI 생성 → DataLab 검증하는 파이프라인의 입력값.

```typescript
const ANNUAL_EVENTS: Record<number, string[]> = {
  1:  ['수능 결과', '대학 원서', '설날 선물', '새해 다이어트', '연말정산'],
  2:  ['발렌타인데이', '졸업 선물', '화이트데이 준비', '봄맞이 다이어트'],
  3:  ['입학 선물', '봄 패션', '봄나들이', '미세먼지 마스크'],
  4:  ['벚꽃 명소', '봄 여행지', '어린이날 선물 준비', '황사 대비'],
  5:  ['어버이날 선물', '스승의날', '어린이날 선물', '가정의달 여행'],
  6:  ['여름 다이어트', '에어컨 추천', '여름 패션', '장마 대비'],
  7:  ['여름휴가 여행지', '피서지 추천', '썬크림 추천', '수영복 추천'],
  8:  ['추석 선물 준비', '개학 준비', '가을 다이어트', '태풍 대비'],
  9:  ['추석 선물', '가을 여행지', '단풍 명소', '운동화 추천'],
  10: ['핼러윈', '단풍 절정', '겨울 패션 준비', '독감 예방접종'],
  11: ['수능 선물', '블랙프라이데이', '김장 재료', '겨울 코트 추천'],
  12: ['크리스마스 선물', '연말 회식', '연말 여행', '새해 계획'],
}
```

### 4-2. 계절성 키워드 자동 발굴 파이프라인

```typescript
async function discoverSeasonalKeywords(
  targetMonth: number  // 발행 목표월 (현재 + 1 또는 + 2)
): Promise<KeywordWithScore[]> {
  // Step 1: 이벤트 캘린더에서 해당 월 이벤트 추출
  const events = ANNUAL_EVENTS[targetMonth]

  // Step 2: AI로 각 이벤트의 롱테일 키워드 20개씩 생성
  const candidates = await generateKeywordsWithAI(events)
  // 프롬프트: "다음 이벤트/주제와 관련하여 한국인이 실제로 검색할
  //           롱테일 키워드 20개를 생성하세요: {events}"

  // Step 3: 네이버 광고 API로 검색량 + 경쟁도 확인
  const naverStats = await fetchNaverKeywordStats(candidates)

  // Step 4: 데이터랩으로 전년 동기 트렌드 확인
  const trendData = await fetchDataLabTrend(candidates, 24) // 2년치

  // Step 5: YoY 상승 + 계절성 점수 산출 후 필터링
  return candidates
    .map(kw => ({
      keyword: kw,
      ...naverStats[kw],
      seasonalBonus: calcSeasonalBonus(trendData[kw], targetMonth),
      yoyGrowth: calcYoYGrowth(trendData[kw]),  // 전년 동기 대비 성장률
    }))
    .filter(kw => kw.seasonalBonus > 0 || kw.yoyGrowth > 0.2) // 20% 이상 성장
    .sort((a, b) => b.seasonalBonus - a.seasonalBonus)
}

// 전년 동기 대비 성장률 계산
function calcYoYGrowth(trendHistory: number[]): number {
  if (trendHistory.length < 13) return 0
  const thisMonth = trendHistory[trendHistory.length - 1]
  const lastYearSameMonth = trendHistory[trendHistory.length - 13]
  return lastYearSameMonth > 0
    ? (thisMonth - lastYearSameMonth) / lastYearSameMonth
    : 0
}
```

### 4-3. 발행 타이밍 자동 계산

구글 색인 반영에 2~4주 소요됨을 고려.

```typescript
function calcOptimalPublishDate(
  peakMonth: number,   // 트래픽 피크 월
  peakDay: number = 15 // 피크 예상일 (기본: 월 중순)
): Date {
  const peakDate = new Date(new Date().getFullYear(), peakMonth - 1, peakDay)
  // 피크 3주 전 발행 = 색인 2주 + 순위 안정화 1주
  peakDate.setDate(peakDate.getDate() - 21)
  return peakDate
}
```

---

## 5. 롱테일 클러스터 전략

### 기본 원칙
- S/A급 메인 키워드 1개 + 연관 롱테일 4~8개를 하나의 포스트로 묶음
- 한 글로 여러 검색 의도를 커버 → 총 노출 기회 극대화
- 클러스터 총 Revenue Score = 개별 합산이 아닌 시너지 (내부 링크 효과)

```typescript
interface KeywordCluster {
  id: string
  mainKeyword: string         // 가장 높은 Opportunity Score
  relatedKeywords: string[]   // 함께 포스트에 포함할 롱테일
  clusterType: 'revenue' | 'traffic' | 'seasonal'  // 클러스터 성격
  totalEstimatedRevenue: number  // 월 예상 수익 (원)
  totalVolume: number
  suggestedTitle: string      // AI 생성 제목 후보
  targetBlogId: string        // 배정된 블로그
  scheduledDate: Date         // 발행 예정일
}

function buildCluster(keywords: KeywordWithScore[]): KeywordCluster[] {
  // 1. 의미적 유사도로 그룹화
  //    - 키워드 앞 2단어 공유 OR 임베딩 코사인 유사도 > 0.75
  // 2. 각 그룹에서 Opportunity Score 1위를 메인으로 지정
  // 3. 나머지 키워드는 본문 소제목 + 자연스러운 문장에 포함
  // 4. clusterType: Revenue Score 합이 가장 큰 쪽으로 분류
}
```

---

## 6. 멀티 블로그 키워드 배분 전략

### 원칙: 같은 네트워크 내 키워드 경쟁 금지 + 블로그 전문성 강화

```typescript
interface BlogProfile {
  blogId: string
  category: string          // 블로그 주제 (예: '육아', '재테크', '맛집')
  avgCpcKrw: number         // 해당 블로그 과거 평균 CPC (수익 성과 데이터)
  assignedKeywords: string[] // 배정 완료된 키워드
}

function distributeKeywords(
  clusters: KeywordCluster[],
  blogs: BlogProfile[]
): KeywordCluster[] {
  // 1. 클러스터의 주제와 블로그 카테고리 친화도 계산
  // 2. 친화도 1위 블로그에 배정 (단, 이미 배정된 키워드 제외)
  // 3. CPC가 높은 블로그에 S등급 키워드 우선 배정
  //    → 같은 키워드라도 고CPC 블로그가 수익이 더 높음
  return clusters.map(cluster => ({
    ...cluster,
    targetBlogId: findBestBlog(cluster, blogs).blogId
  }))
}
```

---

## 7. 콘텐츠 캘린더 자동 생성

### 발행 우선순위 결정 로직

```typescript
interface PublishSchedule {
  cluster: KeywordCluster
  scheduledDate: Date
  priority: number        // 높을수록 먼저
  reason: 'S급-수익황금' | 'A급-트래픽황금' | 'B급-계절황금' | '트렌드급상승'
}

function buildContentCalendar(
  clusters: KeywordCluster[],
  blogs: BlogProfile[],
  postsPerDayPerBlog: number
): PublishSchedule[] {
  return clusters
    .map(cluster => {
      const grade = gradeKeyword(/* ... */)
      const priority =
        grade === 'S' ? 100 :
        grade === 'B' ? 90 :   // 계절성은 S보다 타이밍이 중요
        grade === 'A' ? 70 :
        grade === 'C' ? 40 : 10

      return {
        cluster,
        scheduledDate: cluster.scheduledDate,
        priority,
        reason: grade === 'S' ? 'S급-수익황금' :
                grade === 'B' ? 'B급-계절황금' : 'A급-트래픽황금'
      }
    })
    .sort((a, b) => b.priority - a.priority || a.scheduledDate.getTime() - b.scheduledDate.getTime())
}
```

---

## 8. DB 스키마 확장

```sql
-- keyword_searches 확장
ALTER TABLE keyword_searches ADD COLUMN IF NOT EXISTS
  naver_pc_volume INTEGER,
  naver_mobile_volume INTEGER,
  google_volume INTEGER,
  avg_cpc_krw INTEGER,         -- Google CPC 원화 환산
  traffic_score INTEGER,       -- 0~100
  revenue_score INTEGER,       -- 0~100 ← 핵심 수익 지표
  difficulty_score INTEGER,    -- 0~100
  seasonal_bonus INTEGER,      -- 0~30
  opportunity_score INTEGER,   -- 0~100 최종 점수
  grade TEXT,                  -- S/A/B/C/D/excluded
  trend_history INTEGER[],     -- 24개월 데이터랩 지수 배열
  yoy_growth DECIMAL(4,2),     -- 전년 동기 대비 성장률
  peak_month INTEGER,          -- 트래픽 피크 예상 월
  cluster_id UUID,
  scheduled_date DATE,
  blog_id UUID REFERENCES blogs(id);

-- 키워드 클러스터
CREATE TABLE IF NOT EXISTS keyword_clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  main_keyword TEXT NOT NULL,
  related_keywords TEXT[],
  cluster_type TEXT,           -- revenue/traffic/seasonal
  total_estimated_revenue INTEGER,  -- 월 예상 수익 (원)
  total_volume INTEGER,
  suggested_title TEXT,
  blog_id UUID REFERENCES blogs(id),
  scheduled_date DATE,
  status TEXT DEFAULT 'pending', -- pending/published
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 성과 추적 (피드백 루프용)
CREATE TABLE IF NOT EXISTS keyword_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword_id UUID,
  post_id UUID,
  measured_at DATE,
  actual_impressions INTEGER,
  actual_clicks INTEGER,
  actual_revenue INTEGER,      -- 실제 AdSense 수익 (원)
  search_rank INTEGER,         -- 구글 검색 순위
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 9. API Route 구현 계획

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/api/keywords/search` | GET | **수정**: 네이버 광고 API + Google KWP 실제 호출 |
| `/api/keywords/pool` | GET/POST | 유지 |
| `/api/keywords/analyze` | POST | **신규**: 배치 분석 (여러 키워드 동시, revenue_score 산출) |
| `/api/keywords/seasonal` | GET | **신규**: 다음 달 계절성 키워드 자동 추천 |
| `/api/keywords/cluster` | POST | **신규**: 롱테일 클러스터 생성 |
| `/api/keywords/schedule` | GET/POST | **신규**: 콘텐츠 캘린더 조회/생성 |
| `/api/keywords/trend` | GET | **신규**: 데이터랩 트렌드 + YoY 성장률 |
| `/api/keywords/performance` | POST | **신규**: 성과 데이터 수집 (피드백 루프) |

### 환경변수

```env
# 네이버 광고 API
NAVER_ADS_API_KEY=
NAVER_ADS_SECRET_KEY=
NAVER_ADS_CUSTOMER_ID=

# 네이버 데이터랩
NAVER_CLIENT_ID=
NAVER_CLIENT_SECRET=

# Google Ads API (KWP + CPC 데이터)
GOOGLE_ADS_DEVELOPER_TOKEN=
GOOGLE_ADS_CLIENT_ID=
GOOGLE_ADS_CLIENT_SECRET=
GOOGLE_ADS_REFRESH_TOKEN=
GOOGLE_ADS_CUSTOMER_ID=

# 환율 (CPC 원화 환산용, 주기적 갱신 필요)
USD_TO_KRW=1380
```

---

## 10. 수익 최적화 전체 흐름

```
[자동 계절성 탐색] — 월 1회 자동 실행
    ↓ ANNUAL_EVENTS 캘린더 → AI 키워드 생성 (다음 달 + 다다음 달)
    ↓ 네이버 광고 API → 검색량 + 경쟁도
    ↓ Google KWP → CPC (수익 잠재력 핵심)
    ↓ 데이터랩 → 2년치 트렌드 + YoY 성장률
    ↓ Revenue Score + Seasonal Bonus + Opportunity Score 산출
    ↓ 등급 분류 (S/A/B/C/D) → keyword_pool 자동 적재

[키워드 탐색기] — 사용자 수동 탐색
    ↓ 동일 점수 체계로 분석 → keyword_pool 추가

[키워드 풀 → 클러스터링]
    ↓ S/A/B급 키워드 자동 클러스터 생성
    ↓ 블로그 배분 (주제 친화도 + 블로그 평균 CPC 고려)
    ↓ 최적 발행일 계산 (계절성: 피크 3주 전, 일반: 즉시)

[에디터 / AI 글 생성]
    ↓ scheduled_date = 오늘인 클러스터 자동 로드
    ↓ AI 생성 시 메인 키워드 + 롱테일 클러스터 전체 전달
    ↓ "이 키워드들이 자연스럽게 포함된 글을 작성하라" 지시
    ↓ 발행 완료 → status: 'published' + 성과 추적 시작

[성과 추적 → 피드백 루프] — 주 1회
    ↓ 실제 AdSense 수익 vs Revenue Score 예측값 비교
    ↓ 오차가 큰 키워드 → 가중치 자동 보정
    ↓ 잘 맞는 키워드 패턴 → 유사 키워드 자동 추천
```

---

## 11. 구현 우선순위

| Phase | 작업 | 수익 임팩트 |
|-------|------|-----------|
| **Phase 1** | 네이버 광고 API 연동 → 실제 검색량/경쟁도 | ★★★★☆ |
| **Phase 2** | Google KWP 연동 → CPC 데이터 + Revenue Score 산출 | ★★★★★ |
| **Phase 3** | 데이터랩 연동 → 트렌드 + YoY + 계절성 자동 탐색 | ★★★★★ |
| **Phase 4** | DB 스키마 확장 + 클러스터링 로직 | ★★★★☆ |
| **Phase 5** | 콘텐츠 캘린더 UI + 에디터 자동 키워드 로드 | ★★★★☆ |
| **Phase 6** | 성과 추적 테이블 + AdSense 수익 연동 | ★★★★★ |
| **Phase 7** | 피드백 루프 — 실적 기반 가중치 자동 보정 | ★★★★★ |

> Phase 2와 3이 수익 임팩트 최고. Google CPC 없이는 Revenue Score를 계산할 수 없고,
> 계절성 없이는 "적기 발행"이 불가능하다.
> Phase 6~7은 장기적으로 시스템이 스스로 개선되는 구조를 만든다.
