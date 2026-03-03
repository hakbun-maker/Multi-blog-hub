# 쿼리 최적화

> **로드 시점**: EXPLAIN 분석, JOIN 최적화, N+1 문제 해결 시

---

## EXPLAIN ANALYZE 읽는 법

### 기본 구조

```sql
EXPLAIN ANALYZE
SELECT * FROM orders WHERE user_id = 123;
```

### PostgreSQL 출력 예시

```
Seq Scan on orders  (cost=0.00..1000.00 rows=50 width=100) (actual time=0.05..15.23 rows=52 loops=1)
  Filter: (user_id = 123)
  Rows Removed by Filter: 9948
Planning Time: 0.123 ms
Execution Time: 15.456 ms
```

### 주요 지표 해석

| 항목 | 의미 | 좋은/나쁜 |
|------|------|----------|
| **Seq Scan** | 전체 테이블 스캔 | ❌ 나쁨 (인덱스 추가 고려) |
| **Index Scan** | 인덱스 스캔 | ✅ 좋음 |
| **Index Only Scan** | 테이블 접근 없이 인덱스만 사용 | ✅ 최고 |
| **Bitmap Heap Scan** | 여러 인덱스 병합 | ⚠️ 보통 (단일 복합 인덱스가 더 나음) |
| **Nested Loop** | 중첩 루프 조인 | ⚠️ 소량 데이터엔 좋음, 대량엔 나쁨 |
| **Hash Join** | 해시 조인 | ✅ 대량 데이터에 좋음 |
| **Merge Join** | 정렬 병합 조인 | ✅ 정렬된 데이터에 좋음 |
| **Rows Removed by Filter** | 필터로 제거된 행 | ❌ 많으면 인덱스 필요 |

### cost vs actual time

```
cost=0.00..1000.00  -- 예상 비용 (플래너 추정)
actual time=0.05..15.23  -- 실제 시간 (ms)
```

- **cost**: 플래너가 추정한 비용 (상대적 수치, 단위 없음)
- **actual time**: 실제 실행 시간 (밀리초)
- **rows**: 예상 행 수 vs 실제 행 수 (괴리 크면 통계 정보 오래됨)

---

## JOIN 최적화

### JOIN 타입 비교

#### 1. Nested Loop Join

**작동 방식**:

```
for each row in table1:
    for each row in table2 where condition:
        return joined row
```

**특징**:
- 소량 데이터(수백-수천 행)에 빠름
- 인덱스가 있으면 효율적
- 대량 데이터(수만-수백만 행)에 느림

**EXPLAIN 예시**:

```sql
EXPLAIN ANALYZE
SELECT * FROM orders o
JOIN users u ON o.user_id = u.id
WHERE u.email = 'john@example.com';
```

```
Nested Loop  (cost=0.57..16.61 rows=1 width=200) (actual time=0.05..0.06 rows=1 loops=1)
  ->  Index Scan using users_email_idx on users u  (cost=0.28..8.30 rows=1 width=100)
        Index Cond: (email = 'john@example.com')
  ->  Index Scan using orders_user_id_idx on orders o  (cost=0.29..8.31 rows=1 width=100)
        Index Cond: (user_id = u.id)
```

**최적화**:
- 양쪽 테이블에 JOIN 칼럼 인덱스 필수
- 작은 테이블을 먼저 (드라이빙 테이블)

---

#### 2. Hash Join

**작동 방식**:

```
1. 작은 테이블로 해시 테이블 생성 (메모리)
2. 큰 테이블을 순회하며 해시 테이블에서 매칭
```

**특징**:
- 대량 데이터(수만-수백만 행)에 빠름
- 메모리 사용량 많음 (work_mem 설정 중요)
- 등호(=) JOIN만 가능

**EXPLAIN 예시**:

```sql
EXPLAIN ANALYZE
SELECT * FROM orders o
JOIN products p ON o.product_id = p.id;
```

```
Hash Join  (cost=250.00..5000.00 rows=10000 width=200) (actual time=5.12..45.67 rows=9856 loops=1)
  Hash Cond: (o.product_id = p.id)
  ->  Seq Scan on orders o  (cost=0.00..3000.00 rows=10000 width=100)
  ->  Hash  (cost=150.00..150.00 rows=5000 width=100) (actual time=4.89..4.89 rows=5000 loops=1)
        Buckets: 8192  Batches: 1  Memory Usage: 250kB
        ->  Seq Scan on products p  (cost=0.00..150.00 rows=5000 width=100)
```

**최적화**:
- work_mem 크기 조정 (Batches: 1이 이상적)
- 작은 테이블이 해시 테이블로 (PostgreSQL이 자동 선택)

---

#### 3. Merge Join

**작동 방식**:

