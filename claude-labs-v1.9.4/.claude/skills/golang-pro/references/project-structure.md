# Go 프로젝트 구조 및 설계 패턴

> **로드 시점**: 새 프로젝트 생성 또는 리팩토링 시

---

## 표준 프로젝트 레이아웃

### Standard Go Project Layout

```
myproject/
├── cmd/                    # 애플리케이션 진입점
│   ├── server/
│   │   └── main.go        # 서버 시작
│   └── cli/
│       └── main.go        # CLI 도구
├── internal/              # 외부에 노출되지 않는 패키지
│   ├── domain/            # 도메인 로직 (비즈니스 규칙)
│   │   ├── user.go
│   │   └── user_test.go
│   ├── infra/             # 인프라 계층 (DB, API 클라이언트)
│   │   ├── postgres/
│   │   │   └── user_repo.go
│   │   └── redis/
│   │       └── cache.go
│   └── handler/           # HTTP 핸들러
│       └── user_handler.go
├── pkg/                   # 외부에서 임포트 가능한 라이브러리
│   └── utils/
│       └── validator.go
├── api/                   # API 정의 (OpenAPI, Protobuf)
│   └── openapi.yaml
├── scripts/               # 빌드/배포 스크립트
│   └── migrate.sh
├── migrations/            # 데이터베이스 마이그레이션
│   ├── 001_create_users.up.sql
│   └── 001_create_users.down.sql
├── go.mod
├── go.sum
└── README.md
```

### 디렉토리 설명

| 디렉토리 | 목적 | 가시성 |
|---------|------|--------|
| `cmd/` | 애플리케이션 진입점 (main.go) | 공개 |
| `internal/` | 프로젝트 전용 코드 (외부 임포트 불가) | 비공개 |
| `pkg/` | 외부에서 재사용 가능한 라이브러리 | 공개 |
| `api/` | API 스펙 (OpenAPI, Protobuf 등) | 공개 |
| `scripts/` | 빌드/배포 스크립트 | - |
| `migrations/` | DB 마이그레이션 파일 | - |

---

## 인터페이스 설계

### Accept Interfaces, Return Structs

```go
❌ 잘못된 방법 (인터페이스 반환)
func NewUserService() UserService {
    return &userService{}
}

type UserService interface {
    GetUser(id int) (*User, error)
}

✅ 올바른 방법 (구조체 반환, 인터페이스 수용)
func NewUserService(repo UserRepository) *UserService {
    return &UserService{repo: repo}
}

type UserService struct {
    repo UserRepository // 인터페이스 수용
}

type UserRepository interface {
    FindByID(id int) (*User, error)
}
```

### 왜 이 원칙을 따라야 하는가?

```go
// 호출자가 필요한 메서드만 정의
type UserGetter interface {
    GetUser(id int) (*User, error)
}

func DisplayUser(service UserGetter) {
    user, _ := service.GetUser(1)
    fmt.Println(user)
}

// UserService가 더 많은 메서드를 제공하더라도
// DisplayUser는 GetUser만 요구함 (의존성 최소화)
```

---

## 의존성 주입 패턴

### Constructor Injection (권장)

```go
type UserService struct {
    repo  UserRepository
    cache CacheService
    log   Logger
}

func NewUserService(repo UserRepository, cache CacheService, log Logger) *UserService {
    return &UserService{
        repo:  repo,
        cache: cache,
        log:   log,
    }
}

// 사용
func main() {
    repo := postgres.NewUserRepo(db)
    cache := redis.NewCache(redisClient)
    log := slog.New(slog.NewJSONHandler(os.Stdout, nil))

    service := NewUserService(repo, cache, log)
}
```

### Functional Options 패턴

```go
type Server struct {
    addr    string
    timeout time.Duration
    logger  Logger
}

type Option func(*Server)

func WithAddr(addr string) Option {
    return func(s *Server) {
        s.addr = addr
    }
}

func WithTimeout(timeout time.Duration) Option {
    return func(s *Server) {
        s.timeout = timeout
    }
}

func NewServer(opts ...Option) *Server {
    s := &Server{
        addr:    ":8080",           // 기본값
        timeout: 30 * time.Second,  // 기본값
        logger:  slog.Default(),    // 기본값
    }

    for _, opt := range opts {
        opt(s)
    }

    return s
}

// 사용
server := NewServer(
    WithAddr(":9000"),
    WithTimeout(60 * time.Second),
)
```

