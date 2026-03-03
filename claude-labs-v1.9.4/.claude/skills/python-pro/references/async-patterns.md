# Python Async 패턴 완벽 가이드

> **로드 시점**: async/await, 동시성 구현 시

---

## 1. asyncio 기초

### 기본 async/await

```python
import asyncio

async def fetch_data(url: str) -> str:
    """비동기 데이터 페치 (가상)"""
    await asyncio.sleep(1)  # I/O 시뮬레이션
    return f"Data from {url}"

async def main() -> None:
    result = await fetch_data("https://api.example.com")
    print(result)

# 실행
asyncio.run(main())
```

### 여러 작업 동시 실행 (gather)

```python
import asyncio

async def fetch(id: int) -> str:
    await asyncio.sleep(1)
    return f"Result {id}"

async def main() -> None:
    # 3개 작업을 병렬로 실행 (순차 3초 → 병렬 1초)
    results = await asyncio.gather(
        fetch(1),
        fetch(2),
        fetch(3),
    )
    print(results)  # ['Result 1', 'Result 2', 'Result 3']

asyncio.run(main())
```

### TaskGroup (Python 3.11+)

```python
import asyncio

async def worker(id: int) -> str:
    await asyncio.sleep(1)
    return f"Worker {id} done"

async def main() -> None:
    async with asyncio.TaskGroup() as tg:
        task1 = tg.create_task(worker(1))
        task2 = tg.create_task(worker(2))
        task3 = tg.create_task(worker(3))

    # TaskGroup 종료 시 모든 작업 완료 보장
    print([task1.result(), task2.result(), task3.result()])

asyncio.run(main())
```

---

## 2. 동시성 제어

### Semaphore (최대 동시 실행 제한)

```python
import asyncio

async def limited_fetch(sem: asyncio.Semaphore, id: int) -> str:
    async with sem:  # 세마포어 획득
        print(f"Fetching {id}")
        await asyncio.sleep(1)
        return f"Result {id}"

async def main() -> None:
    sem = asyncio.Semaphore(2)  # 최대 2개 동시 실행

    tasks = [limited_fetch(sem, i) for i in range(5)]
    results = await asyncio.gather(*tasks)
    print(results)

asyncio.run(main())
```

### Lock (상호 배제)

```python
import asyncio

class Counter:
    def __init__(self) -> None:
        self.value = 0
        self.lock = asyncio.Lock()

    async def increment(self) -> None:
        async with self.lock:  # 임계 영역
            current = self.value
            await asyncio.sleep(0.01)  # 경쟁 조건 시뮬레이션
            self.value = current + 1

async def main() -> None:
    counter = Counter()
    await asyncio.gather(*[counter.increment() for _ in range(100)])
    print(counter.value)  # 100 (Lock 없으면 < 100)

asyncio.run(main())
```

### Event (신호 대기)

```python
import asyncio

async def waiter(event: asyncio.Event, id: int) -> None:
    print(f"Worker {id} waiting")
    await event.wait()  # 이벤트 신호 대기
    print(f"Worker {id} started")

async def main() -> None:
    event = asyncio.Event()

    # 3개 워커 시작 (대기 상태)
    workers = [waiter(event, i) for i in range(3)]
    await asyncio.sleep(1)

    # 신호 발생 (모든 워커 실행)
    event.set()
    await asyncio.gather(*workers)

asyncio.run(main())
```

---

## 3. async context manager

### 기본 패턴

```python
import asyncio
from typing import AsyncIterator

class AsyncDatabase:
    async def __aenter__(self) -> "AsyncDatabase":
        print("Connecting to database")
        await asyncio.sleep(0.5)
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:
        print("Closing database")
        await asyncio.sleep(0.5)

    async def query(self, sql: str) -> list[str]:
        await asyncio.sleep(0.1)
        return [f"Result for: {sql}"]

async def main() -> None:
    async with AsyncDatabase() as db:
        results = await db.query("SELECT * FROM users")
        print(results)

asyncio.run(main())
```

### contextlib.asynccontextmanager

```python
import asyncio
from contextlib import asynccontextmanager
from typing import AsyncIterator

@asynccontextmanager
async def async_timer() -> AsyncIterator[None]:
    import time
    start = time.time()
    try:
        yield
    finally:
        elapsed = time.time() - start
        print(f"Elapsed: {elapsed:.2f}s")

async def main() -> None:
    async with async_timer():
        await asyncio.sleep(1)

asyncio.run(main())
```

---

## 4. async generator

### 기본 async generator

```python
import asyncio
from typing import AsyncIterator

async def count_async(n: int) -> AsyncIterator[int]:
    for i in range(n):
        await asyncio.sleep(0.5)
        yield i

async def main() -> None:
    async for num in count_async(5):
        print(num)

asyncio.run(main())
```

### 데이터 스트림 처리

```python
import asyncio
from typing import AsyncIterator

async def fetch_pages(url: str, pages: int) -> AsyncIterator[str]:
    """페이지별 데이터 스트리밍"""
    for page in range(1, pages + 1):
        await asyncio.sleep(0.5)
        yield f"Data from {url}?page={page}"

async def main() -> None:
    async for page_data in fetch_pages("https://api.example.com", 3):
        print(page_data)

asyncio.run(main())
```