```
1. 양쪽 테이블을 JOIN 칼럼 기준으로 정렬
2. 병합하며 매칭 (two-pointer)
```

**특징**:
- 양쪽이 이미 정렬되어 있으면 매우 빠름
- 정렬 비용 없으면 Hash Join보다 효율적
- 등호(=) JOIN만 가능

**EXPLAIN 예시**:

```sql
EXPLAIN ANALYZE
SELECT * FROM orders o
JOIN users u ON o.user_id = u.id
ORDER BY o.user_id;
```

```
Merge Join  (cost=500.00..2000.00 rows=10000 width=200) (actual time=10.23..50.45 rows=10000 loops=1)
  Merge Cond: (o.user_id = u.id)
  ->  Index Scan using orders_user_id_idx on orders o  (cost=0.29..1000.00 rows=10000 width=100)
  ->  Index Scan using users_pkey on users u  (cost=0.28..800.00 rows=5000 width=100)
```

**최적화**:
- JOIN 칼럼에 인덱스 생성 (정렬 비용 제거)
- ORDER BY와 JOIN 칼럼이 같으면 유리

---

### JOIN 최적화 전략

#### 전략 1: JOIN 순서 조정

```sql
-- 나쁜 예: 큰 테이블 먼저
SELECT * FROM orders o
JOIN users u ON o.user_id = u.id
WHERE u.status = 'active';  -- users 90% 필터링

-- 좋은 예: 필터링된 작은 테이블 먼저
SELECT * FROM users u
JOIN orders o ON u.id = o.user_id
WHERE u.status = 'active';  -- users 10%만 남음
```

PostgreSQL은 자동으로 최적 순서 선택하지만, 복잡한 쿼리에선 힌트 필요.

#### 전략 2: JOIN 조건에 인덱스

```sql
-- 인덱스 추가
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_users_id ON users(id);  -- PRIMARY KEY면 자동 생성됨

-- EXPLAIN에서 Index Scan 확인
EXPLAIN ANALYZE SELECT * FROM orders o JOIN users u ON o.user_id = u.id;
```

#### 전략 3: 불필요한 JOIN 제거

```sql
-- 나쁜 예: 사용 안 하는 테이블 JOIN
SELECT o.* FROM orders o
JOIN users u ON o.user_id = u.id
WHERE o.status = 'pending';  -- users 테이블 칼럼 안 씀

-- 좋은 예: JOIN 제거
SELECT * FROM orders WHERE status = 'pending';
```

---

## 서브쿼리 vs JOIN vs CTE 성능 비교

### 시나리오: 활성 사용자의 주문 조회

#### 방법 1: 서브쿼리 (Subquery)

```sql
SELECT * FROM orders
WHERE user_id IN (SELECT id FROM users WHERE status = 'active');
```

**장점**:
- 읽기 쉬움
- PostgreSQL이 자동으로 JOIN으로 최적화

**단점**:
- MySQL에선 비효율적 (서브쿼리 결과를 임시 테이블로 저장)

**EXPLAIN**:

```
Hash Join  (cost=250.00..5000.00 rows=1000 width=100)
  Hash Cond: (orders.user_id = users.id)
  ->  Seq Scan on orders  (cost=0.00..3000.00 rows=10000 width=100)
  ->  Hash  (cost=150.00..150.00 rows=500 width=4)
        ->  Seq Scan on users  (cost=0.00..150.00 rows=500 width=4)
              Filter: (status = 'active')
```

---

#### 방법 2: JOIN

```sql
SELECT o.* FROM orders o
JOIN users u ON o.user_id = u.id
WHERE u.status = 'active';
```

**장점**:
- 가장 빠름 (인덱스 활용)
- 플래너가 최적화하기 쉬움

**단점**:
- 복잡한 쿼리에선 가독성 저하

---

#### 방법 3: CTE (Common Table Expression)

```sql
WITH active_users AS (
  SELECT id FROM users WHERE status = 'active'
)
SELECT o.* FROM orders o
JOIN active_users au ON o.user_id = au.id;
```

**장점**:
- 가독성 좋음 (복잡한 쿼리 분리)
- PostgreSQL 12+: 자동 인라인 최적화

**단점**:
- PostgreSQL 11 이하: CTE가 최적화 장벽 (항상 임시 테이블)
- `MATERIALIZED` / `NOT MATERIALIZED` 키워드로 제어 가능

**PostgreSQL 12+ EXPLAIN**:

```
Hash Join  (cost=250.00..5000.00 rows=1000 width=100)
  -- JOIN과 동일한 실행 계획 (인라인됨)
```

---

### 성능 비교 요약

