import { BlogCreateForm } from '@/components/blogs/BlogCreateForm'

export default function BlogNewPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">새 블로그 만들기</h1>
        <p className="text-sm text-gray-500 mt-1">블로그 기본 정보를 입력하세요.</p>
      </div>
      <BlogCreateForm />
    </div>
  )
}
