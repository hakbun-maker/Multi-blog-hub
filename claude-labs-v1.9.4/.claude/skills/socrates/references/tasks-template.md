# TASKS (AI 개발 파트너용 프롬프트 설계서) 템플릿

> AI 코딩 파트너가 즉시 협업을 시작할 수 있게 실행 가능한 단계별 개발 경로를 제공합니다.
> **TDD 기반 Contract-First Development**로 BE/FE 독립 병렬 개발을 지원합니다.

---

## MVP 캡슐

| # | 항목 | 내용 |
|---|------|------|
| 1 | 목표 | {{목표}} |
| 2 | 페르소나 | {{페르소나}} |
| 3 | 핵심 기능 | {{FEAT-1: 핵심기능명}} |
| 4 | 성공 지표 (노스스타) | {{노스스타 지표}} |
| 5 | 입력 지표 | {{입력지표 1~2개}} |
| 6 | 비기능 요구 | {{최소 1개}} |
| 7 | Out-of-scope | {{이번엔 안 함}} |
| 8 | Top 리스크 | {{리스크 1개}} |
| 9 | 완화/실험 | {{완화책}} |
| 10 | 다음 단계 | {{바로 할 행동}} |

---

## TDD 기반 개발 원칙

### Contract-First Development

```
┌─────────────────────────────────────────────────────────────────────┐
│                        개발 워크플로우                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ══════════════════ 직렬 구간 (단일 터미널) ══════════════════      │
│                                                                     │
│  Phase 0: Foundation (순차 실행 필수)                               │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ M0: 프로젝트 셋업                                           │   │
│  │   T0.1: 프로젝트 구조 초기화 (BE/FE 디렉토리)              │   │
│  │     ↓                                                       │   │
│  │   T0.2: 데이터베이스 설정 (Docker, 마이그레이션)           │   │
│  │     ↓                                                       │   │
│  │   T0.3: 환경 변수 설정 (.env.example)                      │   │
│  │     ↓                                                       │   │
│  │   T0.4: 테스트 환경 설정 (pytest, Vitest, MSW)             │   │
│  │     ↓                                                       │   │
│  │ M0.5: 계약 & 테스트 설계                                    │   │
│  │   T0.5.1: API 계약 정의 (contracts/*.ts, schemas/*.py)     │   │
│  │     ↓                                                       │   │
│  │   T0.5.2: 테스트 케이스 작성 (🔴 RED 상태)                 │   │
│  │     ↓                                                       │   │
│  │   T0.5.3: Mock 핸들러 생성 (MSW)                           │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              ↓                                      │
│                    ✅ Foundation 완료                               │
│                              ↓                                      │
│  ══════════════════ 병렬 구간 (N개 터미널) ══════════════════      │
│                                                                     │
│  Phase 1~N: Feature Development (라운드 로빈 가능)                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │Terminal 1│ │Terminal 2│ │Terminal 3│ │Terminal 4│ │Terminal 5│ │
│  │ Phase 1  │ │ Phase 2  │ │ Phase 3  │ │ Phase 4  │ │ Phase 5  │ │
│  │ 🔴→🟢   │ │ 🔴→🟢   │ │ 🔴→🟢   │ │ 🔴→🟢   │ │ 🔴→🟢   │ │
│  │  ↓       │ │  ↓       │ │  ↓       │ │  ↓       │ │  ↓       │ │
│  │ Phase 6  │ │ Phase 7  │ │ Phase 8  │ │ Phase 9  │ │ Phase 10 │ │
│  │ 🔴→🟢   │ │ 🔴→🟢   │ │  ...     │ │  ...     │ │  ...     │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
│                              ↓                                      │
│                    ✅ 모든 Phase 완료                               │
│                              ↓                                      │
│  ══════════════════ 통합 검증 구간 ══════════════════              │
│                                                                     │
│  Mock 비활성화 → 실제 API 연동 → E2E 테스트 → 배포                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### ⚠️ 직렬/병렬 실행 규칙

| 구간 | 마일스톤 | 실행 방식 | 이유 |
|------|----------|----------|------|
| **직렬 구간** | M0, M0.5 | 단일 터미널 순차 실행 | 의존성 설치, 환경 구성 필수 선행 |
| **병렬 구간** | M1~M(N-1) | 다중 터미널 라운드 로빈 | 계약+Mock 완비로 독립 개발 가능 |
| **통합 구간** | M(N) | 단일 터미널 순차 실행 | 전체 시스템 통합 검증 |

**중요:** Phase 0 (M0 + M0.5)이 완료되어야 병렬 개발을 시작할 수 있습니다.

### TDD 상태 표기

| 상태 | 의미 |
|------|------|
| 🔴 RED | 테스트 작성됨, 구현 없음 (실패 상태) |
| 🟢 GREEN | 테스트 통과, 구현 완료 |
| 🔵 REFACTOR | 리팩토링 진행 중 (테스트 유지) |

---

## 마일스톤 개요

| # | 마일스톤 | Phase | 목표 | TDD 상태 | 실행 방식 | 예상 태스크 수 |
|---|----------|-------|------|----------|----------|---------------|
| M0 | 프로젝트 셋업 | **Phase 0** | 개발 환경 구축 | - | 🔒 **직렬** | 5-7 |
| M0.5 | **계약 & 테스트 설계** | **Phase 0** | API 계약 + 테스트 선행 작성 | 🔴 전체 RED | 🔒 **직렬** | 3-5 |
| M1 | FEAT-0: 인증/온보딩 | **Phase 1** | 로그인/가입 구현 | 🔴→🟢 | 🔓 **병렬** | 8-10 |
| M2 | FEAT-1: {{핵심기능}} | **Phase 2** | MVP 핵심 기능 | 🔴→🟢 | 🔓 **병렬** | 10-15 |
| ... | (추가 기능들) | **Phase N** | 기능별 구현 | 🔴→🟢 | 🔓 **병렬** | 가변 |
| M(N-1) | 통합 & E2E 테스트 | **Phase N+1** | 전체 통합 검증 | 🟢 전체 | 🔒 **직렬** | 5-7 |
| M(N) | 배포 | **Phase N+2** | 프로덕션 배포 | - | 🔒 **직렬** | 3-5 |

> 🔒 **직렬**: 단일 터미널에서 순차 실행 (의존성 있음)
> 🔓 **병렬**: 다중 터미널에서 라운드 로빈 가능 (독립적)

### ⚠️ Phase 번호 규칙 (오케스트레이터 필수!)

**오케스트레이터가 서브에이전트를 호출할 때 반드시 Phase 번호를 포함해야 합니다!**

| 마일스톤 | Phase | 태스크 ID 형식 | Git Worktree |
|----------|-------|---------------|--------------|
| M0, M0.5 | Phase 0 | `Phase 0, T0.X` | ❌ 불필요 (main) |
| M1 | Phase 1 | `Phase 1, T1.X` | ✅ 생성 필요 |
| M2 | Phase 2 | `Phase 2, T2.X` | ✅ 생성 필요 |
| ... | Phase N | `Phase N, TX.X` | ✅ 생성 필요 |

---

## M0: 프로젝트 셋업 (Phase 0)

### 컨텍스트 및 목표
프론트엔드와 백엔드 개발 환경을 구축하고, 팀 협업을 위한 기본 인프라를 설정합니다.

### 태스크 목록

#### [] Phase 0, T0.1: 프로젝트 구조 초기화

**프롬프트:**
> 프로젝트 루트에서 프론트엔드(frontend/)와 백엔드(backend/) 디렉토리를 생성하고,
> TRD 섹션 2.1에 명시된 기술 스택으로 각각 초기화해주세요.

**생성 파일:**
- `frontend/package.json`
- `frontend/tsconfig.json`
- `backend/requirements.txt` (또는 package.json)
- `backend/pyproject.toml`

**인수 조건:**
- [ ] 프론트엔드: `npm run dev`로 실행 가능
- [ ] 백엔드: 서버 실행 가능 (예: `uvicorn main:app`)
- [ ] 모든 의존성 설치 완료

---

#### [] Phase 0, T0.2: 데이터베이스 설정

**프롬프트:**
> Docker Compose로 데이터베이스를 설정해주세요.
> Database Design 문서의 ERD를 참조하여 초기 스키마를 생성합니다.

**참조:** Database Design 섹션 1

**생성 파일:**
- `docker-compose.yml`
- `backend/migrations/` (초기 마이그레이션)

**인수 조건:**
- [ ] `docker compose up -d`로 DB 시작 가능
- [ ] 마이그레이션 실행 가능

---

#### [] Phase 0, T0.3: 환경 변수 설정

**프롬프트:**
> .env.example 파일을 생성하고, 필요한 환경 변수를 정의해주세요.
> 실제 비밀값은 포함하지 마세요.

**생성 파일:**
- `.env.example`
- `frontend/.env.example`
- `backend/.env.example`

**인수 조건:**
- [ ] 모든 필수 환경 변수 목록화
- [ ] .gitignore에 .env 추가됨

---

#### [] Phase 0, T0.4: 테스트 환경 설정

**프롬프트:**
> 백엔드(pytest)와 프론트엔드(Vitest) 테스트 환경을 설정해주세요.
> MSW(Mock Service Worker)도 함께 설정합니다.

**참조:** TRD 섹션 7 (테스트 전략)

**생성 파일:**
- `backend/tests/conftest.py`
- `backend/pytest.ini`
- `frontend/vitest.config.ts`
- `frontend/src/mocks/browser.ts`
- `frontend/src/mocks/server.ts`
- `frontend/src/mocks/handlers/index.ts`

**인수 조건:**
- [ ] `pytest` 실행 가능 (테스트 0개 상태)
- [ ] `npm run test` 실행 가능 (테스트 0개 상태)
- [ ] MSW 설정 완료

---

## M0.5: 계약 & 테스트 설계 (Phase 0) 🆕

### 컨텍스트 및 목표
**모든 기능의 API 계약을 먼저 정의하고, 실패하는 테스트(🔴 RED)를 작성합니다.**
이 단계가 완료되면 BE/FE가 서로 의존하지 않고 독립적으로 병렬 개발 가능합니다.

### 왜 이 단계가 필요한가?

| 역할 | 이점 |
|------|------|
| BE 개발자 | "이 테스트가 통과하면 완료"라는 명확한 기준 |
| FE 개발자 | Mock API로 BE 완성을 기다리지 않고 개발 |
| 통합 시 | 계약만 맞으면 자동으로 호환 |

### TDD 상태 추적

| 태스크 | 테스트 파일 | 완료 시 상태 |
|--------|------------|-------------|
| T0.5.1 계약 정의 | - | 계약 문서 완성 |
| T0.5.2 테스트 작성 | tests/**/*.py, src/__tests__/**/*.ts | 🔴 RED (정상!) |
| T0.5.3 Mock 생성 | mocks/handlers/*.ts | Mock 응답 완성 |

---

#### [] Phase 0, T0.5.1: API 계약 정의

**프롬프트:**
> 모든 마일스톤(M1~M2)의 API 엔드포인트를 정의해주세요.
> PRD, TRD, Database Design을 참조합니다.
> TypeScript 인터페이스와 Pydantic 스키마를 동시에 생성합니다.

**참조:**
- PRD 섹션 3 (핵심 기능)
- TRD 섹션 3 (API 설계)
- Database Design 전체

**생성 파일:**
- `contracts/auth.contract.ts`
- `contracts/{{feature}}.contract.ts`
- `contracts/types.ts` (공통 타입)
- `backend/app/schemas/auth.py`
- `backend/app/schemas/{{feature}}.py`

**계약 예시:**
```typescript
// contracts/auth.contract.ts
import { User } from './types';

