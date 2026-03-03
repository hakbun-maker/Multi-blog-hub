# 에러 처리 및 복구

> **로드 시점**: Task 실패/재시도 시

---

## 에러 처리 전략

### ⚠️ 컨텍스트 인식 재시도 전략 (max_turns 기반)

> **핵심**: 서브에이전트의 컨텍스트 폭발을 방지하면서 에러를 복구합니다.
> 전문가 호출 시 반드시 `max_turns`를 설정하여 무한 재시도를 방지합니다.

```
에러 발생 시 (컨텍스트 인식):
├── 1-2회: 같은 에이전트 내에서 단순 재시도
│   ├── 동일 명령어 재실행
│   └── 임시 파일 정리 후 재시도
├── 3회: 새 에이전트로 이어서 진행 (컨텍스트 리셋)
│   ├── 현재까지 작업 상태 확인
│   ├── 미완료 부분만 새 에이전트에 지시
│   └── 프롬프트에 "이미 작성된 코드 확인 후 이어서" 포함
├── 4회: 프롬프트 단순화 후 재호출
│   ├── TDD 단계 분리 (테스트만 / 구현만)
│   ├── 불필요한 컨텍스트 제거
│   └── 핵심 요구사항만 전달
└── 5회: FAIL
    ├── 에러 메시지를 CLAUDE.md에 기록
    └── 건너뛰고 계속 진행
```

### max_turns 가이드 (전문가 호출 시 필수!)

| 태스크 유형 | max_turns | 근거 |
|------------|-----------|------|
| Phase 0 셋업/설정 | 15 | 파일 읽기 + 생성만 |
| 단일 API/컴포넌트 | 20 | TDD 사이클 1회 |
| 통합 테스트/복합 기능 | 25 | TDD + 디버깅 여유 |

```
⚠️ max_turns 없이 전문가를 호출하면:
→ 에러 재시도 반복 → 컨텍스트 폭발 → "Context limit reached"
→ 작업 내용 전부 소실!
```

---

## 단순 재시도 (1-3회)

### 전략

```
동일한 Task 재호출
    ↓
임시 파일 정리
    ├── node_modules/.cache 삭제
    ├── .next 캐시 삭제
    └── __pycache__ 삭제
    ↓
재시도
```

### 코드 예시

```typescript
async function simpleRetry(task: Task, attempt: number): Promise<void> {
  console.log(`재시도 ${attempt}/3: ${task.id}`);

  // 임시 파일 정리
  await cleanTempFiles();

  // 동일 명령 재실행
  return executeTask(task);
}

async function cleanTempFiles(): Promise<void> {
  const dirsToClean = [
    'node_modules/.cache',
    '.next',
    'dist',
    '**/__pycache__'
  ];

  for (const dir of dirsToClean) {
    await exec(`rm -rf ${dir}`);
  }
}
```

---

## 코드 분석 재시도 (4-6회)

### 전략

```
에러 메시지 분석
    ├── 스택 트레이스에서 파일 경로 추출
    ├── 에러 타입 분류 (TypeError, SyntaxError, etc.)
    └── 관련 변수 식별
    ↓
관련 코드 읽기
    ├── 에러 발생 파일
    ├── 의존성 파일
    └── 테스트 파일
    ↓
패턴 매칭
    ├── CLAUDE.md의 Lessons Learned 검색
    ├── 유사 에러 해결 방법 찾기
    └── 일반적인 안티패턴 확인
    ↓
코드 수정
    └── 전문가 에이전트에게 수정 요청
```

### 코드 예시

```typescript
async function analyzeAndRetry(task: Task, error: Error, attempt: number): Promise<void> {
  console.log(`분석 재시도 ${attempt}/6: ${task.id}`);

  // 1. 에러 분석
  const analysis = analyzeError(error);

  // 2. 관련 코드 읽기
  const relatedFiles = await findRelatedFiles(analysis.stackTrace);
  const codeContext = await readFiles(relatedFiles);

  // 3. Lessons Learned 검색
  const lessons = await searchLessonsLearned(analysis.errorType);

  // 4. 전문가 에이전트에게 수정 요청
  await Task({
    subagent_type: task.agentType,
    description: `${task.id} 에러 수정 (${attempt}회차)`,
    prompt: `
