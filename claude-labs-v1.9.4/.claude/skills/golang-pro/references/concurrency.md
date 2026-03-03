# Go 동시성 패턴

> **로드 시점**: goroutine/channel 사용 시

---

## 개념

Go의 동시성은 goroutine과 channel을 기반으로 합니다. "Don't communicate by sharing memory; share memory by communicating" 원칙을 따릅니다.

---

## Goroutine 기본

### 생성 및 종료

```go
// 기본 goroutine
go func() {
    fmt.Println("Running in goroutine")
}()

// 인자 전달 (값 복사)
for i := 0; i < 5; i++ {
    i := i // 루프 변수 캡처 (Go 1.22부터는 자동)
    go func() {
        fmt.Println(i)
    }()
}
```

### 주의사항

```go
❌ 잘못된 방법 (goroutine 누수)
func leaky() {
    ch := make(chan int)
    go func() {
        val := <-ch // 영원히 블로킹
        fmt.Println(val)
    }()
    // ch에 값을 보내지 않고 종료
}

✅ 올바른 방법 (context로 종료 보장)
func safe(ctx context.Context) {
    ch := make(chan int)
    go func() {
        select {
        case val := <-ch:
            fmt.Println(val)
        case <-ctx.Done():
            return // context 취소 시 종료
        }
    }()
}
```

---

## Channel 패턴

### Unbuffered Channel (동기)

```go
// 송신자와 수신자가 동시에 준비될 때까지 블로킹
ch := make(chan int)

go func() {
    ch <- 42 // 수신자가 준비될 때까지 대기
}()

val := <-ch // 42
```

### Buffered Channel (비동기)

```go
// 버퍼 크기만큼 블로킹 없이 송신 가능
ch := make(chan int, 3)

ch <- 1
ch <- 2
ch <- 3
// ch <- 4 // 블로킹 (버퍼 가득 찬 상태)

fmt.Println(<-ch) // 1
fmt.Println(<-ch) // 2
```

### Channel 닫기

```go
ch := make(chan int, 2)
ch <- 1
ch <- 2
close(ch) // 더 이상 송신 불가

// 수신은 여전히 가능
fmt.Println(<-ch) // 1
fmt.Println(<-ch) // 2
fmt.Println(<-ch) // 0 (zero value, 채널 닫힘)

// 닫힌 채널 확인
val, ok := <-ch
if !ok {
    fmt.Println("Channel closed")
}

// range로 수신 (채널 닫힐 때까지 반복)
for val := range ch {
    fmt.Println(val)
}
```

---

## Select 패턴

### 다중 채널 처리

```go
func worker(ctx context.Context, ch1, ch2 <-chan int) {
    for {
        select {
        case val := <-ch1:
            fmt.Println("From ch1:", val)
        case val := <-ch2:
            fmt.Println("From ch2:", val)
        case <-ctx.Done():
            fmt.Println("Context cancelled")
            return
        }
    }
}
```

### Timeout 패턴

```go
func fetchWithTimeout(url string) ([]byte, error) {
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    resultCh := make(chan []byte, 1)
    errCh := make(chan error, 1)

    go func() {
        data, err := http.Get(url)
        if err != nil {
            errCh <- err
            return
        }
        resultCh <- data
    }()

    select {
    case data := <-resultCh:
        return data, nil
    case err := <-errCh:
        return nil, err
    case <-ctx.Done():
        return nil, fmt.Errorf("timeout: %w", ctx.Err())
    }
}
```

### Default Case (Non-blocking)

```go
func tryReceive(ch <-chan int) {
    select {
    case val := <-ch:
        fmt.Println("Received:", val)
    default:
        fmt.Println("No value available")
    }
}
```

---

## 동시성 패턴

### 1. Fan-Out / Fan-In

```go
// Fan-Out: 하나의 입력을 여러 goroutine으로 분산
func fanOut(input <-chan int, workers int) []<-chan int {
    outputs := make([]<-chan int, workers)

    for i := 0; i < workers; i++ {
        out := make(chan int)
        outputs[i] = out

        go func(out chan<- int) {
            defer close(out)
            for val := range input {
                // 처리 작업
                out <- val * 2
            }
        }(out)
    }

    return outputs
}

// Fan-In: 여러 goroutine 출력을 하나로 병합
func fanIn(channels ...<-chan int) <-chan int {
    out := make(chan int)
    var wg sync.WaitGroup

    for _, ch := range channels {
        wg.Add(1)
        go func(ch <-chan int) {
            defer wg.Done()
            for val := range ch {
                out <- val
            }
        }(ch)
    }

    go func() {
        wg.Wait()
        close(out)
    }()

    return out
}
```

