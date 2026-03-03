# Python 타입 시스템 완벽 가이드

> **로드 시점**: 타입 힌트, Protocol, Generic 사용 시

---

## 1. 기본 타입 힌트 (Python 3.11+)

### 내장 타입

```python
# ✅ Python 3.11+ 권장 방식
def process(items: list[str]) -> dict[str, int]:
    return {item: len(item) for item in items}

# ❌ 구식 (typing 모듈 불필요)
from typing import List, Dict
def process(items: List[str]) -> Dict[str, int]:
    ...
```

### Union 타입

```python
# ✅ Python 3.10+ 권장
def get_value(key: str) -> str | None:
    return data.get(key)

# ❌ 구식
from typing import Optional
def get_value(key: str) -> Optional[str]:
    ...
```

### 복수 Union

```python
# ✅ 파이프 연산자 사용
def parse(value: str | int | float) -> float:
    return float(value)

# 타입 별칭 활용
JsonValue = str | int | float | bool | None | dict[str, "JsonValue"] | list["JsonValue"]

def process_json(data: JsonValue) -> JsonValue:
    return data
```

---

## 2. TypeAlias (복잡한 타입 단순화)

### 기본 사용법

```python
from typing import TypeAlias

# 타입 별칭 정의
UserId: TypeAlias = int
UserData: TypeAlias = dict[str, str | int]
Callback: TypeAlias = callable[[int], None]

def create_user(user_id: UserId, data: UserData) -> None:
    ...

def register_callback(cb: Callback) -> None:
    ...
```

### 복잡한 데이터 구조

```python
from typing import TypeAlias

# JSON 타입 정의 (재귀적)
JsonPrimitive: TypeAlias = str | int | float | bool | None
JsonValue: TypeAlias = JsonPrimitive | dict[str, "JsonValue"] | list["JsonValue"]

# 설정 타입
ConfigValue: TypeAlias = str | int | bool | list[str]
Config: TypeAlias = dict[str, ConfigValue]

def load_config(path: Path) -> Config:
    import json
    return json.loads(path.read_text())
```

### 함수 타입

```python
from typing import TypeAlias
from collections.abc import Callable

# 콜백 함수 타입
ErrorHandler: TypeAlias = Callable[[Exception], None]
Validator: TypeAlias = Callable[[str], bool]
Transform: TypeAlias = Callable[[str], str]

def process_with_error(data: str, on_error: ErrorHandler) -> None:
    try:
        print(data.upper())
    except Exception as e:
        on_error(e)
```

---

## 3. Protocol (구조적 서브타이핑)

### 기본 Protocol

```python
from typing import Protocol

class Drawable(Protocol):
    """그릴 수 있는 객체 인터페이스"""
    def draw(self) -> None:
        ...

class Circle:
    def draw(self) -> None:
        print("○")

class Square:
    def draw(self) -> None:
        print("□")

def render(obj: Drawable) -> None:
    obj.draw()

# Circle, Square 둘 다 Drawable 타입으로 사용 가능 (명시적 상속 없음)
render(Circle())
render(Square())
```

### Protocol with 속성

```python
from typing import Protocol

class Sized(Protocol):
    @property
    def size(self) -> int:
        ...

class Collection(Protocol):
    items: list[str]  # 인스턴스 변수

    def add(self, item: str) -> None:
        ...

class MyList:
    def __init__(self):
        self.items: list[str] = []

    def add(self, item: str) -> None:
        self.items.append(item)

def process(coll: Collection) -> int:
    return len(coll.items)

# MyList는 Collection Protocol 준수
process(MyList())
```

### Protocol 상속

```python
from typing import Protocol

class Readable(Protocol):
    def read(self) -> str:
        ...

class Writable(Protocol):
    def write(self, data: str) -> None:
        ...

class ReadWritable(Readable, Writable, Protocol):
    """읽기/쓰기 모두 가능한 인터페이스"""
    pass

class File:
    def read(self) -> str:
        return "data"

    def write(self, data: str) -> None:
        print(f"Writing: {data}")

def transfer(source: Readable, dest: Writable) -> None:
    data = source.read()
    dest.write(data)

# File은 ReadWritable 타입
file = File()
transfer(file, file)
```

---

## 4. Generic (제네릭 타입)

### TypeVar 기본

