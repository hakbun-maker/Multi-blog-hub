# 통계 페이지 (`/stats`) 재설계 — TASKS

> 작성: 2026-05-02
> 출처: [SPEC.md](./SPEC.md) | [neurion-proposal-stats.md](../../neurion-proposal-stats.md)
> 형식: Resource(Backend) ↔ Screen(Frontend) 분리 + 검증

---

## 범례

| ID 형식 | 의미 |
|---|---|
| `PA-R{n}` | Phase A의 Resource(Backend) 태스크 |
| `PA-S{n}` | Phase A의 Screen(Frontend) 태스크 |
| `PA-V{n}` | Phase A의 Verification 태스크 |
| ⛓️ | 다른 태스크 의존 |
| 🔀 | 병렬 가능 |
| 🧱 | 마이그레이션·인프라 |
| 🧪 | 테스트 포함 |
| ⏱️ | 예상 시간 |

---

## Phase A — 데이터 인프라 (예상 1주)

> 캐시 테이블 + 7개 API 라우트 스켈레톤 + 외부 API 통합기

### PA-R1 🧱 stats_cache 테이블 마이그레이션 ⏱️ 30분
- [ ] `supabase/migrations/049_stats_cache.sql` 작성
  - 컬럼: `id`, `user_id`, `cache_key`, `data jsonb`, `computed_at`, `expires_at`
  - 인덱스: `(user_id, cache_key)` UNIQUE
  - RLS: `user_id = auth.uid()`로 본인만 조회·수정
- [ ] 로컬 적용 후 동작 확인

### PA-R2 🔀 캐시 헬퍼 라이브러리 ⏱️ 1시간
- [ ] `lib/stats/cache.ts` 작성
  - `getOrCompute(userId, key, ttlMs, compute: () => Promise<T>): Promise<T>`
  - 만료 시 `compute()` 실행 + 캐시 저장
  - [수동 갱신] 위해 `invalidate(userId, key)` 함수도

### PA-R3 🔀 GA4 + AdSense + GSC 통합 fetcher ⏱️ 3시간
- [ ] `lib/stats/sources.ts` 작성
  - `fetchGa4Range(userId, days)` — 기존 `lib/google/ga4-data.ts` 활용
  - `fetchAdsenseRange(userId, days)` — 기존 `lib/google/adsense.ts` 활용
  - `fetchGscRange(userId, blogId, days)` — 신규 (GSC Search Analytics API)
  - 셋 다 병렬 호출 + 실패 시 부분 데이터 반환

### PA-R4 ⛓️ PA-R2,R3 — `/api/stats/overview` ⏱️ 2시간
- [ ] `app/api/stats/overview/route.ts` GET
- [ ] 응답: `{ delta: {revenue, views, ctr}, alerts: {hiddenGems, decaying}, recommendedActions: [3개] }`
- [ ] 캐시 키: `'overview'`, TTL 1h
- [ ] 추천 액션 3개 — 휴리스틱 룰:
  - viewability < 30% 슬롯 있으면 → "비활성화 추천"
  - ROI 하위 5% 글 ≥ 5개 있으면 → "리라이팅 큐 추가"
  - GSC 노출 ≥ 1000 + CTR < 2% 글 있으면 → "제목 재제안"

### PA-R5 ⛓️ PA-R2,R3 🔀 `/api/stats/hidden-gems` ⏱️ 1시간
- [ ] `app/api/stats/hidden-gems/route.ts` GET
- [ ] GSC에서 노출 ≥ 1000, CTR < 2% 글 식별
- [ ] AI(Claude/Gemini)로 새 제목 3개 생성
- [ ] 응답: `[{ postId, title, impressions, ctr, suggestedTitles: [3] }]`

### PA-R6 ⛓️ PA-R2,R3 🔀 `/api/stats/forecast` ⏱️ 1.5시간
- [ ] `app/api/stats/forecast/route.ts` GET
- [ ] 최근 30일 일별 수익 → 다음 30일 선형 회귀 예측
- [ ] 사용자 월 목표(추후 설정) 대비 진척도 + 달성 가능성 %
- [ ] 응답: `{ predictedNext30: number, vsLastYear: number, goalProgress: number, achievability: number }`

### PA-R7 ⛓️ PA-R2,R3 🔀 `/api/stats/diagnosis` ⏱️ 2시간
- [ ] `app/api/stats/diagnosis/route.ts` GET
- [ ] ROI 랭킹 (Top 10 + Bottom 5)
- [ ] 카테고리 파레토 데이터 (수익 합 + 누적 %)
- [ ] 드릴다운 트리: `category > keyword > post > slot`
- [ ] 응답: `{ roiRanking: [...], pareto: [...], drilldown: tree }`

