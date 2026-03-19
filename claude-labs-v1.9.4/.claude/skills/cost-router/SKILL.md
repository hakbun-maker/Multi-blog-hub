---
name: cost-router
description: AI 비용 최적화 라우팅. 태스크 복잡도에 따라 적절한 모델/에이전트를 자동 선택하여 40-70% 비용 절감.
trigger: /cost-router 실행 또는 비용 최적화 분석 요청 시
integrates_with: [auto-orchestrate, evaluation] (참조 가이드, 수동 적용)
inspired_by: HyoDo (https://github.com/lofibrainwav/HyoDo)
---

# Cost Router - AI 비용 최적화 라우팅

> **"적재적소에 적절한 AI를 배치하여 비용과 품질의 균형을 맞춘다"**

## 개요

Cost Router는 HyoDo의 비용 인식 라우팅 기능을 Claude Labs에 통합한 스킬입니다.
태스크의 복잡도와 중요도를 분석하여 최적의 모델/에이전트를 자동 선택함으로써
**40-70%의 AI 비용 절감**을 달성합니다.

---

## 비용 최적화 원리

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Cost-Aware Routing                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  태스크 입력                                                         │
│       │                                                             │
│       ▼                                                             │
│  ┌──────────────────┐                                               │
│  │  복잡도 분석기   │                                               │
│  │  (Complexity     │                                               │
│  │   Analyzer)      │                                               │
│  └────────┬─────────┘                                               │
│           │                                                         │
│           ▼                                                         │
│  ┌─────────────────────────────────────────────────────┐            │
│  │              Tier Classification                     │            │
│  ├─────────────────────────────────────────────────────┤            │
│  │                                                     │            │
│  │  FREE Tier         CHEAP Tier       EXPENSIVE Tier  │            │
│  │  ─────────         ──────────       ───────────────  │            │
│  │  • 읽기 전용       • 단순 편집       • 복잡한 리팩토링│            │
│  │  • 검색/탐색       • 포맷팅          • 아키텍처 설계  │            │
│  │  • 패턴 매칭       • 린트 수정       • 새 기능 구현   │            │
│  │                    • 문서화          • 디버깅         │            │
│  │  비용: $0          비용: Low        비용: Standard   │            │
│  │  모델: haiku       모델: haiku      모델: opus/sonnet│            │
│  │                                                     │            │
│  └─────────────────────────────────────────────────────┘            │
│           │                                                         │
│           ▼                                                         │
│       적절한 모델/에이전트 호출                                      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Tier 분류 기준

### FREE Tier (비용: $0)

**특징:** 코드 변경 없음, 읽기만 수행

| 작업 유형 | 예시 |
|----------|------|
| **코드 검색** | grep, 패턴 매칭 |
| **파일 읽기** | 구조 분석, 내용 확인 |
| **정보 조회** | git log, status |
| **정적 분석** | 린트 실행 (수정 없이) |

```yaml
free_tier:
  tools_allowed:
    - Read
    - Grep
    - Glob
    - Bash (read-only commands)

  patterns:
    - "find all files matching"
    - "search for"
    - "list"
    - "show me"
    - "what is"
```

### CHEAP Tier (비용: Low)

**특징:** 단순 편집, 패턴 기반 수정

| 작업 유형 | 예시 |
|----------|------|
| **포맷팅** | prettier, black |
| **린트 수정** | auto-fix |
| **이름 변경** | rename variable |
| **단순 추가** | import 추가, 상수 추가 |
| **문서화** | docstring, 주석 |

```yaml
cheap_tier:
  model: haiku
  tools_allowed:
    - Read
    - Edit (simple)
    - Bash (format, lint)

  patterns:
    - "format"
    - "fix lint"
    - "add import"
    - "rename"
    - "add comment"
    - "update documentation"

  complexity_threshold:
    lines_changed: "<= 20"
    files_affected: "<= 3"
    cyclomatic_delta: "<= 2"
```

### EXPENSIVE Tier (비용: Standard)

**특징:** 복잡한 로직, 창의적 문제 해결

| 작업 유형 | 예시 |
|----------|------|
| **새 기능 구현** | 전체 기능 개발 |
| **리팩토링** | 아키텍처 변경 |
| **버그 수정** | 복잡한 디버깅 |
| **설계 결정** | 기술 선택 |
| **통합 작업** | API 연동 |

```yaml
expensive_tier:
  model: opus (critical) / sonnet (standard)
  tools_allowed:
    - All tools

  patterns:
    - "implement"
    - "create"
    - "refactor"
    - "debug"
    - "design"
    - "integrate"

  complexity_threshold:
    lines_changed: "> 20"
    files_affected: "> 3"
    requires_reasoning: true
```

---

## 복잡도 분석 알고리즘

```python
def analyze_complexity(task: Task) -> Tier:
    """태스크 복잡도를 분석하여 적절한 Tier 반환"""

    score = 0

    # 1. 키워드 분석 (30%)
    keywords = extract_keywords(task.description)
    if has_expensive_keywords(keywords):
        score += 30
    elif has_cheap_keywords(keywords):
        score += 10

    # 2. 변경 범위 분석 (30%)
    scope = estimate_change_scope(task)
    score += min(scope.files * 5, 30)

    # 3. 의존성 분석 (20%)
    deps = analyze_dependencies(task)
    score += min(deps.count * 4, 20)

    # 4. 히스토리 분석 (20%)
    history = get_similar_tasks_history(task)
    if history.avg_complexity > 0.7:
        score += 20

    # Tier 결정
    if score < 20:
        return Tier.FREE
    elif score < 50:
        return Tier.CHEAP
    else:
        return Tier.EXPENSIVE
```

---

## 모델 매핑

| Tier | 기본 모델 | 조건부 업그레이드 |
|------|----------|------------------|
| FREE | - (도구만 사용) | - |
| CHEAP | Haiku | 실패 시 Sonnet |
| EXPENSIVE | Sonnet | 중요도 높으면 Opus |

### 에이전트별 기본 모델

```yaml
agent_models:
  # 전략적 판단 - 항상 높은 모델
  orchestrator: opus

  # 구현 작업 - 복잡도에 따라
  backend-specialist:
    default: sonnet
    simple_tasks: haiku
    critical_tasks: opus

  frontend-specialist:
    default: sonnet
    simple_tasks: haiku

  # 보조 작업 - 낮은 모델
  database-specialist: haiku
  test-specialist: haiku
  docs-specialist: haiku

  # 보안 - 항상 높은 모델
  security-specialist: opus
```

---

## auto-orchestrate 연동

```markdown
## Cost Router + Auto Orchestrate

### 태스크 실행 전 분류

각 태스크 실행 전 Cost Router가 자동으로:

1. 태스크 복잡도 분석
2. 적절한 Tier 결정
3. 에이전트 + 모델 조합 선택
4. 실행 및 결과 기록

### 예시 흐름

```
TASKS.md:
  - P1-S1-T1: 로그인 페이지 구현        → EXPENSIVE (sonnet)
  - P1-S1-T2: 로그인 폼 스타일링        → CHEAP (haiku)
  - P1-S1-T3: 로그인 API 연동           → EXPENSIVE (sonnet)
  - P1-S1-V:  로그인 화면 검증           → CHEAP (haiku)

비용 절감:
  - 최적화 없이: 모든 태스크 opus → $10.00
  - Cost Router: 혼합 사용 → $4.50 (55% 절감)
```
```

---

## 비용 추적 & 리포트

### 실시간 비용 모니터링

```yaml
# .claude/metrics/cost/tokens.json
{
  "session": {
    "start": "2025-01-30T10:00:00Z",
    "tasks_completed": 15,
    "total_tokens": 125000,
    "estimated_cost": "$4.50"
  },
  "by_tier": {
    "FREE": { "tasks": 5, "tokens": 0, "cost": "$0.00" },
    "CHEAP": { "tasks": 7, "tokens": 35000, "cost": "$0.70" },
    "EXPENSIVE": { "tasks": 3, "tokens": 90000, "cost": "$3.80" }
  },
  "savings": {
    "without_routing": "$10.00",
    "with_routing": "$4.50",
    "saved": "$5.50",
    "percentage": "55%"
  }
}
```

### 비용 리포트

```markdown
# Cost Router Report

**기간**: 2025-01-30
**세션**: my-project 개발

## 요약

| 항목 | 값 |
|------|-----|
| 총 태스크 | 15 |
| 총 토큰 | 125,000 |
| 실제 비용 | $4.50 |
| 절감 비용 | $5.50 |
| 절감률 | **55%** |

## Tier별 분석

```
FREE      ████████████████████ 33% (5 tasks)
CHEAP     ████████████████████████████ 47% (7 tasks)
EXPENSIVE ████████████ 20% (3 tasks)
```

## 태스크별 상세

| 태스크 | Tier | 모델 | 토큰 | 비용 |
|--------|------|------|------|------|
| P1-S1-T1 | EXPENSIVE | sonnet | 30K | $1.20 |
| P1-S1-T2 | CHEAP | haiku | 5K | $0.10 |
| P1-S1-T3 | EXPENSIVE | sonnet | 35K | $1.40 |
| ... | ... | ... | ... | ... |

## 최적화 제안

1. **P1-S2-T4**: EXPENSIVE → CHEAP 가능
   - 이유: 단순 CRUD, 패턴 반복
   - 절감: ~$0.80

2. **재사용 패턴 감지**
   - 유사 태스크 3개 발견
   - 템플릿화로 추가 절감 가능
```

---

## 설정

### 프로젝트별 설정

```yaml
# .claude/config/cost-router.yaml

enabled: true

# Tier 임계값 조정
thresholds:
  cheap_max_files: 3
  cheap_max_lines: 20
  expensive_min_complexity: 0.5

# 모델 오버라이드
model_overrides:
  # 특정 패턴은 항상 높은 모델
  always_expensive:
    - "security"
    - "authentication"
    - "payment"

  # 특정 패턴은 항상 낮은 모델
  always_cheap:
    - "format"
    - "lint"
    - "typo"

# 예산 제한
budget:
  daily_limit: "$50.00"
  alert_threshold: "$40.00"  # 80%에서 경고
  hard_stop: true            # 한도 초과 시 중단

# 리포트
reporting:
  real_time: true
  daily_summary: true
  slack_webhook: "https://hooks.slack.com/..."
```

---

## 실패 시 자동 업그레이드

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Auto-Upgrade on Failure                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   CHEAP Tier로 시작                                                  │
│        │                                                            │
│        ▼                                                            │
│   ┌─────────┐    성공    ┌─────────┐                               │
│   │ 실행    │ ────────▶ │ 완료    │                               │
│   │ (haiku) │           └─────────┘                               │
│   └────┬────┘                                                       │
│        │ 실패 (품질 미달 또는 에러)                                 │
│        ▼                                                            │
│   ┌─────────┐    성공    ┌─────────┐                               │
│   │ 재시도  │ ────────▶ │ 완료    │                               │
│   │(sonnet) │           └─────────┘                               │
│   └────┬────┘                                                       │
│        │ 실패                                                       │
│        ▼                                                            │
│   ┌─────────┐    성공    ┌─────────┐                               │
│   │ 최종    │ ────────▶ │ 완료    │                               │
│   │ (opus)  │           └─────────┘                               │
│   └────┬────┘                                                       │
│        │ 실패                                                       │
│        ▼                                                            │
│   ❌ 사람 개입 필요                                                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 업그레이드 조건

```yaml
upgrade_conditions:
  # haiku → sonnet
  cheap_to_expensive:
    - error_count: ">= 2"
    - quality_score: "< 0.7"
    - complexity_underestimated: true

  # sonnet → opus
  expensive_to_premium:
    - error_count: ">= 2"
    - task_type: "architecture"
    - security_related: true
```

---

## evaluation 연동

비용 메트릭을 evaluation에 통합:

```markdown
## Evaluation Report에 비용 섹션 추가

### 💰 비용 효율

| 메트릭 | 값 | 기준 | 상태 |
|--------|-----|------|------|
| 총 비용 | $4.50 | < $10 | ✅ |
| 절감률 | 55% | > 30% | ✅ |
| 토큰/태스크 | 8.3K | < 15K | ✅ |

### Tier 분포 최적화

현재: FREE 33%, CHEAP 47%, EXPENSIVE 20%
권장: FREE 40%, CHEAP 45%, EXPENSIVE 15%

개선 제안:
- 단순 검증 태스크 → FREE로 이동 가능
- 반복 패턴 → 템플릿화로 CHEAP 유지
```

---

## 참조 파일

- `references/tier-classification.md` - Tier 분류 상세 규칙
- `references/model-selection.md` - 모델 선택 알고리즘
- `references/cost-calculation.md` - 비용 계산 방식