```python
from typing import TypeVar

T = TypeVar("T")

def first(items: list[T]) -> T | None:
    return items[0] if items else None

# 타입 추론
result1: str | None = first(["a", "b"])  # T = str
result2: int | None = first([1, 2, 3])   # T = int
```

### 제약 조건 (bound)

```python
from typing import TypeVar, Protocol

class Comparable(Protocol):
    def __lt__(self, other: "Comparable") -> bool:
        ...

T = TypeVar("T", bound=Comparable)

def min_value(items: list[T]) -> T:
    return min(items)

# int, str 등 비교 가능 타입만 허용
min_value([3, 1, 2])  # OK
min_value(["a", "c", "b"])  # OK
# min_value([object()])  # mypy 에러
```

### Generic 클래스

```python
from typing import Generic, TypeVar

T = TypeVar("T")

class Stack(Generic[T]):
    def __init__(self) -> None:
        self._items: list[T] = []

    def push(self, item: T) -> None:
        self._items.append(item)

    def pop(self) -> T | None:
        return self._items.pop() if self._items else None

# 타입 안전한 스택
stack: Stack[int] = Stack()
stack.push(1)
# stack.push("a")  # mypy 에러
```

### 복수 TypeVar

```python
from typing import TypeVar, Generic

K = TypeVar("K")
V = TypeVar("V")

class Cache(Generic[K, V]):
    def __init__(self) -> None:
        self._data: dict[K, V] = {}

    def get(self, key: K) -> V | None:
        return self._data.get(key)

    def set(self, key: K, value: V) -> None:
        self._data[key] = value

# 타입 안전한 캐시
cache: Cache[str, int] = Cache()
cache.set("age", 30)
value: int | None = cache.get("age")
```

---

## 5. dataclass (데이터 구조)

### 기본 dataclass

```python
from dataclasses import dataclass

@dataclass
class User:
    id: int
    name: str
    email: str
    active: bool = True  # 기본값

# 자동 생성: __init__, __repr__, __eq__
user = User(id=1, name="Alice", email="alice@example.com")
print(user)  # User(id=1, name='Alice', email='alice@example.com', active=True)
```

### field() 활용

```python
from dataclasses import dataclass, field

@dataclass
class Product:
    id: int
    name: str
    tags: list[str] = field(default_factory=list)  # 가변 기본값
    metadata: dict[str, str] = field(default_factory=dict)
    _internal: str = field(default="", repr=False)  # repr에서 제외

product = Product(id=1, name="Laptop")
product.tags.append("electronics")
```

### frozen dataclass (불변)

```python
from dataclasses import dataclass

@dataclass(frozen=True)
class Point:
    x: int
    y: int

p = Point(x=10, y=20)
# p.x = 15  # dataclasses.FrozenInstanceError

# 불변 객체는 dict 키로 사용 가능
points: dict[Point, str] = {
    Point(0, 0): "origin",
    Point(1, 1): "diagonal",
}
```

### 상속 + field

```python
from dataclasses import dataclass, field

@dataclass
class Base:
    id: int
    created_at: str = field(default_factory=lambda: "2024-01-01")

@dataclass
class User(Base):
    name: str
    email: str

user = User(id=1, name="Bob", email="bob@example.com")
print(user.created_at)  # 2024-01-01
```

---

## 6. 고급 타입 힌트

### TypeGuard (타입 좁히기)

```python
from typing import TypeGuard

def is_str_list(val: list[object]) -> TypeGuard[list[str]]:
    """리스트의 모든 원소가 문자열인지 확인"""
    return all(isinstance(x, str) for x in val)

def process(items: list[object]) -> None:
    if is_str_list(items):
        # 이제 items는 list[str] 타입으로 좁혀짐
        print(items[0].upper())  # OK
```

### overload (함수 오버로딩)

```python
from typing import overload

@overload
def process(value: int) -> str:
    ...

@overload
def process(value: str) -> int:
    ...

def process(value: int | str) -> str | int:
    if isinstance(value, int):
        return str(value)
    return len(value)

# mypy가 반환 타입 추론
result1: str = process(42)     # OK
result2: int = process("abc")  # OK
```

### Literal (리터럴 타입)

```python
from typing import Literal

Mode = Literal["read", "write", "append"]

def open_file(path: str, mode: Mode) -> None:
    print(f"Opening {path} in {mode} mode")

open_file("data.txt", "read")    # OK
# open_file("data.txt", "delete")  # mypy 에러
```

### Final (상수)

