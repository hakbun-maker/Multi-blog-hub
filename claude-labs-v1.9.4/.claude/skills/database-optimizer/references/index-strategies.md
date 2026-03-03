# 인덱스 전략

> **로드 시점**: 인덱스 설계, 복합 인덱스, 커버링 인덱스 요청 시

---

## 개념

인덱스는 데이터베이스에서 데이터를 빠르게 찾기 위한 자료구조입니다. 책의 색인(index)처럼 전체를 뒤지지 않고 특정 위치로 바로 이동할 수 있게 해줍니다.

### 인덱스의 트레이드오프

| 장점 | 단점 |
|------|------|
| SELECT 성능 향상 (Seq Scan → Index Scan) | INSERT/UPDATE/DELETE 성능 저하 (인덱스 갱신 비용) |
| ORDER BY, GROUP BY 최적화 | 디스크 공간 사용 증가 |
| JOIN 성능 개선 | 인덱스 bloat 관리 필요 |

---

## 인덱스 종류 (PostgreSQL)

### 1. B-Tree 인덱스 (기본)

**특징**:
- 가장 범용적인 인덱스 타입
- 등호(=), 범위(<, >, BETWEEN), ORDER BY 모두 지원
- 균형 트리 구조로 검색 시간 O(log N)

**사용 사례**:

```sql
-- 기본 B-Tree 인덱스
CREATE INDEX idx_users_email ON users(email);

-- 복합 인덱스 (칼럼 순서 중요!)
CREATE INDEX idx_orders_user_created ON orders(user_id, created_at);

-- WHERE user_id = 123 AND created_at > '2024-01-01' 쿼리 최적화
```

**PostgreSQL 자동 생성**:
- PRIMARY KEY → B-Tree 인덱스 자동 생성
- UNIQUE 제약 → B-Tree 인덱스 자동 생성

---

### 2. Hash 인덱스

**특징**:
- 등호(=) 검색만 지원 (범위 검색 불가)
- B-Tree보다 약간 빠름 (실무에서 거의 안 씀)
- PostgreSQL 10+ WAL 지원 (복제 가능)

**사용 사례**:

```sql
-- Hash 인덱스 (등호 검색 전용)
CREATE INDEX idx_users_username_hash ON users USING HASH (username);

-- 적합한 쿼리
SELECT * FROM users WHERE username = 'john_doe';

-- 부적합한 쿼리 (인덱스 사용 안 됨)
SELECT * FROM users WHERE username LIKE 'john%';
```

**권장**:
- 대부분의 경우 B-Tree 사용 (범위 검색도 지원)
- Hash는 매우 큰 테이블에서 등호 검색만 필요할 때 고려

---

### 3. GIN (Generalized Inverted Index)

**특징**:
- 배열, JSONB, 전문 검색(Full-Text Search)에 최적화
- 복합 값(array, json) 내부 요소 검색 가능
- 쓰기 속도 느림 (여러 키 업데이트 필요)

**사용 사례**:

```sql
-- JSONB 인덱스
CREATE INDEX idx_products_metadata ON products USING GIN (metadata);

-- 배열 인덱스
CREATE INDEX idx_posts_tags ON posts USING GIN (tags);

-- 전문 검색 인덱스
CREATE INDEX idx_articles_content ON articles USING GIN (to_tsvector('english', content));

-- 쿼리 예시
SELECT * FROM products WHERE metadata @> '{"color": "red"}';
SELECT * FROM posts WHERE tags @> ARRAY['postgresql', 'performance'];
SELECT * FROM articles WHERE to_tsvector('english', content) @@ to_tsquery('optimization');
```

---

### 4. GiST (Generalized Search Tree)

**특징**:
- 지리 정보(PostGIS), 범위(Range), 전문 검색 지원
- 손실 압축(lossy) 가능 (정확도 vs 성능 트레이드오프)
- GIN보다 쓰기 빠름, 읽기 느림

**사용 사례**:

