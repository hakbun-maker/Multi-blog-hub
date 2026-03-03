# Common Ground 스킬

> **AI의 숨겨진 가정을 투명하게 만들고, 협업의 기반을 명시적으로 관리합니다.**

---

## 역할

Common Ground는 인간-AI 협업에서 Claude가 내부적으로 구축하는 **가정의 모델**을 사용자가 볼 수 있고 편집할 수 있게 만드는 스킬입니다.

### 핵심 문제

- Claude는 대화 중 암묵적으로 가정을 쌓지만, 사용자는 이를 볼 수 없음
- 잘못된 가정은 문제가 발생할 때까지 발견되지 않음
- 가정을 명시적으로 확인하고 교정할 방법이 없음

### 해결 방법

- 가정을 4가지 유형(`[stated]`, `[inferred]`, `[assumed]`, `[uncertain]`)으로 분류
- 신뢰 등급(ESTABLISHED, WORKING, OPEN)을 부여하여 우선순위 관리
- `COMMON-GROUND.md` 파일로 명시적 기록
- 대화형 워크플로우로 가정 발굴 → 검증 → 조정

---

## 트리거

```bash
# 기본 모드: 대화형 2단계 워크플로우 (Surface & Select → Adjust Tiers)
/common-ground

# 읽기 전용: 기존 가정 조회
/common-ground --list

# 빠른 검증: 기존 가정 확인
/common-ground --check

# 플로우차트 생성: Mermaid 다이어그램
/common-ground --graph
```

---

## 가정 유형 (4가지)

### `[stated]` - 명시적 진술
- 사용자가 직접 말한 사실
- 예: "React와 TypeScript를 사용합니다"
- **Immutable audit trail**: 사용자 발언을 정확히 기록

### `[inferred]` - 추론
- 코드, 문서, 환경에서 추론한 사실
- 예: package.json에서 "Next.js 14 사용 중"
- **근거 제시**: 어떤 파일에서 추론했는지 명시

### `[assumed]` - 가정
- Claude가 일반적 패턴에서 가정한 것
- 예: "REST API는 /api 경로를 사용할 것"
- **사용자 확인 필요**: 가장 불확실한 유형

### `[uncertain]` - 불확실
- 확신 없는 가정, 추가 정보 필요
- 예: "인증은 JWT를 사용하는 것으로 추정"
- **질문 제기**: 사용자에게 명확히 물어봐야 함

---

## 신뢰 등급 (3단계, user-adjustable)

| 등급 | 의미 | 예시 |
|------|------|------|
| `ESTABLISHED` | 확인된 사실, 높은 신뢰도 | package.json에 명시된 dependencies |
| `WORKING` | 작업 가정, 중간 신뢰도 | 일반적 디렉토리 구조 (`src/`, `tests/`) |
| `OPEN` | 미결정, 낮은 신뢰도 | 아직 논의 안 된 배포 전략 |

### 등급 조정 규칙

- `[stated]` → 보통 `ESTABLISHED`
- `[inferred]` → 보통 `WORKING` (근거 강할수록 상향)
- `[assumed]` → 보통 `OPEN` (사용자 확인 전까지)
- `[uncertain]` → 항상 `OPEN`

---

## 워크플로우

### 1. 기본 모드 (대화형 2단계)

```
Phase 1: Surface & Select
├── 1-1. 프로젝트 컨텍스트 수집
│   ├── README.md, package.json 등 핵심 파일 읽기
│   ├── Git remote URL 확인 (Project ID)
│   └── 기존 COMMON-GROUND.md 확인
├── 1-2. 가정 발굴 (4가지 유형 분류)
│   ├── [stated]: 사용자 발언에서 추출
│   ├── [inferred]: 코드/문서에서 추론
│   ├── [assumed]: 일반적 패턴 가정
│   └── [uncertain]: 불확실한 사항
├── 1-3. 가정 목록 제시 (5-15개)
│   └── AskUserQuestion: "어떤 가정을 확인하시겠습니까? (숫자 또는 'all')"
└── 1-4. 사용자 선택 수신

Phase 2: Adjust Tiers
├── 2-1. 선택된 가정의 현재 등급 표시
├── 2-2. AskUserQuestion: "신뢰 등급을 조정하시겠습니까?"
│   ├── ESTABLISHED (확인됨)
│   ├── WORKING (작업 가정)
│   └── OPEN (미결정)
├── 2-3. 사용자 피드백 반영
├── 2-4. COMMON-GROUND.md 업데이트
└── 2-5. ground.index.json 업데이트
```