```python
from typing import Final

MAX_SIZE: Final = 100
API_KEY: Final[str] = "secret"

# MAX_SIZE = 200  # mypy 에러 (재할당 불가)

class Config:
    BASE_URL: Final[str] = "https://api.example.com"
```

---

## 7. 실전 패턴

### Result 타입 (함수형 에러 처리)

```python
from typing import TypeVar, Generic
from dataclasses import dataclass

T = TypeVar("T")
E = TypeVar("E")

@dataclass(frozen=True)
class Ok(Generic[T]):
    value: T

@dataclass(frozen=True)
class Err(Generic[E]):
    error: E

Result = Ok[T] | Err[E]

def divide(a: int, b: int) -> Result[float, str]:
    if b == 0:
        return Err("Division by zero")
    return Ok(a / b)

# 사용
result = divide(10, 2)
match result:
    case Ok(value):
        print(f"Result: {value}")
    case Err(error):
        print(f"Error: {error}")
```

### Builder 패턴 (타입 안전)

```python
from dataclasses import dataclass, field

@dataclass
class QueryBuilder:
    _table: str = ""
    _fields: list[str] = field(default_factory=list)
    _where: list[str] = field(default_factory=list)

    def table(self, name: str) -> "QueryBuilder":
        self._table = name
        return self

    def select(self, *fields: str) -> "QueryBuilder":
        self._fields.extend(fields)
        return self

    def where(self, condition: str) -> "QueryBuilder":
        self._where.append(condition)
        return self

    def build(self) -> str:
        fields = ", ".join(self._fields) or "*"
        query = f"SELECT {fields} FROM {self._table}"
        if self._where:
            query += " WHERE " + " AND ".join(self._where)
        return query

# 메서드 체이닝 (타입 안전)
query = (QueryBuilder()
    .table("users")
    .select("id", "name")
    .where("age > 18")
    .build())
```

### 타입 안전한 설정 로더

```python
from typing import TypeAlias
from pathlib import Path
from dataclasses import dataclass
import json

ConfigValue: TypeAlias = str | int | bool | list[str]

@dataclass
class AppConfig:
    database_url: str
    debug: bool
    max_connections: int
    allowed_hosts: list[str]

def load_config(path: Path) -> AppConfig:
    data = json.loads(path.read_text())
    return AppConfig(
        database_url=data["database_url"],
        debug=data.get("debug", False),
        max_connections=data.get("max_connections", 10),
        allowed_hosts=data.get("allowed_hosts", []),
    )
```

---

## 8. mypy 설정

### pyproject.toml

```toml
[tool.mypy]
python_version = "3.11"
strict = true
warn_return_any = true
warn_unused_configs = true
disallow_untyped_defs = true
disallow_any_generics = true
no_implicit_optional = true
```

### 점진적 타입 체크 (레거시 코드)

```python
# mypy: strict (파일별 설정)

def legacy_function(x):  # type: ignore[no-untyped-def]
    return x * 2

# 또는 파일 전체 무시
# mypy: ignore-errors
```

---

## 9. 안티패턴

### ❌ Any 남용

```python
from typing import Any

# ❌ 타입 안전성 상실
def process(data: Any) -> Any:
    return data

# ✅ 구체적 타입 명시
def process(data: dict[str, str]) -> list[str]:
    return list(data.values())
```

### ❌ 문자열 타입 힌트

```python
# ❌ Python 3.7+ 불필요
def process(items: "list[str]") -> "dict[str, int]":
    ...

# ✅ 직접 타입 사용
def process(items: list[str]) -> dict[str, int]:
    ...
```

### ❌ assert로 타입 체크

```python
# ❌ 런타임 검증은 타입 힌트가 아님
def process(value: int | str) -> str:
    assert isinstance(value, str)
    return value.upper()

# ✅ TypeGuard 사용
from typing import TypeGuard

def is_str(val: int | str) -> TypeGuard[str]:
    return isinstance(val, str)

def process(value: int | str) -> str:
    if is_str(value):
        return value.upper()
    return str(value)
```

---

## 10. 참고 자료

- [PEP 604](https://peps.python.org/pep-0604/) - Union 타입 (`X | Y`)
- [PEP 544](https://peps.python.org/pep-0544/) - Protocol
- [PEP 647](https://peps.python.org/pep-0647/) - TypeGuard
- [mypy 공식 문서](https://mypy.readthedocs.io/)

---

**마지막 업데이트**: 2026-02-15
