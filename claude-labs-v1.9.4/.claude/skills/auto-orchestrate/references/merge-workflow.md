# Phase 병합 워크플로우

> **로드 시점**: Phase 완료 후 병합 시

---

## Phase 완료 후 병합 절차

### 일반 모드 (기본)

```
Phase N 완료
    ↓
1️⃣ 품질 게이트 검증
    ├── 테스트 실행
    ├── 커버리지 확인
    ├── 린트 체크
    └── 빌드 확인
    ↓
2️⃣ 슬랙 알림 전송 (웹훅 URL 있는 경우)
    "🎉 Phase N 완료! (X개 태스크)"
    ↓
3️⃣ AskUserQuestion으로 다음 단계 확인
    ┌─────────────────────────────────────────────────┐
    │ ✅ Phase N 완료!                                 │
    │                                                  │
    │ [1] /compact 후 계속 (권장)                      │
    │ [2] 바로 다음 Phase 시작                         │
    │ [3] 여기서 종료                                  │
    └─────────────────────────────────────────────────┘
    ↓
4️⃣ 사용자 선택에 따라 진행

⛔ 일반 모드에서는 위 3️⃣ 단계를 건너뛰고 바로 다음 Phase로 진행 금지!
```

### 🚨 Ultra-Thin 모드 (`--ultra-thin`) 예외!

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚠️ --ultra-thin 모드에서는 위 규칙이 적용되지 않습니다!        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Ultra-Thin Phase 완료 시:                                      │
│    1️⃣ 슬랙 알림 전송 (비동기)                                   │
│    2️⃣ 자동 병합                                                 │
│    3️⃣ ❌ AskUserQuestion 없음!                                  │
│    4️⃣ 즉시 다음 Phase 시작                                      │
│                                                                 │
│  Ultra-Thin 모드는 ALL_DONE까지 절대 멈추지 않습니다!           │
│  상세: ../ultra-thin-orchestrate/SKILL.md                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 품질 게이트 (Quality Gates)

### Phase 완료 전 필수 검증

#### 백엔드 태스크

```bash
# 1. 테스트 실행
pytest --cov=app --cov-fail-under=70

# 2. 타입 체크
mypy app/

# 3. 린트
ruff check .

# 4. 보안 검사 (선택)
bandit -r app/
```

#### 프론트엔드 태스크

```bash
# 1. 테스트 실행
npm test

# 2. 린트
npm run lint

# 3. 빌드
npm run build

# 4. 타입 체크
npm run type-check
```

#### 데이터베이스 태스크

```bash
# 1. 마이그레이션 테스트
alembic upgrade head

# 2. 롤백 테스트
alembic downgrade -1

# 3. DB 테스트
pytest tests/db/
```

### 품질 게이트 실패 시

```
실패 발견
    ↓
1️⃣ 에러 메시지 CLAUDE.md에 기록
    ↓
2️⃣ 해당 태스크를 failed_tasks에 추가
    ↓
3️⃣ 에러 복구 시도 (references/error-handling.md 참조)
    ↓
4️⃣ 10회 실패 → 건너뛰고 계속 진행
```

---

## Git 병합 절차

### Worktree에서 main으로 병합

```bash
# 1. Worktree에서 테스트 통과 확인
cd worktree/phase-1-object-system
npm test

# 2. main으로 돌아가기
cd ../..

# 3. 병합 (--no-ff로 병합 커밋 명시)
git merge phase-1-object-system --no-ff -m "Phase 1: Object System 완료"

# 4. Worktree 정리 (선택)
git worktree remove worktree/phase-1-object-system
```

### 병합 충돌 발생 시

```
충돌 발생
    ↓
1️⃣ 충돌 파일 확인
    git status
    ↓
2️⃣ 자동 해결 시도
    git mergetool --tool=vimdiff
    ↓
3️⃣ 실패 시 → 사용자에게 안내
    "충돌 발견: {files}. 수동 해결 후 /auto-orchestrate --resume"
    ↓
4️⃣ 해결 후 재개
    git add .
    git merge --continue
```

---

## 슬랙 알림

### 웹훅 URL 설정

#### 초기 설정 (처음 실행 시)

```
1️⃣ orchestrate-state.json 확인
    ↓
2️⃣ slackWebhookUrl 필드 없음 → AskUserQuestion
    ┌─────────────────────────────────────────────────┐
    │ 슬랙 알림을 받으시겠습니까?                      │
    │                                                  │
    │ [1] 예, 웹훅 URL 입력                            │
    │ [2] 아니오, 건너뛰기                             │
    └─────────────────────────────────────────────────┘
    ↓
3️⃣ [1] 선택 시 → AskUserQuestion으로 URL 입력
    ↓
4️⃣ orchestrate-state.json에 저장
```

#### 슬랙 웹훅 생성 방법