---

## 5. async HTTP 클라이언트

### aiohttp

```python
import asyncio
import aiohttp

async def fetch(session: aiohttp.ClientSession, url: str) -> str:
    async with session.get(url) as response:
        return await response.text()

async def main() -> None:
    async with aiohttp.ClientSession() as session:
        tasks = [
            fetch(session, "https://httpbin.org/delay/1"),
            fetch(session, "https://httpbin.org/delay/2"),
        ]
        results = await asyncio.gather(*tasks)
        print(f"Fetched {len(results)} pages")

# asyncio.run(main())  # 실제 실행 시
```

### httpx (aiohttp 대안)

```python
import asyncio
import httpx

async def fetch_all(urls: list[str]) -> list[str]:
    async with httpx.AsyncClient() as client:
        tasks = [client.get(url) for url in urls]
        responses = await asyncio.gather(*tasks)
        return [r.text for r in responses]

async def main() -> None:
    urls = [
        "https://httpbin.org/get",
        "https://httpbin.org/uuid",
    ]
    results = await fetch_all(urls)
    print(f"Fetched {len(results)} pages")

# asyncio.run(main())
```

---

## 6. 에러 처리

### 개별 에러 처리 (gather)

```python
import asyncio

async def may_fail(id: int) -> str:
    await asyncio.sleep(0.5)
    if id == 2:
        raise ValueError(f"Task {id} failed")
    return f"Success {id}"

async def main() -> None:
    # return_exceptions=True: 에러도 결과로 반환
    results = await asyncio.gather(
        may_fail(1),
        may_fail(2),
        may_fail(3),
        return_exceptions=True,
    )

    for i, result in enumerate(results, 1):
        if isinstance(result, Exception):
            print(f"Task {i} failed: {result}")
        else:
            print(f"Task {i}: {result}")

asyncio.run(main())
```

### ExceptionGroup (Python 3.11+)

```python
import asyncio

async def worker(id: int) -> str:
    await asyncio.sleep(0.5)
    if id % 2 == 0:
        raise ValueError(f"Even ID {id} not allowed")
    return f"Result {id}"

async def main() -> None:
    try:
        async with asyncio.TaskGroup() as tg:
            for i in range(1, 5):
                tg.create_task(worker(i))
    except* ValueError as eg:
        print(f"Caught {len(eg.exceptions)} errors:")
        for exc in eg.exceptions:
            print(f"  - {exc}")

asyncio.run(main())
```

### 타임아웃 처리

```python
import asyncio

async def slow_task() -> str:
    await asyncio.sleep(5)
    return "Done"

async def main() -> None:
    try:
        result = await asyncio.wait_for(slow_task(), timeout=2.0)
        print(result)
    except asyncio.TimeoutError:
        print("Task timed out")

asyncio.run(main())
```

---

## 7. 실전 패턴

### Producer-Consumer

```python
import asyncio
from typing import AsyncIterator

async def producer(queue: asyncio.Queue[int], n: int) -> None:
    for i in range(n):
        await asyncio.sleep(0.5)
        await queue.put(i)
        print(f"Produced {i}")
    await queue.put(None)  # 종료 신호

async def consumer(queue: asyncio.Queue[int | None], id: int) -> None:
    while True:
        item = await queue.get()
        if item is None:
            queue.task_done()
            break
        await asyncio.sleep(1)
        print(f"Consumer {id} processed {item}")
        queue.task_done()

async def main() -> None:
    queue: asyncio.Queue[int | None] = asyncio.Queue()

    async with asyncio.TaskGroup() as tg:
        tg.create_task(producer(queue, 5))
        tg.create_task(consumer(queue, 1))
        tg.create_task(consumer(queue, 2))

asyncio.run(main())
```

### Rate Limiter

```python
import asyncio
import time
from collections import deque

class RateLimiter:
    def __init__(self, max_calls: int, period: float) -> None:
        self.max_calls = max_calls
        self.period = period
        self.calls: deque[float] = deque()
        self.lock = asyncio.Lock()

    async def acquire(self) -> None:
        async with self.lock:
            now = time.time()

            # 오래된 호출 제거
            while self.calls and self.calls[0] < now - self.period:
                self.calls.popleft()

            # 제한 초과 시 대기
            if len(self.calls) >= self.max_calls:
                sleep_time = self.period - (now - self.calls[0])
                await asyncio.sleep(sleep_time)
                await self.acquire()  # 재시도
            else:
                self.calls.append(now)

async def api_call(limiter: RateLimiter, id: int) -> str:
    await limiter.acquire()
    print(f"API call {id} at {time.time():.2f}")
    return f"Result {id}"

async def main() -> None:
    limiter = RateLimiter(max_calls=3, period=1.0)  # 초당 3개

    tasks = [api_call(limiter, i) for i in range(10)]
    await asyncio.gather(*tasks)

asyncio.run(main())
```

### Retry with Exponential Backoff