### 2. --list 모드 (읽기 전용)

```
1. COMMON-GROUND.md 읽기
2. 등급별로 분류하여 출력
   ├── ESTABLISHED (높음)
   ├── WORKING (중간)
   └── OPEN (낮음)
3. 각 가정의 유형 태그 표시
```

### 3. --check 모드 (빠른 검증)

```
1. ground.index.json 읽기
2. 각 가정의 현재 상태 확인
   ├── 파일 기반 가정: 파일 존재 여부 체크
   ├── 코드 기반 가정: 최신 코드와 일치 여부 체크
   └── 진술 기반 가정: 사용자에게 여전히 유효한지 확인
3. 유효하지 않은 가정 경고
4. AskUserQuestion: "이 가정들을 업데이트하시겠습니까?"
```

### 4. --graph 모드 (플로우차트)

```
1. ground.index.json 읽기
2. 가정 간 의존성 분석
3. Mermaid 플로우차트 생성
   ├── 노드 색상 규칙:
   │   ├── yellow: 결정 사항
   │   ├── green: 선택된 기술/패턴
   │   ├── gray: 고려했지만 선택 안 함
   │   ├── orange: 불확실 (OPEN)
   │   └── blue: 구현 완료
   ├── 화살표: 의존 관계 (A → B: "B는 A에 의존")
   └── 라벨: 가정 유형 태그
4. COMMON-GROUND.md에 추가 또는 별도 파일 저장
```

---

## 파일 관리

### COMMON-GROUND.md (Human-readable)

프로젝트 루트에 생성:

```markdown
# Common Ground - {프로젝트명}

**Project ID**: {Git remote URL 또는 절대 경로}
**Last Updated**: 2026-02-15

---

## ESTABLISHED (확인된 사실)

### [stated] 프론트엔드는 Next.js 14 사용
- **출처**: 사용자 발언 (2026-02-15)
- **근거**: "Next.js 14와 App Router를 쓰고 싶어요"

### [inferred] TypeScript 5.3 사용
- **출처**: package.json
- **근거**: `"typescript": "^5.3.0"`

---

## WORKING (작업 가정)

### [assumed] API 경로는 /api로 시작
- **출처**: Next.js 기본 규칙
- **근거**: Next.js App Router의 Route Handlers 패턴

### [inferred] Tailwind CSS 사용
- **출처**: tailwind.config.ts
- **근거**: 설정 파일 존재

---

## OPEN (미결정)

### [uncertain] 인증 방식
- **질문**: JWT, OAuth, Session 중 어떤 방식을 사용할까요?
- **현재 상태**: 논의 필요

### [assumed] PostgreSQL 사용
- **출처**: 일반적 스택 가정
- **확인 필요**: 데이터베이스 선택하셨나요?

---

## 플로우차트 (--graph)

\`\`\`mermaid
graph TD
    A[Next.js 14] -->|의존| B[React 18]
    A -->|의존| C[TypeScript 5.3]
    D[API Routes] -.->|가정| E[인증 방식?]

    style A fill:#90EE90
    style B fill:#90EE90
    style C fill:#90EE90
    style D fill:#FFD700
    style E fill:#FFA500
\`\`\`
```

### ground.index.json (Machine-readable)

`.claude/memory/ground.index.json`에 저장:

```json
{
  "projectId": "https://github.com/user/repo.git",
  "lastUpdated": "2026-02-15T10:30:00Z",
  "assumptions": [
    {
      "id": "cg-001",
      "type": "stated",
      "tier": "ESTABLISHED",
      "content": "프론트엔드는 Next.js 14 사용",
      "source": "사용자 발언",
      "timestamp": "2026-02-15T10:00:00Z",
      "evidence": "Next.js 14와 App Router를 쓰고 싶어요"
    },
    {
      "id": "cg-002",
      "type": "inferred",
      "tier": "ESTABLISHED",
      "content": "TypeScript 5.3 사용",
      "source": "package.json",
      "timestamp": "2026-02-15T10:05:00Z",
      "evidence": "\"typescript\": \"^5.3.0\""
    },
    {
      "id": "cg-003",
      "type": "uncertain",
      "tier": "OPEN",
      "content": "인증 방식 미정",
      "source": "Claude 질문",
      "timestamp": "2026-02-15T10:10:00Z",
      "question": "JWT, OAuth, Session 중 어떤 방식을 사용할까요?"
    }
  ],
  "dependencies": [
    {"from": "cg-001", "to": "cg-002", "reason": "Next.js는 TypeScript를 의존"}
  ]
}
```