### 2. Pipeline 패턴

```go
// Stage 1: 정수 생성
func generate(ctx context.Context, nums ...int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for _, n := range nums {
            select {
            case out <- n:
            case <-ctx.Done():
                return
            }
        }
    }()
    return out
}

// Stage 2: 제곱 계산
func square(ctx context.Context, in <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for n := range in {
            select {
            case out <- n * n:
            case <-ctx.Done():
                return
            }
        }
    }()
    return out
}

// 사용
func main() {
    ctx, cancel := context.WithCancel(context.Background())
    defer cancel()

    nums := generate(ctx, 1, 2, 3, 4, 5)
    squares := square(ctx, nums)

    for sq := range squares {
        fmt.Println(sq) // 1, 4, 9, 16, 25
    }
}
```

### 3. Worker Pool 패턴

```go
type Job struct {
    ID   int
    Data string
}

type Result struct {
    Job    Job
    Output string
}

func worker(ctx context.Context, id int, jobs <-chan Job, results chan<- Result) {
    for {
        select {
        case job, ok := <-jobs:
            if !ok {
                return // jobs 채널 닫힘
            }
            // 작업 처리
            output := fmt.Sprintf("Worker %d processed %s", id, job.Data)
            results <- Result{Job: job, Output: output}
        case <-ctx.Done():
            return
        }
    }
}

func main() {
    ctx, cancel := context.WithCancel(context.Background())
    defer cancel()

    jobs := make(chan Job, 100)
    results := make(chan Result, 100)

    // 10개 워커 시작
    for w := 1; w <= 10; w++ {
        go worker(ctx, w, jobs, results)
    }

    // 작업 투입
    for j := 1; j <= 50; j++ {
        jobs <- Job{ID: j, Data: fmt.Sprintf("task-%d", j)}
    }
    close(jobs)

    // 결과 수집
    for i := 1; i <= 50; i++ {
        result := <-results
        fmt.Println(result.Output)
    }
}
```

---

## sync 패키지

### Mutex (상호 배제)

```go
type Counter struct {
    mu    sync.Mutex
    value int
}

func (c *Counter) Increment() {
    c.mu.Lock()
    defer c.mu.Unlock()
    c.value++
}

func (c *Counter) Value() int {
    c.mu.Lock()
    defer c.mu.Unlock()
    return c.value
}
```

### RWMutex (읽기/쓰기 분리)

```go
type Cache struct {
    mu    sync.RWMutex
    items map[string]string
}

func (c *Cache) Get(key string) (string, bool) {
    c.mu.RLock()         // 읽기 잠금 (다중 허용)
    defer c.mu.RUnlock()
    val, ok := c.items[key]
    return val, ok
}

func (c *Cache) Set(key, val string) {
    c.mu.Lock()          // 쓰기 잠금 (독점)
    defer c.mu.Unlock()
    c.items[key] = val
}
```

### WaitGroup (goroutine 대기)

```go
func processAll(items []string) {
    var wg sync.WaitGroup

    for _, item := range items {
        wg.Add(1)
        go func(item string) {
            defer wg.Done()
            process(item)
        }(item)
    }

    wg.Wait() // 모든 goroutine 완료 대기
}
```

### Once (단 한 번만 실행)

```go
var (
    instance *Database
    once     sync.Once
)

func GetDB() *Database {
    once.Do(func() {
        instance = &Database{
            // 초기화 코드 (딱 한 번만 실행)
        }
    })
    return instance
}
```

### Pool (객체 재사용)

```go
var bufferPool = sync.Pool{
    New: func() interface{} {
        return new(bytes.Buffer)
    },
}

func process() {
    buf := bufferPool.Get().(*bytes.Buffer)
    defer bufferPool.Put(buf)

    buf.Reset() // 재사용 전 초기화
    buf.WriteString("Hello")
    fmt.Println(buf.String())
}
```

---

## context.Context 활용

### Context 전파

```go
func handler(w http.ResponseWriter, r *http.Request) {
    ctx := r.Context() // HTTP 요청의 context 가져오기

    result, err := fetchData(ctx)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    w.Write(result)
}

func fetchData(ctx context.Context) ([]byte, error) {
    // context를 하위 함수로 전파
    return queryDB(ctx)
}

func queryDB(ctx context.Context) ([]byte, error) {
    // DB 쿼리 시 context 전달
    return db.QueryContext(ctx, "SELECT * FROM users")
}
```