## 에러 정보
${analysis.summary}

## 관련 코드
${codeContext}

## 참고 (유사 사례)
${lessons}

## 요청
위 에러를 분석하고 수정하세요.
    `
  });
}

function analyzeError(error: Error): ErrorAnalysis {
  return {
    errorType: error.constructor.name,
    message: error.message,
    stackTrace: error.stack || '',
    summary: `${error.constructor.name}: ${error.message}`
  };
}
```

---

## Systematic Debugging (7-9회)

### 전략

```
Phase 1: 근본 원인 조사 (Root Cause Analysis)
    ├── 에러가 언제부터 발생했는지 확인
    ├── 최근 변경 사항 확인 (git log)
    ├── 환경 변수 확인 (.env)
    └── 의존성 버전 확인 (package.json, requirements.txt)
    ↓
Phase 2: 패턴 분석
    ├── 에러 발생 조건 재현
    ├── 최소 재현 코드 작성
    └── 관련 이슈 검색 (GitHub, Stack Overflow)
    ↓
Phase 3: 가설 및 테스트
    ├── 가능한 원인 3-5개 나열
    ├── 각 가설에 대한 테스트 케이스 작성
    └── 테스트 실행하여 원인 특정
    ↓
Phase 4: 구현 및 회귀 테스트
    ├── 수정 사항 구현
    ├── 기존 테스트 모두 통과 확인
    └── 새 테스트 추가 (재발 방지)
```

### 코드 예시

```typescript
async function systematicDebug(task: Task, error: Error, attempt: number): Promise<void> {
  console.log(`Systematic Debugging ${attempt}/9: ${task.id}`);

  // Phase 1: Root Cause Analysis
  const rootCause = await analyzeRootCause(task, error);

  // Phase 2: 패턴 분석
  const pattern = await analyzePattern(rootCause);

  // Phase 3: 가설 및 테스트
  const hypotheses = generateHypotheses(pattern);
  const validHypothesis = await testHypotheses(hypotheses);

  // Phase 4: 구현 및 회귀 테스트
  await implementFix(task, validHypothesis);
  await runRegressionTests(task);
}

async function analyzeRootCause(task: Task, error: Error): Promise<RootCause> {
  // Git 히스토리 확인
  const recentChanges = await exec('git log --oneline -10');

  // 환경 변수 확인
  const envVars = await readFile('.env');

  // 의존성 확인
  const deps = await readFile('package.json');

  return {
    recentChanges,
    envVars,
    dependencies: JSON.parse(deps).dependencies,
    firstOccurrence: await findFirstOccurrence(error)
  };
}

function generateHypotheses(pattern: Pattern): Hypothesis[] {
  return [
    {
      name: "API 응답 형식 변경",
      test: () => checkApiResponseFormat(),
      fix: "옵셔널 체이닝 추가"
    },
    {
      name: "의존성 버전 충돌",
      test: () => checkDependencyConflicts(),
      fix: "package.json 버전 고정"
    },
    {
      name: "환경 변수 누락",
      test: () => checkEnvVars(),
      fix: ".env.example 업데이트"
    }
  ];
}

async function testHypotheses(hypotheses: Hypothesis[]): Promise<Hypothesis> {
  for (const hypothesis of hypotheses) {
    const result = await hypothesis.test();
    if (result.isValid) {
      return hypothesis;
    }
  }
  throw new Error("모든 가설이 기각됨");
}
```

---

## 동일 에러 3회 감지

### 전략

