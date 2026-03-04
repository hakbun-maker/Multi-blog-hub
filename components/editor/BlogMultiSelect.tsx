'use client'

interface Blog {
  id: string
  name: string
  color: string | null
  ai_provider: string | null
}

interface BlogMultiSelectProps {
  blogs: Blog[]
  selectedIds: string[]
  onToggle: (id: string) => void
}

const BLOG_COLORS = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#06b6d4','#84cc16','#f97316']

export function BlogMultiSelect({ blogs, selectedIds, onToggle }: BlogMultiSelectProps) {
  if (!blogs.length) {
    return <p className="text-sm text-gray-400">블로그가 없습니다. 먼저 블로그를 만들어주세요.</p>
  }

  return (
    <div className="space-y-2">
      {blogs.map((blog, i) => {
        const color = blog.color ?? BLOG_COLORS[i % BLOG_COLORS.length]
        const selected = selectedIds.includes(blog.id)
        return (
          <label key={blog.id}
            className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${
              selected ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
            }`}>
            <input type="checkbox" checked={selected} onChange={() => onToggle(blog.id)}
              className="w-4 h-4 text-blue-600 rounded" />
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
            <span className="text-sm font-medium text-gray-800 flex-1">{blog.name}</span>
            <span className="text-xs text-gray-400">{blog.ai_provider ?? 'claude'}</span>
          </label>
        )
      })}
    </div>
  )
}