1. Slack 워크스페이스 접속
2. Apps → Incoming Webhooks 검색
3. "Add to Slack" 클릭
4. 채널 선택 (예: #dev-alerts)
5. 웹훅 URL 복사 (https://hooks.slack.com/services/...)

### 알림 형식

#### Phase 완료 알림

```json
{
  "text": "🎉 Phase 1 완료!",
  "attachments": [
    {
      "color": "good",
      "fields": [
        {
          "title": "완료 태스크",
          "value": "12개",
          "short": true
        },
        {
          "title": "경과 시간",
          "value": "23분",
          "short": true
        }
      ]
    }
  ]
}
```

#### Task 실패 알림

```json
{
  "text": "⚠️ Task 실패: T1.3",
  "attachments": [
    {
      "color": "warning",
      "fields": [
        {
          "title": "에러",
          "value": "TypeError: Cannot read property 'data' of undefined"
        },
        {
          "title": "시도 횟수",
          "value": "10회"
        }
      ]
    }
  ]
}
```

#### 전체 완료 알림

```json
{
  "text": "🎊 Auto-Orchestrate 완료!",
  "attachments": [
    {
      "color": "good",
      "fields": [
        {
          "title": "총 태스크",
          "value": "45개",
          "short": true
        },
        {
          "title": "성공",
          "value": "43개 (96%)",
          "short": true
        },
        {
          "title": "실패",
          "value": "2개",
          "short": true
        },
        {
          "title": "총 경과 시간",
          "value": "2시간 15분",
          "short": true
        }
      ]
    }
  ]
}
```

---

## 체크포인트 시스템

### Phase별 체크포인트

```
Phase N 완료
    ↓
1️⃣ 상태 파일 업데이트
    orchestrate-state.json에 현재 Phase 기록
    ↓
2️⃣ 체크포인트 파일 생성
    .claude/checkpoints/phase-N.json
    ↓
3️⃣ 재개 가능 상태 저장
    완료된 태스크 ID 목록
    실패한 태스크 정보
    다음 Phase 정보
```

### 체크포인트 파일 구조

```json
{
  "phase": 1,
  "completedAt": "2026-01-18T12:00:00Z",
  "completedTasks": ["T1.1", "T1.2", "T1.3"],
  "failedTasks": [
    {
      "id": "T1.4",
      "error": "API key missing",
      "attempts": 3
    }
  ],
  "nextPhase": 2,
  "totalDuration": "23m 15s"
}
```

### 재개 (`--resume`) 시

```bash
# 1. 가장 최근 체크포인트 로드
cat .claude/orchestrate-state.json

# 2. 실패한 태스크 재시도
/auto-orchestrate --resume

# 3. 완료된 태스크 건너뛰기
# 4. 다음 Phase부터 계속
```

---

## 완료 보고 형식

### 성공 시

```
═══════════════════════════════════════════════════════
  🎉 Auto-Orchestrate 완료!
═══════════════════════════════════════════════════════

📊 결과 요약:
   총 태스크: 45개
   성공: 45개 (100%)
   실패: 0개
   총 경과 시간: 2시간 15분

📋 Phase별 요약:
   Phase 0: 5개 (12m)
   Phase 1: 12개 (35m)
   Phase 2: 18개 (58m)
   Phase 3: 10개 (30m)

✅ 모든 Phase가 main에 병합되었습니다.

═══════════════════════════════════════════════════════
```

### 일부 실패 시

```
═══════════════════════════════════════════════════════
  🎉 Auto-Orchestrate 완료!
═══════════════════════════════════════════════════════

📊 결과 요약:
   총 태스크: 45개
   성공: 43개 (96%)
   실패: 2개

❌ 실패 태스크:
   - T2.5: Redis 연결 실패 (10회 시도)
     └─ Error: ECONNREFUSED 127.0.0.1:6379
   - T3.2: Stripe API 키 필요
     └─ Error: STRIPE_SECRET_KEY not found in .env

📋 권장 조치:
   1. Redis 서버 상태 확인: redis-cli ping
   2. .env에 STRIPE_SECRET_KEY 추가 후:
      /auto-orchestrate --resume

   재개 시 완료된 43개 태스크는 건너뜁니다.

═══════════════════════════════════════════════════════
```

---

## Worktree 정리

### 병합 후 Worktree 제거

```bash
# 안전한 제거 (변경사항 확인)
git worktree remove worktree/phase-1-object-system

# 강제 제거 (변경사항 무시)
git worktree remove --force worktree/phase-1-object-system
```

### 모든 Worktree 정리

```bash
# Worktree 목록 확인
git worktree list

# 하나씩 제거
git worktree remove worktree/phase-1-object-system
git worktree remove worktree/phase-2-transaction
git worktree remove worktree/phase-3-ui

# 또는 반복문으로 일괄 제거
for dir in worktree/*; do
  git worktree remove "$dir"
done
```

### Worktree 유지 vs 제거

| 시나리오 | 권장 |
|----------|------|
| Phase 완료 후 바로 다음 Phase 시작 | 제거 (메모리 절약) |
| Phase 완료 후 검증 필요 | 유지 (재작업 가능) |
| 모든 Phase 완료 | 제거 (정리) |
| 디스크 공간 부족 | 제거 (필수) |

---

## 참조 문서

- `references/phase-execution.md` - Phase 실행 상세
- `references/error-handling.md` - 에러 처리
- `../ultra-thin-orchestrate/SKILL.md` - Ultra-Thin 모드
- `../ralph-loop/SKILL.md` - RALPH 루프 패턴
