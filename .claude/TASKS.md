# 수익화 로켓 4차 보완 TASKS — 스케줄러 버그 수정 + 인터랙티브 + 다국어 + Google Calendar

> 기반: 스케줄러 탭 심층 분석 결과
> 모드: ultra-thin orchestrate (병렬)

---

## Phase H: 스케줄러 버그 수정 (4개 동시 — 의존성 없음)

### T6.1: Calendar API keywordGrade/time 반환 + 카드 시간 표시
- **담당**: backend
- **의존성**: 없음
- **복잡도**: S
- **파일**:
  - 수정: `app/api/monetize/scheduler/calendar/route.ts`
  - 수정: `components/monetize/scheduler/KeywordScheduleCard.tsx`
  - 수정: `components/monetize/scheduler/SchedulerCalendar.tsx`
- **요구사항**:
  1. `calendar/route.ts`의 `scheduled_posts` SELECT에 keywords 테이블 JOIN 추가:
     - 현재: `select('id, blog_id, keyword_id, scheduled_date, scheduled_time, status, intent_type, content_draft, blogs(name), keywords(keyword)')` (추정)
     - 추가: `keywords(keyword, keyword_grade, revenue_score)`
  2. API 응답에 `keywordGrade`, `scheduledTime` 필드 포함
  3. `SchedulerCalendar.tsx`에서 `KeywordScheduleCard`에 `grade`, `time` props 전달
  4. `KeywordScheduleCard.tsx`에 시간(HH:MM) 표시 추가 (왼쪽에 작게)
  5. `(entry as any).keywordGrade` unsafe cast 제거 → 정상 필드 사용
- **완료 조건**: 캘린더 카드에 등급 배지 + 시간 정상 표시

### T6.2: Distribute API 응답 필드명 + blogIds 필터 수정
- **담당**: backend
- **의존성**: 없음
- **복잡도**: S
- **파일**:
  - 수정: `app/api/monetize/scheduler/distribute/route.ts`
- **요구사항**:
  1. 현재 버그: 응답이 `{ preview: [...] }`인데 UI가 `data.previews`로 접근 → undefined
  2. 응답 필드명을 `previews`로 변경: `return NextResponse.json({ previews: result })`
  3. 요청 body에서 `blogIds` 필드 지원:
     - 현재: `{ keywordIds?, category?, excludeWarnedBlogs? }` — blogIds 무시
     - 추가: `blogIds`가 있으면 해당 블로그만 대상으로 배분
     - 블로그 조회 쿼리에 `.in('id', blogIds)` 필터 추가
  4. 기존 키워드 필터 로직은 유지
- **완료 조건**: DistributionEnginePanel에서 미리보기가 정상 표시

### T6.3: Confirm API 미리보기 항목 수용
- **담당**: backend
- **의존성**: 없음
- **복잡도**: S
- **파일**:
  - 수정: `app/api/monetize/scheduler/confirm/route.ts`
- **요구사항**:
  1. 현재 버그: UI가 `{ previews: [...] }` 전송하지만 API가 무시하고 엔진 재실행
  2. `previews` 배열을 받으면 엔진 재실행 없이 직접 DB에 삽입:
     ```ts
     if (previews && Array.isArray(previews) && previews.length > 0) {
       // 직접 scheduled_posts + blog_keyword_assignments 생성
     } else {
       // 기존 로직: 엔진 재실행 (fallback)
     }
     ```
  3. 각 preview item에서: keywordId, blogId, scheduledDate, scheduledTime, intentType, intentFitScore 추출
  4. `scheduled_posts` 삽입 + `blog_keyword_assignments` 삽입
  5. 성공 시 생성된 항목 수 반환
- **완료 조건**: 미리보기 → 확정 시 사용자가 선택한 배분 그대로 저장

### T6.4: BlogDistributionPreview remove 버그 + 상태 업데이트
- **담당**: frontend
- **의존성**: 없음
- **복잡도**: S
- **파일**:
  - 수정: `components/monetize/scheduler/BlogDistributionPreview.tsx`
  - 수정: `components/monetize/scheduler/DistributionEnginePanel.tsx`