```
에러 발생
    ↓
에러 시그니처 생성
    ├── 에러 타입
    ├── 에러 메시지 (동적 부분 제거)
    └── 스택 트레이스 최상단 3줄
    ↓
히스토리에서 동일 시그니처 검색
    ↓
3회 이상 발견 시
    └── Systematic Debugging 즉시 시작
```

### 코드 예시

```typescript
interface ErrorSignature {
  type: string;
  message: string;
  stackTop: string[];
}

function generateErrorSignature(error: Error): ErrorSignature {
  const stackLines = (error.stack || '').split('\n').slice(0, 3);

  return {
    type: error.constructor.name,
    message: normalizeErrorMessage(error.message),
    stackTop: stackLines.map(line => line.trim())
  };
}

function normalizeErrorMessage(msg: string): string {
  // 동적 부분 제거 (숫자, 경로 등)
  return msg
    .replace(/\d+/g, 'N')  // 숫자 → N
    .replace(/\/[^\s]+/g, '/PATH')  // 경로 → /PATH
    .replace(/['"].*?['"]/g, 'STR');  // 문자열 → STR
}

class ErrorTracker {
  private history: Map<string, number> = new Map();

  track(error: Error): number {
    const signature = generateErrorSignature(error);
    const key = JSON.stringify(signature);

    const count = (this.history.get(key) || 0) + 1;
    this.history.set(key, count);

    return count;
  }

  shouldUseSystematicDebug(count: number): boolean {
    return count >= 3;
  }
}

// 사용 예시
const tracker = new ErrorTracker();

async function retryWithTracking(task: Task, error: Error): Promise<void> {
  const count = tracker.track(error);

  if (tracker.shouldUseSystematicDebug(count)) {
    console.log(`동일 에러 ${count}회 감지 → Systematic Debugging 시작`);
    await systematicDebug(task, error, count);
  } else if (count <= 3) {
    await simpleRetry(task, count);
  } else if (count <= 6) {
    await analyzeAndRetry(task, error, count);
  }
}
```

---

## 프론트엔드 에러 특수 처리

### 스크린샷 검증 실패 시

```
스크린샷 검증 실패
    ↓
1️⃣ 개발자 도구 콘솔 로그 확인
    └── ReadScreenshot으로 콘솔 에러 캡처
    ↓
2️⃣ 네트워크 탭 확인
    └── API 호출 실패 여부 확인
    ↓
3️⃣ React 에러 경계 확인
    └── ErrorBoundary 컴포넌트 로그
    ↓
4️⃣ 원인 특정 후 수정
    ├── API 에러 → Backend 확인
    ├── 렌더링 에러 → Frontend 수정
    └── 스타일 에러 → CSS 수정
```

### 상태별 스크린샷 검증

```typescript
async function verifyFrontendTask(task: Task): Promise<void> {
  const states = ['loading', 'error', 'empty', 'normal'];

  for (const state of states) {
    try {
      // 상태 전환
      await clickButton(`[data-testid="${state}-button"]`);

      // 스크린샷 검증
      const screenshot = await captureScreenshot();
      const isValid = await verifyScreenshot(screenshot, state);

      if (!isValid) {
        throw new Error(`${state} 상태 검증 실패`);
      }
    } catch (error) {
      console.error(`${state} 상태 에러:`, error);

      // 콘솔 로그 캡처
      const consoleLogs = await captureConsoleLogs();

      // Frontend 에이전트에게 수정 요청
      await Task({
        subagent_type: 'frontend-specialist',
        description: `${task.id} ${state} 상태 에러 수정`,
        prompt: `
## 에러 정보
상태: ${state}
에러: ${error.message}

## 콘솔 로그
${consoleLogs}

## 요청
${state} 상태에서 발생하는 에러를 수정하세요.
        `
      });
    }
  }
}
```

---

## CLAUDE.md 에러 기록

### 필수 기록 항목