---

## 에러 처리

### errors.Is / errors.As

```go
import "errors"

var (
    ErrNotFound     = errors.New("not found")
    ErrUnauthorized = errors.New("unauthorized")
)

func GetUser(id int) (*User, error) {
    user, err := db.FindByID(id)
    if err != nil {
        return nil, fmt.Errorf("get user %d: %w", id, err)
    }
    return user, nil
}

// 에러 확인
user, err := GetUser(123)
if errors.Is(err, ErrNotFound) {
    // NotFound 처리
}
```

### Custom Error Types

```go
type ValidationError struct {
    Field   string
    Message string
}

func (e *ValidationError) Error() string {
    return fmt.Sprintf("%s: %s", e.Field, e.Message)
}

// 사용
func ValidateUser(user *User) error {
    if user.Email == "" {
        return &ValidationError{
            Field:   "email",
            Message: "email is required",
        }
    }
    return nil
}

// 에러 타입 확인
err := ValidateUser(user)
var validErr *ValidationError
if errors.As(err, &validErr) {
    fmt.Printf("Validation failed on field: %s\n", validErr.Field)
}
```

### Error Wrapping

```go
func ProcessOrder(orderID int) error {
    order, err := getOrder(orderID)
    if err != nil {
        return fmt.Errorf("process order: %w", err) // %w로 래핑
    }

    if err := validateOrder(order); err != nil {
        return fmt.Errorf("validate order %d: %w", orderID, err)
    }

    return nil
}

// 에러 체인 확인
err := ProcessOrder(123)
if errors.Is(err, ErrNotFound) {
    // 깊은 곳에 ErrNotFound가 있어도 감지 가능
}
```

---

## 테스트 패턴

### Table-Driven Tests

```go
func TestAdd(t *testing.T) {
    tests := []struct {
        name     string
        a, b     int
        expected int
    }{
        {"positive", 1, 2, 3},
        {"negative", -1, -2, -3},
        {"zero", 0, 0, 0},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            result := Add(tt.a, tt.b)
            if result != tt.expected {
                t.Errorf("Add(%d, %d) = %d; want %d", tt.a, tt.b, result, tt.expected)
            }
        })
    }
}
```

### Mock with Interface

```go
type UserRepository interface {
    FindByID(id int) (*User, error)
}

type MockUserRepo struct {
    FindByIDFunc func(id int) (*User, error)
}

func (m *MockUserRepo) FindByID(id int) (*User, error) {
    return m.FindByIDFunc(id)
}

// 테스트
func TestUserService_GetUser(t *testing.T) {
    mockRepo := &MockUserRepo{
        FindByIDFunc: func(id int) (*User, error) {
            return &User{ID: id, Name: "Alice"}, nil
        },
    }

    service := NewUserService(mockRepo)
    user, err := service.GetUser(1)

    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
    if user.Name != "Alice" {
        t.Errorf("got %s, want Alice", user.Name)
    }
}
```

### testify 활용

```go
import (
    "testing"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
)

func TestUserService(t *testing.T) {
    service := NewUserService(mockRepo)

    user, err := service.GetUser(1)

    require.NoError(t, err)           // 에러 시 즉시 종료
    assert.Equal(t, "Alice", user.Name) // 비교
    assert.NotNil(t, user)             // nil 체크
}
```

---

## 모듈 관리

### go.mod 기본

```go
module github.com/user/myproject

go 1.22

require (
    github.com/gin-gonic/gin v1.9.1
    golang.org/x/sync v0.5.0
)

require (
    github.com/json-iterator/go v1.1.12 // indirect
    gopkg.in/yaml.v3 v3.0.1 // indirect
)
```

### 주요 명령어

```bash
# 모듈 초기화
go mod init github.com/user/myproject

# 의존성 추가
go get github.com/gin-gonic/gin@v1.9.1

# 사용하지 않는 의존성 제거
go mod tidy

# 의존성 다운로드 (vendor 없이)
go mod download

# vendor 디렉토리 생성
go mod vendor

# 의존성 그래프 확인
go mod graph
```

### Workspace (Go 1.18+)

