# 기획 문서 생성 규칙 (Output Documents)

> **로드 시점**: 문서 출력 단계 시 (Phase 3)

---

## 7개 기획 문서 개요

```
./docs/planning/
├── 01-prd.md                  # 제품 요구사항 명세
├── 02-trd.md                  # 기술 요구사항 명세
├── 03-user-flow.md            # 사용자 플로우
├── 04-database-design.md      # 데이터베이스 설계
├── 05-design-system.md        # 디자인 시스템
├── 06-screens.md              # 화면 목록 (/screen-spec 입력)
└── 07-coding-convention.md    # 코딩 컨벤션
```

---

## 01-prd.md (제품 요구사항 명세)

### 템플릿 경로
`.claude/skills/socrates/references/templates/prd-template.md`

### 필수 섹션
```markdown
# {프로젝트명} PRD

## 1. 제품 개요
- 서비스명: {서비스명}
- 핵심 가치: {Phase 1 답변}
- 타겟 사용자: {레벨 측정 결과}

## 2. 핵심 기능
### 기능 1: {기능명}
- 설명: {Phase 1 답변}
- Why: {Why 질문 답변}
- 우선순위: {MVP 여부}

### 기능 2: {기능명}
...

## 3. 사용자 스토리
- As a {사용자}, I want {기능}, so that {목적}

## 4. 제약 조건
- 시간: {Phase 1 답변}
- 예산: {Phase 1 답변}
- 인력: {Phase 1 답변}

## 5. MVP 범위
- Phase 0 기능: {MVP 답변}
```

### 생성 규칙
```
1. Phase 1 답변을 모두 포함
2. Why 질문 답변을 "핵심 가치"로 전환
3. 제약 조건 답변을 "MVP 범위"로 전환
4. 사용자 스토리는 기능별 자동 생성
```

---

## 02-trd.md (기술 요구사항 명세)

### 템플릿 경로
`.claude/skills/socrates/references/templates/trd-template.md`

### 필수 섹션
```markdown
# {프로젝트명} TRD

## 1. 기술 스택
### 프론트엔드
- {Phase 2.5 답변: 프론트엔드 스택}

### 백엔드
- {Phase 2.5 답변: 백엔드 스택}

### 데이터베이스
- {Phase 2.5 답변: DB 스택}

### 인프라
- {Phase 2.5 답변: 인프라 스택}

## 2. 아키텍처
- 구조: {레벨별 자동 추천}
- 패턴: {레벨별 자동 추천}

## 3. 보안 요구사항
- 인증: {기능에 로그인 포함 시}
- 인가: {기능에 권한 포함 시}

## 4. 성능 요구사항
- 응답 시간: {레벨별 기본값}
- 동시 접속: {레벨별 기본값}

## 5. 개발 환경
- Node.js: {자동 추천}
- Python: {자동 추천}
- Docker: {레벨별 선택}
```

### 생성 규칙
```
1. Phase 2.5 기술 스택을 그대로 사용
2. 레벨별 아키텍처 자동 추천:
   - L1/L2: Monolith (간단)
   - L3/L4: Microservices (선택지 제공)
3. 보안/성능 요구사항은 기본값 사용
4. 개발 환경은 기술 스택 기반 자동 추천
```

---

## 03-user-flow.md (사용자 플로우)

### 템플릿 경로
`.claude/skills/socrates/references/templates/user-flow-template.md`

### 필수 섹션
```markdown
# {프로젝트명} 사용자 플로우

## 1. 메인 플로우
```
{Phase 2 답변: 화면 간 이동 경로}
```

## 2. 화면별 플로우
### 화면 1: {화면명}
- 진입: {이전 화면}
- 행동: {사용자 행동}
- 이탈: {다음 화면}

### 화면 2: {화면명}
...

## 3. 예외 플로우
- 로그인 실패 시: {처리 방법}
- 네트워크 에러 시: {처리 방법}
```

### 생성 규칙
```
1. Phase 2 "화면 간 이동 경로" 답변을 Mermaid 다이어그램으로 변환
2. 각 화면의 진입/행동/이탈을 명시
3. 예외 플로우는 기본 패턴 사용 (로그인, 네트워크 에러)
```

---

## 04-database-design.md (데이터베이스 설계)

### 템플릿 경로
`.claude/skills/socrates/references/templates/database-design-template.md`

### 필수 섹션
```markdown
# {프로젝트명} 데이터베이스 설계

## 1. ERD
```mermaid
erDiagram
  {자동 생성}
```

## 2. 테이블 정의
### 테이블 1: {테이블명}
| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | int | PK | 기본키 |
| {컬럼명} | {타입} | {제약} | {설명} |

### 테이블 2: {테이블명}
...

## 3. 인덱스
- {테이블명}.{컬럼명} (성능 최적화)

## 4. 제약 조건
- Foreign Key: {관계}
- Unique: {유니크 필드}
```

### 생성 규칙
```
1. Phase 1 "핵심 기능"에서 데이터 모델 추출
2. 기능별로 필요한 테이블 자동 생성:
   - "게시물 작성" → posts 테이블
   - "친구 추가" → users, friendships 테이블
   - "좋아요" → likes 테이블
3. ERD는 Mermaid 형식으로 자동 생성
4. 인덱스는 기본 PK + 검색 필드만 추가
```

