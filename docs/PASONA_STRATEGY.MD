# PASONA × 문맥 광고 전략 - 수익 최적화 완전 가이드

> **핵심 공식**: 수익 = 트래픽 × CPC × CTR
>
> - **트래픽**: KEYWORD_STRATEGY.MD — 키워드 선택 + 계절성 + 롱테일
> - **CPC**: 문맥 광고 섹션 타겟팅 — 어떤 광고가 붙느냐를 내가 결정
> - **CTR**: PASONA 심리 구조 — 독자가 광고를 자연스럽게 클릭하게 만듦
>
> 세 가지를 동시에 최적화하는 시스템을 구축하는 것이 이 전략의 전부다.

---

## 1. PASONA 공식

일본 마케터 神田昌典(칸다 마사노리)이 정립한 카피라이팅 프레임워크.
독자를 "문제를 인식하고 해결책을 찾는 심리 상태"로 유도하여 광고 클릭을 이끌어낸다.

| 단계 | 의미 | 독자 심리 | 섹션 타겟팅 |
|------|------|----------|------------|
| **P** Problem | 문제 제시 | "맞아, 나 이거야" | `weight=ignore` |
| **A** Affinity | 공감/친근감 | "이 사람 나랑 같네" | `weight=ignore` |
| **S** Solution | 해결 방향 제시 | "어디서 해결하지?" ← **클릭 욕구 최고조** | **`section_start`** ← 핵심 |
| **O** Offer | 더 나은 옵션 시사 | "선택지가 있다" | **`section_start` 유지** |
| **N** Narrow | 긴박감 | "지금 해야겠다" | `section_end` |
| **A** Action | 행동 촉구 | 클릭 준비 완료 | `weight=ignore` |

---

## 2. 구글 문맥 광고 섹션 타겟팅 태그

구글 AdSense 공식 지원 HTML 주석 태그.
구글 봇이 이 태그를 읽고 **"이 안의 내용으로 광고 카테고리를 결정"** 한다.

```html
<!-- google_ad_section_start -->
  고CPC 키워드가 집중된 핵심 내용 (S~O 단계)
  → 보험/금융/법률 키워드가 여기 있으면 해당 광고가 붙음
<!-- google_ad_section_end -->

<!-- google_ad_section_start(weight=ignore) -->
  광고 결정에 영향을 주면 안 되는 내용
  → 헤더, 푸터, 도입부, 잡담, 무관한 메뉴
<!-- google_ad_section_end -->
```

### PASONA + 섹션 타겟팅 완성 구조

```html
<!-- google_ad_section_start(weight=ignore) -->
<p>[P] 독자의 문제 공감 — 도입부, 경험담</p>
<p>[A] 나도 그랬다 — 신뢰 형성 문단</p>
<!-- google_ad_section_end -->


<!-- google_ad_section_start -->
<h2>[S] 핵심 해결 방향 — 고CPC 키워드 집중</h2>
<p>실비보험 비교 시 반드시 확인할 3가지...</p>
<p>보험료 절약 방법, 무료 견적...</p>

<!-- 광고 슬롯 1 — CTR 최고점 -->
<!-- AdSense 광고 코드 위치 -->

<h2>[O] 더 나은 선택지 존재</h2>
<p>지금 무료로 비교할 수 있는 서비스가 있습니다...</p>
<!-- google_ad_section_end -->


<!-- google_ad_section_start(weight=ignore) -->
<p>[N] 긴박감 — 기간 한정, 조건 변경 예정</p>
<p>[A] CTA — 지금 바로 확인하세요</p>
<!-- google_ad_section_end -->
```

---

## 3. 고CPC 광고 카테고리 등급표

글의 주제 선택이 붙는 광고와 CPC를 결정한다.

