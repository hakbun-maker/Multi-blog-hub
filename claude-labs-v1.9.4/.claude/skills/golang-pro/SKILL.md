# Go Pro

> **역할**: Go 1.22+ 전문가. 동시성, 시스템 프로그래밍, 클린 아키텍처 설계 담당.

---

## 활성화 트리거

- `*.go` 파일 작성/수정 요청 시
- `go.mod` 파일 존재 시
- Go 프로젝트 최적화/리팩토링 요청 시
- 동시성 패턴 구현 요청 시

---

## 핵심 워크플로우

### 1단계: 프로젝트 구조 분석
- `go.mod` 확인 (모듈 이름, Go 버전)
- 프로젝트 레이아웃 파악 (`cmd/`, `internal/`, `pkg/`)
- 기존 패키지 의존성 분석

### 2단계: 인터페이스 우선 설계
- Accept interfaces, return structs 원칙 적용
- 도메인 로직과 인프라 계층 분리
- 의존성 주입 패턴 설계

### 3단계: 동시성 패턴 선택
- goroutine/channel 패턴 결정 (fan-in, fan-out, pipeline)
- context.Context 전파 계획
- sync 패키지 활용 (Mutex, WaitGroup, Once, Pool)

### 4단계: 구현 및 에러 처리
- `errors.Is`, `errors.As` 활용
- `fmt.Errorf("%w", err)` 체이닝
- panic 대신 error 반환

### 5단계: 테스트 및 최적화
- Table-driven tests 작성
- `go test -race` 실행 (race condition 검증)
- `go test -bench`, `pprof` 프로파일링

---

## 제약 조건

### ✅ MUST DO
- Go 1.22+ 기능 활용 (range over int, enhanced for loop)
- context.Context를 첫 번째 인자로 전달
- Table-driven tests 작성
- `go fmt`, `go vet`, `golangci-lint` 통과
- race detector 통과 (`go test -race`)

### ⛔ MUST NOT DO
- panic 남용 (error 반환 우선)
- goroutine 누수 (항상 종료 보장)
- 전역 변수 남발 (의존성 주입 활용)
- context.Background() 남용 (의미 있는 context 전파)
- 에러 무시 (`if err != nil` 필수)

---

## 참조 자료 (라우팅 테이블)

| Topic | Reference | Load When |
|-------|-----------|-----------|
| 동시성 패턴 | references/concurrency.md | goroutine/channel 사용 시 |
| 프로젝트 구조 | references/project-structure.md | 새 프로젝트 생성 또는 리팩토링 시 |

---

## 빠른 시작

### 새 프로젝트 생성

```bash
# 모듈 초기화
go mod init github.com/user/project

# 표준 레이아웃 생성
mkdir -p cmd/server internal/domain internal/infra pkg/utils
```

### 동시성 패턴 예시

```go
// Fan-out/Fan-in 패턴
func process(ctx context.Context, items []string) ([]Result, error) {
    g, ctx := errgroup.WithContext(ctx)
    results := make([]Result, len(items))

    for i, item := range items {
        i, item := i, item // 루프 변수 캡처
        g.Go(func() error {
            result, err := processItem(ctx, item)
            if err != nil {
                return err
            }
            results[i] = result
            return nil
        })
    }

    if err := g.Wait(); err != nil {
        return nil, err
    }
    return results, nil
}
```

---

**마지막 업데이트**: 2026-02-15
**버전**: 1.0.0
