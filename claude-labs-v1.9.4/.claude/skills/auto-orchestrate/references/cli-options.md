# CLI 옵션

## 호출 방법

```
/orchestrate 실행
    ↓
"실행 모드 선택" 질문
    ↓
"완전 자동화" 선택
    ↓
auto-orchestrate 로직 실행
```

직접 호출도 가능합니다:
```
/auto-orchestrate
```

---

## --phase N (특정 Phase만 실행)

```bash
/auto-orchestrate --phase 2
```

**동작:**

```
/auto-orchestrate --phase 2 실행
    ↓
0️⃣ [필수] 슬랙 웹훅 URL 확인
    ↓
1️⃣ TASKS.md 파싱 + orchestrate-state.json 확인
    ↓
2️⃣ 선행 Phase 완료 여부 검증
    ├── Phase 0, 1 완료됨 → 진행
    └── 미완료 → 에러
    ↓
3️⃣ Phase 2 태스크만 실행
    ↓
4️⃣ Phase 2 완료 후 자동 정지
    ↓
5️⃣ 슬랙 알림 + 체크포인트
```

**사용 시나리오:**

| 시나리오 | 명령어 |
|---------|--------|
| Phase 0만 실행 (테스트 정의) | `/auto-orchestrate --phase 0` |
| Phase 1만 실행 (백엔드 구현) | `/auto-orchestrate --phase 1` |
| Phase 2부터 재개 | `/auto-orchestrate --phase 2` |

---

## --resume (중단된 작업 재개)

```bash
/auto-orchestrate --resume
```

**동작:**
1. `.claude/orchestrate-state.json` 로드
2. 마지막 완료 태스크 확인
3. 다음 태스크부터 자동 실행

---

## --ralph (RALPH 루프 모드)

```bash
/auto-orchestrate --ralph [옵션]

옵션:
  --max-iterations N      최대 반복 횟수 (기본값: 50)
  --completion-promise T  완료 신호 텍스트 (기본값: "TASK_DONE")
```

**예시:**
```bash
# 기본 (50회 반복)
/auto-orchestrate --ralph

# 커스텀 설정
/auto-orchestrate --ralph --max-iterations 30

# 끈기 있게 100회까지
/auto-orchestrate --ralph --max-iterations 100
```

---

## --verify (검증 모드)

```bash
/auto-orchestrate --verify
```

**태스크 누락 없이 실행되었는지 검증:**

```
/auto-orchestrate --verify 실행
    ↓
1️⃣ TASKS.md 파싱 → 전체 태스크 목록
    ↓
2️⃣ orchestrate-state.json → 완료된 태스크 목록
    ↓
3️⃣ 교차 검증
    ├── 누락된 태스크 찾기
    └── Phase별 완료율 계산
    ↓
4️⃣ 검증 보고서 출력

═══════════════════════════════════════════════════════
  태스크 누락 검증 보고서
═══════════════════════════════════════════════════════

📊 전체 현황:
   TASKS.md 태스크: 100개
   완료된 태스크: 98개
   누락된 태스크: 1개 ⚠️

⚠️ 누락된 태스크:
   - T2.7: 장바구니 수량 변경 API

📋 Phase별 완료율:
   Phase 0: 15/15 (100%) ✅
   Phase 1: 25/25 (100%) ✅
   Phase 2: 18/20 (90%) ⚠️

🎯 권장 조치:
   /auto-orchestrate --phase 2 --resume
═══════════════════════════════════════════════════════
```

---

## --phase vs --resume 차이

| 옵션 | 동작 | 사용 시점 |
|------|------|----------|
| `--phase N` | 특정 Phase만 실행 후 정지 | Phase 단위 수동 제어 |
| `--resume` | 저장된 위치부터 끝까지 | 중단된 작업 이어서 |
| `--phase N --resume` | Phase N의 중단된 태스크부터 | Phase N 중간 중단 |

---

## Phase 완료 시 필수 체크리스트

```
┌─────────────────────────────────────────────────────────────────┐
│  Phase 완료 시 반드시 다음을 수행하세요!                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ✅ 1. TASKS.md 체크박스 업데이트 [ ] → [x]                     │
│  ✅ 2. orchestrate-state.json 업데이트                          │
│  ✅ 3. 슬랙 알림 전송 (웹훅 URL 있으면)                          │
│  ✅ 4. CLAUDE.md 업데이트                                       │
│  ✅ 5. AskUserQuestion으로 다음 단계 확인                       │
│                                                                 │
│  ⛔ 이 5단계 모두 수행 전 세션 종료 금지!                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```
