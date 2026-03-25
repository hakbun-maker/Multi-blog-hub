-- google_indexing provider 허용
ALTER TABLE public.user_oauth_tokens
  DROP CONSTRAINT check_oauth_provider;

ALTER TABLE public.user_oauth_tokens
  ADD CONSTRAINT check_oauth_provider CHECK (provider IN ('google_analytics', 'google_indexing'));