```sql
-- 지리 정보 인덱스 (PostGIS)
CREATE INDEX idx_locations_geom ON locations USING GIST (geom);

-- 범위 타입 인덱스
CREATE INDEX idx_reservations_period ON reservations USING GIST (period);

-- 쿼리 예시
SELECT * FROM locations WHERE ST_DWithin(geom, ST_MakePoint(127.0, 37.5), 1000);
SELECT * FROM reservations WHERE period @> '2024-01-15'::date;
```

---

### 5. BRIN (Block Range Index)

**특징**:
- 매우 큰 테이블(수억 행)에서 시간순 데이터에 최적화
- 인덱스 크기 극소 (B-Tree의 1/100)
- 데이터가 물리적으로 정렬되어 있어야 효과적

**사용 사례**:

```sql
-- 시계열 데이터 (로그, 이벤트)
CREATE INDEX idx_events_created_brin ON events USING BRIN (created_at);

-- 적합: 시간순 INSERT (append-only)
-- 부적합: 무작위 INSERT, UPDATE 빈번

-- 쿼리 예시
SELECT * FROM events WHERE created_at > NOW() - INTERVAL '7 days';
```

---

## 복합 인덱스 설계

### 칼럼 순서 원칙

**규칙 1: 선택도(Selectivity) 높은 칼럼을 먼저**

```sql
-- 나쁜 예: status (3가지 값) → user_id (수백만 값)
CREATE INDEX idx_bad ON orders(status, user_id);

-- 좋은 예: user_id (수백만 값) → status (3가지 값)
CREATE INDEX idx_good ON orders(user_id, status);

-- 이유: user_id로 먼저 필터링하면 검색 범위가 크게 줄어듦
```

**규칙 2: WHERE 조건 칼럼을 먼저, ORDER BY 칼럼을 나중에**

```sql
-- 쿼리
SELECT * FROM posts WHERE user_id = 123 ORDER BY created_at DESC LIMIT 10;

-- 최적 인덱스
CREATE INDEX idx_posts_user_created ON posts(user_id, created_at);

-- user_id로 필터링 → created_at으로 정렬 (인덱스 순서대로 읽기만 하면 됨)
```

**규칙 3: 등호(=) 조건을 먼저, 범위(>, <) 조건을 나중에**

```sql
-- 쿼리
SELECT * FROM orders WHERE user_id = 123 AND created_at > '2024-01-01';

-- 최적 인덱스
CREATE INDEX idx_orders_user_created ON orders(user_id, created_at);

-- user_id = 123으로 정확히 찾고 → created_at 범위 스캔
```

---

### 복합 인덱스 활용 범위

```sql
-- 인덱스: (a, b, c)
CREATE INDEX idx_abc ON table(a, b, c);

-- ✅ 사용됨
WHERE a = 1
WHERE a = 1 AND b = 2
WHERE a = 1 AND b = 2 AND c = 3
WHERE a = 1 AND c = 3  -- PostgreSQL만 (Index Skip Scan)

-- ❌ 사용 안 됨
WHERE b = 2
WHERE c = 3
WHERE b = 2 AND c = 3
```

**MySQL 주의**: 선두 칼럼이 없으면 인덱스 사용 불가 (Index Skip Scan 미지원)

---

## 커버링 인덱스 (Index-Only Scan)

### 개념

테이블에 접근하지 않고 인덱스만으로 쿼리를 완료하는 기법.

```sql
-- 쿼리
SELECT user_id, status FROM orders WHERE user_id = 123;

-- 일반 인덱스 (테이블 접근 필요)
CREATE INDEX idx_orders_user ON orders(user_id);
-- Index Scan on idx_orders_user → Heap Fetch (테이블 읽기)

-- 커버링 인덱스 (테이블 접근 불필요)
CREATE INDEX idx_orders_user_status ON orders(user_id, status);
-- Index-Only Scan on idx_orders_user_status (테이블 안 읽음!)
```

### EXPLAIN 차이