| 방법 | PostgreSQL | MySQL | 가독성 |
|------|-----------|-------|--------|
| 서브쿼리 (IN) | ✅ 빠름 (자동 최적화) | ❌ 느림 (임시 테이블) | 보통 |
| JOIN | ✅ 빠름 | ✅ 빠름 | 보통 |
| CTE | ✅ 빠름 (12+) | ⚠️ 보통 | ✅ 좋음 |

**권장**:
- 단순 쿼리: JOIN
- 복잡한 쿼리: CTE (가독성 우선)
- MySQL: 서브쿼리 피하기 (JOIN으로 변환)

---

## Window Function 활용

### 개념

그룹별 집계를 하면서도 개별 행을 유지하는 함수.

### 예시 1: 사용자별 최근 주문 3개

```sql
-- Window Function (효율적)
SELECT * FROM (
  SELECT *,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) AS rn
  FROM orders
) sub
WHERE rn <= 3;
```

**EXPLAIN**:

```
Subquery Scan on sub  (cost=5000.00..6000.00 rows=3333 width=108)
  Filter: (sub.rn <= 3)
  ->  WindowAgg  (cost=5000.00..5500.00 rows=10000 width=108)
        ->  Sort  (cost=5000.00..5250.00 rows=10000 width=100)
              Sort Key: orders.user_id, orders.created_at DESC
              ->  Seq Scan on orders  (cost=0.00..3000.00 rows=10000 width=100)
```

---

### 예시 2: 누적 합계

```sql
-- Window Function
SELECT
  user_id,
  created_at,
  amount,
  SUM(amount) OVER (PARTITION BY user_id ORDER BY created_at) AS cumulative_total
FROM orders;
```

**일반 쿼리로 하면**:

```sql
-- 비효율적 (각 행마다 서브쿼리 실행)
SELECT
  o1.user_id,
  o1.created_at,
  o1.amount,
  (SELECT SUM(o2.amount)
   FROM orders o2
   WHERE o2.user_id = o1.user_id
     AND o2.created_at <= o1.created_at) AS cumulative_total
FROM orders o1;
```

**성능 차이**: Window Function이 10-100배 빠름.

---

### 주요 Window Function

| 함수 | 용도 | 예시 |
|------|------|------|
| ROW_NUMBER() | 행 번호 | 순위, 페이지네이션 |
| RANK() | 순위 (동점 허용) | 리더보드 |
| DENSE_RANK() | 순위 (연속) | 순위표 |
| LAG() / LEAD() | 이전/다음 행 | 변화량 계산 |
| SUM() / AVG() | 누적 합계/평균 | 이동 평균 |
| FIRST_VALUE() / LAST_VALUE() | 첫/마지막 값 | 그룹 대표값 |

---

## 파티셔닝 (Partitioning)

### 개념

큰 테이블을 작은 물리적 조각으로 분할 (논리적으론 하나의 테이블).

### 파티셔닝 타입

#### 1. Range Partitioning (범위)

```sql
-- PostgreSQL
CREATE TABLE events (
  id BIGSERIAL,
  user_id INT,
  created_at TIMESTAMP,
  data JSONB
) PARTITION BY RANGE (created_at);

-- 월별 파티션 생성
CREATE TABLE events_2024_01 PARTITION OF events
  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE events_2024_02 PARTITION OF events
  FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
```

**사용 사례**:
- 시계열 데이터 (로그, 이벤트)
- 오래된 파티션 삭제로 빠른 데이터 정리

---

#### 2. List Partitioning (리스트)

```sql
-- PostgreSQL
CREATE TABLE orders (
  id BIGSERIAL,
  region VARCHAR(10),
  data JSONB
) PARTITION BY LIST (region);

-- 지역별 파티션
CREATE TABLE orders_us PARTITION OF orders
  FOR VALUES IN ('US', 'CA', 'MX');

CREATE TABLE orders_eu PARTITION OF orders
  FOR VALUES IN ('UK', 'FR', 'DE');
```

**사용 사례**:
- 지역별, 카테고리별 데이터 분리

---

#### 3. Hash Partitioning (해시)

```sql
-- PostgreSQL
CREATE TABLE users (
  id BIGSERIAL,
  email VARCHAR(255),
  data JSONB
) PARTITION BY HASH (id);

-- 4개 파티션 (균등 분배)
CREATE TABLE users_0 PARTITION OF users
  FOR VALUES WITH (MODULUS 4, REMAINDER 0);

CREATE TABLE users_1 PARTITION OF users
  FOR VALUES WITH (MODULUS 4, REMAINDER 1);

-- ... users_2, users_3
```

**사용 사례**:
- 균등 분산 (부하 분산)
- 특정 파티션 조회 불가 (전체 스캔)

---

### 파티셔닝 효과

