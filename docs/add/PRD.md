# PRD — 멀티 블로그 수익화 자동화 플랫폼
**Product Requirements Document v2.0**

---

## 문서 정보

| 항목 | 내용 |
|------|------|
| 제품명 | 멀티 블로그 수익화 자동화 플랫폼 (Multi-Blog Revenue Platform) |
| 버전 | v2.0 |
| 상태 | 기획 확정 |
| 핵심 공식 | **수익 = 트래픽 × CPC × CTR** |
| 기반 전략 | KEYWORD_STRATEGY.MD + PASONA_STRATEGY.MD |
| 핵심 변경 | 자체 블로그 생성 + 페르소나 자동화 + 완전 무인 발행 |

---

## 목차

1. [제품 개요](#1-제품-개요)
2. [3대 워크플로우 — 전체 그림](#2-3대-워크플로우--전체-그림)
3. [워크플로우 1: 블로그 제작](#3-워크플로우-1-블로그-제작)
4. [워크플로우 2: 키워드 발굴 & 스케줄링](#4-워크플로우-2-키워드-발굴--스케줄링)
5. [워크플로우 3: 글 자동 발행](#5-워크플로우-3-글-자동-발행)
6. [시스템 아키텍처](#6-시스템-아키텍처)
7. [데이터 모델 (DB 스키마)](#7-데이터-모델-db-스키마)
8. [외부 API 연동](#8-외부-api-연동)
9. [내부 API 라우트](#9-내부-api-라우트)
10. [비기능 요구사항](#10-비기능-요구사항)
11. [개발 로드맵](#11-개발-로드맵)
12. [용어 정의](#12-용어-정의)

---

## 1. 제품 개요

### 1-1. 한 줄 요약
> 자체 블로그를 직접 생성·운영하면서, 블로그마다 고유한 페르소나를 부여하고, 키워드 발굴부터 글+이미지 생성·예약 발행·성과 추적까지 전 과정을 **사람 손 한 번 안 대고** 자동화하는 AdSense 수익 극대화 플랫폼.

### 1-2. 기존 버전과의 핵심 차이

| 항목 | v1.0 (기존) | v2.0 (현재) |
|------|-------------|-------------|
| 블로그 | 티스토리/워드프레스 외부 플랫폼에 API로 연동 | **자체 웹서비스로 블로그를 직접 생성** (개별 도메인, 자체 호스팅) |
| 글 스타일 | 동일한 AI 톤으로 생성 | **블로그별 페르소나** — 각각 다른 사람이 쓴 것처럼 문체·어조·습관 전부 다름 |
| 발행 방식 | 에디터 검토 후 수동 발행 | **완전 무인 예약 발행** — 날짜+시간 자동 배정, 글+이미지 생성부터 발행까지 무개입 |
| 캘린더 | 단순 월간/주간 뷰 | **표(Table) 뷰 + 캘린더 뷰** 동시 지원, 필터·정렬·수정·발행상태·바로가기 링크 |
| 이미지 | 없음 | **AI 이미지 자동 생성** — 글에 어울리는 대표 이미지 + 본문 이미지 |
| 발행 시간 | 시간 개념 없음 | **오전 7시~오후 8시, 1시간+ 간격 랜덤 배정** — 사람이 직접 쓴 듯한 패턴 |

### 1-3. 핵심 수익 공식
```
수익 = 트래픽 × CPC × CTR

트래픽 → KEYWORD STRATEGY   : 고검색량·저경쟁·계절성 키워드 자동 발굴
CPC    → BLOG PERSONA       : 블로그별 광고 카테고리 고정 → 고CPC 광고 배정 유도
CTR    → PASONA + 문맥광고   : P→A→S→O→N→A 심리 구조 + 섹션 타겟팅 태그
```

### 1-4. 제품이 해결하는 문제
- 외부 플랫폼(티스토리 등)의 정책 변경으로 수익 기반이 흔들림
- 블로그 글이 모두 같은 AI 톤으로 쓰여 부자연스러움
- 수동 키워드 조사에 매주 수십 시간 소요
- 블로그 주제가 뒤섞여 구글이 낮은 CPC 광고를 배정
- 글 구조가 광고 클릭을 유도하지 못해 CTR이 낮음
- 발행 시간이 불규칙하거나 패턴이 기계적이어서 자연스럽지 못함
- 이미지를 별도로 제작해야 하는 번거로움

---

## 2. 3대 워크플로우 — 전체 그림

아래는 플랫폼의 전체 동작을 한눈에 보여주는 3단계 파이프라인이다.

```
╔══════════════════════════════════════════════════════════════════════════╗
║  WORKFLOW 1 — 블로그 제작 (최초 1회 + 필요 시 추가)                       ║
║                                                                        ║
║  [블로그 생성]                                                          ║
║      ↓ 유형 선택: 법률 / 의료 / 금융 / 보험 / 부동산 / 교육 / 여행 ...    ║
║      ↓ 도메인 연결: law-insight.kr, health-story.kr ...                  ║
║      ↓ 페르소나 부여: 이름, 나이, 직업, 말투, 습관어, 문장 길이 ...        ║
║      ↓ 디자인 템플릿: 유형에 맞는 레이아웃 자동 적용                      ║
║      ↓ AdSense 설정: 슬롯 ID 등록, ads.txt 자동 생성                    ║
║      ↓ 완성: 개별 URL을 가진 독립 블로그 → 바로 글 수용 가능              ║
║                                                                        ║
╠══════════════════════════════════════════════════════════════════════════╣
║  WORKFLOW 2 — 키워드 발굴 & 스케줄링 (자동 + 수동)                       ║
║                                                                        ║
║  [키워드 발굴]                                                          ║
║      ↓ 자동 탐색: 월 1회, ANNUAL_EVENTS 기반 계절성 키워드               ║
║      ↓ 수동 탐색: 사용자가 직접 키워드 입력 → 즉시 분석                   ║
║      ↓ 5단계 점수: Traffic / Revenue / Difficulty / Seasonal / Opportunity║
║      ↓ 등급 분류: S(수익황금) / A(트래픽황금) / B(계절황금) / C / D        ║
║                                                                        ║
║  [블로그 매칭]                                                          ║
║      ↓ 키워드 광고카테고리 ↔ 블로그 primaryAdCategory 매칭               ║
║      ↓ 하루 최대 3개/블로그, 초과 시 동일 유형 다른 블로그로 분산          ║
║      ↓ 같은 키워드 네트워크 내 중복 배정 금지                             ║
║                                                                        ║
║  [발행 스케줄 생성]                                                      ║
║      ↓ 발행일 자동 계산 (계절성: 피크 -21일 / 일반: 즉시)                 ║
║      ↓ 발행 시간: 07:00~20:00 사이 1시간+ 간격 랜덤 배정                 ║
║      ↓ ANNUAL_EVENTS 캘린더에 등록                                      ║
║      ↓ 캘린더 뷰 + 표(Table) 뷰로 조회 가능                             ║
║      ↓ 필터·정렬·수정·발행상태 확인·해당 글 바로가기                      ║
║                                                                        ║
╠══════════════════════════════════════════════════════════════════════════╣
║  WORKFLOW 3 — 글 자동 발행 (완전 무인)                                   ║
║                                                                        ║
║  [예약 시간 도달]                                                        ║
║      ↓ 스케줄러가 해당 키워드 + 블로그 페르소나 정보 로드                  ║
║      ↓ PASONA 법칙 + 문맥광고 전략으로 HTML 글 자동 생성                  ║
║      ↓ 블로그 페르소나의 문체·어조·습관어로 작성 (= 다른 사람이 쓴 느낌)   ║
║      ↓ AI 이미지 생성: 대표이미지 1장 + 본문 삽화 1~2장                  ║
║      ↓ 섹션 타겟팅 태그 + 광고 슬롯 자동 삽입                           ║
║      ↓ 해당 블로그에 자동 발행 (= 사람 개입 제로)                        ║
║      ↓ 발행 완료 → 캘린더/표에 상태 업데이트 + 글 URL 기록               ║
║                                                                        ║
║  [성과 추적 → 피드백 루프] (주 1회 자동)                                 ║
║      ↓ AdSense 실제 수익 vs 예측 비교 → 가중치 자동 보정                 ║
║      ↓ 잘 되는 글 유형/키워드 패턴 → 다음 발행에 자동 반영               ║
║                                                                        ║
╚══════════════════════════════════════════════════════════════════════════╝
```

---

## 3. 워크플로우 1: 블로그 제작

### 3-1. 핵심 개념

이 플랫폼에서 블로그는 티스토리나 워드프레스 같은 **외부 플랫폼이 아니다**.
우리 시스템이 **웹서비스를 직접 만들어서 블로그를 생성**한다.
각 블로그는 **자기만의 도메인**, **자기만의 디자인**, **자기만의 페르소나**를 가진 완전히 독립된 웹사이트다.

```
생성 예시:

  블로그 1: law-insight.kr
  → 법률 전문, "김정현 변호사" 페르소나
  → 차분하고 권위있는 문체, 법률 용어 자연스럽게 사용
  → 판서 느낌의 깔끔한 디자인

  블로그 2: health-story.kr
  → 의료/건강 전문, "박소연 간호사" 페르소나
  → 친근하고 따뜻한 문체, 경험담 위주
  → 밝고 깨끗한 의료 느낌 디자인

  블로그 3: money-sense.kr
  → 금융/재테크 전문, "이동훈 재무설계사" 페르소나
  → 숫자에 강하고 논리적인 문체, 표/수치 즐겨 사용
  → 세련된 금융 느낌 디자인

  → 3개 블로그가 모두 다른 사람이 운영하는 것처럼 보임
  → 실제로는 하나의 플랫폼에서 전부 자동 관리
```

### 3-2. 블로그 생성 프로세스

#### Step 1: 유형(카테고리) 선택

사용자가 블로그의 주제 유형을 선택하면, 해당 유형에 최적화된 설정이 자동으로 준비된다.

| 등급 | 유형 | CPC 범위 (한국어) | 블로그 성격 |
|------|------|-----------------|-----------|
| S | 법률 | 5,000~20,000원 | 법률 상담·판례·절차 안내 전문 블로그 |
| S | 금융/대출 | 3,000~15,000원 | 재테크·대출·투자 정보 블로그 |
| S | 보험 | 3,000~12,000원 | 보험 비교·가입 가이드 블로그 |
| S | 부동산/투자 | 2,000~10,000원 | 부동산 시장·청약·세금 블로그 |
| A | 의료/건강 | 1,000~8,000원 | 건강 정보·질병·치료 블로그 |
| A | B2B SaaS | 2,000~10,000원 | 업무 도구·솔루션 리뷰 블로그 |
| A | 자동차 | 1,000~5,000원 | 자동차 구매·보험·관리 블로그 |
| B | 교육/자격증 | 500~3,000원 | 학습·시험·자격증 블로그 |
| B | 여행 | 500~2,000원 | 여행지·숙소·패키지 블로그 |
| C | 뷰티/육아 | 200~1,000원 | 뷰티·육아 팁 블로그 |
| D | 음식/연예 | 50~300원 | 맛집·엔터테인먼트 블로그 |

#### Step 2: 페르소나 설정 ★ 핵심

각 블로그에는 **가상의 작성자 페르소나**가 부여된다.
이 페르소나가 글의 문체, 어조, 습관, 표현 방식을 전부 결정한다.
**같은 키워드를 줘도 블로그마다 완전히 다른 글이 나온다.**

```typescript
interface BlogPersona {
  // === 기본 인물 정보 ===
  penName: string              // 필명: "김정현", "박소연"
  age: number                  // 나이: 38
  gender: string               // 성별: "남성"
  occupation: string           // 직업: "변호사 출신 법률 칼럼니스트"
  experience: string           // 경력: "대형 로펌 10년 근무 후 독립"

  // === 글쓰기 스타일 ===
  writingTone: string          // 기본 어조: "차분하고 권위있지만 친근한"
  sentenceStyle: string        // 문장 스타일: "짧은 문장 선호, 핵심을 먼저 말함"
  avgSentenceLength: string    // 문장 길이: "15~25자 짧은 문장 위주"
  paragraphStyle: string       // 단락 구성: "한 단락 3~4문장, 핵심→부연→예시"

  // === 개성 요소 ===
  habitPhrases: string[]       // 습관어/입버릇:
                               //   ["솔직히 말씀드리면", "제 경험상", "핵심은 이겁니다"]
  emojiUsage: string           // 이모지 사용: "거의 안 씀, 간혹 ⚠️ 정도"
  titlePattern: string         // 제목 패턴: "[법률용어] 쉽게 풀어본 ~"
  openingStyle: string         // 도입부 스타일: "질문으로 시작 → 바로 핵심"
  closingStyle: string         // 마무리 스타일: "요약 정리 + '도움이 되셨길 바랍니다'"

  // === 전문성 표현 ===
  expertiseLevel: string       // 전문성 수준: "전문가이지만 비전문가에게 설명하듯"
  technicalTermUsage: string   // 전문 용어: "법률 용어 사용 후 괄호 안에 쉬운 설명"
  dataUsage: string            // 데이터 활용: "판례 번호, 법조항 인용 즐겨 함"

  // === 독자와의 관계 ===
  readerAddress: string        // 독자 호칭: "여러분", "독자님"
  personalAnecdote: boolean    // 개인 경험담 포함: true
  humorLevel: string           // 유머 수준: "가끔 가벼운 비유, 절대 과하지 않게"
}
```

**페르소나가 글에 미치는 영향 — 같은 키워드 "실비보험 비교"의 예시:**

```
📝 블로그 A (보험 전문 — "이재원 보험 분석가" 페르소나)
제목: "2024 실비보험 비교 — 보험료만 보면 큰코다칩니다"
도입: "보험 업계에서 15년을 일하면서 가장 많이 받는 질문이 있습니다.
      '실비보험, 그냥 싼 거 들면 되는 거 아니에요?'
      솔직히 말씀드리면, 절대 그렇지 않습니다."
→ 전문가 톤, 단정적, 숫자 비교표 활용

📝 블로그 B (건강/의료 전문 — "박소연 간호사" 페르소나)
제목: "실비보험 비교해봤어요 — 간호사인 제가 직접 고른 기준"
도입: "병원에서 일하다 보면 환자분들이 보험 얘기를 정말 많이 하세요.
      '간호사님, 실비보험 어디가 좋아요?' 이런 질문요.
      저도 작년에 실비를 갈아탔는데, 그때 꽤 고민했거든요."
→ 친근한 톤, 경험담 중심, 공감 위주
```

#### Step 3: 도메인 연결

| 설정 항목 | 설명 |
|----------|------|
| 커스텀 도메인 | 사용자 소유 도메인 연결 (예: law-insight.kr) |
| 서브도메인 | 기본 제공 (예: law-insight.platform.com) |
| SSL 인증서 | Let's Encrypt 자동 발급 |
| DNS 설정 | CNAME 레코드 안내 + 자동 검증 |

#### Step 4: 디자인 & 레이아웃

블로그 유형에 맞는 **디자인 템플릿이 자동 적용**된다.

```
법률 블로그  → 다크 네이비 + 골드 포인트, 서체: 명조 계열, 깔끔한 카드 레이아웃
의료 블로그  → 화이트 + 스카이블루, 서체: 고딕 계열, 넓은 여백
금융 블로그  → 다크 그린 + 화이트, 서체: 고딕 계열, 차트/표 강조 레이아웃
여행 블로그  → 밝은 오렌지 + 화이트, 서체: 둥근 고딕, 이미지 중심 그리드
```

사용자는 템플릿을 커스터마이징할 수 있지만, 기본 제공 템플릿만으로도 전문 블로그처럼 보인다.

#### Step 5: AdSense 설정

| 설정 항목 | 설명 |
|----------|------|
| primaryAdCategory | 주 광고 카테고리 (필수, 1개) |
| secondaryAdCategory | 부 광고 카테고리 (선택, 1개) |
| adsense_slot_top | 글 상단 광고 슬롯 ID |
| adsense_slot_mid | S단계 직후 광고 슬롯 ID ★핵심 |
| adsense_slot_bottom | 글 하단 광고 슬롯 ID |
| ads.txt | 자동 생성 및 루트 디렉토리 배치 |

#### Step 6: 블로그 완성 → 글 수용 가능 상태

생성된 블로그는 즉시 글을 받을 수 있는 상태가 된다.
별도의 설치나 설정 없이, 워크플로우 3에서 생성된 글이 바로 이 블로그에 발행된다.

### 3-3. 블로그 관리 기능

**FR-B-001 블로그 목록 대시보드**
- 블로그별 카드: 이름, 도메인, 페르소나 아바타, 카테고리 등급(S/A/B), 월 수익, 평균 CPC, 발행 포스트 수
- 상태 표시: 활성 / 일시정지 / 도메인 미연결

**FR-B-002 블로그 카테고리 일관성 경보**
- 포스트의 카테고리 분포를 분석하여 primaryAdCategory 비율이 70% 미만이면 경고 배지 표시
- "보험 블로그인데 여행 글이 35% → CPC 하락 위험" 같은 구체적 경고

**FR-B-003 페르소나 미리보기**
- 샘플 키워드로 300자 미리보기 글 생성
- 페르소나가 제대로 반영되는지 사용자가 확인 후 조정 가능

**FR-B-004 블로그 복제**
- 기존 블로그의 설정(페르소나/디자인/카테고리)을 복사하여 새 블로그 빠르게 생성
- 페르소나는 복제 후 반드시 변경 (동일 페르소나 블로그 2개 이상 금지)

---

## 4. 워크플로우 2: 키워드 발굴 & 스케줄링

### 4-1. 키워드 발굴

#### 4-1-1. 데이터 소스

| 소스 | API | 수집 데이터 | 역할 |
|------|-----|-----------|------|
| 네이버 광고 API | `api.naver.com/keywordstool` | PC/모바일 검색량, 경쟁도, 평균 노출 순위 | 트래픽 점수 |
| Google Keyword Planner | `googleads.googleapis.com` | avg_monthly_searches, CPC(micros), competition | 수익 점수 (핵심) |
| 네이버 데이터랩 | `openapi.naver.com/v1/datalab/search` | 2년치 상대 검색량 지수, 기기/성별/연령 분포 | 계절성 점수 |

#### 4-1-2. 5단계 점수 체계

**① Traffic Score (0~100)** — 방문자 추정
```
한국어: volume = (naverPc + naverMobile) × 0.7 + googleMonthly × 0.3
영어:   volume = googleMonthly
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
조건: max(trendHistory) > avg(trendHistory) × 2.5  → 계절성 키워드로 판정
피크 1개월 전: +30점  /  2개월 전: +15점  /  당월: +5점
```

**⑤ Opportunity Score (0~100)** — 최종 기회 점수
```
base = Traffic × 0.25 + Revenue × 0.40 + (1 - Difficulty/100) × 0.25 + trendIndex/100 × 0.10
Opportunity Score = min(round(base × 100) + SeasonalBonus, 100)
```

#### 4-1-3. 키워드 등급 분류

| 등급 | 조건 | 전략 |
|------|------|------|
| **S — 수익 황금** | Revenue ≥ 60 AND Difficulty ≤ 40 | 최우선 발행, S급 블로그 배정 |
| **A — 트래픽 황금** | Traffic ≥ 60 AND Difficulty ≤ 40 | 볼륨 극대화, A급 블로그 배정 |
| **B — 계절 황금** | SeasonalBonus ≥ 20 AND Opportunity ≥ 50 | 피크 3~4주 전 집중 발행 |
| **C — 도전** | (Revenue ≥ 40 OR Traffic ≥ 40) AND Difficulty > 40 | 장기 육성, 내부 링크 집중 |
| **D — 틈새** | Revenue < 30 AND Difficulty ≤ 30 | 롱테일 묶음으로만 활용 |
| **제외** | Revenue < 20 AND Difficulty > 60 | 풀에서 자동 삭제 |

#### 4-1-4. 계절성 키워드 자동 발굴 파이프라인

**실행 주기**: 월 1회 자동 (매월 1일 00:00)

```
Step 1. ANNUAL_EVENTS 캘린더에서 targetMonth(+1, +2개월) 이벤트 추출
Step 2. Claude API → 각 이벤트별 롱테일 키워드 20개 생성
Step 3. 네이버 광고 API → 검색량 + 경쟁도 수집
Step 4. 데이터랩 API → 24개월 트렌드 + YoY 성장률 계산
Step 5. SeasonalBonus > 0 OR YoY > 20% → 필터링
Step 6. keyword_pool 테이블에 grade와 함께 자동 적재
```

**ANNUAL_EVENTS 캘린더 (하드코딩)**:
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

#### 4-1-5. 롱테일 클러스터 생성

**기본 원칙**: S/A급 메인 키워드 1개 + 연관 롱테일 4~8개를 하나의 포스트로 묶음

**그룹화 알고리즘**:
1. 키워드 앞 2단어 공유 → 동일 클러스터
2. 임베딩 코사인 유사도 > 0.75 → 동일 클러스터
3. 각 클러스터에서 Opportunity Score 1위 = 메인 키워드
4. 클러스터 타입 분류: `revenue` / `traffic` / `seasonal`

### 4-2. 블로그 매칭 ★ 핵심 로직

발굴된 키워드는 가장 적합한 블로그에 배정되어야 한다.

#### 4-2-1. 매칭 알고리즘

```
1단계: 카테고리 매칭
  키워드의 adCategory ↔ 블로그의 primaryAdCategory 일치 확인
  예: "실비보험 비교" (insurance) → 보험 블로그에 배정

2단계: 중복 검사
  이미 동일/유사 키워드가 배정된 블로그 제외 (내부 경쟁 방지)

3단계: 수익 우선 배정
  Revenue Score 높은 키워드 → 평균 CPC가 높은 블로그에 우선 배정

4단계: 일일 한도 검사
  블로그당 하루 최대 3개 글
  초과 시 → 동일 카테고리의 다른 블로그로 자동 이동
  동일 카테고리 블로그가 없거나 모두 차면 → 다음 날로 밀림

5단계: 배분 균형
  특정 블로그에 키워드가 몰리지 않도록 라운드로빈 방식 적용
```

#### 4-2-2. 일일 발행 한도 & 오버플로우 처리

```
규칙:
- 블로그당 하루 최대 3개 글
- 키워드가 3개 이상 동일 블로그에 쌓이면:
    1순위: 같은 primaryAdCategory를 가진 다른 블로그로 이동
    2순위: secondaryAdCategory가 일치하는 블로그로 이동
    3순위: 다음 날로 밀림 (priority에 따라 순서 유지)

예시:
  "실비보험 비교" → 보험블로그A (오늘 1/3)
  "자동차보험 추천" → 보험블로그A (오늘 2/3)
  "보험료 절약법" → 보험블로그A (오늘 3/3, 한도 도달)
  "치아보험 가입" → 보험블로그B로 자동 이동 (오버플로우)
  "생명보험 비교" → 보험블로그B (2/3)
```

### 4-3. 발행 스케줄 생성 ★ 자연스러운 발행 패턴

#### 4-3-1. 발행 시간 배정 규칙

사람이 직접 글을 쓰고 발행하는 것처럼 보이게 하는 것이 핵심이다.

```
규칙 1: 발행 가능 시간대
  오전 7:00 ~ 오후 8:00 (13시간 범위)
  → 새벽이나 심야에는 절대 발행하지 않음

규칙 2: 최소 간격
  같은 블로그에서 연속 발행 시 최소 1시간 이상 간격
  → 07:15에 첫 글이면, 두 번째는 08:15 이후

규칙 3: 랜덤 분배
  시간대를 3등분하여 균등 분배:
    아침 (07:00~11:00) → 1번째 글
    점심 (11:00~15:00) → 2번째 글
    오후 (15:00~20:00) → 3번째 글
  각 시간대 내에서 분 단위 랜덤 (예: 07:23, 12:47, 17:05)

규칙 4: 블로그 간 시간 분산
  같은 시간대에 여러 블로그가 발행할 경우,
  블로그별로 5분 이상 차이를 둠
  → 법률블로그 07:23, 금융블로그 07:31, 의료블로그 07:38

규칙 5: 요일별 패턴 변화
  월~금: 3개/일 발행 가능
  토~일: 1~2개/일로 줄여서 자연스러운 패턴
```

#### 4-3-2. 발행 시간 배정 알고리즘

```typescript
function assignPublishTimes(
  blogId: string,
  date: Date,
  postCount: number  // 1~3
): Date[] {
  const isWeekend = date.getDay() === 0 || date.getDay() === 6
  const maxPosts = isWeekend ? Math.min(postCount, 2) : postCount

  // 시간대 구간 정의
  const slots = [
    { start: 7*60, end: 11*60 },   // 아침: 420~660분
    { start: 11*60, end: 15*60 },  // 점심: 660~900분
    { start: 15*60, end: 20*60 },  // 오후: 900~1200분
  ]

  const times: Date[] = []
  for (let i = 0; i < maxPosts; i++) {
    const slot = slots[i]
    // 구간 내 랜덤 분 선택
    const randomMinute = slot.start + Math.floor(Math.random() * (slot.end - slot.start))
    const publishTime = new Date(date)
    publishTime.setHours(Math.floor(randomMinute / 60), randomMinute % 60, 0, 0)
    times.push(publishTime)
  }

  return times
}
```

### 4-4. ANNUAL_EVENTS 캘린더 ★ 통합 조회 인터페이스

캘린더는 발행 스케줄의 **사령탑**이다.
단순히 날짜만 보여주는 게 아니라, **모든 키워드의 생애 주기**를 추적한다.

#### 4-4-1. 캘린더 뷰 (Calendar View)

```
┌──────────────────────────────────────────────────────────────┐
│  ← 2026년 3월                                        오늘 → │
├──────┬──────┬──────┬──────┬──────┬──────┬──────┤
│  월   │  화   │  수   │  목   │  금   │  토   │  일   │
├──────┼──────┼──────┼──────┼──────┼──────┼──────┤
│      │      │      │      │      │      │  1   │
│      │      │      │      │      │      │      │
├──────┼──────┼──────┼──────┼──────┼──────┼──────┤
│  2   │  3   │  4   │  5   │  6   │  7   │  8   │
│ 🔵3  │ 🔵2  │ 🟢2  │ 🔵3  │ 🟢1  │ 🔵1  │      │
│ 🟢1  │      │ 🟡1  │      │      │      │      │
├──────┼──────┼──────┼──────┼──────┼──────┼──────┤
│  9   │ 10   │ 11   │ 12   │ 13   │ 14   │ 15   │
│ 🔵2  │ 🔴3  │ 🔵2  │ ⬜3  │ ⬜2  │ ⬜1  │      │
│ 🟢1  │      │ 🟢1  │      │      │      │      │
└──────┴──────┴──────┴──────┴──────┴──────┴──────┘

색상 범례:
🔵 = 발행 완료 (published) — 클릭 시 해당 글로 이동
🟢 = 발행 성공 + 성과 데이터 수집 중 (tracking)
🔴 = 발행 실패 (failed) — 재시도 필요
🟡 = 생성 완료, 발행 대기 중 (ready)
⬜ = 미래 예약 (scheduled) — 아직 글 생성 전
숫자 = 해당 날짜의 발행 예정/완료 수

날짜 클릭 → 해당 날짜의 포스트 목록 팝업:
  ┌────────────────────────────────────────────┐
  │ 📅 2026년 3월 10일 (화)                     │
  ├────────────────────────────────────────────┤
  │ 🔴 09:15  실비보험 비교 — 보험블로그A        │
  │           등급: S  │  예상수익: ₩85,000     │
  │           [재시도] [상세보기]                │
  │                                            │
  │ 🔵 12:47  자동차보험 추천 — 보험블로그A      │
  │           등급: A  │  실제수익: ₩12,300     │
  │           [글 보기 ↗]                       │
  │                                            │
  │ 🔵 17:23  변호사 무료상담 — 법률블로그       │
  │           등급: S  │  실제수익: ₩45,200     │
  │           [글 보기 ↗]                       │
  └────────────────────────────────────────────┘
```

#### 4-4-2. 표(Table) 뷰 ★ 핵심 관리 인터페이스

캘린더와 동일한 데이터를 표 형태로 보여준다.
**필터, 정렬, 인라인 수정, 발행 상태 확인, 바로가기** 모두 가능하다.

```
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│  📋 발행 스케줄 테이블                                                                      │
│                                                                                            │
│  [필터] 블로그: [전체 ▼] 등급: [전체 ▼] 상태: [전체 ▼] 기간: [이번 달 ▼]  [검색: _______ ]  │
├────┬──────────┬──────┬─────────────────┬──────────┬────────┬────────┬────────┬──────────────┤
│ #  │ 발행일시   │ 상태  │ 메인 키워드      │ 블로그    │ 등급   │ 예상수익 │ 실제수익│ 액션         │
├────┼──────────┼──────┼─────────────────┼──────────┼────────┼────────┼────────┼──────────────┤
│ 1  │ 03/02 07:23│ 🔵  │ 실비보험 비교    │ 보험블로그A│ S     │ ₩85,000│₩92,100│ [글 보기 ↗]  │
│ 2  │ 03/02 12:47│ 🔵  │ 자동차보험 추천  │ 보험블로그A│ A     │ ₩45,000│₩38,200│ [글 보기 ↗]  │
│ 3  │ 03/02 17:05│ 🔵  │ 변호사 무료상담  │ 법률블로그 │ S     │ ₩120,000│₩95,400│ [글 보기 ↗]  │
│ 4  │ 03/03 08:31│ 🟢  │ 대출 금리 비교   │ 금융블로그 │ S     │ ₩95,000│₩—    │ [글 보기 ↗]  │
│ 5  │ 03/03 14:12│ 🔵  │ 봄 여행지 추천   │ 여행블로그 │ B     │ ₩15,000│₩11,800│ [글 보기 ↗]  │
│ ...│          │      │                 │          │        │        │        │              │
│ 23 │ 03/12 09:00│ ⬜  │ 미세먼지 마스크   │ 건강블로그 │ B     │ ₩8,000 │ —    │ [수정] [삭제]│
│ 24 │ 03/12 13:30│ ⬜  │ 봄 패션 코디    │ 뷰티블로그 │ C     │ ₩3,500 │ —    │ [수정] [삭제]│
│ 25 │ 03/12 18:15│ ⬜  │ 입학 선물 추천   │ 교육블로그 │ B     │ ₩12,000│ —    │ [수정] [삭제]│
└────┴──────────┴──────┴─────────────────┴──────────┴────────┴────────┴────────┴──────────────┘

하단: 총 87건  │  발행완료: 52건  │  대기중: 30건  │  실패: 5건  │  총 예상수익: ₩2,450,000
```

**표 뷰 핵심 기능:**

| 기능 | 설명 |
|------|------|
| **필터** | 블로그별, 등급별(S/A/B/C/D), 상태별(발행완료/대기/실패), 기간별, 키워드 검색 |
| **정렬** | 발행일시순, 등급순, 예상수익순, 실제수익순, 블로그순 (오름/내림차순 토글) |
| **인라인 수정** | 발행일시 클릭 → 날짜/시간 변경 (캘린더 픽커) |
|  | 블로그 클릭 → 다른 블로그로 재배정 (드롭다운) |
|  | 키워드 클릭 → 키워드 상세 점수 팝업 |
| **상태 확인** | ⬜ 예약 / 🟡 생성완료 / 🔵 발행완료 / 🟢 성과추적중 / 🔴 실패 |
| **바로가기** | 발행 완료된 글의 URL로 바로 이동 (새 탭) |
| **일괄 작업** | 체크박스 선택 → 일괄 삭제 / 일괄 블로그 변경 / 일괄 날짜 변경 |
| **내보내기** | CSV / Excel 다운로드 |

#### 4-4-3. 캘린더 ↔ 표 연동

두 뷰는 **같은 데이터**를 보여주며, 한쪽에서 수정하면 다른 쪽에 즉시 반영된다.

```
캘린더 뷰에서 할 수 있는 것:
  - 날짜별 발행 현황 한눈에 파악
  - 포스트 카드를 드래그하여 다른 날짜로 이동
  - 날짜 클릭 → 상세 목록 팝업

표 뷰에서 할 수 있는 것:
  - 모든 스케줄을 필터·정렬하여 원하는 형태로 조회
  - 인라인으로 날짜/시간/블로그 수정
  - 발행 상태 한눈에 확인
  - 발행된 글로 바로 이동
```

---

## 5. 워크플로우 3: 글 자동 발행

### 5-1. 핵심 원칙

**사람이 아무것도 안 해도** 글이 쓰이고, 이미지가 만들어지고, 발행까지 완료된다.
예약된 시간이 되면 스케줄러가 알아서 전부 처리한다.

```
사용자가 해야 할 일: 아무것도 없음
시스템이 하는 일:
  1. 예약 시간 감지
  2. 키워드 + 블로그 페르소나 정보 로드
  3. PASONA + 문맥광고 전략으로 글 생성
  4. 페르소나 문체로 작성 (다른 사람이 쓴 것처럼)
  5. AI 이미지 생성 (대표이미지 + 본문 삽화)
  6. 섹션 타겟팅 + 광고 슬롯 자동 삽입
  7. 블로그에 발행
  8. 상태 업데이트 + URL 기록
```

### 5-2. 자동 발행 파이프라인 상세

#### Step 1: 스케줄러 트리거

```
매분 실행되는 Cron Job:
  → scheduled_publish_time이 현재 시간 이전이고
  → status = 'scheduled'인 레코드 조회
  → 해당 레코드를 처리 큐에 투입
```

#### Step 2: 콘텐츠 생성 인풋 조립

```typescript
interface AutoPublishInput {
  // 키워드 정보
  mainKeyword: string
  relatedKeywords: string[]
  keywordGrade: 'S' | 'A' | 'B' | 'C' | 'D'
  adCategory: string

  // 블로그 페르소나 정보 (전부 자동 로드)
  persona: BlogPersona          // 문체, 어조, 습관어 등 전체 페르소나
  blogCategory: string          // 블로그 주제명
  blogDesignTheme: string       // 디자인 테마 (이미지 톤 결정에 사용)

  // 발행 설정
  pasonaType: 'compare' | 'solve' | 'cost'  // AI가 키워드 분석 후 자동 결정
  targetLength: number          // 목표 자수 (기본: 2000)
  imageCount: number            // 이미지 수 (기본: 대표 1장 + 본문 1~2장)
}
```

#### Step 3: AI 글 생성 — PASONA + 문맥광고 + 페르소나

AI에게 전달되는 프롬프트는 세 가지 전략이 정교하게 결합되어 있다.

**[전략 1] PASONA 법칙 — 심리 흐름 제어**

```
P (Problem)   : 독자의 문제를 구체적으로 묘사. 200자 이내.
                → 섹션 타겟팅: weight=ignore (광고 배정에 영향 안 줌)

A (Affinity)  : 1인칭 공감 경험담. 150자 이내.
                → 섹션 타겟팅: weight=ignore

S (Solution)  : 핵심 해결 방향. H2 소제목 포함. 600자 이상.
                → 섹션 타겟팅: section_start ★★★ (고CPC 광고 배정 구간)
                → adKeywords를 소제목과 본문에 자연스럽게 포함
                → 완전한 해결책 제공 금지 (광고가 해결책이어야 함)

O (Offer)     : 더 나은 선택지 제시. 200자 이내.
                → 섹션 타겟팅: section_start 유지 (고CPC 유지)

N (Narrow)    : 긴박감 조성. 100자 이내.
                → 섹션 타겟팅: weight=ignore

A (Action)    : 명확한 CTA. 100자 이내.
                → 섹션 타겟팅: weight=ignore
```

**[전략 2] 문맥광고 섹션 타겟팅 — CPC 제어**

```html
<!-- 최종 HTML 출력 형식 -->

<!-- google_ad_section_start(weight=ignore) -->
[P단계] 독자 문제 공감
[A단계] 경험담으로 신뢰 형성
<!-- google_ad_section_end -->

<!-- google_ad_section_start -->
[S단계] 핵심 해결 방향 — 고CPC 키워드 밀집
         ↓ AdSense 광고 슬롯 자동 삽입 위치
[O단계] 더 나은 선택지 소개
<!-- google_ad_section_end -->

<!-- google_ad_section_start(weight=ignore) -->
[N단계] 긴박감
[A단계] CTA
<!-- google_ad_section_end -->
```

**[전략 3] 페르소나 적용 — 문체 제어**

```
프롬프트에 페르소나 정보가 주입됨:

"당신은 {persona.penName}입니다.
 {persona.occupation}이며, {persona.experience}.
 글을 쓸 때 {persona.writingTone} 어조를 사용합니다.
 문장은 {persona.sentenceStyle}.
 자주 쓰는 표현: {persona.habitPhrases.join(', ')}
 도입부는 {persona.openingStyle},
 마무리는 {persona.closingStyle}.
 전문 용어는 {persona.technicalTermUsage}.
 독자를 {persona.readerAddress}라고 부릅니다."

→ 결과: 같은 "실비보험 비교" 키워드를 줘도
   보험 블로그의 "이재원 분석가"는 전문가 톤으로,
   건강 블로그의 "박소연 간호사"는 친근한 톤으로 완전히 다른 글을 작성
```

#### Step 4: AI 이미지 생성

```
대표 이미지 (1장):
  - 글의 주제를 시각적으로 표현
  - 블로그 디자인 테마의 색상 톤 반영
  - 16:9 비율, 1200×675px
  - 텍스트 오버레이: 글 제목의 핵심 키워드

본문 삽화 (1~2장):
  - S단계 해결 방향을 시각화 (비교표, 프로세스 다이어그램 등)
  - 블로그 카테고리에 맞는 일러스트 스타일
  - 4:3 비율, 800×600px
```

#### Step 5: HTML 후처리 & 발행

```
1. 섹션 타겟팅 태그 검증 및 보완
   → google_ad_section 태그가 없으면 자동 삽입

2. 광고 슬롯 자동 삽입
   → section_start 직후 첫 번째 </h2> 뒤에 adsense_slot_mid 삽입
   → 글 상단에 adsense_slot_top 삽입
   → 글 하단에 adsense_slot_bottom 삽입

3. 이미지 삽입
   → 대표 이미지: 글 최상단
   → 본문 삽화: S단계 본문 중간에 자연스럽게 배치

4. 블로그 발행
   → 해당 블로그의 CMS API로 글 전송
   → 카테고리 자동 매핑, 태그 자동 생성, SEO 메타 자동 설정

5. 결과 기록
   → 성공: status = 'published', published_url 저장, published_at 기록
   → 실패: status = 'failed', 재시도 큐 등록 (최대 3회, 5분 간격)
```

### 5-3. 글 유형별 PASONA 패턴

| 유형 | 제목 패턴 | CPC 특성 | 사용 조건 |
|------|---------|---------|---------|
| `compare` | "[A] vs [B] 솔직 비교" / "TOP N 추천" | 최고 (구매 의도 높음) | 2개 이상 비교 가능한 키워드 |
| `solve` | "[문제 상황] 해결 방법" | 높음 | 고민/문제 해결 키워드 |
| `cost` | "[서비스] 비용 얼마?" | 최고 (구매 결심 직전) | 가격/비용 관련 키워드 |

유형은 AI가 키워드를 분석하여 자동으로 결정한다:
- "A vs B", "추천", "비교" → compare
- "방법", "해결", "어떻게" → solve
- "비용", "가격", "얼마" → cost

### 5-4. 카테고리별 S단계 adKeywords

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

### 5-5. 성과 추적 & 피드백 루프

**FR-T-001 AdSense API 연동**
- 일별 수집: page_views, ad_impressions, ad_clicks, ctr, avg_cpc, revenue
- 포스트 단위 URL 기반 매핑

**FR-T-002 주간 피드백 배치 (매주 월요일 자동)**
```
Step 1. 지난 7일 actual_revenue vs Revenue Score 기반 예측값 비교
Step 2. 오차율 = |actual - predicted| / predicted
Step 3. 오차율 > 20%인 키워드 패턴 추출
Step 4. 해당 패턴의 점수 가중치 조정 (최대 ±10%씩 점진적 보정)
Step 5. 높은 CTR 패턴 → 해당 pasonaType 글 비중 자동 증가
Step 6. 낮은 CTR 블로그 → 광고 카테고리 재설정 권고 알림
```

**FR-T-003 페르소나별 성과 분석**
- 어떤 페르소나의 문체가 CTR이 높은지 추적
- 높은 성과 페르소나의 특성을 다른 블로그에 적용 권고

---

## 6. 시스템 아키텍처

### 6-1. 전체 레이어

```
┌─────────────────────────────────────────────────────┐
│  Layer 0. 블로그 인프라                                │
│  자체 블로그 생성  /  도메인 연결  /  디자인 템플릿      │
│  페르소나 엔진  /  CMS 시스템                          │
└───────────────────────┬─────────────────────────────┘
                        ↓
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
│  Layer 3. 매칭 & 스케줄링                            │
│  블로그 매칭  /  일일 한도 관리  /  시간 랜덤 배정     │
│  캘린더 등록  /  오버플로우 처리                       │
└───────────────────────┬─────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│  Layer 4. AI 콘텐츠 생성                             │
│  PASONA 프롬프트 + 페르소나 주입 + 문맥광고 태그      │
│  AI 이미지 생성 (대표 + 삽화)                         │
└───────────────────────┬─────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│  Layer 5. 자동 발행 파이프라인                        │
│  HTML 후처리  /  광고 슬롯 삽입  /  이미지 삽입        │
│  자체 블로그 CMS에 발행  /  스케줄러(Cron)             │
└───────────────────────┬─────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│  Layer 6. 성과 추적 & 피드백 루프                    │
│  AdSense 수익 연동  /  예측 보정  /  가중치 자동 조정 │
│  페르소나별 성과 분석                                 │
└─────────────────────────────────────────────────────┘
```

### 6-2. 기술 스택

| 레이어 | 기술 |
|--------|------|
| Frontend | Next.js 14 (App Router), Tailwind CSS, shadcn/ui |
| Backend API | Next.js Route Handlers (또는 Node.js + Express) |
| Blog CMS | Next.js 기반 멀티테넌트 블로그 시스템 (동적 라우팅) |
| DB | PostgreSQL (Supabase 권장) |
| AI 텍스트 | Anthropic Claude API (claude-sonnet-4-6) |
| AI 이미지 | DALL-E 3 / Stable Diffusion API / Midjourney API |
| 캐시 | Redis (키워드 점수 캐싱, API 호출 제한 대응) |
| 스케줄러 | Cron Job (Vercel Cron 또는 GitHub Actions) — 매분 실행 |
| 인증 | Supabase Auth |
| 파일 저장 | S3 / Supabase Storage (이미지 호스팅) |
| 도메인 관리 | Cloudflare DNS API (자동 도메인 연결) |

---

## 7. 데이터 모델 (DB 스키마)

```sql
-- ============================================================
-- 블로그 테이블 (자체 생성 블로그)
-- ============================================================
CREATE TABLE blogs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID REFERENCES auth.users(id),

  -- 기본 정보
  name                  TEXT NOT NULL,           -- "보험 인사이트"
  slug                  TEXT NOT NULL UNIQUE,     -- "insurance-insight"
  custom_domain         TEXT,                    -- "insurance-insight.kr"
  subdomain             TEXT,                    -- "insurance-insight.platform.com"

  -- 카테고리 & 광고
  primary_ad_category   TEXT NOT NULL,           -- 'insurance' | 'finance' | 'legal' | ...
  secondary_ad_category TEXT,
  category_grade        TEXT,                    -- 'S' | 'A' | 'B' | 'C' | 'D'
  adsense_slot_top      TEXT,
  adsense_slot_mid      TEXT,
  adsense_slot_bottom   TEXT,
  ads_txt_verified      BOOLEAN DEFAULT FALSE,

  -- 디자인
  design_template       TEXT DEFAULT 'default',  -- 'legal-dark' | 'medical-clean' | ...
  color_primary         TEXT,                    -- '#1a365d'
  color_accent          TEXT,                    -- '#c9a84c'
  font_family           TEXT,                    -- 'Noto Serif KR'

  -- 성과
  avg_cpc_krw           INTEGER DEFAULT 0,       -- 실측 평균 CPC
  total_posts           INTEGER DEFAULT 0,
  monthly_revenue       INTEGER DEFAULT 0,

  -- 상태
  status                TEXT DEFAULT 'active',   -- 'active' | 'paused' | 'pending_domain'
  ssl_status            TEXT DEFAULT 'pending',  -- 'pending' | 'active' | 'failed'
  domain_verified       BOOLEAN DEFAULT FALSE,

  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 블로그 페르소나 (1:1 관계)
-- ============================================================
CREATE TABLE blog_personas (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_id               UUID REFERENCES blogs(id) ON DELETE CASCADE UNIQUE,

  -- 인물 정보
  pen_name              TEXT NOT NULL,           -- "김정현"
  age                   INTEGER,                 -- 38
  gender                TEXT,                    -- "남성"
  occupation            TEXT,                    -- "변호사 출신 법률 칼럼니스트"
  experience            TEXT,                    -- "대형 로펌 10년 근무 후 독립"

  -- 글쓰기 스타일
  writing_tone          TEXT NOT NULL,           -- "차분하고 권위있지만 친근한"
  sentence_style        TEXT,                    -- "짧은 문장 선호, 핵심을 먼저 말함"
  avg_sentence_length   TEXT,                    -- "15~25자"
  paragraph_style       TEXT,                    -- "한 단락 3~4문장"

  -- 개성 요소
  habit_phrases         TEXT[],                  -- ARRAY['솔직히 말씀드리면', '제 경험상']
  emoji_usage           TEXT,                    -- "거의 안 씀"
  title_pattern         TEXT,                    -- "[법률용어] 쉽게 풀어본 ~"
  opening_style         TEXT,                    -- "질문으로 시작"
  closing_style         TEXT,                    -- "요약 정리 + 마무리 인사"

  -- 전문성
  expertise_level       TEXT,                    -- "전문가이지만 비전문가에게 설명하듯"
  technical_term_usage  TEXT,                    -- "법률 용어 사용 후 괄호 안에 쉬운 설명"
  data_usage            TEXT,                    -- "판례 번호, 법조항 인용 즐겨 함"

  -- 독자 관계
  reader_address        TEXT,                    -- "여러분"
  personal_anecdote     BOOLEAN DEFAULT TRUE,
  humor_level           TEXT,                    -- "가끔 가벼운 비유"

  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 키워드 풀
-- ============================================================
CREATE TABLE keyword_pool (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID REFERENCES auth.users(id),
  keyword               TEXT NOT NULL,
  is_korean             BOOLEAN DEFAULT TRUE,

  -- API 원본 데이터
  naver_pc_volume       INTEGER,
  naver_mobile_volume   INTEGER,
  google_volume         INTEGER,
  avg_cpc_krw           INTEGER,
  naver_comp_idx        TEXT,                    -- 'low' | 'mid' | 'high'
  google_competition    TEXT,                    -- 'LOW' | 'MEDIUM' | 'HIGH'
  pl_avg_depth          DECIMAL(4,2),

  -- 5단계 점수
  traffic_score         INTEGER,                 -- 0~100
  revenue_score         INTEGER,                 -- 0~100 ★핵심
  difficulty_score      INTEGER,                 -- 0~100
  seasonal_bonus        INTEGER,                 -- 0~30
  trend_index           INTEGER,                 -- 현재 데이터랩 지수
  opportunity_score     INTEGER,                 -- 0~100

  -- 분류
  grade                 TEXT,                    -- 'S'|'A'|'B'|'C'|'D'|'excluded'
  ad_category           TEXT,                    -- 매칭된 광고 카테고리

  -- 계절성
  trend_history         INTEGER[],               -- 24개월 데이터랩 지수 배열
  yoy_growth            DECIMAL(4,2),
  peak_month            INTEGER,                 -- 1~12

  -- 매칭
  cluster_id            UUID,
  blog_id               UUID REFERENCES blogs(id),

  -- 상태
  source                TEXT,                    -- 'manual' | 'seasonal_auto' | 'ai_suggest'
  status                TEXT DEFAULT 'active',   -- 'active' | 'used' | 'excluded'

  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 키워드 클러스터 (롱테일 묶음)
-- ============================================================
CREATE TABLE keyword_clusters (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID REFERENCES auth.users(id),
  main_keyword             TEXT NOT NULL,
  related_keywords         TEXT[],
  cluster_type             TEXT,                 -- 'revenue'|'traffic'|'seasonal'
  ad_category              TEXT,
  total_estimated_revenue  INTEGER,
  total_volume             INTEGER,
  suggested_title          TEXT,
  pasona_type              TEXT,                 -- 'compare'|'solve'|'cost'
  blog_id                  UUID REFERENCES blogs(id),
  status                   TEXT DEFAULT 'pending', -- 'pending'|'scheduled'|'generating'|'published'|'failed'
  created_at               TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 발행 스케줄 ★ 핵심 테이블 (캘린더 + 표의 데이터 소스)
-- ============================================================
CREATE TABLE publish_schedule (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID REFERENCES auth.users(id),
  cluster_id            UUID REFERENCES keyword_clusters(id),
  blog_id               UUID REFERENCES blogs(id),

  -- 스케줄 정보
  scheduled_date        DATE NOT NULL,           -- 발행 예정 날짜
  scheduled_time        TIME NOT NULL,           -- 발행 예정 시간 (07:00~20:00)
  scheduled_datetime    TIMESTAMPTZ NOT NULL,    -- 날짜+시간 합쳐진 발행 시점
  priority              INTEGER DEFAULT 50,      -- 높을수록 우선

  -- 키워드 정보 (빠른 조회용 비정규화)
  main_keyword          TEXT NOT NULL,
  keyword_grade         TEXT,                    -- 'S'|'A'|'B'|'C'|'D'
  pasona_type           TEXT,                    -- 'compare'|'solve'|'cost'
  estimated_revenue     INTEGER,                 -- 예상 월 수익 (원)

  -- 발행 상태
  status                TEXT DEFAULT 'scheduled',
  -- 'scheduled': 예약됨 (아직 글 생성 전)
  -- 'generating': AI가 글 생성 중
  -- 'ready': 글 생성 완료, 발행 대기
  -- 'publishing': 발행 진행 중
  -- 'published': 발행 완료
  -- 'failed': 발행 실패
  -- 'cancelled': 취소됨

  -- 발행 결과
  post_id               UUID REFERENCES posts(id),
  published_url         TEXT,                    -- 발행된 글 URL
  published_at          TIMESTAMPTZ,             -- 실제 발행 시각
  actual_revenue        INTEGER,                 -- 실제 수익 (피드백 루프 업데이트)

  -- 실패 관리
  retry_count           INTEGER DEFAULT 0,
  last_error            TEXT,

  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- 날짜별 + 블로그별 빠른 조회를 위한 인덱스
CREATE INDEX idx_schedule_date_blog ON publish_schedule(scheduled_date, blog_id);
CREATE INDEX idx_schedule_status ON publish_schedule(status);
CREATE INDEX idx_schedule_datetime ON publish_schedule(scheduled_datetime);

-- ============================================================
-- 발행된 포스트
-- ============================================================
CREATE TABLE posts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id),
  cluster_id      UUID REFERENCES keyword_clusters(id),
  blog_id         UUID REFERENCES blogs(id),
  schedule_id     UUID REFERENCES publish_schedule(id),

  -- 글 내용
  title           TEXT NOT NULL,
  content_html    TEXT,                          -- PASONA + 섹션 타겟팅 태그 + 이미지 포함 HTML
  meta_description TEXT,                         -- SEO 메타 설명
  tags            TEXT[],                        -- SEO 태그

  -- 이미지
  featured_image_url TEXT,                       -- 대표 이미지 URL
  body_image_urls TEXT[],                        -- 본문 삽화 URL 배열

  -- 메타
  pasona_type     TEXT,
  ad_category     TEXT,
  word_count      INTEGER,                       -- 실제 글 자수

  -- 상태
  status          TEXT DEFAULT 'draft',          -- 'draft'|'ready'|'published'|'failed'
  published_url   TEXT,
  published_at    TIMESTAMPTZ,

  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 포스트 광고 성과 (일별)
-- ============================================================
CREATE TABLE post_ad_performance (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id         UUID REFERENCES posts(id),
  blog_id         UUID REFERENCES blogs(id),
  schedule_id     UUID REFERENCES publish_schedule(id),
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

-- ============================================================
-- PASONA 유형별 성과 집계 뷰
-- ============================================================
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

-- ============================================================
-- 페르소나별 성과 집계 뷰
-- ============================================================
CREATE VIEW persona_performance_summary AS
SELECT
  b.id AS blog_id,
  bp.pen_name,
  b.primary_ad_category,
  AVG(pap.ctr)         AS avg_ctr,
  AVG(pap.avg_cpc_krw) AS avg_cpc,
  SUM(pap.revenue_krw) AS total_revenue,
  COUNT(*)             AS post_count
FROM post_ad_performance pap
JOIN blogs b ON pap.blog_id = b.id
JOIN blog_personas bp ON b.id = bp.blog_id
GROUP BY b.id, bp.pen_name, b.primary_ad_category
ORDER BY total_revenue DESC;
```

---

## 8. 외부 API 연동

### 8-1. 네이버 검색광고 API

| 항목 | 내용 |
|------|------|
| 엔드포인트 | `https://api.naver.com/keywordstool` |
| 인증 | 고객 ID + API Key + Secret (HMAC-SHA256 서명) |
| 제한 | 최대 100개/요청, 초당 10회 |
| 수집 항목 | relKeyword, monthlyPcQcCnt, monthlyMobileQcCnt, compIdx, plAvgDepth |

### 8-2. Google Ads API (Keyword Planner)

| 항목 | 내용 |
|------|------|
| 엔드포인트 | `googleads.googleapis.com` |
| 인증 | OAuth2 + Developer Token + Customer ID |
| 대안 | DataForSEO API (인증 간단, 유료) |
| 수집 항목 | avg_monthly_searches, competition, low/high_top_of_page_bid_micros |
| CPC 변환 | micros ÷ 1,000,000 = USD → × USD_TO_KRW = 원화 |

### 8-3. 네이버 데이터랩 API

| 항목 | 내용 |
|------|------|
| 엔드포인트 | `https://openapi.naver.com/v1/datalab/search` |
| 인증 | Client ID + Client Secret |
| 제한 | 일 1,000회 |
| 수집 항목 | 최대 3년치 기간별 상대 검색량 (0~100 지수) |

### 8-4. AI 이미지 생성 API

| 항목 | 내용 |
|------|------|
| 1순위 | DALL-E 3 API (OpenAI) |
| 2순위 | Stable Diffusion XL API (Stability AI) |
| 용도 | 대표 이미지 + 본문 삽화 자동 생성 |
| 스타일 | 블로그 디자인 테마에 맞춘 일러스트/사진 스타일 |

### 8-5. 환경변수

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

# 환율
USD_TO_KRW=1380

# AI 텍스트
ANTHROPIC_API_KEY=

# AI 이미지
OPENAI_API_KEY=
STABILITY_API_KEY=

# DB
DATABASE_URL=

# 도메인 관리
CLOUDFLARE_API_TOKEN=
CLOUDFLARE_ZONE_ID=

# 파일 저장
S3_BUCKET=
S3_REGION=
S3_ACCESS_KEY=
S3_SECRET_KEY=
```

---

## 9. 내부 API 라우트

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| **블로그 관리** | | |
| `/api/blogs` | GET / POST | 블로그 목록 조회 / 생성 |
| `/api/blogs/:id` | GET / PUT / DELETE | 블로그 상세 / 수정 / 삭제 |
| `/api/blogs/:id/persona` | GET / PUT | 페르소나 조회 / 수정 |
| `/api/blogs/:id/persona/preview` | POST | 페르소나 미리보기 글 생성 |
| `/api/blogs/:id/domain` | POST / DELETE | 도메인 연결 / 해제 |
| `/api/blogs/:id/design` | PUT | 디자인 템플릿 변경 |
| **키워드 관리** | | |
| `/api/keywords/search` | GET | 키워드 점수 즉시 조회 |
| `/api/keywords/pool` | GET / POST | 키워드 풀 조회 / 추가 |
| `/api/keywords/analyze` | POST | 배치 분석 (여러 키워드 동시) |
| `/api/keywords/seasonal` | GET | 계절성 키워드 자동 추천 |
| `/api/keywords/trend` | GET | 데이터랩 트렌드 + YoY 성장률 |
| `/api/keywords/cluster` | POST | 롱테일 클러스터 생성 |
| `/api/keywords/distribute` | POST | 클러스터 → 블로그 자동 배분 |
| **스케줄 관리** | | |
| `/api/schedule` | GET | 발행 스케줄 전체 조회 (필터·정렬 지원) |
| `/api/schedule` | POST | 스케줄 수동 추가 |
| `/api/schedule/:id` | PUT | 스케줄 수정 (날짜/시간/블로그 변경) |
| `/api/schedule/:id` | DELETE | 스케줄 삭제 |
| `/api/schedule/batch` | PUT | 일괄 수정 (다수 스케줄 동시 변경) |
| `/api/schedule/calendar` | GET | 캘린더 뷰용 데이터 (월별 집계) |
| `/api/schedule/table` | GET | 표 뷰용 데이터 (필터·정렬·페이지네이션) |
| **글 생성 & 발행** | | |
| `/api/posts/generate` | POST | PASONA 구조 AI 글 생성 (페르소나 적용) |
| `/api/posts/generate-image` | POST | AI 이미지 생성 |
| `/api/posts/publish` | POST | HTML 후처리 + 블로그 발행 |
| `/api/posts/auto-publish` | POST | 완전 자동 발행 (생성→이미지→후처리→발행) |
| `/api/posts/:id` | GET / PUT | 포스트 조회 / 수정 |
| **성과 & 대시보드** | | |
| `/api/analytics/dashboard` | GET | 대시보드 통합 수익 데이터 |
| `/api/analytics/feedback` | POST | 피드백 루프 배치 실행 |
| `/api/analytics/persona` | GET | 페르소나별 성과 분석 |

---

## 10. 비기능 요구사항

### 10-1. 성능

| 항목 | 요구사항 |
|------|---------|
| 키워드 점수 조회 응답 | ≤ 3초 (캐시 히트 시 ≤ 500ms) |
| AI 글 생성 응답 | ≤ 30초 (스트리밍 권장) |
| AI 이미지 생성 | ≤ 60초 |
| 자동 발행 처리 (글+이미지+발행) | ≤ 120초 전체 |
| 스케줄러 체크 주기 | 매분 1회 |
| 발행 시간 정확도 | 예약 시간 대비 ±2분 이내 |
| 계절성 탐색 배치 | ≤ 10분 (월 1회) |

### 10-2. 보안

- API 키는 서버 환경변수에만 저장 (클라이언트 노출 금지)
- 사용자별 데이터 완전 격리 (user_id 기반 Row Level Security)
- AdSense 슬롯 ID는 암호화 저장
- 블로그 관리자 비밀번호 bcrypt 해시 저장

### 10-3. 확장성

| 항목 | 제한 |
|------|------|
| 블로그 수 | 초기 10개 / 플랜 업그레이드 시 무제한 |
| 키워드 풀 용량 | 사용자당 최대 10,000개 |
| 포스트 저장 | 무제한 (S3/Supabase Storage) |
| 이미지 저장 | 월 10GB (기본) |
| 블로그당 일일 발행 | 최대 3건 |

---

## 11. 개발 로드맵

| Phase | 주요 작업 | 수익 임팩트 | 예상 기간 |
|-------|---------|-----------|---------|
| **Phase 1** | 자체 블로그 생성 시스템 (CMS + 도메인 연결 + 디자인 템플릿) | ★★★★★ | 3~4주 |
| **Phase 2** | 페르소나 엔진 (페르소나 정의 + AI 프롬프트 주입 + 미리보기) | ★★★★★ | 1~2주 |
| **Phase 3** | 네이버 광고 API + Google KWP 연동 → 5단계 점수 산출 | ★★★★★ | 2~3주 |
| **Phase 4** | 데이터랩 연동 → 계절성 자동 탐색 파이프라인 | ★★★★☆ | 2주 |
| **Phase 5** | 블로그 매칭 + 발행 시간 랜덤 배정 + 일일 한도 관리 | ★★★★★ | 1~2주 |
| **Phase 6** | ANNUAL_EVENTS 캘린더 (캘린더 뷰 + 표 뷰 + 필터/정렬/수정) | ★★★★☆ | 2~3주 |
| **Phase 7** | AI PASONA + 문맥광고 글 생성 (페르소나 반영) | ★★★★★ | 1~2주 |
| **Phase 8** | AI 이미지 생성 연동 | ★★★☆☆ | 1주 |
| **Phase 9** | 완전 자동 발행 파이프라인 (스케줄러 + HTML 후처리 + 발행) | ★★★★★ | 2~3주 |
| **Phase 10** | AdSense API 연동 + 성과 대시보드 + 피드백 루프 | ★★★★★ | 2~3주 |

> **Phase 1+2가 기존과 가장 큰 차이점.** 자체 블로그 인프라 + 페르소나 시스템이 전체 자동화의 기반이 된다.
> **Phase 5+6+9가 자동화의 핵심.** 이 세 단계가 완성되면 사람 개입 없이 전 과정이 돌아간다.

---

## 12. 용어 정의

| 용어 | 정의 |
|------|------|
| 자체 블로그 | 외부 플랫폼이 아닌, 이 플랫폼이 직접 생성·호스팅하는 독립 블로그 웹사이트 |
| 페르소나 | 블로그에 부여된 가상 작성자의 인물 설정 — 이름, 직업, 문체, 습관어, 어조 등 |
| Revenue Score | 구글 CPC × 검색량 × CTR 기반 월 예상 수익을 0~100으로 정규화한 지표 |
| Opportunity Score | Traffic(25%) + Revenue(40%) + Difficulty역(25%) + Trend(10%) + SeasonalBonus 합산 |
| primaryAdCategory | 블로그에 고정 지정된 주 광고 카테고리. 구글이 이 기반으로 광고를 배정 |
| PASONA | Problem-Affinity-Solution-Offer-Narrow-Action 6단계 카피라이팅 프레임워크 |
| 섹션 타겟팅 | `<!-- google_ad_section_start -->` HTML 주석으로 구글 봇에게 광고 카테고리 결정 구간을 알리는 기술 |
| 롱테일 클러스터 | 메인 키워드 + 연관 롱테일 4~8개를 하나의 포스트로 묶은 단위 |
| 피드백 루프 | 실제 수익 vs 예측을 비교하여 가중치를 자동 보정하는 자기개선 메커니즘 |
| adKeywords | 각 광고 카테고리별로 S단계에 삽입해야 하는 고CPC 트리거 키워드 목록 |
| PasonaType | 글 유형: compare(비교), solve(문제해결), cost(비용탐색) |
| 오버플로우 | 블로그 일일 발행 한도(3건) 초과 시 동일 카테고리 다른 블로그로 이동하는 처리 |
| 발행 시간 랜덤 배정 | 07:00~20:00 사이 1시간+ 간격으로 자연스럽게 분배하는 알고리즘 |