---

## 05-design-system.md (디자인 시스템)

### 템플릿 경로
`.claude/skills/socrates/references/templates/design-system-template.md`

### 필수 섹션
```markdown
# {프로젝트명} 디자인 시스템

## 1. 색상 팔레트
- Primary: {자동 추천}
- Secondary: {자동 추천}
- Background: {자동 추천}

## 2. 타이포그래피
- Heading: {자동 추천}
- Body: {자동 추천}
- Caption: {자동 추천}

## 3. 컴포넌트
### Button
- Primary: {스타일}
- Secondary: {스타일}

### Input
- Default: {스타일}
- Error: {스타일}

## 4. 간격 시스템
- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px

## 5. 반응형
- Mobile: < 768px
- Tablet: 768px ~ 1024px
- Desktop: > 1024px
```

### 생성 규칙
```
1. 색상 팔레트는 기본 추천값 사용
2. 타이포그래피는 기본 추천값 사용
3. 컴포넌트는 Phase 2 "컴포넌트 목록"에서 추출
4. 간격/반응형은 고정값 사용
```

---

## 06-screens.md (화면 목록)

### 템플릿 경로
`.claude/skills/socrates/references/templates/screens-template.md`

### 필수 섹션
```markdown
# {프로젝트명} 화면 목록

## 화면 1: {화면명}
- ID: {screen-id}
- 경로: {URL 경로}
- 기능: {Phase 2 답변}
- 컴포넌트: {Phase 2 답변}

## 화면 2: {화면명}
...

## 화면 간 이동
```
{Phase 2 답변: 화면 간 이동 경로}
```
```

### 생성 규칙
```
1. Phase 2 "화면 목록" 답변을 그대로 사용
2. 각 화면에 screen-id 자동 부여 (예: screen-01)
3. URL 경로는 화면명 기반 자동 생성 (예: /login, /dashboard)
4. 컴포넌트 목록은 Phase 2 답변에서 추출
```

### /screen-spec 연동
```
이 파일은 /screen-spec의 입력이 됩니다:
- /screen-spec은 06-screens.md를 읽어서 각 화면의 YAML 명세 생성
- 화면 ID, 경로, 컴포넌트 정보를 /screen-spec이 활용
```

---

## 07-coding-convention.md (코딩 컨벤션)

### 템플릿 경로
`.claude/skills/socrates/references/templates/coding-convention-template.md`

### 필수 섹션
```markdown
# {프로젝트명} 코딩 컨벤션

## 1. 파일 구조
```
{기술 스택 기반 자동 추천}
```

## 2. 네이밍 규칙
- 변수: camelCase
- 컴포넌트: PascalCase
- 상수: UPPER_SNAKE_CASE

## 3. 주석 규칙
- 함수: JSDoc
- 파일: 파일 상단에 설명

## 4. Lint/Formatter
- ESLint: {기술 스택 기반}
- Prettier: {기술 스택 기반}

## 5. Git 커밋 메시지
- feat: 새 기능
- fix: 버그 수정
- docs: 문서 수정
- refactor: 리팩토링
```

### 생성 규칙
```
1. 파일 구조는 기술 스택 기반 자동 추천
2. 네이밍 규칙은 고정값 사용
3. Lint/Formatter는 기술 스택 기반 자동 추천
4. Git 커밋 메시지는 Conventional Commits 사용
```

---

## 문서 생성 순서

```
1. 01-prd.md (Phase 1 답변 기반)
2. 02-trd.md (Phase 2.5 답변 기반)
3. 03-user-flow.md (Phase 2 답변 기반)
4. 04-database-design.md (Phase 1 답변 기반)
5. 05-design-system.md (기본 추천값)
6. 06-screens.md (Phase 2 답변 기반) ← /screen-spec 입력
7. 07-coding-convention.md (Phase 2.5 답변 기반)
```

---

## 문서 품질 검증

### 필수 체크리스트
```
□ 모든 문서가 docs/planning/ 폴더에 생성됨
□ 모든 문서에 Phase 답변이 반영됨
□ 06-screens.md에 화면 목록이 명시됨
□ 템플릿의 모든 섹션이 채워짐
□ Mermaid 다이어그램이 정상 렌더링됨
```

### 에러 처리
```
에러: 템플릿 파일이 없을 때
→ 기본 구조로 문서 생성 (템플릿 없이도 작동)

에러: Phase 답변이 누락됐을 때
→ 해당 섹션에 "[미정]" 표시 + 사용자에게 알림

에러: 파일 쓰기 실패
→ 사용자에게 에러 메시지 표시 + 문서 내용 출력
```

---

## 다음 스킬 전달 정보

### /screen-spec으로 전달
```
- 파일 경로: docs/planning/06-screens.md
- 화면 목록: {Phase 2 답변}
- 기술 스택: {Phase 2.5 답변}
```

### /tasks-generator로 전달
```
- 파일 경로: docs/planning/*.md (전체)
- 핵심 기능: {Phase 1 답변}
- 화면 목록: {Phase 2 답변}
- 기술 스택: {Phase 2.5 답변}
```

---

## 마지막 업데이트
**날짜**: 2026-02-15
**버전**: 1.0.0
