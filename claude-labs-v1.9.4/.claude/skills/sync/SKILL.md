---
name: sync
description: 명세(spec)와 코드의 동기화 상태를 검증. 드리프트 감지, 불일치 리포트, 자동 수정 제안.
trigger: /sync, 개발 중간 점검, PR 생성 전
integrates_with: [screen-spec, tasks-generator, evaluation, reverse]
inspired_by: SDD Tool (https://github.com/JakeB-5/sdd-tool)
---

> **allowed-tools**: `Read`, `Grep`, `Glob` (비교 전용 — spec↔code 동기화 상태 검증만 수행)

# Sync - 명세-코드 동기화 검증

> **"명세와 코드가 하나의 진실을 말하게 한다"**

## 개요

Sync는 SDD Tool의 동기화 검증 기능을 Claude Labs에 통합한 스킬입니다.
명세(screen-spec, domain resources)와 실제 구현 코드 사이의 **드리프트(drift)**를 감지하고,
일관성을 유지하도록 돕습니다.

---

## 왜 동기화가 중요한가?

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Spec-Code Drift Problem                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  시작 시점: 명세 = 코드 (완벽한 일치)                               │
│                                                                     │
│       명세 ────────────────────────────────── 코드                  │
│             ════════════════════════════════                        │
│                                                                     │
│  시간 경과: 드리프트 발생                                           │
│                                                                     │
│       명세 ──────────────────                                       │
│                              ╲                                      │
│                               ╲  ← 드리프트 (불일치)                │
│                                ╲                                    │
│                                 ────────────────── 코드             │
│                                                                     │
│  문제점:                                                            │
│  - 명세를 보고 코드를 이해할 수 없음                                │
│  - 새 팀원 온보딩 어려움                                            │
│  - 기능 추가 시 혼란                                                │
│  - 테스트와 실제 동작 불일치                                        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 워크플로우

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Sync Verification Flow                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   /sync                                                             │
│     │                                                               │
│     ├─── 1. 명세 로드 ──────────────────┐                           │
│     │    specs/domain/resources.yaml    │                           │
│     │    specs/screens/*.yaml           │                           │
│     │    specs/api/*.yaml               │                           │
│     │                                   │                           │
│     ├─── 2. 코드 분석 ──────────────────┤                           │
│     │    app/models/*.py                │                           │
│     │    app/routers/*.py               ├── 비교                    │
│     │    src/pages/*.tsx                │                           │
│     │                                   │                           │
│     ├─── 3. 드리프트 감지 ──────────────┘                           │
│     │                                                               │
│     ▼                                                               │
│   ┌──────────────────────────────────────────────────┐              │
│   │               Sync Report                         │              │
│   ├──────────────────────────────────────────────────┤              │
│   │  동기화율: 87%                                    │              │
│   │                                                  │              │
│   │  ✅ 일치: 45 항목                                │              │
│   │  ⚠️ 부분 일치: 5 항목                            │              │
│   │  ❌ 불일치: 3 항목                               │              │
│   │  🆕 명세에만: 2 항목 (미구현)                    │              │
│   │  👻 코드에만: 1 항목 (문서화 안됨)               │              │
│   └──────────────────────────────────────────────────┘              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 사용법

### 기본 사용

```bash
# 전체 프로젝트 동기화 검증
/sync

# 특정 도메인만 검증
/sync domain users

# 특정 화면만 검증
/sync screen user-list

# 특정 API만 검증
/sync api users
```

### 옵션

| 옵션 | 설명 |
|------|------|
| `--ci` | CI 모드 (임계값 미달 시 exit 1) |
| `--threshold N` | 최소 동기화율 (기본: 80%) |
| `--fix` | 자동 수정 제안 생성 |
| `--json` | JSON 형식 출력 |
| `--markdown` | 마크다운 리포트 생성 |

---

## 동기화 검증 항목

### 1. 도메인 리소스 (Domain Resources)

```yaml
# specs/domain/resources.yaml
resources:
  users:
    fields:
      - name: id
        type: integer
      - name: email
        type: string
        required: true
      - name: name
        type: string
```

**코드 비교 대상:**

```python
# app/models/user.py
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String, nullable=False)  # ✅ required: true 일치
    name = Column(String)                    # ✅ 일치
    phone = Column(String)                   # ❌ 명세에 없음!
```

**검증 결과:**

```markdown
## Domain Sync: users

| 필드 | 명세 | 코드 | 상태 |
|------|------|------|------|
| id | integer | Integer | ✅ |
| email | string, required | String, NOT NULL | ✅ |
| name | string | String | ✅ |
| phone | - | String | ❌ 명세 누락 |

**동기화율**: 75% (3/4)
**조치 필요**: phone 필드를 명세에 추가하거나 코드에서 제거
```

---

### 2. API 계약 (API Contracts)

```yaml
# specs/api/users.yaml
endpoints:
  get_users:
    method: GET
    path: /users
    response:
      - name: id
      - name: email
      - name: name
```

**코드 비교 대상:**

```python
# app/routers/users.py
@router.get("/users")
async def get_users():
    return {"users": [...]}  # 실제 반환 필드 분석
```

**검증 항목:**

| 항목 | 설명 |
|------|------|
| **경로 일치** | 명세 path vs 라우터 path |
| **메서드 일치** | GET/POST/PUT/DELETE |
| **파라미터 일치** | query, path, body params |
| **응답 스키마** | 반환 필드 일치 |
| **에러 코드** | 정의된 에러 vs 실제 raise |

---

### 3. 화면 명세 (Screen Specs)

```yaml
# specs/screens/user-list.yaml
screen:
  name: 사용자 목록
  route: /users

data_requirements:
  - resource: users
    needs: [id, name, email, avatar]

components:
  - id: user_grid
    type: grid
```

**코드 비교 대상:**

```tsx
// src/pages/UserList.tsx
export function UserList() {
  const { data } = useQuery(['users']);

  return (
    <div className="grid">      {/* ✅ grid 컴포넌트 일치 */}
      {data?.map(user => (
        <div key={user.id}>     {/* ✅ id 사용 */}
          {user.name}            {/* ✅ name 사용 */}
          {user.email}           {/* ✅ email 사용 */}
          {/* avatar 사용 안함 */} {/* ⚠️ 명세에는 있지만 미사용 */}
        </div>
      ))}
    </div>
  );
}
```

---

## 동기화율 계산

```
동기화율 = (일치 항목 + 0.5 × 부분일치) / 전체 항목 × 100%