| 등급 | 카테고리 | 한국어 CPC | 영어 CPC | 섹션 타겟팅 핵심 키워드 |
|------|---------|-----------|---------|----------------------|
| **S** | 법률 | 5,000~20,000원 | $15~$50 | 변호사, 무료상담, 소송, 합의 |
| **S** | 금융/대출 | 3,000~15,000원 | $10~$40 | 대출, 금리비교, 한도조회, 신청 |
| **S** | 보험 | 3,000~12,000원 | $8~$30 | 보험비교, 견적, 가입, 보장 |
| **S** | 부동산/투자 | 2,000~10,000원 | $5~$20 | 청약, 세금, 수익률, 매매 |
| **A** | 의료/건강 | 1,000~8,000원 | $3~$15 | 치료비용, 병원추천, 효과 |
| **A** | B2B SaaS | 2,000~10,000원 | $10~$40 | 추천, 비교, 무료체험, 도입 |
| **A** | 자동차 | 1,000~5,000원 | $3~$10 | 보험비교, 할부, 견적, 신차 |
| **B** | 교육/자격증 | 500~3,000원 | $2~$8 | 강의추천, 합격률, 비용 |
| **B** | 여행 | 500~2,000원 | $1~$5 | 패키지, 예약, 가격비교 |
| **C** | 뷰티/육아 | 200~1,000원 | $0.5~$2 | 추천, 후기, 비교 |
| **D** | 음식/연예 | 50~300원 | $0.1~$0.5 | — |

---

## 4. 에디터 UI 설계 — 클릭 한 번으로 적용

### 4-1. 에디터 툴바에 추가할 버튼 그룹: "광고 최적화"

```
┌─────────────────────────────────────────────────────────┐
│  [기존 툴바 버튼들...]  │  📢 PASONA  │  🎯 타겟 ON  │  🚫 무시  │
└─────────────────────────────────────────────────────────┘
```

**버튼 1: 📢 PASONA 구조 삽입**
- 클릭 시 커서 위치에 PASONA 6단계 템플릿 전체 삽입
- 섹션 타겟팅 태그 포함된 완성 구조

**버튼 2: 🎯 타겟 ON (섹션 타겟팅 시작)**
- 선택한 텍스트 또는 커서 위치에 `<!-- google_ad_section_start -->` 삽입
- 에디터에서 시각적으로 하이라이트 (연두색 배경)

**버튼 3: 🚫 무시 (weight=ignore)**
- 선택한 텍스트를 `<!-- google_ad_section_start(weight=ignore) -->` 로 감쌈
- 에디터에서 시각적으로 회색 배경

**버튼 4: 🏷️ 광고 카테고리 선택 (드롭다운)**
- 보험 / 금융 / 법률 / 의료 / 부동산 / 자동차 / 기타
- 선택 시 해당 카테고리 핵심 키워드 힌트 패널 표시

### 4-2. PASONA 구조 삽입 템플릿 (버튼 1 클릭 시 삽입되는 내용)

```html
<!-- google_ad_section_start(weight=ignore) -->
<p>💡 [P - 문제] 혹시 이런 경험 있으신가요? 독자의 고통을 구체적으로 묘사하세요.</p>

<p>💬 [A - 공감] 저도 똑같이 겪었습니다. 1인칭 경험담으로 신뢰를 형성하세요.</p>
<!-- google_ad_section_end -->


<!-- google_ad_section_start -->
<h2>🔑 [S - 해결] 이렇게 하면 됩니다 — 여기에 고CPC 키워드 집중</h2>
<p>핵심 정보를 제공하되, 완전한 해결책은 주지 마세요. 광고가 완전한 해결책입니다.</p>

<h2>💡 [O - 제안] 더 빠른 방법이 있습니다</h2>
<p>무료로 이용할 수 있는 서비스/방법을 소개하세요.</p>
<!-- google_ad_section_end -->


<!-- google_ad_section_start(weight=ignore) -->
<p>⏰ [N - 긴박감] 지금이 최적의 타이밍입니다. 기간 한정, 조건 변경 예정 등</p>

<p>👉 [A - 행동] 지금 바로 확인하세요. 명확한 CTA로 마무리.</p>
<!-- google_ad_section_end -->
```

### 4-3. 에디터 시각화 (실제 렌더링)

에디터에서 섹션 타겟팅 태그가 보이지 않더라도 **색상 테두리**로 표시:

```
┌─────────────────────────────────────────────────────┐
│ 🚫 회색 영역 (광고 무시)                              │
│   P: 문제 제시 문단                                   │
│   A: 공감 문단                                       │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ 🎯 초록 영역 (광고 타겟팅 활성)                        │
│   S: 보험 비교 방법, 금리 조회, 무료 견적...            │
│                                                     │
│  [광고 슬롯 표시 — 발행 시 AdSense 코드 자동 삽입]      │
│                                                     │
│   O: 더 나은 선택지 소개                              │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ 🚫 회색 영역 (광고 무시)                              │
│   N: 긴박감                                          │
│   A: CTA                                            │
└─────────────────────────────────────────────────────┘
```