export interface AuthAPI {
  'POST /auth/register': {
    request: { email: string; password: string; name: string };
    response: { user: User; token: string };
    errors: {
      400: 'Invalid input';
      409: 'Email already exists';
    };
  };
  'POST /auth/login': {
    request: { email: string; password: string };
    response: { user: User; token: string };
    errors: {
      401: 'Invalid credentials';
    };
  };
  'GET /auth/me': {
    headers: { Authorization: string };
    response: User;
    errors: {
      401: 'Unauthorized';
    };
  };
  'POST /auth/logout': {
    headers: { Authorization: string };
    response: { message: string };
  };
}
```

```python
# backend/app/schemas/auth.py
from pydantic import BaseModel, EmailStr

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class AuthResponse(BaseModel):
    user: UserResponse
    token: str

class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    created_at: datetime
```

**인수 조건:**
- [ ] 모든 API 엔드포인트 정의됨
- [ ] 요청/응답 타입 명시됨
- [ ] 에러 케이스 정의됨
- [ ] TypeScript ↔ Pydantic 타입 일치

---

#### [] Phase 0, T0.5.2: 테스트 케이스 작성 (🔴 RED)

**프롬프트:**
> 계약(contracts/)을 기반으로 모든 API의 테스트를 작성해주세요.
> **구현 없이 테스트만 작성합니다. 모든 테스트는 실패(🔴 RED) 상태여야 합니다.**

**참조:**
- contracts/*.contract.ts
- backend/app/schemas/*.py

**생성 파일:**
- `backend/tests/api/test_auth.py`
- `backend/tests/api/test_{{feature}}.py`
- `frontend/src/__tests__/api/auth.test.ts`
- `frontend/src/__tests__/api/{{feature}}.test.ts`

**백엔드 테스트 예시:**
```python
# backend/tests/api/test_auth.py
import pytest
from httpx import AsyncClient

