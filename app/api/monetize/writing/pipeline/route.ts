import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { data: blogs } = await supabase
      .from('blogs')
      .select('id')
      .eq('user_id', user.id)

    const blogIds = blogs?.map(b => b.id) || []
    if (blogIds.length === 0) {
      return NextResponse.json({ data: { pending: 0, writing: 0, reviewing: 0, published: 0, rejected: 0, total: 0 } })
    }

    const { data: posts } = await supabase
      .from('scheduled_posts')
      .select('status')
      .in('blog_id', blogIds)

    const counts = {
      pending: 0, writing: 0, reviewing: 0, published: 0, rejected: 0, total: 0,
    }
    for (const post of (posts || [])) {
      counts.total++
      if (post.status === 'pending') counts.pending++
      else if (post.status === 'writing') counts.writing++
      else if (['reviewing', 'review_queue'].includes(post.status)) counts.reviewing++
      else if (['auto_published', 'published'].includes(post.status)) counts.published++
      else if (post.status === 'rejected') counts.rejected++
    }

    return NextResponse.json({ data: counts })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