### 4-4. 광고 카테고리 힌트 패널 (버튼 4 선택 시 우측 슬라이딩 패널)

```
┌──────────────────────────────────┐
│ 🏷️ 광고 카테고리: 보험            │
├──────────────────────────────────┤
│ S 단계 추천 키워드 (복사하여 사용) │
│                                  │
│ ✅ 실비보험 비교                  │
│ ✅ 보험료 견적                    │
│ ✅ 무료 비교 서비스               │
│ ✅ 보장 내용 확인                 │
│ ✅ 갱신형 vs 비갱신형             │
│                                  │
│ H2 추천 소제목:                   │
│ • "실비보험 비교하는 3가지 기준"  │
│ • "보험료 절약하는 방법"          │
│ • "무료 견적 받는 법"             │
└──────────────────────────────────┘
```

---

## 5. AI 글 생성 자동화 — PASONA 완전 자동 적용

### 5-1. AI 생성 시 섹션 타겟팅 자동 포함

AI가 생성한 글에 섹션 타겟팅 태그가 자동으로 적용되도록 프롬프트 설계:

```typescript
const PASONA_SYSTEM_PROMPT = `
당신은 애드센스 수익 최적화 전문 블로그 작가입니다.

## 출력 형식 (반드시 준수)

글을 다음 HTML 구조로 출력하세요:

<!-- google_ad_section_start(weight=ignore) -->
[P 단계 내용: 독자의 문제를 구체적으로 묘사. 200자 이내.]
[A 단계 내용: 1인칭 공감 경험담. 150자 이내.]
<!-- google_ad_section_end -->

<!-- google_ad_section_start -->
[S 단계 내용: 핵심 해결 방향. H2 소제목 포함. 600자 이상.
 반드시 {adKeywords} 키워드를 소제목과 본문에 자연스럽게 포함.]
[O 단계 내용: 더 나은 선택지 제시. 200자 이내.]
<!-- google_ad_section_end -->

<!-- google_ad_section_start(weight=ignore) -->
[N 단계 내용: 긴박감 조성. 100자 이내.]
[A 단계 내용: 명확한 CTA. 100자 이내.]
<!-- google_ad_section_end -->

## 핵심 규칙
- S 단계에서 완전한 해결책을 주지 않는다 (광고가 해결책처럼 보여야 함)
- S 단계 소제목(H2)에 반드시 고CPC 트리거 키워드 포함
- 광고를 직접 언급하거나 "클릭하세요" 절대 금지
- 전체 분량: 1,800 ~ 2,200자
`

interface AIGenerateInput {
  mainKeyword: string
  relatedKeywords: string[]
  adCategory: string           // 광고 카테고리 (insurance, finance 등)
  blogCategory: string         // 블로그 주제
  pasonaType: PasonaType       // 글 유형
}

type PasonaType = 'compare' | 'solve' | 'cost'
// compare: 비교글 (A vs B)
// solve:   문제해결글
// cost:    비용탐색글

const AD_KEYWORDS: Record<string, string[]> = {
  insurance:   ['실비보험 비교', '보험료 견적', '무료 비교', '보장 내용', '가입 방법'],
  finance:     ['대출 금리 비교', '한도 조회', '낮은 금리', '무료 상담', '신청 방법'],
  legal:       ['변호사 무료 상담', '법적 해결', '소송 비용', '합의 방법'],
  medical:     ['치료 비용', '전문의 추천', '효과적인 치료', '병원 선택'],
  realestate:  ['청약 전략', '세금 절약', '투자 수익률', '매매 타이밍'],
  automobile:  ['자동차 보험 비교', '할부 조건', '견적 받기', '신차 혜택'],
  education:   ['강의 추천', '합격률 비교', '수강료', '자격증 취득'],
  travel:      ['패키지 가격 비교', '최저가 예약', '여행 일정'],
}

function buildPasonaPrompt(input: AIGenerateInput): string {
  const adKeywords = AD_KEYWORDS[input.adCategory]?.join(', ') ?? ''
  const typeGuide = {
    compare: '제목은 "[A] vs [B]" 또는 "TOP N 추천" 형식. S단계는 비교표 포함.',
    solve:   '제목은 "[문제 상황] 해결 방법" 형식. S단계는 원인 분석 + 해결 순서.',
    cost:    '제목은 "[서비스] 비용 얼마?" 형식. S단계는 가격 범위표 + 결정 요인.',
  }[input.pasonaType]

  return `