class TestAuthRegister:
    """POST /auth/register 테스트"""

    @pytest.mark.asyncio
    async def test_register_success(self, async_client: AsyncClient):
        """회원가입 성공 시 user와 token 반환"""
        response = await async_client.post("/auth/register", json={
            "email": "test@example.com",
            "password": "SecurePass123!",
            "name": "Test User"
        })

        assert response.status_code == 201
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == "test@example.com"

    @pytest.mark.asyncio
    async def test_register_duplicate_email(self, async_client: AsyncClient):
        """중복 이메일로 가입 시 409 에러"""
        # 먼저 가입
        await async_client.post("/auth/register", json={
            "email": "duplicate@example.com",
            "password": "SecurePass123!",
            "name": "First User"
        })

        # 같은 이메일로 다시 가입 시도
        response = await async_client.post("/auth/register", json={
            "email": "duplicate@example.com",
            "password": "AnotherPass123!",
            "name": "Second User"
        })

        assert response.status_code == 409

    @pytest.mark.asyncio
    async def test_register_invalid_email(self, async_client: AsyncClient):
        """잘못된 이메일 형식 시 400 에러"""
        response = await async_client.post("/auth/register", json={
            "email": "not-an-email",
            "password": "SecurePass123!",
            "name": "Test User"
        })

        assert response.status_code == 400


class TestAuthLogin:
    """POST /auth/login 테스트"""

    @pytest.mark.asyncio
    async def test_login_success(self, async_client: AsyncClient, test_user):
        """로그인 성공 시 token 반환"""
        response = await async_client.post("/auth/login", json={
            "email": test_user.email,
            "password": "TestPass123!"
        })

        assert response.status_code == 200
        data = response.json()
        assert "token" in data

    @pytest.mark.asyncio
    async def test_login_wrong_password(self, async_client: AsyncClient, test_user):
        """잘못된 비밀번호 시 401 에러"""
        response = await async_client.post("/auth/login", json={
            "email": test_user.email,
            "password": "WrongPassword!"
        })

        assert response.status_code == 401
```

**프론트엔드 테스트 예시:**
```typescript
// frontend/src/__tests__/api/auth.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { authApi } from '@/api/auth';

describe('Auth API', () => {
  describe('register', () => {
    it('should return user and token on successful registration', async () => {
      const result = await authApi.register({
        email: 'test@example.com',
        password: 'SecurePass123!',
        name: 'Test User',
      });

      expect(result.token).toBeDefined();
      expect(result.user.email).toBe('test@example.com');
    });

    it('should throw error on duplicate email', async () => {
      await expect(
        authApi.register({
          email: 'existing@example.com',
          password: 'SecurePass123!',
          name: 'Test User',
        })
      ).rejects.toThrow('Email already exists');
    });
  });
});
```

**인수 조건:**
- [ ] 모든 성공 케이스 테스트 작성됨
- [ ] 모든 에러 케이스 테스트 작성됨
- [ ] **테스트 실행 시 모두 FAIL (🔴 RED) ← 정상!**
- [ ] 테스트가 계약과 일치함

**검증 명령어:**
```bash
# 백엔드 - 모두 FAIL이어야 정상
pytest backend/tests/api/ -v
# Expected: FAILED (구현 없으므로)

# 프론트엔드 - 모두 FAIL이어야 정상
npm run test -- src/__tests__/api/
# Expected: FAILED (구현 없으므로)
```

---

#### [] Phase 0, T0.5.3: Mock 핸들러 생성

**프롬프트:**
> 프론트엔드가 백엔드 완성 전에 개발할 수 있도록
> MSW(Mock Service Worker) 핸들러를 생성해주세요.
> 계약(contracts/)에 정의된 모든 응답을 시뮬레이션합니다.

**참조:** contracts/*.contract.ts

**생성 파일:**
- `frontend/src/mocks/handlers/auth.ts`
- `frontend/src/mocks/handlers/{{feature}}.ts`
- `frontend/src/mocks/data/users.ts` (Mock 데이터)

**Mock 핸들러 예시:**
```typescript
// frontend/src/mocks/handlers/auth.ts
import { http, HttpResponse } from 'msw';
import { mockUsers, createMockUser, generateToken } from '../data/users';