항목 분류:
- ✅ 일치 (1.0점): 명세와 코드가 완전히 일치
- ⚠️ 부분일치 (0.5점): 일부만 일치 (타입 다름 등)
- ❌ 불일치 (0점): 명세와 코드가 다름
- 🆕 명세에만 (0점): 아직 미구현
- 👻 코드에만 (0점): 문서화 안됨
```

---

## Sync Report 형식

```markdown
# Sync Report

**프로젝트**: my-project
**일시**: 2025-01-30 14:30
**동기화율**: 87%

## 요약

| 카테고리 | 동기화율 | 항목 수 |
|----------|----------|---------|
| Domain | 92% | 24/26 |
| API | 85% | 34/40 |
| Screens | 83% | 15/18 |
| **전체** | **87%** | **73/84** |

## 상세 불일치

### Domain: users

#### ❌ 불일치
| 필드 | 명세 | 코드 | 제안 |
|------|------|------|------|
| phone | - | String | 명세에 추가 |
| status | enum(active,inactive) | String | 타입 수정 |

### API: users

#### ❌ 불일치
| 엔드포인트 | 명세 | 코드 | 제안 |
|------------|------|------|------|
| DELETE /users/{id} | 정의됨 | 미구현 | 구현 필요 |

### Screens: user-list

#### ⚠️ 부분일치
| 항목 | 명세 | 코드 | 제안 |
|------|------|------|------|
| data.avatar | 필요 | 미사용 | 제거 또는 구현 |

## 자동 수정 제안

### 명세 업데이트 필요

```yaml
# specs/domain/resources.yaml 에 추가
users:
  fields:
    - name: phone
      type: string
      description: "전화번호 (코드에서 발견)"
```

### 코드 구현 필요

```python
# app/routers/users.py 에 추가
@router.delete("/users/{user_id}")
async def delete_user(user_id: int):
    # TODO: 구현 필요
    pass
```

## CI/CD 판정

- **Threshold**: 80%
- **Current**: 87%
- **Result**: ✅ PASS
```

---

## CI/CD 통합

### GitHub Actions 예시

```yaml
# .github/workflows/sync-check.yml
name: Spec-Code Sync Check

on:
  pull_request:
    paths:
      - 'specs/**'
      - 'src/**'
      - 'app/**'

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Check Sync
        run: |
          # Claude Code CLI로 sync 검증
          claude --skill sync --ci --threshold 80

      - name: Upload Report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: sync-report
          path: .claude/reports/sync-*.md
```

### Pre-commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit

# 명세 또는 코드 변경 시 sync 검증
if git diff --cached --name-only | grep -E "(specs/|src/|app/)"; then
  echo "🔄 Checking spec-code sync..."
  claude --skill sync --ci --threshold 80

  if [ $? -ne 0 ]; then
    echo "❌ Sync check failed. Please fix discrepancies."
    exit 1
  fi
fi
```

---

## 자동 수정 모드

```bash
/sync --fix
```

**수행 작업:**

1. **명세 자동 업데이트**
   - 코드에만 있는 항목 → 명세에 추가 (초안)
   - `_auto_generated: true` 마킹

2. **코드 스켈레톤 생성**
   - 명세에만 있는 항목 → TODO 코드 생성

3. **불일치 하이라이트**
   - diff 형식으로 변경 제안

```markdown
## Auto-Fix Suggestions

### 1. 명세 업데이트 (자동 적용됨)

```diff
# specs/domain/resources.yaml
  users:
    fields:
+     - name: phone
+       type: string
+       _auto_generated: true
```

### 2. 코드 생성 필요 (수동 검토)

```python
# app/routers/users.py
# TODO: 명세에 정의된 엔드포인트 구현 필요
@router.delete("/users/{user_id}")
async def delete_user(user_id: int):
    raise NotImplementedError("Spec-defined endpoint not yet implemented")
```
```

---

## evaluation/trinity 연동

Sync 결과는 품질 평가에 반영됩니다:

```yaml
# Trinity Score 계산 시
truth_pillar:  # 眞
  components:
    - type_safety: 0.4
    - test_coverage: 0.3
    - spec_sync: 0.3     # ← Sync 동기화율 반영

# 동기화율 80% 미만 시
# → Trinity Score에서 감점
# → 품질 게이트 경고
```

---

## reverse 연동

역추출 후 지속적인 동기화 유지:

```markdown
## Reverse → Sync 워크플로우

1. /reverse extract → 기존 코드에서 명세 추출
2. /reverse finalize → 명세 확정
3. 개발 진행...
4. /sync → 주기적 동기화 검증
5. 드리프트 발생 시 → /sync --fix로 수정
```

---

## 참조 파일

- `references/sync-rules.md` - 동기화 규칙 상세
- `references/drift-detection.md` - 드리프트 감지 알고리즘
- `references/auto-fix-templates.md` - 자동 수정 템플릿
