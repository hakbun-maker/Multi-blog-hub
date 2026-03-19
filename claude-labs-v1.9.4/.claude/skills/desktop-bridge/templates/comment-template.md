# GitHub Issue 코멘트 템플릿

> /desktop-bridge implement 진행 중 Issue에 자동 추가되는 코멘트 템플릿

---

## 코멘트 유형

| 유형 | 시점 | 내용 |
|------|------|------|
| `implement_start` | implement 시작 시 | 구현 시작 알림 |
| `phase_start` | Phase 시작 시 | Phase 시작 알림 |
| `phase_complete` | Phase 완료 시 | 완료 요약 |
| `screen_complete` | 화면 구현 완료 시 | 화면별 완료 알림 |
| `all_complete` | 전체 완료 시 | 최종 요약 + Issue 닫기 |
| `error` | 에러 발생 시 | 에러 정보 |

---

## 1. implement_start (구현 시작)

```markdown
## 🚀 구현 시작

Claude Code CLI에서 이 설계를 기반으로 구현을 시작합니다.

### 환경 정보
- **CLI 버전**: {cli_version}
- **작업 브랜치**: `feature/{branch_name}`
- **시작 시간**: {timestamp}

### 계획
- **Phase 수**: {phase_count}개
- **총 Task 수**: {task_count}개
- **예상 화면**: {screen_count}개

---
🤖 Auto-comment by Claude Code CLI
```

---

## 2. phase_start (Phase 시작)

```markdown
## ▶️ Phase {phase_num} 시작: {phase_name}

### Task 목록
| Task ID | 설명 | 담당 | 상태 |
|---------|------|------|------|
| {task_id} | {task_name} | {specialist} | ⏳ |
| ... | ... | ... | ... |

### 예상 작업
- {work_item_1}
- {work_item_2}

---
🤖 Auto-comment by Claude Code CLI
📅 {timestamp}
```

---

## 3. phase_complete (Phase 완료)

```markdown
## ✅ Phase {phase_num} 완료: {phase_name}

### 완료된 Task
- [x] `{task_id}`: {task_name}
- [x] `{task_id}`: {task_name}

### 생성된 파일
\`\`\`
{file_list}
\`\`\`

### 테스트 결과
- ✅ 단위 테스트: {unit_test_result}
- ✅ 타입 체크: {type_check_result}
- ✅ 린트: {lint_result}

### 다음 Phase
- Phase {next_phase_num}: {next_phase_name}

---
🤖 Auto-comment by Claude Code CLI
📅 {timestamp}
⏱️ 소요 시간: {duration}
```

---

## 4. screen_complete (화면 구현 완료)

```markdown
## 📱 화면 구현 완료: {screen_name}

**Route**: `{route}`

### 완료된 Task
- [x] API: `{api_task_id}`
- [x] UI: `{ui_task_id}`
- [x] 연결점 검증: `{verify_task_id}`

### 컴포넌트
| 컴포넌트 | 파일 | 상태 |
|---------|------|------|
| {component_name} | {file_path} | ✅ |
| ... | ... | ... |

### 스크린샷 (선택)
<details>
<summary>📸 화면 스크린샷</summary>

![{screen_name}]({screenshot_url})

</details>

---
🤖 Auto-comment by Claude Code CLI
📅 {timestamp}
```

---

## 5. all_complete (전체 완료)

```markdown
## 🎉 구현 완료!

모든 Phase와 화면 구현이 완료되었습니다.

### 📊 요약

| 항목 | 값 |
|------|-----|
| 총 Phase | {phase_count}개 |
| 총 Task | {task_count}개 |
| 화면 수 | {screen_count}개 |
| 소요 시간 | {total_duration} |
| 커밋 수 | {commit_count}개 |

### 📁 산출물

#### Pull Request
- PR #{pr_number}: [{pr_title}]({pr_url})

#### 브랜치
- `feature/{branch_name}` → `main`

#### 파일 통계
| 영역 | 파일 수 | 라인 수 |
|------|---------|---------|
| Backend | {backend_files} | {backend_lines} |
| Frontend | {frontend_files} | {frontend_lines} |
| Tests | {test_files} | {test_lines} |

### ✅ 품질 검증
- **Trinity Score**: {trinity_score}/100
- **테스트 커버리지**: {coverage}%
- **린트 에러**: 0개

### 🔗 관련 링크
- [PR #{pr_number}]({pr_url})
- [배포 미리보기]({preview_url}) (있는 경우)

---

이 Issue는 구현 완료로 자동 닫힙니다.

🤖 Auto-closed by Claude Code CLI
📅 {timestamp}
```

---

## 6. error (에러 발생)

```markdown
## ⚠️ 에러 발생

### 에러 정보
- **Phase**: {phase_num}
- **Task**: {task_id}
- **시간**: {timestamp}

### 에러 내용
\`\`\`
{error_message}
\`\`\`

### 컨텍스트
- 파일: `{file_path}`
- 라인: {line_number}
- 담당: {specialist}

### 시도한 해결
{attempted_fixes}

### 다음 조치
- [ ] 수동 검토 필요
- [ ] `/systematic-debugging` 실행 권장

---
🤖 Auto-comment by Claude Code CLI
⚠️ 구현이 일시 중지되었습니다
```

---

## 진행 상황 테이블 업데이트

Phase 완료 시 Issue 본문의 진행 상황 테이블도 업데이트:

```markdown
## 📊 진행 상황

| Phase | 상태 | 완료일 |
|-------|------|--------|
| Phase 0: 셋업 | ✅ 완료 | 2026-01-31 |
| Phase 1: 데이터베이스 | ✅ 완료 | 2026-01-31 |
| Phase 2: 백엔드 | 🔄 진행중 | - |
| Phase 3: 프론트엔드 | ⏳ 대기 | - |
| Phase 4: 통합 | ⏳ 대기 | - |
```

**상태 아이콘**:
| 상태 | 아이콘 |
|------|--------|
| 대기 | ⏳ |
| 진행중 | 🔄 |
| 완료 | ✅ |
| 에러 | ❌ |
| 건너뜀 | ⏭️ |
