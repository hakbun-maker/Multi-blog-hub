-- AI API Keys 테이블 (암호화 저장)
CREATE TABLE IF NOT EXISTS public.ai_api_keys (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  provider    TEXT NOT NULL CHECK (provider IN ('claude', 'openai', 'gemini')),
  encrypted_key TEXT NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider)
);

-- RLS
ALTER TABLE public.ai_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_api_keys: 본인만 조회"
  ON public.ai_api_keys FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "ai_api_keys: 본인만 삽입"
  ON public.ai_api_keys FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ai_api_keys: 본인만 수정"
  ON public.ai_api_keys FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "ai_api_keys: 본인만 삭제"
  ON public.ai_api_keys FOR DELETE
  USING (auth.uid() = user_id);