### Project ID 결정 규칙

```
1. Git remote URL 확인 (git config --get remote.origin.url)
   ├── 있으면: Git URL 사용 (예: https://github.com/user/repo.git)
   └── 없으면: 절대 경로 사용 (예: /Users/name/Projects/my-app)

2. ID 정규화:
   ├── Git URL: 트레일링 슬래시 제거, .git 유지
   └── 경로: 절대 경로로 정규화 (realpath)
```

---

## 제약조건

### 1. 가정 수 제한
- Phase 1에서 **5-15개** 가정만 제시 (너무 많으면 사용자 피로)
- 우선순위: `[uncertain]` > `[assumed]` > `[inferred]` > `[stated]`

### 2. Immutable Audit Trail
- `[stated]` 유형은 **절대 수정 금지** (사용자 발언 원본 보존)
- 등급 조정은 가능하지만, 내용은 변경 불가
- 수정 이력은 ground.index.json에 타임스탬프로 기록

### 3. 파일 위치 규칙
- `COMMON-GROUND.md`: 프로젝트 루트 (사용자가 쉽게 볼 수 있도록)
- `ground.index.json`: `.claude/memory/` (기계 전용 인덱스)

### 4. AskUserQuestion 활용
- 등급 조정, 가정 선택 등 모든 대화형 단계에서 사용
- 사용자 의도를 명시적으로 확인

### 5. 근거 제시 필수
- 모든 `[inferred]` 가정은 **파일명 + 코드 스니펫** 제공
- 모든 `[stated]` 가정은 **사용자 발언 인용** 제공

---

## 출력 형식

### Phase 1 완료 후 출력

```
📋 발굴한 가정 (10개)

ESTABLISHED (3개):
  1. [stated] 프론트엔드는 Next.js 14 사용
  2. [inferred] TypeScript 5.3 사용
  3. [inferred] Tailwind CSS 사용

WORKING (4개):
  4. [assumed] API 경로는 /api로 시작
  5. [inferred] ESLint + Prettier 사용
  6. [assumed] 컴포넌트는 src/components에 위치
  7. [inferred] Vercel 배포 예정 (vercel.json 존재)

OPEN (3개):
  8. [uncertain] 인증 방식 미정 (JWT? OAuth? Session?)
  9. [assumed] PostgreSQL 사용 (확인 필요)
  10. [uncertain] 상태 관리 라이브러리 미정 (Zustand? Redux?)

어떤 가정을 확인하시겠습니까? (숫자 또는 'all' 입력)
```

### Phase 2 완료 후 출력

```
✅ Common Ground 업데이트 완료!

조정된 가정:
  - #8 (인증 방식): OPEN → ESTABLISHED [stated]
    → "JWT with httpOnly cookies 사용"
  - #9 (PostgreSQL): OPEN → WORKING [inferred]
    → docker-compose.yml에서 postgres:16 확인

📄 파일 업데이트:
  - COMMON-GROUND.md
  - .claude/memory/ground.index.json

💡 다음 단계:
  - /common-ground --graph 로 플로우차트 생성
  - /common-ground --check 로 정기 검증
```

### --list 출력

```
📚 현재 Common Ground

ESTABLISHED (5개):
  - [stated] 프론트엔드는 Next.js 14 사용
  - [inferred] TypeScript 5.3 사용
  - [inferred] Tailwind CSS 사용
  - [stated] JWT with httpOnly cookies 사용
  - [inferred] PostgreSQL 16 사용

WORKING (3개):
  - [assumed] API 경로는 /api로 시작
  - [inferred] ESLint + Prettier 사용
  - [assumed] 컴포넌트는 src/components에 위치

OPEN (1개):
  - [uncertain] 상태 관리 라이브러리 미정

📄 상세 내용: COMMON-GROUND.md
```

### --check 출력

