---
name: agent-lifecycle
description: clabs Electron 앱 에이전트 생성, 유지, 종료 규칙.
---

## 사용 가능한 에이전트

| 에이전트 | 역할 |
|---------|------|
| electron-main-specialist | Main Process, IPC, PTY, Store |
| electron-renderer-specialist | React UI, xterm.js, Zustand |
| electron-test-specialist | Vitest, E2E, 통합 테스트 |

## 에이전트 선택 규칙

```
태스크 내용 분석:
- "Main Process", "IPC", "Store", "PTY" → electron-main-specialist
- "Component", "Page", "UI", "Renderer" → electron-renderer-specialist
- "Test", "E2E", "검증" → electron-test-specialist
```

## 생성 조건
- 작업이 5개 이상의 파일을 포함할 때
- 병렬 작업이 가능할 때
- 전문화가 필요할 때

## 종료 조건
- 3회 연속 잘못된 제안
- 컨텍스트 윈도우 > 85%
- 순환 편집 감지됨

## 상태 출력

```
┌─────────────────────────────────────────────────┐
│  👥 Agent Status                                │
├─────────────────────────────────────────────────┤
│  🟢 electron-main-specialist: working           │
│  🟡 electron-renderer-specialist: blocked       │
│  ⚪ electron-test-specialist: idle              │
└─────────────────────────────────────────────────┘
```