| 항목 | Before | After | 효과 |
|------|--------|-------|------|
| 쿼리 성능 | 1억 행 스캔 | 천만 행 스캔 (1개 파티션) | 10배 빠름 |
| 인덱스 크기 | 10GB | 1GB (파티션당) | 메모리 효율 |
| 데이터 삭제 | DELETE (느림) | DROP TABLE (빠름) | 100배 빠름 |

**주의사항**:
- 파티션 키 칼럼이 WHERE 조건에 없으면 모든 파티션 스캔 (느림)
- 파티션 수 너무 많으면 플래너 오버헤드 (권장: 100개 이하)

---

## N+1 문제 해결

### 문제 상황

```python
# ORM 코드 (Django, SQLAlchemy 등)
users = User.objects.all()  # 1 query
for user in users:
    print(user.orders.count())  # N queries (사용자 수만큼)

# 총 N+1 쿼리 (N=100이면 101개 쿼리)
```

### 해결 방법 1: JOIN (Eager Loading)

```python
# Django
users = User.objects.prefetch_related('orders')  # 2 queries
for user in users:
    print(user.orders.count())  # 메모리에서 계산 (쿼리 없음)

# SQL
SELECT * FROM users;
SELECT * FROM orders WHERE user_id IN (1, 2, 3, ...);
```

---

### 해결 방법 2: Aggregation

```python
# Django
users = User.objects.annotate(order_count=Count('orders'))  # 1 query
for user in users:
    print(user.order_count)  # 메모리에서 읽기

# SQL
SELECT users.*, COUNT(orders.id) AS order_count
FROM users
LEFT JOIN orders ON users.id = orders.user_id
GROUP BY users.id;
```

---

### 해결 방법 3: DataLoader (GraphQL)

```javascript
// GraphQL DataLoader (Node.js)
const orderLoader = new DataLoader(async (userIds) => {
  const orders = await db.query('SELECT * FROM orders WHERE user_id IN (?)', [userIds]);
  return userIds.map(id => orders.filter(o => o.user_id === id));
});

// 여러 요청을 배치로 묶음
const orders1 = await orderLoader.load(1);  // 즉시 실행 안 함
const orders2 = await orderLoader.load(2);  // 배치에 추가
// 한 번에 실행: SELECT * FROM orders WHERE user_id IN (1, 2)
```

---

### 성능 비교

| 방법 | 쿼리 수 | 응답 시간 (100명) |
|------|---------|------------------|
| N+1 | 101 | 5000ms |
| JOIN | 2 | 50ms |
| Aggregation | 1 | 30ms |

**핵심**: ORM이 자동으로 lazy loading 하므로, 명시적으로 eager loading 필요.

---

## 안티패턴

### ❌ 1. SELECT *

```sql
-- 나쁜 예
SELECT * FROM orders WHERE user_id = 123;

-- 좋은 예: 필요한 칼럼만
SELECT id, user_id, total, created_at FROM orders WHERE user_id = 123;

-- 이유: 네트워크 대역폭 낭비, 인덱스 온리 스캔 불가
```

---

### ❌ 2. OFFSET 페이지네이션

```sql
-- 나쁜 예: 10000번째 페이지
SELECT * FROM posts ORDER BY created_at DESC LIMIT 10 OFFSET 100000;
-- 앞의 100000행을 전부 스캔 후 버림 (느림)

-- 좋은 예: Keyset Pagination
SELECT * FROM posts WHERE created_at < '2024-01-15 12:00:00' ORDER BY created_at DESC LIMIT 10;
-- 인덱스 시크로 바로 이동 (빠름)
```

---

### ❌ 3. OR 조건 남발

```sql
-- 나쁜 예
SELECT * FROM users WHERE status = 'active' OR status = 'pending';
-- 인덱스 2번 스캔 (비효율)

-- 좋은 예: IN
SELECT * FROM users WHERE status IN ('active', 'pending');
-- 인덱스 1번 스캔 (효율)
```

---

## 요약

### EXPLAIN 체크리스트

```
□ Seq Scan → Index Scan으로 변경됐는가?
□ Rows Removed by Filter가 적은가? (인덱스 필요)
□ actual time vs cost 괴리가 큰가? (통계 정보 오래됨 → ANALYZE)
□ Nested Loop vs Hash Join이 데이터 크기에 적합한가?
□ Index Only Scan이 가능한가? (커버링 인덱스)
```

### 최적화 우선순위

1. **인덱스 추가**: 가장 빠른 효과
2. **쿼리 재작성**: JOIN 순서, 서브쿼리 → CTE
3. **파티셔닝**: 데이터 크기 감소
4. **하드웨어**: 마지막 수단 (메모리, SSD)

**핵심**: 추측하지 말고 EXPLAIN ANALYZE로 검증!