```sql
-- 일반 인덱스
EXPLAIN SELECT user_id, status FROM orders WHERE user_id = 123;
/*
Index Scan using idx_orders_user on orders
  Index Cond: (user_id = 123)
  Heap Fetches: 50  -- 테이블 읽음
*/

-- 커버링 인덱스
EXPLAIN SELECT user_id, status FROM orders WHERE user_id = 123;
/*
Index Only Scan using idx_orders_user_status on orders
  Index Cond: (user_id = 123)
  Heap Fetches: 0  -- 테이블 안 읽음!
*/
```

### 주의사항

- PostgreSQL: VACUUM이 실행되어야 Visibility Map 활용 가능
- 인덱스가 너무 커지면 오히려 성능 저하 (디스크 I/O 증가)
- SELECT * 같은 쿼리는 커버링 불가 (모든 칼럼 필요)

---

## Partial 인덱스 (PostgreSQL 전용)

### 개념

특정 조건을 만족하는 행만 인덱스에 포함 (인덱스 크기 절감, 성능 향상).

```sql
-- 예시: active 사용자만 자주 조회
CREATE INDEX idx_users_active_email ON users(email) WHERE status = 'active';

-- 쿼리 (인덱스 사용됨)
SELECT * FROM users WHERE email = 'john@example.com' AND status = 'active';

-- 쿼리 (인덱스 사용 안 됨)
SELECT * FROM users WHERE email = 'john@example.com';  -- status 조건 없음
```

### 사용 사례

```sql
-- 1. 미완료 주문만 인덱싱
CREATE INDEX idx_orders_pending ON orders(user_id, created_at) WHERE status = 'pending';

-- 2. NULL이 아닌 값만 인덱싱
CREATE INDEX idx_users_phone ON users(phone) WHERE phone IS NOT NULL;

-- 3. 최근 데이터만 인덱싱
CREATE INDEX idx_events_recent ON events(user_id) WHERE created_at > NOW() - INTERVAL '30 days';
```

### 효과

- 인덱스 크기 50-90% 절감 가능
- 쓰기 성능 향상 (조건 불만족 시 인덱스 갱신 안 함)
- 읽기 성능 향상 (인덱스가 작아서 메모리 캐싱 유리)

---

## 인덱스 유지보수

### REINDEX (PostgreSQL)

```sql
-- 인덱스 재구성 (bloat 제거)
REINDEX INDEX idx_users_email;
REINDEX TABLE users;  -- 테이블의 모든 인덱스

-- 동시성: REINDEX는 테이블 잠금 (주의!)
-- 대안: REINDEX CONCURRENTLY (PostgreSQL 12+)
REINDEX INDEX CONCURRENTLY idx_users_email;
```

### VACUUM (PostgreSQL)

```sql
-- 죽은 튜플 정리 (Visibility Map 업데이트)
VACUUM users;
VACUUM ANALYZE users;  -- 통계 정보도 갱신

-- 자동 VACUUM 설정 (postgresql.conf)
autovacuum = on
autovacuum_max_workers = 3
```

### OPTIMIZE TABLE (MySQL)

```sql
-- 테이블 및 인덱스 최적화
OPTIMIZE TABLE users;

-- 주의: InnoDB는 테이블 재구성 (시간 오래 걸림)
-- 대안: pt-online-schema-change (Percona Toolkit)
```

---

## 인덱스 모니터링

### PostgreSQL

```sql
-- 인덱스 사용 통계
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan AS index_scans,
  idx_tup_read AS tuples_read,
  idx_tup_fetch AS tuples_fetched
FROM pg_stat_user_indexes
ORDER BY idx_scan;

-- 사용 안 되는 인덱스 찾기
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexrelname NOT LIKE '%_pkey';

-- 인덱스 bloat 확인
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) AS size,
  ROUND(100 * pg_relation_size(indexrelid) / pg_relation_size(tablename::regclass)) AS index_ratio
FROM pg_stat_user_indexes
ORDER BY pg_relation_size(indexrelid) DESC;
```

### MySQL

