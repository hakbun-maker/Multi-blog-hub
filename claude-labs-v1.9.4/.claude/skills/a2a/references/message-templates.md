# A2A 메시지 템플릿

## Request 템플릿

```markdown
## 📨 Request: {{task_id}}

### 메타데이터
- **ID**: msg-{{timestamp}}-{{seq}}
- **From**: orchestrator
- **To**: {{target_agent}}
- **Time**: {{timestamp}}

### 컨텍스트
- **Phase**: {{phase}}
- **Task**: {{task_id}} - {{task_name}}
- **의존성**: {{dependencies}}

### 지시사항
{{instruction}}

### 요구사항
1. {{requirement_1}}
2. {{requirement_2}}
3. {{requirement_3}}

### 제약사항
- {{constraint_1}}
- {{constraint_2}}

### 참조 파일
- {{reference_file_1}}
- {{reference_file_2}}

### 완료 조건
- [ ] {{completion_criteria_1}}
- [ ] {{completion_criteria_2}}
```

---

## Response 템플릿

```markdown
## ✅ Response: {{task_id}}

### 메타데이터
- **ID**: msg-{{timestamp}}-{{seq}}
- **From**: {{source_agent}}
- **To**: orchestrator
- **Time**: {{timestamp}}
- **In Reply To**: {{request_msg_id}}

### 결과
- **상태**: 성공 ✅ / 실패 ❌ / 부분 완료 ⚠️
- **소요 시간**: {{duration}}

### 생성된 파일
| 파일 | 설명 |
|------|------|
| {{file_1}} | {{description_1}} |
| {{file_2}} | {{description_2}} |

### 테스트 결과
```
pytest {{test_path}}
{{test_count}} passed, {{fail_count}} failed
Coverage: {{coverage}}%
```

### 참고사항
- {{note_1}}
- {{note_2}}

### 다음 단계 제안
- {{suggestion}}
```

---

## Handoff 템플릿

### Backend → Frontend

```markdown
## 🔄 Handoff: Backend → Frontend

### 소스
- **에이전트**: backend-specialist
- **태스크**: {{source_task_id}}
- **상태**: 완료 ✅

### 전달 컨텍스트

#### API 엔드포인트
| Method | Path | 설명 | 인증 |
|--------|------|------|------|
| {{method}} | {{path}} | {{description}} | {{auth}} |

#### 요청 스키마
```typescript
interface {{RequestSchema}} {
  {{fields}}
}
```

#### 응답 스키마
```typescript
interface {{ResponseSchema}} {
  {{fields}}
}
```

#### 에러 코드
| 코드 | 의미 | 처리 방법 |
|------|------|----------|
| {{code}} | {{meaning}} | {{handling}} |

### 수신자 액션
- **에이전트**: frontend-specialist
- **태스크**: {{target_task_id}}
- **기대 결과**: {{expected_outcome}}
```

### Frontend → Test

```markdown
## 🔄 Handoff: Frontend → Test

### 소스
- **에이전트**: frontend-specialist
- **태스크**: {{source_task_id}}
- **상태**: 완료 ✅

### 전달 컨텍스트

#### 컴포넌트 목록
| 컴포넌트 | 경로 | 테스트 필요 기능 |
|----------|------|-----------------|
| {{component}} | {{path}} | {{test_points}} |

#### 사용자 시나리오
1. {{scenario_1}}
2. {{scenario_2}}
3. {{scenario_3}}

#### 테스트 데이터
```typescript
const testData = {
  {{test_data}}
};
```

### 수신자 액션
- **에이전트**: test-specialist
- **태스크**: {{target_task_id}}
- **기대 결과**: E2E 테스트 작성
```

### Test → Backend (Bug Report)

```markdown
## 🐛 Handoff: Test → Backend (Bug Report)

### 소스
- **에이전트**: test-specialist
- **태스크**: {{source_task_id}}
- **상태**: 실패 ❌

### 버그 상세

#### 테스트 케이스
```python
def {{test_name}}():
    {{test_code}}
    assert {{assertion}}  # 실패!
```

#### 에러 메시지
```
{{error_message}}
```

#### 기대 동작 vs 실제 동작
| 기대 | 실제 |
|------|------|
| {{expected}} | {{actual}} |

#### 재현 단계
1. {{step_1}}
2. {{step_2}}
3. {{step_3}}

#### 의심되는 위치
- 파일: {{file_path}}
- 라인: {{line_number}}
- 코드: `{{code_snippet}}`

### 수신자 액션
- **에이전트**: backend-specialist
- **우선순위**: {{priority}}
- **기대 결과**: 버그 수정 후 테스트 통과
```

---

## Broadcast 템플릿

### Phase 완료

```markdown
## 📢 Broadcast: Phase {{phase_number}} 완료

### 발신
- **에이전트**: orchestrator
- **시간**: {{timestamp}}

### 내용
═══════════════════════════════════════════════════
  🎉 Phase {{phase_number}} 완료!
═══════════════════════════════════════════════════

**완료된 태스크:**
{{#each tasks}}
- {{task_id}} ✅ {{task_name}} ({{agent}})
{{/each}}

**품질 메트릭:**
- 테스트 커버리지: {{coverage}}%
- 린트 에러: {{lint_errors}}
- 보안 이슈: {{security_issues}}

**병합:** main ← {{branch_name}}

**다음:** Phase {{next_phase}} 시작

═══════════════════════════════════════════════════

### 수신자
- [ ] backend-specialist
- [ ] frontend-specialist
- [ ] test-specialist
- [ ] database-specialist
- [ ] Memory (기록)
- [ ] Goal Setting (진행률 업데이트)
```

### 긴급 알림

```markdown
## 🚨 Broadcast: 긴급 알림

### 발신
- **에이전트**: {{source_agent}}
- **우선순위**: {{priority}} (CRITICAL / HIGH / MEDIUM)

### 내용
⚠️ {{priority}}: {{title}}

**상세:**
{{description}}

**영향 범위:**
- {{affected_area_1}}
- {{affected_area_2}}

**즉시 조치 필요:**
{{#each actions}}
- {{agent}}: {{action}}
{{/each}}

### 필수 액션
{{#each required_actions}}
- [ ] {{agent}}: {{action}}
{{/each}}
```

---

## 통신 상태 코드

| 코드 | 의미 | 다음 액션 |
|------|------|----------|
| `ACK` | 메시지 수신 확인 | 작업 시작 대기 |
| `WIP` | 작업 진행 중 | 완료 대기 |
| `DONE` | 작업 완료 | 다음 단계 진행 |
| `FAIL` | 작업 실패 | 피드백 루프 |
| `BLOCK` | 블로커 발생 | 의존성 해결 대기 |
| `HELP` | 도움 요청 | 상위 에이전트 개입 |