- **요구사항**:
  1. `BlogDistributionPreview` remove 버튼 버그:
     - 현재: `fetch(/api/.../entry/${item.keywordId})` — 잘못된 ID 사용
     - 수정: remove는 API 호출 없이 프론트엔드 상태에서만 제거 (아직 DB에 저장 전이므로)
  2. `onRemove` 콜백 prop 추가: `(keywordId: string) => void`
  3. `DistributionEnginePanel`에서 `onRemove` 핸들러 구현:
     - previews 상태에서 해당 항목 필터링
  4. 빈 미리보기일 때 "배분할 항목이 없습니다" 메시지 표시
- **완료 조건**: 미리보기에서 항목 제거가 정상 동작

---

## Phase I: 캘린더 인터랙티브 (4개 — 일부 병렬)

### T7.1: ScheduleDetailPanel — 날짜 클릭 시 상세 패널
- **담당**: frontend
- **의존성**: T6.1 (grade/time 반환)
- **복잡도**: M
- **파일**:
  - 생성: `components/monetize/scheduler/ScheduleDetailPanel.tsx`
  - 수정: `components/monetize/scheduler/SchedulerCalendar.tsx`
- **요구사항**:
  1. `ScheduleDetailPanel` 컴포넌트 생성:
     - props: `{ date: string, entries: ScheduleEntry[], onEdit, onDelete, onAdd, onClose }`
     - 선택한 날짜의 모든 스케줄 항목을 리스트로 표시
     - 각 항목: 키워드 + 등급 배지 + 블로그명 + 시간 + 상태 + 인텐트
     - 항목별 "수정" / "삭제" 버튼
     - 하단에 "키워드 추가" 버튼
  2. `SchedulerCalendar` 수정:
     - `selectedDate` 상태 추가
     - 날짜 셀 클릭 시 `selectedDate` 설정
     - `selectedDate`가 있으면 `ScheduleDetailPanel` 렌더링 (캘린더 우측 또는 하단)
  3. 삭제 시 `DELETE /api/monetize/scheduler/entry/[id]` 호출 후 캘린더 재조회
- **완료 조건**: 날짜 클릭 → 해당 일자 스케줄 목록 표시 + 수정/삭제 버튼

### T7.2: ScheduleEditModal — 항목 수정 모달
- **담당**: frontend
- **의존성**: T7.1
- **복잡도**: M
- **파일**:
  - 생성: `components/monetize/scheduler/ScheduleEditModal.tsx`
  - 수정: `components/monetize/scheduler/ScheduleDetailPanel.tsx` (수정 버튼 연결)
- **요구사항**:
  1. `ScheduleEditModal` 컴포넌트 생성:
     - props: `{ entry: ScheduleEntry, blogs: Blog[], onSave, onDelete, onClose }`
     - 수정 가능 필드:
       a. 블로그 선택 (드롭다운 — 사용자의 모든 블로그)
       b. 날짜 선택 (date input)
       c. 시간 선택 (select, 09:00~18:00)
       d. 동일 키워드를 다른 블로그에도 추가 ("다른 블로그에도 등록" 버튼)
     - 저장 시 `PUT /api/monetize/scheduler/reassign` 호출
     - 삭제 시 `DELETE /api/monetize/scheduler/entry/[id]` 호출 + 확인 dialog
  2. "다른 블로그에도 등록" 기능:
     - 클릭 시 블로그 선택 드롭다운 표시 (현재 블로그 제외)
     - 선택한 블로그에 같은 키워드를 다른 시간에 등록
     - POST 신규 스케줄 항목 생성 (T7.3의 API 사용)
  3. 블로그 목록에 언어 표시: `블로그명 (ko)`, `Blog Name (en)`
- **완료 조건**: 항목 수정(블로그/날짜/시간) + 삭제 + 다른 블로그 추가 동작

### T7.3: Manual Schedule Add — 수동 키워드 추가
- **담당**: backend
- **의존성**: 없음
- **복잡도**: M
- **파일**:
  - 생성: `app/api/monetize/scheduler/entry/route.ts` (POST)
  - 수정: `components/monetize/scheduler/ScheduleDetailPanel.tsx` (추가 폼 연결)