${PASONA_SYSTEM_PROMPT.replace('{adKeywords}', adKeywords)}

## 작성 요청
- 메인 키워드: ${input.mainKeyword}
- 함께 포함할 키워드: ${input.relatedKeywords.join(', ')}
- 글 유형 가이드: ${typeGuide}
- 광고 카테고리 핵심 키워드 (S단계 소제목에 포함): ${adKeywords}
`
}
```

---

## 6. 발행 파이프라인 — HTML 후처리

### 6-1. 발행 시 자동 처리 항목

```typescript
async function prepareForPublish(rawHtml: string, blogConfig: BlogConfig): Promise<string> {
  let html = rawHtml

  // 1. 섹션 타겟팅 태그가 없으면 자동 삽입
  if (!html.includes('google_ad_section')) {
    html = autoInsertSectionTags(html)
  }

  // 2. 광고 슬롯 자동 삽입 (S단계 직후)
  html = insertAdSlot(html, blogConfig.adsenseSlotId)

  // 3. 헤더/푸터 무시 태그 처리
  html = wrapIgnoreSections(html)

  return html
}

function autoInsertSectionTags(html: string): string {
  // H2 태그 패턴 분석 → Solution 섹션 자동 감지
  // "비교", "방법", "추천", "비용", "해결" 키워드가 있는 H2 이전에 section_start 삽입
  const solutionPattern = /(<h2[^>]*>[^<]*(비교|방법|추천|비용|해결|선택|확인)[^<]*<\/h2>)/gi
  return html.replace(solutionPattern, '<!-- google_ad_section_start -->\n$1')
}

function insertAdSlot(html: string, slotId: string): string {
  // google_ad_section_start 직후 첫 번째 </h2> 뒤에 광고 슬롯 삽입
  const adCode = `
<div class="ad-slot-mid" style="text-align:center;margin:1.5em 0;">
  <!-- AdSense: ${slotId} -->
</div>`
  return html.replace(
    /(<!-- google_ad_section_start -->[\s\S]*?<\/h2>)/,
    `$1${adCode}`
  )
}
```

---

## 7. 멀티 블로그 전략

### 7-1. 블로그별 광고 카테고리 프로파일

각 블로그에 **광고 카테고리를 1~2개 지정**하여 구글이 일관되게 고CPC 광고를 붙이게 한다.
한 블로그가 다양한 주제를 다루면 구글이 광고 카테고리를 결정하지 못해 CPC가 낮아진다.

```typescript
interface BlogAdProfile {
  blogId: string
  blogName: string
  primaryAdCategory: string    // 주 광고 카테고리 (CPC 최우선)
  secondaryAdCategory?: string // 부 광고 카테고리
  adsTxtVerified: boolean      // ads.txt 등록 여부
  adsenseSlotIds: {
    top: string                // 글 상단 슬롯 ID
    mid: string                // S단계 직후 슬롯 ID (핵심)
    bottom: string             // 글 하단 슬롯 ID
  }
}

// 멀티 블로그 예시 구성
const BLOG_AD_PROFILES: BlogAdProfile[] = [
  {
    blogId: 'blog-a',
    blogName: '보험/금융 블로그',
    primaryAdCategory: 'insurance',
    secondaryAdCategory: 'finance',
    // → 모든 글이 보험/금융 주제 → 구글이 일관되게 고CPC 광고 배정
  },
  {
    blogId: 'blog-b',
    blogName: '법률/부동산 블로그',
    primaryAdCategory: 'legal',
    secondaryAdCategory: 'realestate',
  },
  {
    blogId: 'blog-c',
    blogName: '건강/의료 블로그',
    primaryAdCategory: 'medical',
  },
  {
    blogId: 'blog-d',
    blogName: '자동차/여행 블로그 (중간 CPC)',
    primaryAdCategory: 'automobile',
    secondaryAdCategory: 'travel',
  },
]
```

### 7-2. 블로그별 키워드 배분 원칙