```sql
-- 인덱스 통계
SHOW INDEX FROM users;

-- 사용 안 되는 인덱스 (performance_schema)
SELECT
  object_schema,
  object_name,
  index_name,
  COUNT_STAR AS total_accesses
FROM performance_schema.table_io_waits_summary_by_index_usage
WHERE index_name IS NOT NULL
  AND index_name != 'PRIMARY'
  AND COUNT_STAR = 0
ORDER BY object_schema, object_name;
```

---

## 안티패턴

### ❌ 1. 모든 칼럼에 인덱스

```sql
-- 나쁜 예
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_name ON users(name);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_created ON users(created_at);
-- INSERT 성능 저하, 디스크 낭비

-- 좋은 예: 실제 쿼리 패턴 분석 후 필요한 것만
CREATE INDEX idx_users_email ON users(email);  -- 로그인 검색
CREATE INDEX idx_users_created ON users(created_at);  -- 최근 가입자 조회
```

### ❌ 2. 복합 인덱스 칼럼 순서 무시

```sql
-- 나쁜 예
CREATE INDEX idx_orders_created_user ON orders(created_at, user_id);

-- 쿼리: WHERE user_id = 123 AND created_at > '2024-01-01'
-- 인덱스 사용 안 됨! (created_at이 선두 칼럼인데 범위 조건)

-- 좋은 예
CREATE INDEX idx_orders_user_created ON orders(user_id, created_at);
```

### ❌ 3. 함수 인덱스 없이 함수 사용

```sql
-- 나쁜 예
SELECT * FROM users WHERE LOWER(email) = 'john@example.com';
-- 인덱스: CREATE INDEX idx_users_email ON users(email);
-- Seq Scan 발생 (LOWER 함수로 인해 인덱스 사용 안 됨)

-- 좋은 예 1: 함수 인덱스
CREATE INDEX idx_users_email_lower ON users(LOWER(email));
SELECT * FROM users WHERE LOWER(email) = 'john@example.com';

-- 좋은 예 2: CITEXT 타입 (PostgreSQL)
ALTER TABLE users ALTER COLUMN email TYPE CITEXT;
SELECT * FROM users WHERE email = 'john@example.com';  -- 대소문자 구분 안 함
```

### ❌ 4. 저선택도 칼럼 단독 인덱스

```sql
-- 나쁜 예: status (3가지 값: pending, completed, canceled)
CREATE INDEX idx_orders_status ON orders(status);
-- 인덱스 스캔보다 Seq Scan이 빠를 수 있음

-- 좋은 예 1: 고선택도 칼럼과 복합 인덱스
CREATE INDEX idx_orders_user_status ON orders(user_id, status);

-- 좋은 예 2: Partial 인덱스
CREATE INDEX idx_orders_pending ON orders(user_id) WHERE status = 'pending';
```

---

## 요약

| 인덱스 타입 | 사용 사례 | 주의사항 |
|------------|----------|----------|
| B-Tree | 범용 (등호, 범위, 정렬) | 가장 많이 사용 |
| Hash | 등호 검색만 | 실무에서 거의 안 씀 |
| GIN | JSONB, 배열, 전문 검색 | 쓰기 느림 |
| GiST | 지리 정보, 범위 | GIN보다 읽기 느림, 쓰기 빠름 |
| BRIN | 시계열 대용량 | 물리적 정렬 필요 |
| Partial | 특정 조건만 인덱싱 | WHERE 조건 일치 시만 사용 |
| Covering | SELECT 칼럼 모두 포함 | 인덱스 크기 증가 주의 |

**핵심 원칙**:
1. 쿼리 패턴 분석 후 인덱스 설계 (추측 금지)
2. 복합 인덱스 칼럼 순서: 선택도 높음 → 낮음, 등호 → 범위
3. 쓰기 성능 트레이드오프 고려 (인덱스는 공짜가 아님)
4. EXPLAIN ANALYZE로 검증 (Index Scan, Index-Only Scan 확인)
5. 주기적 유지보수 (REINDEX, VACUUM, 사용 안 되는 인덱스 제거)