```
🔍 Common Ground 검증 결과

✅ 유효한 가정 (7개):
  - TypeScript 5.3 사용 (package.json 확인)
  - Tailwind CSS 사용 (tailwind.config.ts 존재)
  - PostgreSQL 16 사용 (docker-compose.yml 확인)
  ...

⚠️ 검증 필요 (2개):
  - API 경로는 /api로 시작
    → 확인: app/api/ 디렉토리가 비어있음. 아직 API 구현 안 됨?
  - 컴포넌트는 src/components에 위치
    → 확인: app/components/ 사용 중. 가정 업데이트 필요.

이 가정들을 업데이트하시겠습니까? (y/n)
```

### --graph 출력

```
🔀 Common Ground 플로우차트

\`\`\`mermaid
graph TD
    A[Next.js 14] -->|의존| B[React 18]
    A -->|의존| C[TypeScript 5.3]
    A -->|사용| D[Tailwind CSS]
    E[API Routes] -->|인증| F[JWT httpOnly]
    E -->|DB| G[PostgreSQL 16]
    H[상태 관리?] -.->|미정| I[Zustand or Redux]

    style A fill:#90EE90
    style B fill:#90EE90
    style C fill:#90EE90
    style D fill:#90EE90
    style E fill:#FFD700
    style F fill:#ADD8E6
    style G fill:#ADD8E6
    style H fill:#FFA500
    style I fill:#FFA500
\`\`\`

📄 COMMON-GROUND.md에 추가되었습니다.
```

---

## 사용 예시

### 시나리오 1: 프로젝트 초기 (가정 발굴)

```bash
# 사용자가 새 프로젝트 시작
/common-ground

# Claude가 프로젝트 스캔 → 10개 가정 제시
# 사용자: "8, 9, 10 확인할게요"
# Claude가 등급 조정 대화 → COMMON-GROUND.md 생성
```

### 시나리오 2: 프로젝트 중반 (가정 검증)

```bash
# 2주 후, 코드가 많이 변경됨
/common-ground --check

# Claude가 "컴포넌트 경로 가정이 실제와 다름" 경고
# 사용자가 가정 업데이트 승인 → ground.index.json 수정
```

### 시나리오 3: 새 팀원 온보딩

```bash
# 새 팀원이 프로젝트 이해 필요
/common-ground --list

# ESTABLISHED 가정만 보고 핵심 기술 스택 파악
# --graph로 의존 관계 시각화
```

### 시나리오 4: 아키텍처 결정 문서화

```bash
# 중요한 기술 선택 후
/common-ground

# "Redis 캐싱 레이어 추가" → [stated] ESTABLISHED로 기록
# --graph로 새 의존성 반영된 플로우차트 생성
```

---

## 통합 팁

### 다른 스킬과의 조합

| 스킬 | 조합 방법 |
|------|----------|
| `/socrates` | 21개 질문 답변을 `[stated]` 가정으로 자동 추가 |
| `/screen-spec` | 화면 명세에서 추론한 기술 스택을 `[inferred]` 추가 |
| `/auto-orchestrate` | TASKS.md 생성 전 Common Ground 확인 → 불확실 가정 해소 |
| `/systematic-debugging` | 버그 근본 원인이 잘못된 가정인 경우 Common Ground 업데이트 |

### 정기 검증 습관

```
프로젝트 초기: /common-ground (발굴)
    ↓
매주 1회: /common-ground --check (검증)
    ↓
마일스톤마다: /common-ground --graph (시각화)
```

---

## 주의사항

1. **과도한 가정 금지**: 5-15개 범위 유지 (핵심만 추출)
2. **사용자 발언 존중**: `[stated]` 내용은 절대 수정 금지
3. **근거 없는 추론 금지**: `[inferred]`는 반드시 파일 기반 근거 제시
4. **OPEN 가정 방치 금지**: 프로젝트 시작 1주 내에 OPEN → WORKING 이상으로 승격 유도
5. **플로우차트 복잡도 제한**: 노드 20개 이하 (가독성 유지)

---

## 버전 정보

- **작성**: 2026-02-15
- **스킬 타입**: Conversational (대화형 워크플로우)
- **호환**: Claude Labs v1.9.x 이상
- **의존성**: AskUserQuestion, Read, Write, Bash (git 명령어)
- **참조**: [jeffallan/claude-skills/common-ground](https://github.com/Jeffallan/claude-skills)