```
네트워크 수익 = Σ(블로그별 트래픽 × CPC × CTR)

최적화 방향:
① S급 블로그 (보험/법률/금융): 고CPC 키워드만 배정, 글 수 ≤ 품질
② A급 블로그 (의료/부동산):    중간 CPC + 볼륨 전략
③ B급 블로그 (여행/자동차):    롱테일 볼륨으로 커버
④ 같은 키워드 → 반드시 다른 블로그에 배정 (내부 경쟁 금지)
```

```typescript
function assignKeywordToBlog(
  keyword: KeywordWithScore,
  blogs: BlogAdProfile[]
): string {  // 배정할 blogId 반환
  // 1. 키워드의 광고 카테고리와 블로그 primaryAdCategory 일치 여부
  // 2. 이미 같은 키워드 또는 유사 키워드가 배정된 블로그 제외
  // 3. CPC가 높은 키워드일수록 S급 블로그에 우선 배정
  // 4. 블로그별 일일 발행 한도 초과 시 다음 적합 블로그로
}
```

### 7-3. 블로그 카테고리 일관성 유지 전략

구글은 **블로그 전체의 주제 일관성**을 보고 광고 카테고리 등급을 결정한다.
한 블로그에서 70% 이상의 글이 같은 카테고리일 때 CPC가 안정적으로 높아진다.

```
❌ 나쁜 예: 블로그 A
  - 강아지 사료 추천 (펫)
  - 실비보험 비교 (보험)
  - 맛집 소개 (음식)
  → 구글: 카테고리 불명 → 낮은 CPC 광고 배정

✅ 좋은 예: 블로그 A
  - 실비보험 비교 (보험)
  - 자동차 보험 추천 (보험)
  - 치아보험 가입 방법 (보험)
  - 보험료 절약 방법 (보험)
  → 구글: 보험 전문 블로그 → 고CPC 보험 광고 고정 배정
```

---

## 8. 글 유형별 PASONA 패턴

### 8-1. 비교글 — 구매 의도 최고, CPC 최고

```
제목 패턴:
  "[A] vs [B] — 솔직 비교 후기"
  "[카테고리] TOP 5 추천 2024"
  "내가 [X] 선택한 이유 (직접 비교해봤습니다)"

P: 뭘 골라야 할지 몰라서 고민했던 순간
A: 나도 3개월 동안 비교하다 포기했었다
S: 비교 기준 3가지 + 비교표 (고CPC 키워드 집중)
   ← 광고 (비교 서비스 / 직접 가입 광고)
O: 지금 한 번에 비교할 수 있는 방법
N: 이 조건은 이번 달까지만
A: 무료 비교 견적 받기
```

### 8-2. 문제해결글 — 고민 탐색 → 구매 전환

```
제목 패턴:
  "[문제 상황] 해결하는 방법"
  "왜 [X]가 안 될까? 원인과 해결책"
  "[고통 상황]에서 벗어나는 [N]가지 방법"

P: 고통 상황을 극도로 구체적으로 묘사
A: 나도 6개월 이 문제로 고생했다
S: 근본 원인 분석 + 일반 해결법 (방향만, 완전한 답은 x)
   ← 광고 (전문 서비스/제품 광고)
O: 더 빠른 전문가 해결 방법
N: 방치하면 더 심해진다
A: 전문가 무료 상담
```

### 8-3. 비용탐색글 — 이미 구매 의향 있음, 전환율 최고

```
제목 패턴:
  "[서비스] 비용 얼마나 드나요?"
  "[X] 가격 — 제가 직접 알아봤습니다"
  "[시술/서비스] 가격표 공개"

→ 비용 검색 = 구매 결심 직전 단계 = 광고 클릭 전환율 최고

P: 가격이 제각각이라 믿을 수 없다
A: 나도 4곳 전화해서 다 다른 가격 받았다
S: 가격 범위 + 가격 결정 요인 + 비교 방법
   ← 광고 (견적 비교 / 직접 예약)
O: 한 번에 가격 비교하는 방법
N: 시즌/이벤트로 지금이 가장 저렴
A: 무료 견적 3초 받기
```

---

## 9. DB 스키마 — 광고 최적화 데이터 저장

