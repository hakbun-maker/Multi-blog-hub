-- 키워드 자동 수집 설정 테이블
CREATE TABLE IF NOT EXISTS keyword_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  auto_discover boolean DEFAULT false,
  min_score integer DEFAULT 60,
  preferred_intents text[] DEFAULT ARRAY['AD','REVIEW','INFO','COMPARE','TREND','CRITIC'],
  max_daily_keywords integer DEFAULT 50,
  event_sources jsonb DEFAULT '{"interpark":true,"yes24":true,"melon":true,"google_trends":true,"sports":true,"festivals":true}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE keyword_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own keyword settings" ON keyword_settings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