### PA-R8 ⛓️ PA-R2,R3 🔀 `/api/stats/optimization` ⏱️ 2시간
- [ ] `app/api/stats/optimization/route.ts` GET
- [ ] 슬롯별 수익·CTR 비교
- [ ] 카테고리 × RPM 매트릭스 (heatmap data)
- [ ] viewability 점수 분포 (히스토그램)
- [ ] 응답: `{ slots: [...], rpmMatrix: [...], viewability: [...] }`

### PA-R9 ⛓️ PA-R3 🔀 `/api/stats/simulate` POST ⏱️ 3시간
- [ ] `app/api/stats/simulate/route.ts` POST
- [ ] 입력: `{ publishesPerWeek, totalAdSlots, medicalCategoryRatio, rewriteCount }`
- [ ] 모델: 단순 다중 선형 회귀 (과거 90일 학습)
- [ ] 출력: `{ revenue30d, revenue60d, revenue90d, confidence }`
- [ ] 학습 데이터 부족 시 폴백: 룰 기반 예측 (단순 가중 평균)

### PA-R10 ⛓️ PA-R1 🔀 `/api/stats/action/apply` POST ⏱️ 2시간
- [ ] `app/api/stats/action/apply/route.ts` POST
- [ ] 입력: `{ actionType: 'toggle_slot' | 'apply_slot_position' | 'change_title' | 'add_to_rewrite_queue', payload }`
- [ ] 화이트리스트 4종 액션만 허용 (단순 자동화)
- [ ] 적용 결과 + 다음 동작(있으면) 반환

### PA-V1 🧪 ⛓️ PA-R4~R10 ⏱️ 1시간
- [ ] 7개 API 모두 200 응답 확인 (curl 또는 vitest)
- [ ] 캐시 hit/miss 동작 확인
- [ ] RLS로 다른 user 데이터 접근 차단 확인

---

## Phase B — TOP 브리핑 + 숨은 보석 + 행동 카탈로그 (예상 1주)

> `/stats` 페이지 신규 + 매일 사용 핵심 컴포넌트

### PB-S1 🧱 `/stats` 페이지 신규 라우트 ⏱️ 1시간
- [ ] `app/(dashboard)/stats/page.tsx` 신규
- [ ] 5섹션 placeholder + 콜랩스 골격 (시뮬레이션은 기본 접힘)
- [ ] 사이드바 메뉴 라벨 "통계" 유지

### PB-S2 ⛓️ PA-R4 🧪 TOP 브리핑 컴포넌트 ⏱️ 4시간
- [ ] `components/stats/TopBriefing.tsx`
- [ ] Delta 카드 3개 (수익 / 조회수 / CTR — 화살표 + %)
- [ ] 새 알림 배지 (숨은 보석 N개, 덮이는 글 M개)
- [ ] 추천 액션 카드 3개 — 각각 [지금 적용] [나중에] [무시]
- [ ] 알림 배지 클릭 시 해당 섹션으로 스크롤 (`scrollIntoView`)

### PB-S3 ⛓️ PA-R10 🧪 행동 카탈로그 액션 핸들러 ⏱️ 2시간
- [ ] `lib/stats/actions.ts`
- [ ] `applyAction(actionType, payload): Promise<{ ok, message }>`
- [ ] 4종 액션 호출 + 토스트 피드백 (sonner)
- [ ] 적용 후 추천 액션 목록 다시 fetch (낙관적 갱신)

### PB-S4 ⛓️ PA-R5 🧪 숨은 보석 섹션 ⏱️ 4시간
- [ ] `components/stats/HiddenGems.tsx`
- [ ] 후보 글 5개 카드 — 노출수, CTR, AI 제안 제목 3개
- [ ] [제목 변경] 버튼 → `applyAction('change_title')` 호출
- [ ] 빈 상태 처리 ("이번 주 발견된 숨은 보석 없음")

### PB-V1 🧪 ⛓️ PB-S2,S3,S4 ⏱️ 1시간
- [ ] TOP 브리핑 → 알림 배지 클릭 → 숨은 보석 섹션으로 스크롤 동작
- [ ] 추천 액션 카드 3개 모두 [지금 적용] 동작 확인
- [ ] 숨은 보석에서 [제목 변경] 클릭 → 글 제목 실제 변경 + 토스트 노출