```python
import asyncio
from typing import TypeVar, Callable, Awaitable

T = TypeVar("T")

async def retry_with_backoff(
    func: Callable[[], Awaitable[T]],
    max_retries: int = 3,
    base_delay: float = 1.0,
) -> T:
    for attempt in range(max_retries):
        try:
            return await func()
        except Exception as e:
            if attempt == max_retries - 1:
                raise
            delay = base_delay * (2 ** attempt)
            print(f"Retry {attempt + 1}/{max_retries} after {delay}s: {e}")
            await asyncio.sleep(delay)

    raise RuntimeError("Unreachable")

async def unreliable_task() -> str:
    import random
    if random.random() < 0.7:
        raise ValueError("Transient error")
    return "Success"

async def main() -> None:
    result = await retry_with_backoff(unreliable_task, max_retries=5)
    print(result)

# asyncio.run(main())
```

---

## 8. Task 관리

### Task 생성 및 취소

```python
import asyncio

async def long_task() -> str:
    try:
        await asyncio.sleep(10)
        return "Completed"
    except asyncio.CancelledError:
        print("Task cancelled")
        raise

async def main() -> None:
    task = asyncio.create_task(long_task())

    await asyncio.sleep(1)
    task.cancel()  # 작업 취소

    try:
        await task
    except asyncio.CancelledError:
        print("Main caught cancellation")

asyncio.run(main())
```

### as_completed (완료 순서대로 처리)

```python
import asyncio

async def task(id: int, delay: float) -> str:
    await asyncio.sleep(delay)
    return f"Task {id} (delay {delay}s)"

async def main() -> None:
    tasks = [
        task(1, 2.0),
        task(2, 0.5),
        task(3, 1.0),
    ]

    for coro in asyncio.as_completed(tasks):
        result = await coro
        print(f"Completed: {result}")

asyncio.run(main())
```

---

## 9. Testing async code

### pytest-asyncio

```python
import asyncio
import pytest

async def async_add(a: int, b: int) -> int:
    await asyncio.sleep(0.1)
    return a + b

@pytest.mark.asyncio
async def test_async_add() -> None:
    result = await async_add(2, 3)
    assert result == 5

@pytest.mark.asyncio
async def test_with_timeout() -> None:
    async def slow() -> str:
        await asyncio.sleep(5)
        return "done"

    with pytest.raises(asyncio.TimeoutError):
        await asyncio.wait_for(slow(), timeout=1.0)
```

### Mock async 함수

```python
import asyncio
import pytest
from unittest.mock import AsyncMock

async def fetch_data(url: str) -> str:
    # 실제 HTTP 요청
    ...

@pytest.mark.asyncio
async def test_fetch_data(monkeypatch) -> None:
    mock = AsyncMock(return_value="mocked data")
    monkeypatch.setattr("module.fetch_data", mock)

    result = await mock("https://example.com")
    assert result == "mocked data"
    mock.assert_awaited_once()
```

---

## 10. 안티패턴

### ❌ asyncio.run() 중복 호출

```python
import asyncio

# ❌ 이미 실행 중인 이벤트 루프에서 호출 불가
async def main() -> None:
    asyncio.run(some_task())  # RuntimeError

# ✅ await 사용
async def main() -> None:
    await some_task()
```

### ❌ Blocking I/O in async

```python
import asyncio
import time

# ❌ 동기 sleep은 전체 이벤트 루프 차단
async def bad_task() -> None:
    time.sleep(1)  # 전체 차단!

# ✅ asyncio.sleep 사용
async def good_task() -> None:
    await asyncio.sleep(1)
```

### ❌ await 없이 코루틴 호출

```python
import asyncio

async def task() -> str:
    await asyncio.sleep(1)
    return "done"

# ❌ 코루틴 객체만 생성 (실행 안 됨)
async def main() -> None:
    task()  # 경고: coroutine was never awaited

# ✅ await 사용
async def main() -> None:
    result = await task()
```

---

## 11. 성능 최적화

### uvloop (고성능 이벤트 루프)

```python
import asyncio
import uvloop

async def main() -> None:
    # 고성능 작업
    ...

# uvloop 설치: pip install uvloop
asyncio.set_event_loop_policy(uvloop.EventLoopPolicy())
asyncio.run(main())
```

### Batching (요청 묶기)

```python
import asyncio
from typing import AsyncIterator

async def process_batch(items: list[int]) -> list[str]:
    await asyncio.sleep(0.5)
    return [f"Processed {item}" for item in items]

async def stream_processor(
    items: AsyncIterator[int],
    batch_size: int = 10
) -> AsyncIterator[str]:
    batch: list[int] = []

    async for item in items:
        batch.append(item)
        if len(batch) >= batch_size:
            results = await process_batch(batch)
            for result in results:
                yield result
            batch.clear()

    if batch:
        results = await process_batch(batch)
        for result in results:
            yield result
```

---

## 12. 참고 자료

- [asyncio 공식 문서](https://docs.python.org/3/library/asyncio.html)
- [aiohttp](https://docs.aiohttp.org/)
- [httpx](https://www.python-httpx.org/)
- [uvloop](https://github.com/MagicStack/uvloop)

---

**마지막 업데이트**: 2026-02-15