```sql
-- 블로그 광고 프로파일
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS
  primary_ad_category TEXT,       -- insurance/finance/legal 등
  secondary_ad_category TEXT,
  adsense_slot_top TEXT,
  adsense_slot_mid TEXT,
  adsense_slot_bottom TEXT,
  ads_txt_verified BOOLEAN DEFAULT FALSE;

-- 포스트 광고 성과
CREATE TABLE IF NOT EXISTS post_ad_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID,
  blog_id UUID REFERENCES blogs(id),
  measured_date DATE,
  page_views INTEGER,
  ad_impressions INTEGER,
  ad_clicks INTEGER,
  ctr DECIMAL(5,4),              -- 실제 CTR
  avg_cpc_krw INTEGER,           -- 실제 CPC
  revenue_krw INTEGER,           -- 일 수익
  pasona_type TEXT,              -- compare/solve/cost
  ad_category TEXT,              -- 해당 포스트 광고 카테고리
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PASONA 패턴별 성과 집계 뷰
CREATE VIEW pasona_performance_summary AS
SELECT
  pasona_type,
  ad_category,
  AVG(ctr) as avg_ctr,
  AVG(avg_cpc_krw) as avg_cpc,
  SUM(revenue_krw) as total_revenue,
  COUNT(*) as post_count
FROM post_ad_performance
GROUP BY pasona_type, ad_category
ORDER BY avg_ctr DESC;
```

---

## 10. 전체 수익 최적화 워크플로우

```
[블로그 설정]
    ↓ 각 블로그에 primaryAdCategory 지정 (보험/법률/금융 등)
    ↓ AdSense 슬롯 ID 3개 등록 (상단/중단/하단)
    ↓ ads.txt 검증

[키워드 탐색 → 풀]  (KEYWORD_STRATEGY.MD 참조)
    ↓ Revenue Score = 구글 CPC × 구글 검색량 산출
    ↓ 블로그 primaryAdCategory와 일치하는 키워드 우선 배정
    ↓ 같은 카테고리 키워드가 같은 블로그에 몰리도록 배분

[AI 글 생성]
    ↓ 블로그의 primaryAdCategory → AD_KEYWORDS 로드
    ↓ PASONA 프롬프트 + adKeywords 주입
    ↓ 글 유형(비교/해결/비용) 자동 또는 수동 선택
    ↓ AI 생성 결과: 섹션 타겟팅 태그 포함된 HTML

[에디터 수정]
    ↓ 🎯/🚫 버튼으로 섹션 타겟팅 수동 조정
    ↓ 광고 카테고리 힌트 패널로 키워드 보완
    ↓ S단계 하이라이트 확인

[발행]
    ↓ 섹션 타겟팅 태그 최종 검증
    ↓ 광고 슬롯 S단계 직후 자동 삽입
    ↓ 블로그 포스팅 API 전송

[성과 추적 → 피드백]
    ↓ 일별 CTR / CPC / 수익 수집
    ↓ PASONA 유형별 성과 비교 (비교글 vs 해결글 vs 비용글)
    ↓ 높은 CTR 패턴 → 해당 유형 글 비중 자동 증가
    ↓ 낮은 CTR 블로그 → 광고 카테고리 재설정 권고
```

---

## 11. 구현 우선순위

| Phase | 작업 | 수익 임팩트 | 구현 난이도 |
|-------|------|-----------|-----------|
| **Phase 1** | AI 프롬프트에 PASONA + 섹션 타겟팅 태그 자동 포함 | ★★★★★ | 낮음 (프롬프트만 수정) |
| **Phase 2** | 블로그 프로파일에 primaryAdCategory 필드 추가 | ★★★★★ | 낮음 |
| **Phase 3** | 에디터 툴바에 🎯/🚫 버튼 + PASONA 템플릿 삽입 버튼 | ★★★★☆ | 중간 |
| **Phase 4** | 광고 카테고리 힌트 패널 (슬라이딩) | ★★★★☆ | 중간 |
| **Phase 5** | 발행 파이프라인 HTML 후처리 (광고 슬롯 자동 삽입) | ★★★★☆ | 중간 |
| **Phase 6** | 성과 추적 + PASONA 유형별 CTR 비교 대시보드 | ★★★★★ | 높음 |

> **Phase 1~2는 코드 최소 변경으로 즉시 적용 가능.**
> AI 프롬프트 수정 + 블로그 DB 필드 1개 추가만으로
> CPC와 CTR이 동시에 개선되기 시작한다.