export const authHandlers = [
  // POST /auth/register
  http.post('/api/auth/register', async ({ request }) => {
    const body = await request.json() as {
      email: string;
      password: string;
      name: string;
    };

    // 중복 이메일 체크
    const existingUser = mockUsers.find(u => u.email === body.email);
    if (existingUser) {
      return HttpResponse.json(
        { error: 'Email already exists' },
        { status: 409 }
      );
    }

    // 이메일 형식 체크
    if (!body.email.includes('@')) {
      return HttpResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const newUser = createMockUser(body);
    mockUsers.push(newUser);

    return HttpResponse.json({
      user: newUser,
      token: generateToken(newUser.id),
    }, { status: 201 });
  }),

  // POST /auth/login
  http.post('/api/auth/login', async ({ request }) => {
    const body = await request.json() as {
      email: string;
      password: string;
    };

    const user = mockUsers.find(u => u.email === body.email);

    // 테스트용: password가 'wrong'이면 실패
    if (!user || body.password === 'wrong') {
      return HttpResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    return HttpResponse.json({
      user,
      token: generateToken(user.id),
    });
  }),

  // GET /auth/me
  http.get('/api/auth/me', ({ request }) => {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Mock: 항상 첫 번째 유저 반환
    return HttpResponse.json(mockUsers[0]);
  }),

  // POST /auth/logout
  http.post('/api/auth/logout', () => {
    return HttpResponse.json({ message: 'Logged out successfully' });
  }),
];
```

**Mock 데이터 예시:**
```typescript
// frontend/src/mocks/data/users.ts
export interface MockUser {
  id: number;
  email: string;
  name: string;
  createdAt: string;
}

export const mockUsers: MockUser[] = [
  {
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
    createdAt: new Date().toISOString(),
  },
];

let nextId = 2;

export function createMockUser(data: { email: string; name: string }): MockUser {
  return {
    id: nextId++,
    email: data.email,
    name: data.name,
    createdAt: new Date().toISOString(),
  };
}

export function generateToken(userId: number): string {
  return `mock-jwt-token-${userId}-${Date.now()}`;
}
```

**인수 조건:**
- [ ] 모든 API 엔드포인트에 Mock 핸들러 있음
- [ ] 성공/실패 케이스 모두 시뮬레이션 가능
- [ ] FE 개발 시 BE 없이 작동 확인됨

**검증:**
```bash
# 프론트엔드 개발 서버 시작 (MSW 활성화)
npm run dev

# 브라우저에서 Mock API 호출 테스트
# Network 탭에서 [MSW] 태그 확인
```

---

## M1: FEAT-0 인증/온보딩 (Phase 1)

### 컨텍스트 및 목표
사용자가 서비스에 가입하고 로그인할 수 있도록 인증 시스템을 구현합니다.

### TDD 상태 추적

| 태스크 | 테스트 파일 | 시작 상태 | 완료 상태 |
|--------|------------|----------|----------|
| T1.1 BE API | tests/api/test_auth.py | 🔴 RED | 🟢 GREEN |
| T1.2 FE UI | src/__tests__/auth/*.test.tsx | 🔴 RED | 🟢 GREEN |
| T1.3 통합 | e2e/auth.spec.ts | 🔴 RED | 🟢 GREEN |

### 사용자 스토리
> "{{페르소나}}로서, 이메일/소셜로 간편하게 가입하고 로그인할 수 있어야 한다.
> 왜냐하면 복잡한 가입 과정은 이탈을 유발하기 때문이다."

### 태스크 목록

---

#### [] Phase 1, T1.1: 인증 API 구현 (Backend) 🔴→🟢

**TDD 사이클:**
```
1. pytest tests/api/test_auth.py 실행 → 🔴 RED (정상, M0.5에서 작성됨)
2. 코드 구현
3. pytest tests/api/test_auth.py 실행 → 🟢 GREEN (완료!)
4. 리팩토링 (테스트 유지)
```

**프롬프트:**
> tests/api/test_auth.py의 모든 테스트가 통과하도록 인증 API를 구현해주세요.
> 계약(contracts/auth.contract.ts)과 스키마(backend/app/schemas/auth.py)를 준수합니다.

**참조:**
- contracts/auth.contract.ts (계약)
- tests/api/test_auth.py (통과해야 할 테스트)
- Database Design 섹션 2.1 (USER)
- TRD 섹션 3.2 (보안)

**생성 파일:**
- `backend/app/models/user.py`
- `backend/app/routes/auth.py`
- `backend/app/services/auth.py`
- `backend/app/core/security.py`

**인수 조건:**
- [ ] `pytest tests/api/test_auth.py` 모두 통과 (🟢)
- [ ] 계약의 모든 엔드포인트 구현됨
- [ ] 커버리지 ≥ 80%

**완료 검증:**
```bash
# 모든 테스트 통과 확인
pytest tests/api/test_auth.py -v --cov=app/routes/auth --cov-report=term-missing

# Expected:
# tests/api/test_auth.py::TestAuthRegister::test_register_success PASSED
# tests/api/test_auth.py::TestAuthRegister::test_register_duplicate_email PASSED
# tests/api/test_auth.py::TestAuthLogin::test_login_success PASSED
# ...
# Coverage: ≥80%
```

**자가 수정 지침:**
- 테스트 실패 시 에러 메시지 확인 후 수정
- 보안 체크리스트(Coding Convention 참조) 확인

---

#### [] Phase 1, T1.2: 로그인 UI 구현 (Frontend) 🔴→🟢

**TDD 사이클:**
```
1. MSW Mock 활성화 (BE 없이 개발)
2. npm run test -- src/__tests__/auth/ 실행 → 🔴 RED
3. 컴포넌트 구현
4. npm run test 실행 → 🟢 GREEN
```

**프롬프트:**
> Mock API(mocks/handlers/auth.ts)를 사용하여 로그인/회원가입 UI를 구현해주세요.
> **백엔드 완성을 기다리지 않고 진행합니다.**

**참조:**
- contracts/auth.contract.ts (계약)
- mocks/handlers/auth.ts (Mock API)
- User Flow 섹션 2
- Design System

**생성 파일:**
- `frontend/src/pages/Login.tsx`
- `frontend/src/pages/Register.tsx`
- `frontend/src/components/auth/LoginForm.tsx`
- `frontend/src/components/auth/RegisterForm.tsx`
- `frontend/src/api/auth.ts`
- `frontend/src/hooks/useAuth.ts`
- `frontend/src/__tests__/auth/LoginForm.test.tsx`
- `frontend/src/__tests__/auth/RegisterForm.test.tsx`

**인수 조건:**
- [ ] Mock API로 로그인/회원가입 동작
- [ ] `npm run test -- src/__tests__/auth/` 통과 (🟢)
- [ ] 유효성 검사 UI 구현됨
- [ ] 에러 상태 UI 구현됨
- [ ] 로딩 상태 UI 구현됨

**완료 검증:**
```bash
# Mock 모드에서 테스트 통과
npm run test -- src/__tests__/auth/ --coverage

# 브라우저에서 Mock API 동작 확인
npm run dev
# → /login, /register 페이지에서 폼 제출 테스트
```

---

#### [] Phase 1, T1.3: BE/FE 통합 검증 🔴→🟢

**실행 조건:** T1.1 🟢 AND T1.2 🟢

**프롬프트:**
> 백엔드와 프론트엔드가 모두 완료되었습니다.
> Mock을 비활성화하고 실제 API로 통합 테스트를 실행합니다.

**검증 단계:**
```bash
# 1. Mock 비활성화
# frontend/.env에서 VITE_MOCK_API=false 설정

# 2. 백엔드 + DB 실행
docker compose up -d
uvicorn app.main:app --reload

# 3. 프론트엔드 실행
npm run dev

# 4. E2E 테스트 실행
npx playwright test e2e/auth.spec.ts
```

**E2E 테스트 예시:**
```typescript
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should register a new user', async ({ page }) => {
    await page.goto('/register');

    await page.fill('[data-testid="email"]', 'newuser@example.com');
    await page.fill('[data-testid="password"]', 'SecurePass123!');
    await page.fill('[data-testid="name"]', 'New User');
    await page.click('[data-testid="submit"]');

    // 회원가입 후 리다이렉트 확인
    await expect(page).toHaveURL('/dashboard');
  });

  test('should login existing user', async ({ page }) => {
    await page.goto('/login');

    await page.fill('[data-testid="email"]', 'test@example.com');
    await page.fill('[data-testid="password"]', 'TestPass123!');
    await page.click('[data-testid="submit"]');

    await expect(page).toHaveURL('/dashboard');
  });
});
```

**인수 조건:**
- [ ] 실제 API로 회원가입 성공
- [ ] 실제 API로 로그인 성공
- [ ] E2E 테스트 통과 (🟢)
- [ ] 계약 불일치 없음

---

## M2: FEAT-1 {{핵심기능명}} (Phase 2)

### 컨텍스트 및 목표
MVP의 핵심 기능을 구현합니다. 이 기능이 서비스의 핵심 가치를 전달합니다.

### TDD 상태 추적

| 태스크 | 테스트 파일 | 시작 상태 | 완료 상태 |
|--------|------------|----------|----------|
| T2.1 BE API | tests/api/test_{{feature}}.py | 🔴 RED | 🟢 GREEN |
| T2.2 FE UI | src/__tests__/{{feature}}/*.test.tsx | 🔴 RED | 🟢 GREEN |
| T2.3 통합 | e2e/{{feature}}.spec.ts | 🔴 RED | 🟢 GREEN |

### 사용자 스토리
> "{{페르소나}}로서, {{행동}}할 수 있어야 한다.
> 왜냐하면 {{가치}}."

### 태스크 목록

---

#### [] Phase 2, T2.1: {{핵심 엔티티}} API 구현 (Backend) 🔴→🟢

**TDD 사이클:**
```
1. pytest tests/api/test_{{feature}}.py 실행 → 🔴 RED
2. 코드 구현
3. pytest 실행 → 🟢 GREEN
```

**프롬프트:**
> tests/api/test_{{feature}}.py의 모든 테스트가 통과하도록 API를 구현해주세요.
> 계약(contracts/{{feature}}.contract.ts)을 준수합니다.

**참조:**
- contracts/{{feature}}.contract.ts (계약)
- tests/api/test_{{feature}}.py (통과해야 할 테스트)
- Database Design 섹션 2.2

**생성 파일:**
- `backend/app/models/{{entity}}.py`
- `backend/app/routes/{{entity}}.py`
- `backend/app/services/{{entity}}.py`

**인수 조건:**
- [ ] `pytest tests/api/test_{{feature}}.py` 모두 통과 (🟢)
- [ ] GET /{{entity}} - 목록 조회
- [ ] POST /{{entity}} - 생성
- [ ] GET /{{entity}}/{id} - 상세 조회
- [ ] PUT /{{entity}}/{id} - 수정
- [ ] DELETE /{{entity}}/{id} - 삭제
- [ ] 본인 데이터만 접근 가능 (권한 검사)
- [ ] 커버리지 ≥ 80%

---

#### [] Phase 2, T2.2: {{핵심 기능}} UI 구현 (Frontend) 🔴→🟢

**TDD 사이클:**
```
1. MSW Mock 활성화
2. npm run test -- src/__tests__/{{feature}}/ 실행 → 🔴 RED
3. 컴포넌트 구현
4. npm run test 실행 → 🟢 GREEN
```

**프롬프트:**
> Mock API를 사용하여 {{핵심기능}} UI를 구현해주세요.
> User Flow의 FEAT-1 플로우를 참조합니다.

**참조:**
- contracts/{{feature}}.contract.ts (계약)
- mocks/handlers/{{feature}}.ts (Mock API)
- User Flow 섹션 3
- Design System

**생성 파일:**
- `frontend/src/pages/{{Feature}}.tsx`
- `frontend/src/components/{{feature}}/`
- `frontend/src/api/{{feature}}.ts`
- `frontend/src/__tests__/{{feature}}/*.test.tsx`

**인수 조건:**
- [ ] Mock API로 모든 CRUD 동작
- [ ] `npm run test -- src/__tests__/{{feature}}/` 통과 (🟢)
- [ ] User Flow에 정의된 모든 화면 구현
- [ ] 로딩/에러 상태 처리

---

#### [] Phase 2, T2.3: BE/FE 통합 검증 🔴→🟢

**실행 조건:** T2.1 🟢 AND T2.2 🟢

**검증:**
```bash
# E2E 테스트
npx playwright test e2e/{{feature}}.spec.ts
```

**인수 조건:**
- [ ] 실제 API로 CRUD 동작
- [ ] E2E 테스트 통과 (🟢)

---

## M3: 통합 & E2E 테스트 (Phase N+1)

### 컨텍스트 및 목표
모든 기능이 통합된 상태에서 전체 사용자 여정을 검증합니다.

### 태스크 목록

#### [] Phase N+1, T3.1: 전체 E2E 테스트

**프롬프트:**
> 주요 사용자 여정(온보딩 → 핵심 기능 → 결과 확인)에 대한
> 전체 E2E 테스트를 실행하고 검증해주세요.

**검증:**
```bash
# 전체 E2E 테스트 실행
npx playwright test

# CI 통합
npm run test:e2e:ci
```

**인수 조건:**
- [ ] 회원가입 → 로그인 플로우 통과
- [ ] FEAT-1 핵심 시나리오 통과
- [ ] 모든 E2E 테스트 🟢 GREEN
- [ ] CI에서 테스트 자동 실행 확인

---

#### [] Phase N+1, T3.2: 성능 & 보안 점검

**프롬프트:**
> TRD의 비기능 요구사항을 기준으로 성능과 보안을 점검해주세요.

**참조:** TRD 섹션 3

**체크리스트:**
- [ ] API 응답 시간 < 500ms (P95)
- [ ] 초기 로딩 < 3s (FCP)
- [ ] HTTPS 적용
- [ ] 입력 검증 (서버 측)
- [ ] SQL Injection 방지
- [ ] XSS 방지

---

## M4: 배포 (Phase N+2)

### 태스크 목록

#### [] Phase N+2, T4.1: 프로덕션 배포 설정

**프롬프트:**
> TRD 섹션 2.4에 명시된 인프라에 배포 설정을 해주세요.

**인수 조건:**
- [ ] 환경 변수 설정 완료
- [ ] HTTPS 적용
- [ ] 배포 URL 접근 가능
- [ ] 모든 E2E 테스트 프로덕션 환경에서 통과

---

## 자가 수정 지침 (공통)

모든 태스크 완료 후:

### TDD 체크리스트 (Critical)
- [ ] 🔴 RED: 테스트 먼저 작성 후 실패 확인했는가?
- [ ] 🟢 GREEN: 최소 코드로 테스트 통과했는가?
- [ ] 🔵 REFACTOR: 리팩토링 후 테스트 유지되는가?

### 품질 체크리스트
1. **인수 조건 체크**: 모든 조건 충족 확인
2. **코드 품질**: Coding Convention 준수 여부
3. **테스트 실행**: 관련 테스트 통과 (🟢)
4. **문서 참조**: PRD/TRD/Design System과 일관성 유지

### 검증 명령어
```bash
# 백엔드
pytest --cov=app --cov-report=term-missing
ruff check .
mypy app/

# 프론트엔드
npm run test -- --coverage
npm run lint
npm run type-check

# E2E
npx playwright test
```

---

## Worktree 기반 병렬 개발 가이드

> **라운드 로빈(Round Robin)**: 컴퓨터가 자동으로 스케줄링하는 것이 아니라,
> **개발자가 여러 터미널 탭을 순회하며 빈 슬롯(유휴 상태인 Claude 세션)에 작업을 할당하는 수동 워크플로우**입니다.

### Plan Mode로 계약 먼저 확정 (중요!)

병렬 개발 전에 **반드시** Plan Mode에서 인터페이스 계약을 확정합니다:

```
┌─────────────────────────────────────────────────────────────┐
│  Plan Mode (Shift+Tab) 활용                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Shift+Tab → Plan Mode 진입                              │
│  2. Claude와 대화하며 계약 확정:                            │
│     - API 명세 (엔드포인트, 요청/응답 형식)                │
│     - 데이터 구조 (타입, 스키마)                           │
│     - 함수 시그니처                                        │
│  3. 계약이 확정되면 Tab → 구현 모드로 전환                  │
│                                                             │
│  ✓ 이 단계에서 BE/FE 인터페이스가 정의되므로               │
│  ✓ 이후 구현 단계에서는 서로를 기다릴 필요 없음            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 라운드 로빈 운영 절차

#### 1단계: 직렬 구간 (단일 터미널)

```bash
# ═══════════════════════════════════════════════════════════
# Phase 0: Foundation (직렬 실행 - 반드시 완료 후 다음 단계)
# ═══════════════════════════════════════════════════════════

# 메인 브랜치에서 시작
git checkout main

# M0: 프로젝트 셋업
# T0.1 ~ T0.4 순차 실행
pip install -r backend/requirements.txt
npm install --prefix frontend
docker compose up -d
# ...

# M0.5: 계약 & 테스트 설계
# T0.5.1 ~ T0.5.3 순차 실행
# contracts/*.ts 생성
# schemas/*.py 생성
# tests/**/*.py 작성 (🔴 RED)
# mocks/handlers/*.ts 생성