### Context Timeout

```go
func doWork(ctx context.Context) error {
    ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
    defer cancel()

    done := make(chan error, 1)
    go func() {
        done <- expensiveOperation()
    }()

    select {
    case err := <-done:
        return err
    case <-ctx.Done():
        return fmt.Errorf("work cancelled: %w", ctx.Err())
    }
}
```

### Context WithValue (메타데이터 전달)

```go
type contextKey string

const requestIDKey contextKey = "requestID"

func handler(w http.ResponseWriter, r *http.Request) {
    requestID := generateRequestID()
    ctx := context.WithValue(r.Context(), requestIDKey, requestID)

    processRequest(ctx)
}

func processRequest(ctx context.Context) {
    if id, ok := ctx.Value(requestIDKey).(string); ok {
        log.Printf("Processing request %s", id)
    }
}
```

---

## errgroup 패턴

### 병렬 작업 에러 처리

```go
import "golang.org/x/sync/errgroup"

func fetchAll(urls []string) ([][]byte, error) {
    g, ctx := errgroup.WithContext(context.Background())
    results := make([][]byte, len(urls))

    for i, url := range urls {
        i, url := i, url // 루프 변수 캡처
        g.Go(func() error {
            resp, err := http.Get(url)
            if err != nil {
                return err // 첫 에러 발생 시 다른 goroutine 취소
            }
            defer resp.Body.Close()

            data, err := io.ReadAll(resp.Body)
            if err != nil {
                return err
            }

            results[i] = data
            return nil
        })
    }

    if err := g.Wait(); err != nil {
        return nil, err // 하나라도 실패 시 전체 실패
    }

    return results, nil
}
```

### errgroup.Group SetLimit (동시성 제한)

```go
func processFiles(files []string) error {
    g := new(errgroup.Group)
    g.SetLimit(5) // 최대 5개 goroutine만 동시 실행

    for _, file := range files {
        file := file
        g.Go(func() error {
            return processFile(file)
        })
    }

    return g.Wait()
}
```

---

## Race Condition 방지

### 잘못된 예시

```go
❌ Race Condition 발생
func main() {
    counter := 0
    var wg sync.WaitGroup

    for i := 0; i < 1000; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            counter++ // 동시 접근 (race!)
        }()
    }

    wg.Wait()
    fmt.Println(counter) // 1000이 아닐 수 있음
}
```

### 올바른 예시 (Mutex)

```go
✅ Mutex로 보호
func main() {
    var mu sync.Mutex
    counter := 0
    var wg sync.WaitGroup

    for i := 0; i < 1000; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            mu.Lock()
            counter++
            mu.Unlock()
        }()
    }

    wg.Wait()
    fmt.Println(counter) // 항상 1000
}
```

### 올바른 예시 (Channel)

```go
✅ Channel로 동기화
func main() {
    counter := 0
    done := make(chan bool)

    // Counter goroutine
    go func() {
        for i := 0; i < 1000; i++ {
            counter++
        }
        done <- true
    }()

    <-done
    fmt.Println(counter) // 항상 1000
}
```

---

## 안티패턴

### ❌ Goroutine 누수

```go
// 채널이 닫히지 않으면 goroutine 영구 블로킹
func leaky() {
    ch := make(chan int)
    go func() {
        for val := range ch { // ch가 close되지 않으면 영원히 대기
            fmt.Println(val)
        }
    }()
}
```

### ✅ 해결: context로 종료 보장

```go
func safe(ctx context.Context) {
    ch := make(chan int)
    go func() {
        for {
            select {
            case val := <-ch:
                fmt.Println(val)
            case <-ctx.Done():
                return // context 취소 시 종료
            }
        }
    }()
}
```

### ❌ 닫힌 채널에 송신

```go
ch := make(chan int)
close(ch)
ch <- 1 // panic: send on closed channel
```

### ✅ 해결: sync.Once 또는 채널 상태 추적

```go
type SafeChannel struct {
    ch     chan int
    closed atomic.Bool
}

func (s *SafeChannel) Send(val int) {
    if !s.closed.Load() {
        s.ch <- val
    }
}

func (s *SafeChannel) Close() {
    if s.closed.CompareAndSwap(false, true) {
        close(s.ch)
    }
}
```

---

**마지막 업데이트**: 2026-02-15
**버전**: 1.0.0