```bash
# 멀티모듈 프로젝트
myworkspace/
├── go.work
├── service-a/
│   └── go.mod
└── service-b/
    └── go.mod

# go.work 파일
go 1.22

use (
    ./service-a
    ./service-b
)
```

---

## 패키지 설계

### Small Interfaces (1-3 메서드)

```go
// ✅ 좋은 인터페이스 (작고 응집력 있음)
type Reader interface {
    Read(p []byte) (n int, err error)
}

type Writer interface {
    Write(p []byte) (n int, err error)
}

type ReadWriter interface {
    Reader
    Writer
}

// ❌ 나쁜 인터페이스 (너무 많은 책임)
type UserManager interface {
    CreateUser(name string) error
    DeleteUser(id int) error
    UpdateUser(user *User) error
    FindUser(id int) (*User, error)
    ListUsers() ([]*User, error)
    SendEmail(user *User) error // 책임 분리 필요
}
```

### Package Naming

```go
✅ 좋은 패키지명
- http (net/http)
- json (encoding/json)
- context
- errors

❌ 나쁜 패키지명
- util, utils, common, helper (너무 포괄적)
- userutils (중복된 정보, user 패키지면 충분)
```

---

## 고급 패턴

### Repository 패턴

```go
// Domain Layer
type User struct {
    ID    int
    Name  string
    Email string
}

type UserRepository interface {
    Create(user *User) error
    FindByID(id int) (*User, error)
    Update(user *User) error
    Delete(id int) error
}

// Infrastructure Layer
type PostgresUserRepo struct {
    db *sql.DB
}

func NewPostgresUserRepo(db *sql.DB) *PostgresUserRepo {
    return &PostgresUserRepo{db: db}
}

func (r *PostgresUserRepo) FindByID(id int) (*User, error) {
    var user User
    err := r.db.QueryRow("SELECT id, name, email FROM users WHERE id = $1", id).
        Scan(&user.ID, &user.Name, &user.Email)
    if err != nil {
        return nil, err
    }
    return &user, nil
}
```

### Service Layer 패턴

```go
type UserService struct {
    repo  UserRepository
    cache CacheService
    log   *slog.Logger
}

func (s *UserService) GetUser(ctx context.Context, id int) (*User, error) {
    // 1. 캐시 확인
    if cached, err := s.cache.Get(ctx, fmt.Sprintf("user:%d", id)); err == nil {
        s.log.Info("cache hit", "user_id", id)
        return cached.(*User), nil
    }

    // 2. DB 조회
    user, err := s.repo.FindByID(id)
    if err != nil {
        s.log.Error("failed to find user", "user_id", id, "error", err)
        return nil, fmt.Errorf("get user: %w", err)
    }

    // 3. 캐시 저장
    s.cache.Set(ctx, fmt.Sprintf("user:%d", id), user, 5*time.Minute)

    return user, nil
}
```

### Factory 패턴

```go
type Database interface {
    Query(query string) (Result, error)
}

type DatabaseFactory struct{}

func (f *DatabaseFactory) Create(driver string, dsn string) (Database, error) {
    switch driver {
    case "postgres":
        return NewPostgresDB(dsn)
    case "mysql":
        return NewMySQLDB(dsn)
    default:
        return nil, fmt.Errorf("unsupported driver: %s", driver)
    }
}
```

---

## 실전 예제: RESTful API

### 프로젝트 구조

```
myapi/
├── cmd/
│   └── server/
│       └── main.go
├── internal/
│   ├── domain/
│   │   ├── user.go
│   │   └── user_test.go
│   ├── infra/
│   │   └── postgres/
│   │       └── user_repo.go
│   ├── service/
│   │   ├── user_service.go
│   │   └── user_service_test.go
│   └── handler/
│       ├── user_handler.go
│       └── router.go
├── go.mod
└── go.sum
```

### main.go

```go
package main

import (
    "database/sql"
    "log"
    "net/http"

    "myapi/internal/handler"
    "myapi/internal/infra/postgres"
    "myapi/internal/service"

    _ "github.com/lib/pq"
)

func main() {
    // DB 연결
    db, err := sql.Open("postgres", "postgres://localhost/mydb")
    if err != nil {
        log.Fatal(err)
    }
    defer db.Close()

    // 의존성 주입
    userRepo := postgres.NewUserRepo(db)
    userService := service.NewUserService(userRepo)
    userHandler := handler.NewUserHandler(userService)

    // 라우터 설정
    router := handler.NewRouter(userHandler)

    // 서버 시작
    log.Println("Server starting on :8080")
    log.Fatal(http.ListenAndServe(":8080", router))
}
```