# ✅ Foundation 완료 확인
pytest backend/tests/ -v  # 모두 FAIL = 정상!
npm run test --prefix frontend  # 모두 FAIL = 정상!
```

#### 2단계: 병렬 구간 (다중 터미널 - 라운드 로빈)

```bash
# ═══════════════════════════════════════════════════════════
# Phase 1~N: Feature Development (병렬 실행 가능)
# ═══════════════════════════════════════════════════════════

# Terminal 1: Phase 1 (인증)
git worktree add ../project-phase1-auth -b phase/1-auth
cd ../project-phase1-auth
# 🔴 RED → 🟢 GREEN 작업

# Terminal 2: Phase 2 (게시글)
git worktree add ../project-phase2-posts -b phase/2-posts
cd ../project-phase2-posts
# 🔴 RED → 🟢 GREEN 작업

# Terminal 3: Phase 3 (댓글)
git worktree add ../project-phase3-comments -b phase/3-comments
cd ../project-phase3-comments
# 🔴 RED → 🟢 GREEN 작업

# Terminal 4: Phase 4 (알림)
git worktree add ../project-phase4-notifications -b phase/4-notifications
cd ../project-phase4-notifications
# 🔴 RED → 🟢 GREEN 작업

# Terminal 5: Phase 5 (검색)
git worktree add ../project-phase5-search -b phase/5-search
cd ../project-phase5-search
# 🔴 RED → 🟢 GREEN 작업
```

#### 3단계: Phase 완료 시 병합 + 다음 Phase 할당

```bash
# ═══════════════════════════════════════════════════════════
# 라운드 로빈: Phase 완료 시 병합 → 다음 Phase 할당
# ═══════════════════════════════════════════════════════════