```markdown
## 실패한 태스크

| 태스크 | 에러 | 시도 | 상태 |
|--------|------|------|------|
| T1.3 | TypeError: Cannot read property 'data' of undefined | 10회 | 건너뜀 |
| T2.5 | Redis 연결 실패 | 10회 | 건너뜀 |

## Lessons Learned

### [2026-01-18] T1.3 실패 - TypeError
- **원인**: API 응답 형식 변경 (data.items → data)
- **해결**: response.data?.items 옵셔널 체이닝 추가
- **교훈**: API 응답은 항상 방어적으로 처리

### [2026-01-18] T2.5 실패 - Redis 연결
- **원인**: Redis 서버 미실행
- **해결**: docker-compose up -d redis
- **교훈**: 외부 서비스 의존성은 README.md에 명시
```

### 자동 기록 코드

```typescript
async function recordFailure(task: Task, error: Error, attempts: number): Promise<void> {
  const claudeMd = await readFile('CLAUDE.md');

  const failureEntry = `
| ${task.id} | ${error.message} | ${attempts}회 | 건너뜀 |
`;

  const lessonEntry = `
### [${new Date().toISOString().split('T')[0]}] ${task.id} 실패 - ${error.constructor.name}
- **원인**: ${analyzeRootCause(error)}
- **해결**: ${suggestFix(error)}
- **교훈**: ${extractLesson(error)}
`;

  const updatedMd = claudeMd
    .replace('## 실패한 태스크\n\n', `## 실패한 태스크\n\n${failureEntry}`)
    .replace('## Lessons Learned\n\n', `## Lessons Learned\n\n${lessonEntry}`);

  await writeFile('CLAUDE.md', updatedMd);
}
```

---

## 재개 (`--resume`) 처리

### 상태 복원

```bash
# 1. orchestrate-state.json에서 상태 로드
cat .claude/orchestrate-state.json

# 2. 완료된 태스크 건너뛰기
# 3. 실패한 태스크 재시도
# 4. 다음 태스크부터 계속
```

### 코드 예시

```typescript
async function resumeOrchestration(): Promise<void> {
  // 상태 로드
  const state = await loadState();

  // 완료된 태스크 ID 집합
  const completed = new Set(state.completedTasks);

  // 전체 태스크 로드
  const allTasks = await parseTasks('docs/planning/TASKS.md');

  // 미완료 태스크만 필터링
  const remainingTasks = allTasks.filter(task => !completed.has(task.id));

  // 실패한 태스크 먼저 재시도
  for (const failed of state.failedTasks) {
    console.log(`재시도: ${failed.id} (이전 시도: ${failed.attempts}회)`);
    await executeTask(failed);
  }

  // 나머지 태스크 실행
  for (const task of remainingTasks) {
    await executeTask(task);
  }
}
```

---

## 외부 서비스 에러

### API 키 누락

```
API 키 에러 감지
    ├── OPENAI_API_KEY not found
    ├── STRIPE_SECRET_KEY not found
    └── etc.
    ↓
AskUserQuestion으로 입력 요청
    ┌─────────────────────────────────────────────────┐
    │ API 키가 필요합니다:                             │
    │                                                  │
    │ STRIPE_SECRET_KEY                                │
    │                                                  │
    │ 입력하거나 .env에 추가 후 /auto-orchestrate      │
    │ --resume 실행하세요.                             │
    └─────────────────────────────────────────────────┘
```

### 외부 서비스 연결 실패

```
연결 실패 감지
    ├── Redis: ECONNREFUSED 127.0.0.1:6379
    ├── PostgreSQL: connection refused
    └── etc.
    ↓
서비스 상태 확인
    ├── docker ps (컨테이너)
    ├── systemctl status (시스템 서비스)
    └── ping (네트워크)
    ↓
자동 시작 시도
    ├── docker-compose up -d
    └── systemctl start
    ↓
실패 시 → 사용자 안내
```

---

## 참조 문서

- `references/phase-execution.md` - Phase 실행 상세
- `references/merge-workflow.md` - 병합 워크플로우
- `../systematic-debugging/SKILL.md` - Systematic Debugging 상세