### domain/user.go

```go
package domain

type User struct {
    ID    int    `json:"id"`
    Name  string `json:"name"`
    Email string `json:"email"`
}

type UserRepository interface {
    Create(user *User) error
    FindByID(id int) (*User, error)
    FindAll() ([]*User, error)
    Update(user *User) error
    Delete(id int) error
}
```

### infra/postgres/user_repo.go

```go
package postgres

import (
    "database/sql"
    "myapi/internal/domain"
)

type UserRepo struct {
    db *sql.DB
}

func NewUserRepo(db *sql.DB) *UserRepo {
    return &UserRepo{db: db}
}

func (r *UserRepo) FindByID(id int) (*domain.User, error) {
    var user domain.User
    err := r.db.QueryRow(
        "SELECT id, name, email FROM users WHERE id = $1", id,
    ).Scan(&user.ID, &user.Name, &user.Email)

    if err == sql.ErrNoRows {
        return nil, domain.ErrNotFound
    }
    if err != nil {
        return nil, err
    }

    return &user, nil
}

func (r *UserRepo) Create(user *domain.User) error {
    return r.db.QueryRow(
        "INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id",
        user.Name, user.Email,
    ).Scan(&user.ID)
}
```

### service/user_service.go

```go
package service

import (
    "context"
    "fmt"
    "myapi/internal/domain"
)

type UserService struct {
    repo domain.UserRepository
}

func NewUserService(repo domain.UserRepository) *UserService {
    return &UserService{repo: repo}
}

func (s *UserService) GetUser(ctx context.Context, id int) (*domain.User, error) {
    user, err := s.repo.FindByID(id)
    if err != nil {
        return nil, fmt.Errorf("get user: %w", err)
    }
    return user, nil
}

func (s *UserService) CreateUser(ctx context.Context, name, email string) (*domain.User, error) {
    user := &domain.User{
        Name:  name,
        Email: email,
    }

    if err := s.repo.Create(user); err != nil {
        return nil, fmt.Errorf("create user: %w", err)
    }

    return user, nil
}
```

### handler/user_handler.go

```go
package handler

import (
    "encoding/json"
    "net/http"
    "strconv"

    "myapi/internal/service"
)

type UserHandler struct {
    service *service.UserService
}

func NewUserHandler(service *service.UserService) *UserHandler {
    return &UserHandler{service: service}
}

func (h *UserHandler) GetUser(w http.ResponseWriter, r *http.Request) {
    id, _ := strconv.Atoi(r.URL.Query().Get("id"))

    user, err := h.service.GetUser(r.Context(), id)
    if err != nil {
        http.Error(w, err.Error(), http.StatusNotFound)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(user)
}

func (h *UserHandler) CreateUser(w http.ResponseWriter, r *http.Request) {
    var req struct {
        Name  string `json:"name"`
        Email string `json:"email"`
    }

    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }

    user, err := h.service.CreateUser(r.Context(), req.Name, req.Email)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusCreated)
    json.NewEncoder(w).Encode(user)
}
```

---

## 안티패턴

### ❌ 전역 변수 남용

```go
// ❌ 나쁜 방법
var db *sql.DB

func init() {
    db, _ = sql.Open("postgres", "...")
}

func GetUser(id int) (*User, error) {
    // 전역 db 사용
}
```

### ✅ 의존성 주입

```go
// ✅ 좋은 방법
type UserRepo struct {
    db *sql.DB
}

func NewUserRepo(db *sql.DB) *UserRepo {
    return &UserRepo{db: db}
}

func (r *UserRepo) GetUser(id int) (*User, error) {
    // 주입된 db 사용
}
```

### ❌ 파일 이름에 언더스코어

```go
❌ user_service.go (Python 스타일)
✅ userservice.go 또는 user.go
```

### ❌ 패키지 순환 참조

```go
❌ package A imports B, B imports A
✅ 인터페이스로 의존성 역전 (Dependency Inversion)
```

---

**마지막 업데이트**: 2026-02-15
**버전**: 1.0.0