# Terminal 1이 Phase 1 완료
cd ../project-main
git merge --no-ff phase/1-auth -m "Phase 1: Auth 완료 ✅"
git worktree remove ../project-phase1-auth
git branch -d phase/1-auth

# Terminal 1에 Phase 6 할당
git worktree add ../project-phase6-profile -b phase/6-profile
cd ../project-phase6-profile
# 다음 작업 시작...

# (다른 터미널도 동일한 패턴으로 순환)
```

### 수동 라운드 로빈 운영 팁

```
┌─────────────────────────────────────────────────────────────┐
│  라운드 로빈 실제 운영 패턴                                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Tab 1 (작업 할당)                                       │
│     "백엔드 API A를 구현해. 테스트 케이스(인터페이스)가 있어."│
│     → Claude가 Thinking 모드 진입 (몇 분간 작업)           │
│                                                             │
│  2. Tab 2로 즉시 이동                                       │
│     "프런트엔드 컴포넌트 B를 만들어. 디자인 시안은 이거야."  │
│     → Tab 1이 작업하는 동안 다른 작업 할당                  │
│                                                             │
│  3. Tab 3, 4, 5도 동일하게 순회                             │
│     독립된 기능(버그 수정, 문서화 등)을 각각 할당           │
│                                                             │
│  4. 알림으로 복귀                                           │
│     작업 완료 또는 Claude가 질문하면 해당 탭으로 돌아가     │
│     컨펌하거나 다음 지시                                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 터미널 알림 설정 (권장)