- **요구사항**:
  1. `POST /api/monetize/scheduler/entry` API 생성:
     ```ts
     Body: {
       keywordId?: string       // 기존 키워드 ID (선택)
       keywordText?: string     // 새 키워드 텍스트 (keywordId 없을 때)
       blogId: string           // 필수
       scheduledDate: string    // YYYY-MM-DD, 필수
       scheduledTime: string    // HH:MM, 필수
       intentType?: string      // 선택
     }
     ```
  2. keywordId가 있으면 해당 키워드와 연결, 없으면 keywordText로 새 키워드 생성
  3. `scheduled_posts` 삽입 + `blog_keyword_assignments` 삽입
  4. 중복 체크: 같은 블로그 + 같은 날짜 + 같은 시간에 이미 예약이 있으면 에러
  5. ScheduleDetailPanel의 "키워드 추가" 버튼에 연결:
     - 인라인 폼: 키워드 입력 + 블로그 선택 + 시간 선택
     - 기존 keywords 테이블에서 자동완성 (선택 사항)
- **완료 조건**: 캘린더에서 수동으로 키워드 추가 가능

### T7.4: Calendar auto-refresh + 다국어 블로그 동시 등록
- **담당**: frontend
- **의존성**: T7.1, T7.2, T7.3
- **복잡도**: S
- **파일**:
  - 수정: `components/monetize/scheduler/SchedulerCalendar.tsx`
  - 수정: `components/monetize/scheduler/ScheduleEditModal.tsx`
- **요구사항**:
  1. `SchedulerCalendar`에 `refreshCalendar()` 함수 추가
  2. 모든 mutation(수정/삭제/추가) 완료 후 `refreshCalendar()` 자동 호출
  3. `ScheduleEditModal`의 "다른 블로그에도 등록" 기능:
     - 사용자의 블로그 목록을 fetch
     - 같은 카테고리의 다른 언어 블로그를 자동 추천
     - 추천 로직: 현재 블로그와 동일 `primary_ad_category`이고 다른 `language`인 블로그 필터링
     - 체크박스로 다중 선택 → 일괄 등록
     - 등록 시 각 블로그마다 다른 시간 자동 배정 (60~120분 간격)
- **완료 조건**: mutation 후 캘린더 자동 갱신 + 다국어 블로그 일괄 등록

---

## Phase J: Google Calendar 연동

### T8.1: Google Calendar ICS export + sync
- **담당**: backend
- **의존성**: 없음
- **복잡도**: M
- **파일**:
  - 생성: `app/api/monetize/scheduler/ical/route.ts`
  - 수정: `components/monetize/scheduler/SchedulerCalendar.tsx` (동기화 버튼 추가)
- **요구사항**:
  1. `GET /api/monetize/scheduler/ical` — ICS 형식 캘린더 export:
     - Content-Type: `text/calendar; charset=utf-8`
     - 향후 30일간의 모든 scheduled_posts를 VEVENT로 변환
     - 각 이벤트: 키워드명 + 블로그명, 시작 시간 = scheduled_time, 기간 = 30분
     - VALARM 30분 전 알림 추가
  2. ICS feed URL을 Google Calendar에 구독할 수 있도록:
     - 인증: 토큰 기반 공유 URL (UUID 토큰)
     - `GET /api/monetize/scheduler/ical?token=xxx` — 토큰으로 인증
     - 토큰은 users 테이블의 새 필드 또는 별도 테이블에 저장
  3. UI에 "Google Calendar 동기화" 버튼 추가:
     - 클릭 시 ICS feed URL 생성 + 복사
     - Google Calendar 구독 가이드 안내 (모달/tooltip)
     - "핸드폰에서 Google Calendar 앱 → 설정 → 캘린더 추가 → URL로 추가 → 붙여넣기"
  4. `webcal://` 프로토콜 링크 제공 (직접 구독 오픈)
- **완료 조건**: ICS URL을 Google Calendar에 구독하면 스케줄이 핸드폰 달력에 표시
