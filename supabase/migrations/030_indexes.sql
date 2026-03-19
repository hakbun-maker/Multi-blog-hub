-- 성능 인덱스 추가 (Performance Indexes)
-- 마이그레이션 025-029에서 생성된 모든 테이블에 대한 인덱스

-- keywords 테이블 인덱스
-- 키워드 등급별 조회 성능 개선
CREATE INDEX IF NOT EXISTS idx_keywords_grade ON keywords(keyword_grade);

-- 키워드 유형별 조회 성능 개선
CREATE INDEX IF NOT EXISTS idx_keywords_type ON keywords(keyword_type);

-- 시즌성 키워드 필터링 성능 개선
CREATE INDEX IF NOT EXISTS idx_keywords_seasonal ON keywords(is_seasonal) WHERE is_seasonal = true;

-- 사용자별 키워드 유형 조회 성능 개선
CREATE INDEX IF NOT EXISTS idx_keywords_user_type ON keywords(user_id, keyword_type);

-- 수익성 점수 정렬 성능 개선
CREATE INDEX IF NOT EXISTS idx_keywords_revenue_score ON keywords(revenue_score DESC);

-- keyword_clusters 테이블 인덱스
-- 시드 키워드별 클러스터 조회 성능 개선
CREATE INDEX IF NOT EXISTS idx_clusters_seed ON keyword_clusters(seed_keyword_id);

-- 사용자별 클러스터 조회 성능 개선
CREATE INDEX IF NOT EXISTS idx_clusters_user ON keyword_clusters(user_id);

-- scheduled_posts 테이블 인덱스
-- 예약된 날짜별 조회 성능 개선
CREATE INDEX IF NOT EXISTS idx_scheduled_date ON scheduled_posts(scheduled_date);

-- 블로그별 예약 포스트 조회 성능 개선
CREATE INDEX IF NOT EXISTS idx_scheduled_blog ON scheduled_posts(blog_id);

-- 대기 중인 포스트 필터링 성능 개선
CREATE INDEX IF NOT EXISTS idx_pending_posts ON scheduled_posts(status) WHERE status = 'pending';

-- 블로그별 날짜별 예약 포스트 조회 성능 개선
CREATE INDEX IF NOT EXISTS idx_scheduled_blog_date ON scheduled_posts(blog_id, scheduled_date);

-- post_quality_scores 테이블 인덱스
-- 포스트별 품질 점수 조회 성능 개선
CREATE INDEX IF NOT EXISTS idx_quality_post ON post_quality_scores(post_id);

-- 자동 발행된 포스트 필터링 성능 개선
CREATE INDEX IF NOT EXISTS idx_quality_auto_published ON post_quality_scores(auto_published) WHERE auto_published = true;

-- revenue_analytics 테이블 인덱스
-- 분석 날짜별 조회 성능 개선
CREATE INDEX IF NOT EXISTS idx_revenue_date ON revenue_analytics(analytics_date);

-- 광고 카테고리별 수익 조회 성능 개선
CREATE INDEX IF NOT EXISTS idx_revenue_category ON revenue_analytics(ad_category);

-- 블로그별 날짜별 수익 분석 조회 성능 개선
CREATE INDEX IF NOT EXISTS idx_revenue_blog_date ON revenue_analytics(blog_id, analytics_date);

-- post_ad_performance 테이블 인덱스
-- 포스트별 광고 성과 조회 성능 개선
CREATE INDEX IF NOT EXISTS idx_ad_perf_post ON post_ad_performance(post_id);

-- 성과 날짜별 조회 성능 개선
CREATE INDEX IF NOT EXISTS idx_ad_perf_date ON post_ad_performance(performance_date);

-- blog_keyword_assignments 테이블 인덱스
-- 블로그별 키워드 할당 조회 성능 개선
CREATE INDEX IF NOT EXISTS idx_bka_blog ON blog_keyword_assignments(blog_id);

-- 키워드별 할당 조회 성능 개선
CREATE INDEX IF NOT EXISTS idx_bka_keyword ON blog_keyword_assignments(keyword_id);

-- 할당 날짜별 조회 성능 개선
CREATE INDEX IF NOT EXISTS idx_bka_date ON blog_keyword_assignments(assigned_date);

-- keyword_search_history 테이블 인덱스
-- 사용자별 검색 이력 조회 성능 개선
CREATE INDEX IF NOT EXISTS idx_ksh_user ON keyword_search_history(user_id);

-- 최근 검색 이력 정렬 성능 개선
CREATE INDEX IF NOT EXISTS idx_ksh_created ON keyword_search_history(created_at DESC);
