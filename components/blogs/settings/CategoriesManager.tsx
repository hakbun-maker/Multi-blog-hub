'use client'

import { useEffect, useState } from 'react'
import { Pencil, X, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCategories } from '@/hooks/useCategories'

interface CategoriesManagerProps {
  blogId: string
}

export function CategoriesManager({ blogId }: CategoriesManagerProps) {
  const { categories, fetchCategories, createCategory, updateCategory, deleteCategory } = useCategories(blogId)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [editingCatId, setEditingCatId] = useState<string | null>(null)
  const [editingCatName, setEditingCatName] = useState('')
  const [defaultCategoryId, setDefaultCategoryId] = useState<string | null>(null)
  const [deletingCatId, setDeletingCatId] = useState<string | null>(null)
  const [moveToCatId, setMoveToCatId] = useState<string>('none')
  const [success, setSuccess] = useState('')

  useEffect(() => { fetchCategories() }, [fetchCategories])

  useEffect(() => {
    const fetchDefault = async () => {
      const res = await fetch(`/api/blogs/${blogId}`)
      if (!res.ok) return
      const { data } = await res.json()
      setDefaultCategoryId(data.default_category_id ?? null)
    }
    fetchDefault()
  }, [blogId])

  const showSuccess = (msg: string) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(''), 3000)
  }

  return (
    <div className="space-y-6">
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-2.5 rounded-lg">{success}</div>
      )}

      {/* 기본 카테고리 설정 */}
      <div className="space-y-2">
        <Label>기본 카테고리</Label>
        <p className="text-xs text-gray-400">새 글 작성 시 자동으로 선택되는 카테고리입니다.</p>
        <select
          value={defaultCategoryId ?? ''}
          onChange={async (e) => {
            const val = e.target.value || null
            setDefaultCategoryId(val)
            await fetch(`/api/blogs/${blogId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ defaultCategoryId: val }),
            })
            showSuccess('기본 카테고리가 변경되었습니다.')
          }}
          className="text-sm border border-gray-200 rounded-md px-3 py-2 bg-white w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">없음</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* 카테고리 추가 */}
      <div className="space-y-2">
        <Label>카테고리 추가</Label>
        <div className="flex gap-2">
          <Input
            value={newCategoryName}
            onChange={e => setNewCategoryName(e.target.value)}
            placeholder="새 카테고리 이름"
            className="max-w-xs"
            onKeyDown={async (e) => {
              if (e.key === 'Enter' && newCategoryName.trim()) {
                await createCategory(newCategoryName.trim())
                setNewCategoryName('')
                showSuccess('카테고리가 추가되었습니다.')
              }
            }}
          />
          <Button
            size="sm"
            disabled={!newCategoryName.trim()}
            onClick={async () => {
              await createCategory(newCategoryName.trim())
              setNewCategoryName('')
              showSuccess('카테고리가 추가되었습니다.')
            }}
          >
            추가
          </Button>
        </div>
      </div>

      {/* 카테고리 목록 */}
      <div className="space-y-2">
        <Label>카테고리 목록</Label>
        {categories.length === 0 ? (
          <p className="text-sm text-gray-400">등록된 카테고리가 없습니다.</p>
        ) : (
          <div className="space-y-1">
            {categories.map(cat => (
              <div key={cat.id}>
                <div className="flex items-center gap-2 p-2.5 rounded-lg border border-gray-200 hover:bg-gray-50">
                  {editingCatId === cat.id ? (
                    <>
                      <Input
                        value={editingCatName}
                        onChange={e => setEditingCatName(e.target.value)}
                        className="flex-1 h-8 text-sm"
                        autoFocus
                        onKeyDown={async (e) => {
                          if (e.key === 'Enter' && editingCatName.trim()) {
                            await updateCategory(cat.id, { name: editingCatName.trim() })
                            setEditingCatId(null)
                            showSuccess('카테고리 이름이 변경되었습니다.')
                          }
                          if (e.key === 'Escape') setEditingCatId(null)
                        }}
                      />
                      <Button size="sm" variant="ghost" className="h-7" onClick={() => setEditingCatId(null)}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" className="h-7" onClick={async () => {
                        if (!editingCatName.trim()) return
                        await updateCategory(cat.id, { name: editingCatName.trim() })
                        setEditingCatId(null)
                        showSuccess('카테고리 이름이 변경되었습니다.')
                      }}>
                        저장
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm text-gray-800">{cat.name}</span>
                      {defaultCategoryId === cat.id && (
                        <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">기본</span>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => { setEditingCatId(cat.id); setEditingCatName(cat.name) }}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-red-400 hover:text-red-600"
                        onClick={async () => {
                          const result = await deleteCategory(cat.id)
                          if (result.ok) {
                            showSuccess('카테고리가 삭제되었습니다.')
                            if (defaultCategoryId === cat.id) setDefaultCategoryId(null)
                          } else if (result.postCount) {
                            setDeletingCatId(cat.id)
                            setMoveToCatId('none')
                          } else {
                            alert(result.error ?? '삭제에 실패했습니다.')
                          }
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </>
                  )}
                </div>
                {/* 글 이동 다이얼로그 */}
                {deletingCatId === cat.id && (
                  <div className="ml-4 mt-1 p-3 bg-yellow-50 border border-yellow-200 rounded-lg space-y-2">
                    <p className="text-sm text-yellow-800">
                      이 카테고리에 글이 있습니다. 글을 이동할 곳을 선택하세요.
                    </p>
                    <select
                      value={moveToCatId}
                      onChange={e => setMoveToCatId(e.target.value)}
                      className="text-sm border border-yellow-300 rounded-md px-2 py-1.5 bg-white w-full"
                    >
                      <option value="none">미분류</option>
                      {categories.filter(c => c.id !== cat.id).map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDeletingCatId(null)}
                      >
                        취소
                      </Button>
                      <Button
                        size="sm"
                        className="bg-red-500 hover:bg-red-600 text-white"
                        onClick={async () => {
                          const result = await deleteCategory(cat.id, moveToCatId)
                          if (result.ok) {
                            setDeletingCatId(null)
                            showSuccess('카테고리가 삭제되고 글이 이동되었습니다.')
                            if (defaultCategoryId === cat.id) setDefaultCategoryId(null)
                          }
                        }}
                      >
                        글 이동 후 삭제
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
