-- Storage 버킷 RLS 정책: post-images
-- Supabase Dashboard에서 'post-images' 버킷을 Public으로 미리 생성해야 합니다.

-- 인증된 사용자는 자신의 폴더에 업로드 가능
-- 파일 경로 형식: {user_id}/{filename}
CREATE POLICY "Users can upload own images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'post-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 인증된 사용자는 자신의 파일 목록 조회 가능
CREATE POLICY "Users can view own images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'post-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 인증된 사용자는 자신의 파일 삭제 가능
CREATE POLICY "Users can delete own images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'post-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 공개 읽기 (Public 버킷이므로 URL로 직접 접근 가능)
CREATE POLICY "Public images are viewable by everyone"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'post-images');