---

## Phase C — 진단 + 최적화 섹션 (예상 1주)

> 시각화 6종 (recharts 활용)

### PC-S1 ⛓️ PA-R7 🔀 ROI 랭킹 테이블 ⏱️ 3시간
- [ ] `components/stats/RoiRanking.tsx`
- [ ] Top 10 / Bottom 5 토글
- [ ] 컬럼: 제목 / 카테고리 / 누적 수익 / 일평균 수익 / ROI 등급
- [ ] 글 클릭 시 새 창 production URL로 이동 (대시보드 패턴 재사용)

### PC-S2 ⛓️ PA-R7 🔀 카테고리 파레토 차트 ⏱️ 2시간
- [ ] `components/stats/CategoryPareto.tsx`
- [ ] recharts `BarChart` + `LineChart` 조합 (수익 막대 + 누적 % 선)
- [ ] 80% 라인 표시 + 그 이하 카테고리 강조

### PC-S3 ⛓️ PA-R7 🔀 드릴다운 트리 ⏱️ 5시간
- [ ] `components/stats/DrilldownTree.tsx`
- [ ] 4단계 클릭 가능 트리: 카테고리 → 키워드 → 글 → 슬롯
- [ ] 각 노드에 수익 합 + 점유율 % 표시
- [ ] 펼침/접힘 + 빵부스러기 네비

### PC-S4 ⛓️ PA-R8 🔀 광고 슬롯별 수익 비교 ⏱️ 2시간
- [ ] `components/stats/AdSlotsCompare.tsx`
- [ ] recharts `BarChart` — 슬롯별 수익·클릭률·CTR
- [ ] viewability < 30% 슬롯에 ⚠️ 표시 + [비활성화] 버튼

### PC-S5 ⛓️ PA-R8 🔀 카테고리 × RPM 매트릭스 ⏱️ 3시간
- [ ] `components/stats/RpmMatrix.tsx`
- [ ] 카테고리(행) × 블로그(열) heatmap (recharts `Treemap` 또는 커스텀 grid)
- [ ] 셀 hover 시 RPM·수익·발행글수 툴팁
- [ ] 클릭 시 해당 카테고리/블로그 드릴다운

### PC-S6 ⛓️ PA-R8 🔀 Viewability 분포 ⏱️ 1.5시간
- [ ] `components/stats/ViewabilityDistribution.tsx`
- [ ] recharts `PieChart` 또는 도넛 — 0-30% / 30-60% / 60-100% 비율
- [ ] 30% 미만 슬롯 목록 표시

### PC-V1 🧪 ⛓️ PC-S1~S6 ⏱️ 1시간
- [ ] 진단·최적화 6개 위젯 모두 데이터 로드·차트 렌더 확인
- [ ] 빈 데이터 상태 (신규 사용자) 처리 확인
- [ ] 캐시 hit 시 즉시 표시, 캐시 miss 시 로딩 스피너

---

## Phase D — 시뮬레이션 + 예측 (예상 1주)

> 슬라이더 기반 의사결정 도구

### PD-S1 ⛓️ PA-R6 🔀 다음달 예측 + 진척도 카드 ⏱️ 2시간
- [ ] `components/stats/Forecast.tsx`
- [ ] "이대로 가면 X원, 작년 +Y%" 예측치 표시
- [ ] 게이지 바 (목표 대비 진척도)
- [ ] 달성 가능성 % + 색상 (≥70% 녹색, 30~70% 노랑, <30% 빨강)

### PD-S2 ⛓️ PA-R9 🧪 시뮬레이션 슬라이더 ⏱️ 6시간
- [ ] `components/stats/SimulationSliders.tsx`
- [ ] 슬라이더 4개:
  - 발행 빈도 (현재값 ±10)
  - 광고 슬롯 수 (1~6)
  - 의료/법률 카테고리 비중 (0~100%)
  - 리라이팅 수 (0~10)
- [ ] debounce 500ms로 `/api/stats/simulate` 호출
- [ ] 결과 라인차트 (recharts `LineChart`) — 30/60/90일 후 예상 수익
- [ ] [원래대로] 리셋 버튼

### PD-S3 ⛓️ PD-S2 🔀 시뮬레이션 결과 행동 카탈로그 ⏱️ 2시간
- [ ] `components/stats/SimulationActions.tsx`
- [ ] 슬라이더 결과 기반 "이렇게 변경하시겠어요?" 카드
- [ ] 클릭 시 `applyAction()` 호출 (단순 자동화 범위만)

