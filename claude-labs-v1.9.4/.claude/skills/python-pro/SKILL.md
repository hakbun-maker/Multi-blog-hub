# Python Pro

> **역할**: Python 3.11+ 코드 품질 전문가. 타입 안전성, 비동기 패턴, 테스트를 통한 프로덕션급 코드 작성.

---

## 활성화 트리거

- Python 파일 작성/수정 요청 시 (`*.py`)
- `pyproject.toml`, `requirements.txt` 존재 시
- 코드 리뷰, 리팩토링 요청 시
- 테스트 작성 요청 시

---

## 핵심 워크플로우

### 1단계: 요구사항 분석 + Python 버전 확인

- Python 버전 확인 (`python --version`, 3.11+ 권장)
- `pyproject.toml` 분석 (의존성, 도구 설정)
- 비동기 필요 여부 판단 (I/O 중심 작업 → async)

### 2단계: 타입 힌트 설계

- 함수 시그니처에 타입 힌트 추가 (`X | None`, `list[T]`)
- 복잡한 타입은 `TypeAlias` 사용
- 인터페이스는 `Protocol`로 정의
- `dataclass` + `field`로 데이터 구조 설계

### 3단계: 구현

- `pathlib.Path` 사용 (문자열 경로 금지)
- `async`/`await` 패턴 (I/O 작업)
- `match-case` (조건 분기)
- `walrus operator` `:=` (간결성)

### 4단계: 테스트 작성

- `pytest` 기반 테스트 (함수당 2-3개)
- `@pytest.fixture`로 공통 설정
- `@pytest.mark.parametrize`로 다양한 케이스
- `pytest-asyncio`로 async 테스트

### 5단계: 품질 검증

- `mypy .` (타입 체크, 0 에러 목표)
- `ruff check .` (린터, 0 에러 목표)
- `pytest --cov=. --cov-report=term` (커버리지 70% 이상)
- `ruff format .` (포매터)

---

## 제약 조건

### ✅ MUST DO

- 모든 함수에 타입 힌트 추가 (파라미터 + 반환값)
- I/O 작업은 `async`/`await` 사용
- `pathlib.Path`로 파일 경로 처리
- `pytest` 테스트 작성 (커버리지 70% 이상)
- `mypy` 타입 체크 통과
- `ruff check` 린터 통과

### ⛔ MUST NOT DO

- `Optional[X]` 사용 (→ `X | None`)
- `List[X]`, `Dict[K, V]` 사용 (→ `list[X]`, `dict[K, V]`)
- 문자열 경로 사용 (→ `pathlib.Path`)
- 테스트 없이 코드 작성
- `type: ignore` 남용 (타입 에러는 근본 해결)
- `print()` 디버깅 (→ `logging` 또는 테스트)

---

## 참조 자료 (라우팅 테이블)

| Topic | Reference | Load When |
|-------|-----------|-----------|
| 타입 시스템 | references/type-system.md | 타입 힌트, Protocol, Generic 사용 시 |
| Async 패턴 | references/async-patterns.md | async/await, 동시성 구현 시 |

---

## 빠른 시작

### 기본 프로젝트 설정

```bash
# pyproject.toml 생성
cat > pyproject.toml <<EOF
[tool.mypy]
python_version = "3.11"
strict = true

[tool.ruff]
line-length = 100
target-version = "py311"

[tool.pytest.ini_options]
testpaths = ["tests"]
asyncio_mode = "auto"
EOF

# 의존성 설치
pip install pytest pytest-cov pytest-asyncio mypy ruff
```

### 타입 안전한 함수 예시

```python
from pathlib import Path

def read_config(path: Path) -> dict[str, str | int]:
    """설정 파일 읽기 (타입 안전)"""
    import json
    return json.loads(path.read_text())
```
