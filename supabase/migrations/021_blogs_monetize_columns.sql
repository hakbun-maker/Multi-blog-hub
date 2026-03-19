-- P0-T1: 블로그 등급, 일일 쿼터, 광고 카테고리, 언어, 로켓 활성화 컬럼 추가
-- 블로그 설정 테이블 생성 및 RLS 정책 적용

-- 1. blogs 테이블에 등급(grade) 컬럼 추가
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS grade VARCHAR(1) DEFAULT 'C'
  CHECK (grade IN ('S','A','B','C','D'));

-- 2. blogs 테이블에 일일 쿼터(daily_quota) 컬럼 추가
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS daily_quota INT DEFAULT 3;

-- 3. blogs 테이블에 주요 광고 카테고리(primary_ad_category) 컬럼 추가
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS primary_ad_category VARCHAR(50);

-- 4. blogs 테이블에 언어(language) 컬럼 추가
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'ko';

-- 5. blogs 테이블에 로켓 활성화(rocket_enabled) 컬럼 추가
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS rocket_enabled BOOLEAN DEFAULT false;

-- 6. 블로그 설정 테이블 생성
-- SNS 연동, 제휴 설정, 언어 설정, 쿠팡 설정 등을 저장하는 통합 설정 테이블
CREATE TABLE IF NOT EXISTS public.blog_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  blog_id UUID REFERENCES public.blogs(id) ON DELETE CASCADE NOT NULL UNIQUE,
  sns_settings JSONB DEFAULT '{}',
  affiliate_config JSONB DEFAULT '{}',
  language_settings JSONB DEFAULT '{}',
  coupang_settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 7. blog_settings 테이블에 RLS 활성화
ALTER TABLE public.blog_settings ENABLE ROW LEVEL SECURITY;

-- 8. blog_settings RLS 정책: 본인 블로그의 설정만 조회
CREATE POLICY "blog_settings: 본인 블로그만 조회" ON public.blog_settings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.blogs WHERE blogs.id = blog_settings.blog_id AND blogs.user_id = auth.uid())
  );

-- 9. blog_settings RLS 정책: 본인 블로그의 설정만 생성
CREATE POLICY "blog_settings: 본인 블로그만 생성" ON public.blog_settings
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.blogs WHERE blogs.id = blog_settings.blog_id AND blogs.user_id = auth.uid())
  );

-- 10. blog_settings RLS 정책: 본인 블로그의 설정만 수정
CREATE POLICY "blog_settings: 본인 블로그만 수정" ON public.blog_settings
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.blogs WHERE blogs.id = blog_settings.blog_id AND blogs.user_id = auth.uid())
  );

-- 11. blog_settings RLS 정책: 본인 블로그의 설정만 삭제
CREATE POLICY "blog_settings: 본인 블로그만 삭제" ON public.blog_settings
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.blogs WHERE blogs.id = blog_settings.blog_id AND blogs.user_id = auth.uid())
  );

-- 12. blog_settings 테이블의 blog_id 컬럼에 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_blog_settings_blog_id ON public.blog_settings(blog_id);