### PD-V1 🧪 ⛓️ PD-S1,S2,S3 ⏱️ 1시간
- [ ] 슬라이더 4개 동작 + debounce 확인
- [ ] 학습 데이터 부족 케이스(신규 블로그) 폴백 동작
- [ ] 시뮬 결과 행동 카탈로그 적용 흐름 검증

---

## Phase E — 정리 + 통합 (예상 3일)

### PE-T1 ⛓️ Phase A~D 완료 후 🧪 모바일 레이아웃 ⏱️ 4시간
- [ ] 5섹션 모바일 stack 레이아웃 검수
- [ ] 차트들 가로 스크롤 또는 축약 처리
- [ ] 슬라이더 터치 동작 확인

### PE-T2 🔀 기존 `/stats` 처리 ⏱️ 1시간
- [ ] 기존 `app/(dashboard)/stats/page.tsx`(이전 버전) → 백업 또는 폐기 결정
- [ ] 사이드바 메뉴 동작 확인

### PE-T3 🔀 [수동 갱신] 버튼 추가 ⏱️ 30분
- [ ] TOP에 ↻ 버튼 추가
- [ ] 클릭 시 모든 캐시 무효화 + 페이지 새로고침

### PE-T4 🧪 통합 회귀 테스트 ⏱️ 2시간
- [ ] 매일 시나리오: 페이지 진입 → 5초 스캔 → 추천 액션 클릭 → 적용 확인
- [ ] 월 1회 시나리오: 시뮬레이션 → 변경 확정 → 행동 카탈로그 적용

### PE-V1 🧪 ⛓️ PE-T1~T4 ⏱️ 30분
- [ ] 5섹션 정상 동작 + 모바일 OK + 캐시 OK + 액션 적용 OK
- [ ] 빈 데이터·실패 케이스 graceful 처리 확인

---

## 의존성 그래프 요약

```
Phase A (데이터 인프라)
  PA-R1 (마이그레이션) ──┐
  PA-R2 (캐시 헬퍼) ─────┤
  PA-R3 (외부 API 통합) ─┴──→ PA-R4~R10 (API 7개) ──→ PA-V1
                                    │
                                    ↓
Phase B (TOP + 숨은 보석)    Phase C (진단 + 최적화)    Phase D (시뮬+예측)
  PB-S1 (페이지 라우트)         PC-S1~S6 (위젯 6종)      PD-S1~S3 (예측·시뮬)
  PB-S2~S4 (컴포넌트)              ↓                        ↓
        ↓                       PC-V1                    PD-V1
      PB-V1
        ↓
Phase E (정리 — 모든 Phase 완료 후)
  PE-T1~T4 → PE-V1
```

---

## 병렬 실행 가능 섹션

| 함께 실행 가능 | 이유 |
|---|---|
| PA-R4 ~ PA-R10 (Phase A 안의 API 라우트들) | 모두 PA-R1,R2,R3 끝나면 서로 독립 |
| PB-S2 / PB-S4 / PC-S* / PD-S* | UI 컴포넌트는 같은 Phase 내에서 독립 |
| Phase C 위젯 6종 | 같은 데이터 소스(PA-R7,R8) 받으면 독립 |

| 절대 직렬 실행 | 이유 |
|---|---|
| 모든 Phase의 V 태스크 | 그 Phase의 모든 T 끝난 후 |
| Phase E | A,B,C,D 모두 끝난 후 |
| Resource(R) → Screen(S) | API 없으면 화면 못 그림 |

---

## 총 추정 시간

| Phase | 시간 |
|---|---|
| A 데이터 인프라 | 약 18시간 (1주) |
| B TOP + 숨은 보석 | 약 12시간 (3-4일) |
| C 진단 + 최적화 | 약 17시간 (1주) |
| D 시뮬+예측 | 약 11시간 (3일) |
| E 정리 | 약 8시간 (2일) |
| **합계** | **약 66시간 (3-4주)** |

---

## 운영 체크리스트 (구현 중)

- [ ] viewability 측정 정확도 검증 (AdSense API 충분한지)
- [ ] "숨은 보석" 임계치(노출 1,000 / CTR 2%) 운영 데이터로 조정
- [ ] 시뮬 모델 학습 데이터 부족 시 폴백 동작 확인
- [ ] 1시간 캐시가 실제로 비용 절감하는지 모니터링

---

## 다음 단계

> 현재는 환경 셋업 불필요(기존 프로젝트에 추가). 바로 Phase A부터 구현 시작 가능.