병렬 작업 시 완료 알림을 받으면 효율적입니다:

```bash
# iTerm2 (macOS)
# Preferences → Profiles → Terminal → "Silence bell" 해제
# Preferences → Profiles → Terminal → "Notification center alerts" 활성화

# VS Code 터미널
# 기본적으로 작업 완료 시 터미널 탭에 표시됨

# 수동 확인
# 각 터미널을 주기적으로 순회하며 상태 확인 (권장: 2-3분마다)
```

### 작업 완료 시 사운드 알림 (선택)

Claude가 Phase 작업을 완료하면 자동으로 사운드를 재생합니다.

**방법 1: PostToolUse Hook으로 사운드 재생**

`.claude/settings.json`에 추가:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "_comment": "테스트 통과 시 성공 사운드",
        "matcher": "Bash",
        "command": "if echo '{{output}}' | grep -q 'passed\\|PASSED\\|✅'; then afplay /System/Library/Sounds/Glass.aiff; fi"
      }
    ]
  }
}
```

**방법 2: 에이전트가 완료 시 직접 사운드 실행**

에이전트 파일(backend-specialist.md 등)에 추가:

```markdown
## Phase 완료 시 사운드 알림

테스트 통과 후 사용자에게 알림:
1. 테스트 결과 보고
2. **사운드 재생** (macOS: `afplay`, Linux: `paplay`)
3. 병합 여부 확인
```

**macOS 시스템 사운드 목록:**

```bash
# 사용 가능한 시스템 사운드 확인
ls /System/Library/Sounds/

# 주요 사운드
afplay /System/Library/Sounds/Glass.aiff      # 성공 (맑은 종소리)
afplay /System/Library/Sounds/Ping.aiff       # 알림
afplay /System/Library/Sounds/Pop.aiff        # 완료
afplay /System/Library/Sounds/Purr.aiff       # 부드러운 완료
afplay /System/Library/Sounds/Sosumi.aiff     # 주의
afplay /System/Library/Sounds/Basso.aiff      # 에러 (낮은 음)

# TTS로 음성 알림 (더 명확함)
say "Phase 1 completed"
say "테스트 통과"
```

**Linux 사운드:**

```bash
# paplay (PulseAudio)
paplay /usr/share/sounds/freedesktop/stereo/complete.oga

# aplay (ALSA)
aplay /usr/share/sounds/alsa/Front_Center.wav

