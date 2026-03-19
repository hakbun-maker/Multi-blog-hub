# 슬랙 웹훅 설정 가이드

## 웹훅 URL 획득 방법

### 방법 1: 시작 시 입력 (권장)

```
/auto-orchestrate 실행
    ↓
AskUserQuestion: "슬랙 알림을 받으시겠습니까?"
    ↓
[예 선택]
    ↓
Other로 URL 입력 → .claude/orchestrate-state.json에 저장
```

### 방법 2: 환경변수 사전 설정

```bash
# 프로젝트 .env 파일
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T.../B.../xxx

# 또는 셸에서 직접 설정
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..."
```

### 방법 3: orchestrate-state.json에 저장

```json
// .claude/orchestrate-state.json
{
  "project": "my-ecommerce",
  "slack_webhook_url": "https://hooks.slack.com/services/...",
  ...
}
```

---

## 웹훅 URL 우선순위

```
1. AskUserQuestion으로 입력받은 값 (최우선)
2. orchestrate-state.json의 slack_webhook_url
3. 환경변수 SLACK_WEBHOOK_URL
4. 없으면 알림 비활성화
```

---

## 알림 메시지 종류

| 이벤트 | 내용 |
|--------|------|
| 시작 | 프로젝트명, 전체 태스크 수, 예상 Phase |
| 태스크 완료 | 태스크 ID, 이름 |
| 태스크 실패 | 태스크 ID, 에러 메시지, 시도 횟수 |
| Phase 완료 | 완료 태스크, 다음 Phase, 진행률, 컴팩팅 권장 |
| 전체 완료 | 성공/실패 수, 실패 목록 |

---

## 알림 실행 방법 (필수!)

> ⚠️ **중요**: Bash 도구를 직접 호출하여 curl 실행!

```
Phase 완료 시:

Step 1: 웹훅 URL 확인
─────────────────────
Read({ file_path: ".claude/orchestrate-state.json" })
→ slack_webhook_url 필드가 있으면 URL 획득

Step 2: Bash 도구로 curl 실행
─────────────────────────────
Bash({
  command: 'curl -s -X POST -H "Content-type: application/json" --data \'{"text":"🎉 Phase 3 완료!"}\' "실제URL"',
  description: "슬랙 알림 전송"
})

Step 3: 결과 확인
────────────────
→ "ok" 응답이면 성공
```

**⛔ 금지:**
- 환경변수 $SLACK_WEBHOOK_URL 참조 (에이전트는 환경변수 설정 불가)
- curl 명령어를 출력만 하고 실행하지 않음

---

## 알림 빈도 조절

대규모 프로젝트에서 알림이 너무 많으면:

```json
// orchestrate-state.json
{
  "slack_config": {
    "notify_on_task_complete": false,  // 개별 태스크 알림 끄기
    "notify_on_task_fail": true,       // 실패만 알림
    "notify_on_phase_complete": true,  // Phase 완료 알림
    "notify_on_checkpoint": true       // 체크포인트 알림
  }
}
```

---

## Phase 완료 알림 예시

```bash
curl -s -X POST -H 'Content-type: application/json' \
  --data '{
    "blocks": [
      {
        "type": "header",
        "text": {"type": "plain_text", "text": "✅ Phase 1 완료!"}
      },
      {
        "type": "section",
        "fields": [
          {"type": "mrkdwn", "text": "*완료 태스크:* 25/25"},
          {"type": "mrkdwn", "text": "*다음 Phase:* Phase 2"},
          {"type": "mrkdwn", "text": "*진행률:* 40%"}
        ]
      },
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": "💡 *권장:* `/compact` 실행 후 계속하세요."
        }
      }
    ]
  }' \
  "$SLACK_WEBHOOK_URL"
```
