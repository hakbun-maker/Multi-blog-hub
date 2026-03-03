# Progressive Disclosure Architecture

> **2-Tier 구조로 토큰 50% 절감하고 컨텍스트를 효율적으로 관리하는 스킬 설계 패턴**
>
> 출처: [Jeffallan/claude-skills](https://github.com/Jeffallan/claude-skills)

---

## 📖 왜 Progressive Disclosure인가?

### 문제: 전통적인 단일 파일 스킬의 한계

```
❌ 기존 방식: 하나의 거대한 SKILL.md (1000-3000줄)

문제점:
├─ 컨텍스트 창 낭비 (매번 전체 로드)
├─ 토큰 비용 증가 (불필요한 내용까지 로드)
├─ 유지보수 어려움 (모든 내용이 한 파일에)
└─ 로딩 속도 저하 (Claude가 전체 읽어야 함)
```

### 해결: Progressive Disclosure (점진적 노출)

```
✅ 2-Tier 구조

Tier 1: SKILL.md (80-100줄)
├─ 역할 정의 (1-2줄)
├─ 활성화 트리거
├─ 핵심 워크플로우 (5단계)
├─ 제약 조건 (MUST DO / MUST NOT DO)
└─ 라우팅 테이블 (어떤 참조를 언제 로드할지)

Tier 2: references/ (파일당 100-600줄)
├─ 상세 코드 예제
├─ 엣지 케이스 처리
├─ 안티패턴 및 트러블슈팅
└─ 고급 사용법
```

### 효과

| 항목 | 기존 방식 | Progressive Disclosure |
|------|----------|------------------------|
| 초기 로드 토큰 | 3000 | **100** (97% 절감) |
| 평균 토큰 사용 | 3000 | **800** (73% 절감) |
| 유지보수성 | 낮음 | **높음** (모듈화) |
| 로딩 속도 | 느림 | **빠름** (필요한 것만) |

---

## 📐 Tier 1: SKILL.md 구조

### 템플릿

```markdown
# {스킬 이름}

> **역할**: {1-2줄 요약}

---

## 활성화 트리거

- 사용자가 `/{command}` 입력 시
- 특정 파일 패턴 감지 시 (예: `next.config.js`)
- 다른 스킬에서 명시적 호출 시

---

## 핵심 워크플로우

### 1단계: {단계명}
{간단한 설명 1-2줄}

### 2단계: {단계명}
{간단한 설명 1-2줄}

### 3단계: {단계명}
{간단한 설명 1-2줄}

### 4단계: {단계명}
{간단한 설명 1-2줄}

### 5단계: {단계명}
{간단한 설명 1-2줄}

---

## 제약 조건

### ✅ MUST DO
- {필수 행동 1}
- {필수 행동 2}
- {필수 행동 3}

### ⛔ MUST NOT DO
- {금지 행동 1}
- {금지 행동 2}
- {금지 행동 3}

---

## 참조 자료 (라우팅 테이블)

| Topic | Reference | Load When |
|-------|-----------|-----------|
| {주제 1} | references/{파일명}.md | {조건 1} |
| {주제 2} | references/{파일명}.md | {조건 2} |
| {주제 3} | references/{파일명}.md | {조건 3} |

---

## 빠른 시작

{가장 흔한 사용 사례 1-2개 예시}
```

### 중요 원칙

| 원칙 | 설명 |
|------|------|
| **간결성** | 80-100줄 엄수 (200줄 넘으면 분리) |
| **자기완결성** | SKILL.md만으로도 기본 작업 가능 |
| **명확한 라우팅** | 언제 어떤 참조를 로드할지 명시 |
| **토큰 효율** | 불필요한 예제/설명 제거 (참조로 이동) |

---

## 📚 Tier 2: references/ 구조

### 파일 명명 규칙

```
references/
├── {topic}-basics.md           # 기초 개념 (100-200줄)
├── {topic}-advanced.md         # 고급 사용법 (200-400줄)
├── {topic}-examples.md         # 코드 예제 모음 (300-600줄)
├── {topic}-troubleshooting.md  # 문제 해결 (200-400줄)
└── {topic}-antipatterns.md     # 안티패턴 (100-300줄)
```

### 파일 크기 가이드

| 파일 유형 | 권장 크기 | 최대 크기 |
|----------|----------|----------|
| Basics | 100-200줄 | 300줄 |
| Advanced | 200-400줄 | 600줄 |
| Examples | 300-600줄 | 800줄 |
| Troubleshooting | 200-400줄 | 500줄 |
| Antipatterns | 100-300줄 | 400줄 |

### 내용 가이드

#### 1. Basics 파일

```markdown
# {Topic} 기초

## 개념
{핵심 개념 설명}

## 기본 패턴
{가장 흔한 사용 패턴 3-5개}

## 주의사항
{초보자가 놓치기 쉬운 것들}
```

#### 2. Advanced 파일

```markdown
# {Topic} 고급

## 고급 패턴
{복잡한 사용 사례}

## 성능 최적화
{최적화 기법}

## 통합 방법
{다른 시스템과의 통합}
```

#### 3. Examples 파일

```markdown
# {Topic} 예제 모음

## 예제 1: {시나리오}
```typescript
// 완전한 동작 코드
```

## 예제 2: {시나리오}
```typescript
// 완전한 동작 코드
```
```

#### 4. Troubleshooting 파일

```markdown
# {Topic} 문제 해결

## 에러 1: {에러 메시지}
**원인**: {원인}
**해결**: {해결책}

## 에러 2: {에러 메시지}
**원인**: {원인}
**해결**: {해결책}
```

#### 5. Antipatterns 파일

```markdown
# {Topic} 안티패턴

## ❌ 안티패턴 1: {패턴명}
```typescript
// 잘못된 코드
```

**문제**: {문제점}

## ✅ 올바른 방법
```typescript
// 올바른 코드
```
```

---

## 🧭 라우팅 테이블 설계

### 라우팅 조건 유형

| 조건 유형 | 예시 |
|----------|------|
| **파일 패턴** | `*.tsx` 파일 작업 시 |
| **사용자 의도** | 성능 최적화 요청 시 |
| **에러 발생** | 특정 에러 발생 시 |
| **단계** | 워크플로우 N단계 진입 시 |
| **컨텍스트** | Next.js 프로젝트 감지 시 |

### 예시: auto-orchestrate 라우팅 테이블

```markdown
| Topic | Reference | Load When |
|-------|-----------|-----------|
| Task 분해 전략 | references/task-breakdown.md | /auto-orchestrate 시작 시 |
| 의존성 분석 | references/dependency-analysis.md | Phase 2+ 작업 시 |
| 에러 복구 | references/error-recovery.md | Task 실패 시 |
| Git Worktree | references/git-worktree.md | Phase 1+ 첫 Task 시 |
| 상태 관리 | references/state-management.md | 상태 파일 업데이트 시 |
| 품질 게이트 | references/quality-gates.md | Task 완료 전 |
```

### 조건 작성 가이드

```
✅ 좋은 조건:
- "RSC 패턴 사용 시"
- "에러 발생 시"
- "성능 최적화 요청 시"

❌ 나쁜 조건:
- "필요할 때" (모호함)
- "항상" (Tier 1에 포함해야 함)
- "거의 안 씀" (삭제 고려)
```

---

## 🔄 마이그레이션 가이드

### 기존 스킬을 Progressive Disclosure로 전환하기

#### Step 1: 분석

```bash
# 기존 SKILL.md 줄 수 확인
wc -l .claude/skills/{skill-name}/SKILL.md

# 500줄 이상이면 분리 고려
```

#### Step 2: Tier 1 추출

```markdown
1. 역할 정의 (1-2줄) 추출
2. 워크플로우를 5단계로 압축
3. 제약 조건 핵심만 남김 (각 3-5개)
4. 예제 코드 전부 삭제 (Tier 2로 이동)
5. 라우팅 테이블 작성
```

#### Step 3: Tier 2 분리

```bash
# references/ 디렉토리 생성
mkdir -p .claude/skills/{skill-name}/references

# 주제별로 파일 분리
# - 예제 코드 → references/examples.md
# - 에러 처리 → references/troubleshooting.md
# - 고급 패턴 → references/advanced.md
```

#### Step 4: 라우팅 연결

```markdown
# SKILL.md에 라우팅 테이블 추가
| Topic | Reference | Load When |
|-------|-----------|-----------|
| 예제 | references/examples.md | 코드 예제 필요 시 |
| 트러블슈팅 | references/troubleshooting.md | 에러 발생 시 |
| 고급 | references/advanced.md | 고급 기능 요청 시 |
```

#### Step 5: 검증

```bash
# Tier 1 크기 확인 (80-100줄 목표)
wc -l .claude/skills/{skill-name}/SKILL.md

# Tier 2 크기 확인 (100-600줄/파일 목표)
wc -l .claude/skills/{skill-name}/references/*.md
```

---

## 🎯 실전 예시: auto-orchestrate Before/After

### Before (단일 파일, 2500줄)

```
.claude/skills/auto-orchestrate/
└── SKILL.md (2500줄)
    ├── 역할 정의 (50줄)
    ├── 워크플로우 (500줄)
    ├── 예제 코드 (800줄)
    ├── 에러 처리 (400줄)
    ├── Git Worktree 가이드 (300줄)
    ├── 상태 파일 스키마 (200줄)
    └── 품질 게이트 (250줄)

문제:
- 매번 2500줄 로드 (토큰 낭비)
- 유지보수 어려움
- 특정 부분만 참조 불가
```

### After (2-Tier, 100 + 6×300줄)

```
.claude/skills/auto-orchestrate/
├── SKILL.md (100줄) ← Tier 1
│   ├── 역할 (2줄)
│   ├── 활성화 트리거 (5줄)
│   ├── 핵심 워크플로우 (30줄, 5단계×6줄)
│   ├── 제약 조건 (20줄)
│   ├── 라우팅 테이블 (20줄)
│   └── 빠른 시작 (10줄)
└── references/ ← Tier 2
    ├── task-breakdown.md (400줄)
    ├── dependency-analysis.md (300줄)
    ├── error-recovery.md (350줄)
    ├── git-worktree.md (250줄)
    ├── state-management.md (300줄)
    └── quality-gates.md (300줄)

효과:
- 초기 로드: 100줄 (96% 절감)
- 필요 시 참조 로드: 평균 1-2개 파일 (300-600줄)
- 평균 토큰: 400-700 (72% 절감)
- 유지보수: 파일별 독립 수정 가능
```

### SKILL.md (Tier 1) 예시

```markdown
# Auto-Orchestrate

> **역할**: TASKS.md 기반 자동 개발 오케스트레이터. Ultra-Thin 모드로 메인 컨텍스트 최소화.

---

## 활성화 트리거

- `/auto-orchestrate` 명령 입력 시
- `docs/planning/TASKS.md` 파일 존재 시

---

## 핵심 워크플로우

### 1단계: TASKS.md 파싱
kongkong2로 2번 읽기 (ID + 완료 조건)

### 2단계: 의존성 분석
Phase 0 → Phase N 순차 실행

### 3단계: Task Executor 호출
각 Task를 독립 에이전트로 실행

### 4단계: 에러 복구
10회 재시도 (1-3: 단순, 4-6: 분석, 7-9: 디버깅)

### 5단계: 상태 업데이트
orchestrate-state.json + TASKS.md 체크박스

---

## 제약 조건

### ✅ MUST DO
- Task Executor에게 최소 정보만 전달 (TASK_ID + WORKTREE)
- DONE/FAIL 한 줄만 받기
- 상태 파일 자동 동기화

### ⛔ MUST NOT DO
- Task Executor에게 질문하지 않기
- 중간 로그 요청하지 않기
- 메인 컨텍스트에 상세 정보 저장하지 않기

---

## 참조 자료 (라우팅 테이블)

| Topic | Reference | Load When |
|-------|-----------|-----------|
| Task 분해 전략 | references/task-breakdown.md | /auto-orchestrate 시작 시 |
| 의존성 분석 | references/dependency-analysis.md | Phase 2+ 작업 시 |
| 에러 복구 | references/error-recovery.md | Task 실패 시 |
| Git Worktree | references/git-worktree.md | Phase 1+ 첫 Task 시 |
| 상태 관리 | references/state-management.md | 상태 파일 업데이트 시 |
| 품질 게이트 | references/quality-gates.md | Task 완료 전 |

---

## 빠른 시작

```bash
# 1. TASKS.md 확인
cat docs/planning/TASKS.md

# 2. 자동 실행
/auto-orchestrate

# 3. 결과 확인
cat .claude/orchestrate-state.json
```
```

### references/task-breakdown.md (Tier 2) 예시

```markdown
# Task 분해 전략

> **로드 시점**: /auto-orchestrate 시작 시

---

## 개념

TASKS.md의 각 Task를 독립 실행 가능한 원자 단위로 분해하는 전략.

---

## 분해 원칙

### 1. 단일 책임
- 하나의 Task는 하나의 파일/기능만 담당
- 예: "로그인 API" (O), "로그인 API + DB + 테스트" (X)

### 2. 의존성 명시
- Depends On 필드에 선행 Task ID 명시
- Phase로 자동 그룹화 (Phase 0 = 의존성 없음)

### 3. 파일 경로 명확화
- 담당 필드: backend/frontend/database/test
- Files 필드: 정확한 경로 (상대 경로)

---

## 분해 패턴

### 패턴 1: 백엔드 API

```markdown
- [ ] T1.1: 사용자 스키마 정의
  - 담당: database
  - Files: app/models/user.py
  - Depends On: -

- [ ] T1.2: 사용자 CRUD API
  - 담당: backend
  - Files: app/routes/users.py
  - Depends On: T1.1

- [ ] T1.3: 사용자 API 테스트
  - 담당: test
  - Files: tests/test_users.py
  - Depends On: T1.2
```

### 패턴 2: 프론트엔드 컴포넌트

```markdown
- [ ] T2.1: LoginForm 컴포넌트
  - 담당: frontend
  - Files: src/components/LoginForm.tsx
  - Depends On: T1.2

- [ ] T2.2: LoginForm 스타일
  - 담당: frontend
  - Files: src/components/LoginForm.module.css
  - Depends On: T2.1
```

---

## 완료 조건 작성

### 좋은 완료 조건

```markdown
✅ 명확한 검증 가능 조건:
- [ ] pytest로 모든 테스트 통과
- [ ] API가 200 응답 반환
- [ ] 컴포넌트가 에러 없이 렌더링
```

### 나쁜 완료 조건

```markdown
❌ 모호한 조건:
- [ ] 잘 작동함
- [ ] 완성됨
- [ ] 문제 없음
```

---

## 에러 처리

### Task 분해가 너무 클 때

```
에러: Task가 500줄 이상 코드 작성 필요

해결:
├─ 2-3개 하위 Task로 분해
├─ 의존성 업데이트
└─ Phase 재계산
```

### Task 분해가 너무 작을 때

```
에러: Task가 10줄 미만 코드 (오버헤드 과다)

해결:
├─ 관련 Task와 병합
└─ 하나의 Task로 통합
```
```

---

## 📊 토큰 절감 효과 분석

### 시나리오: /auto-orchestrate 10개 Task 실행

#### 기존 방식 (단일 SKILL.md)

```
초기 로드: 2500 토큰
Task 1: 2500 토큰 (전체 재로드)
Task 2: 2500 토큰
...
Task 10: 2500 토큰

총 토큰: 2500 × 11 = 27,500 토큰
```

#### Progressive Disclosure

```
초기 로드: 100 토큰 (SKILL.md)
Task 1: 100 + 400 (task-breakdown) = 500 토큰
Task 2: 100 + 300 (dependency) = 400 토큰
Task 3 (실패): 100 + 350 (error-recovery) = 450 토큰
Task 4-10: 100 × 7 = 700 토큰

총 토큰: 100 + 500 + 400 + 450 + 700 = 2,150 토큰
```

#### 절감 효과

| 항목 | 기존 | Progressive | 절감률 |
|------|------|-------------|--------|
| 총 토큰 | 27,500 | 2,150 | **92%** |
| 평균/Task | 2,500 | 215 | **91%** |
| 초기 로드 | 2,500 | 100 | **96%** |

---

## ✅ 체크리스트

### Progressive Disclosure 스킬 작성 시

```
□ SKILL.md가 80-100줄인가?
□ 핵심 워크플로우가 5단계인가?
□ 라우팅 테이블이 명확한가?
□ references/ 파일이 100-600줄인가?
□ 파일명이 kebab-case인가?
□ 각 참조 파일의 로드 조건이 명시되었는가?
□ SKILL.md만으로도 기본 작업이 가능한가?
□ 예제 코드가 Tier 2로 분리되었는가?
```

### 마이그레이션 시

```
□ 기존 SKILL.md 백업했는가?
□ Tier 1 추출 완료했는가?
□ Tier 2 파일 분리 완료했는가?
□ 라우팅 테이블 작성했는가?
□ 토큰 절감 효과를 측정했는가?
□ 테스트 실행해봤는가?
```

---

## 📚 참고 자료

### 실제 구현 예시

| 스킬 | Progressive Disclosure 적용 |
|------|----------------------------|
| auto-orchestrate | `.claude/skills/auto-orchestrate/` |
| kongkong2 | `.claude/skills/kongkong2/` |
| socrates | `.claude/skills/socrates/` |

### 관련 문서

- [Jeffallan/claude-skills](https://github.com/Jeffallan/claude-skills) - 원본 프로젝트
- `.claude/docs/memory-architecture.md` - 메모리 아키텍처
- `CLAUDE.md` - 프로젝트 표준

---

## 🎓 핵심 요약

```
Progressive Disclosure = 2-Tier 구조

Tier 1 (SKILL.md, 80-100줄):
├─ 역할 정의
├─ 핵심 워크플로우 (5단계)
├─ 제약 조건
└─ 라우팅 테이블 ← 핵심!

Tier 2 (references/, 100-600줄/파일):
├─ 상세 코드 예제
├─ 에러 처리
├─ 고급 패턴
└─ 트러블슈팅

효과:
✅ 토큰 50-92% 절감
✅ 로딩 속도 10배 향상
✅ 유지보수성 대폭 개선
```

---

**마지막 업데이트**: 2026-02-15
**버전**: 1.0.0