# espeak (TTS)
espeak "Phase completed"
```

**권장 설정: Phase별 다른 사운드**

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Bash",
        "command": "if echo '{{output}}' | grep -qE 'PASSED|passed|✅.*GREEN'; then afplay /System/Library/Sounds/Glass.aiff && say 'Tests passed'; elif echo '{{output}}' | grep -qE 'FAILED|failed|❌'; then afplay /System/Library/Sounds/Basso.aiff && say 'Tests failed'; fi"
      }
    ]
  }
}
```

| 상황 | 사운드 | 효과 |
|------|--------|------|
| 테스트 통과 | Glass.aiff + "Tests passed" | 성공 알림 |
| 테스트 실패 | Basso.aiff + "Tests failed" | 주의 환기 |
| Phase 완료 | say "Phase X completed" | 명확한 음성 알림 |

### Phase 완료 시 에이전트 행동 규칙

에이전트(Claude)는 Phase 작업 완료 시 **반드시 사용자에게 확인**을 요청합니다:

```
┌─────────────────────────────────────────────────────────────┐
│  Phase 완료 시 에이전트 프로토콜                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. 테스트 실행 및 결과 보고                                │
│     "pytest tests/api/test_auth.py 실행 결과:              │
│      ✅ 5/5 테스트 통과 (🟢 GREEN)"                        │
│                                                             │
│  2. 완료 상태 요약                                          │
│     "Phase 1 (인증) 구현이 완료되었습니다.                  │
│      - 구현된 기능: 회원가입, 로그인, 토큰 검증            │
│      - 테스트 커버리지: 85%"                               │
│                                                             │
│  3. 사용자에게 병합 여부 확인 (필수!)                       │
│     "main 브랜치에 병합할까요?                              │
│      - [Y] 병합 진행                                       │
│      - [N] 추가 작업 필요"                                 │
│                                                             │
│  4. 사용자 승인 후에만 병합 실행                            │
│     사용자: "Y" 또는 "병합해줘"                             │
│     → git merge 실행                                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**에이전트는 사용자 승인 없이 절대 병합하지 않습니다.**

### 병합 규칙

| 조건 | 병합 가능 | 비고 |
|------|----------|------|
| 모든 테스트 🟢 GREEN | ✅ 가능 | 필수 조건 |
| 일부 테스트 🔴 RED | ❌ 불가 | 완료 전까지 작업 계속 |
| 린트/타입 체크 실패 | ❌ 불가 | 수정 후 재시도 |
| 커버리지 < 80% | ⚠️ 경고 | 권장 기준, 상황 따라 유연 |
| **사용자 승인** | ✅ 필수 | 병합 전 반드시 확인 |

### 충돌 해결 전략

병렬 개발 시 충돌 최소화:

```bash
# 정기적으로 main 동기화 (1일 1회 권장)
git fetch origin main
git rebase origin/main

# 충돌 발생 시
git rebase --abort  # 일단 중단
git merge origin/main  # merge로 대체
# 충돌 해결 후 테스트 재실행
```

---

## 안전 및 포맷팅 설정 (Hooks & Permissions)

### PostToolUse Hook 설정

Claude가 파일을 수정한 직후 자동으로 코드 포맷팅을 실행하여 CI 포맷 에러를 방지합니다.

**설정 파일: `.claude/settings.json`**

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "command": "bun run format --write {{filePath}}"
      }
    ]
  }
}
```

**프로젝트별 설정 예시:**

```json
// Node.js/TypeScript 프로젝트
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "command": "npx prettier --write {{filePath}}"
      }
    ]
  }
}

// Python 프로젝트
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "command": "ruff format {{filePath}} && ruff check --fix {{filePath}}"
      }
    ]
  }
}

// 풀스택 프로젝트 (BE + FE)
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "command": "if [[ {{filePath}} == *.py ]]; then ruff format {{filePath}}; elif [[ {{filePath}} == *.ts* ]]; then npx prettier --write {{filePath}}; fi"
      }
    ]
  }
}
```

### 권한 관리 (Permissions)

`--dangerously-skip-permissions` 대신 `/permissions` 명령어로 안전한 명령어만 화이트리스트에 추가합니다.

**권장 화이트리스트 명령어:**

```bash
# Claude Code에서 /permissions 실행 후 추가

# 빌드 & 테스트 (안전)
npm run build
npm run test
npm run lint
pytest
ruff check
mypy

# 개발 서버 (안전)
npm run dev
uvicorn

# Git 읽기 명령어 (안전)
git status
git log
git diff
git branch

# Docker 읽기 (안전)
docker ps
docker logs
```

**화이트리스트 설정 파일: `.claude/settings.json`**

```json
{
  "permissions": {
    "allow": [
      "npm run build",
      "npm run test",
      "npm run lint",
      "npm run dev",
      "pytest",
      "pytest --cov",
      "ruff check",
      "ruff format",
      "mypy",
      "git status",
      "git log",
      "git diff",
      "git branch",
      "docker ps",
      "docker logs"
    ],
    "deny": [
      "rm -rf",
      "git push --force",
      "git reset --hard",
      "DROP TABLE",
      "DELETE FROM"
    ]
  }
}
```

### 권한 관리 원칙

| 명령어 유형 | 권장 설정 | 이유 |
|------------|----------|------|
| 빌드/테스트 | ✅ Allow | 읽기 전용, 안전 |
| 린트/포맷 | ✅ Allow | 코드 품질 자동화 |
| Git 읽기 | ✅ Allow | 상태 확인용 |
| Git 쓰기 (commit) | ⚠️ 수동 승인 | 변경 확인 필요 |
| Git 병합 (merge) | ⚠️ 수동 승인 | 사용자 확인 필수 |
| 파일 삭제 | ❌ Deny | 위험 |
| DB 수정 | ❌ Deny | 위험 |

---

## Decision Log 참조

{{대화 중 기록된 Decision Log}}
