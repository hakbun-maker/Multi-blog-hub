import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserPlanContext, isFeatureEnabled } from '@/lib/plan/server'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: blog } = await supabase
    .from('blogs')
    .select('id, language')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!blog) return NextResponse.json({ error: 'Blog not found' }, { status: 404 })

  const { data: settings } = await supabase
    .from('blog_settings')
    .select('language_settings')
    .eq('blog_id', params.id)
    .single()

  return NextResponse.json({
    data: {
      language: blog.language || 'ko',
      writeStyle: settings?.language_settings?.writeStyle || '',
    }
  })
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { language, writeStyle } = body

  // Verify user owns blog
  const { data: blog } = await supabase
    .from('blogs')
    .select('id, user_id')
    .eq('id', params.id)
    .single()

  if (!blog || blog.user_id !== user.id) {
    return NextResponse.json({ error: 'Blog not found' }, { status: 404 })
  }

  // Plan check: non-ko requires Growth+
  if (language && language !== 'ko') {
    const ctx = await getUserPlanContext()
    if (!ctx || !isFeatureEnabled(ctx, 'multilingual')) {
      return NextResponse.json({ error: 'plan_required', minPlan: 'growth' }, { status: 403 })
    }
  }

  // Update blog language
  if (language) {
    await supabase.from('blogs').update({ language }).eq('id', params.id).eq('user_id', user.id)
  }

  // Update/create blog_settings
  if (writeStyle !== undefined) {
    const { data: existing } = await supabase
      .from('blog_settings')
      .select('id, language_settings')
      .eq('blog_id', params.id)
      .single()

    if (existing) {
      await supabase
        .from('blog_settings')
        .update({ language_settings: { ...existing.language_settings, writeStyle } })
        .eq('blog_id', params.id)
    } else {
      await supabase
        .from('blog_settings')
        .insert({ blog_id: params.id, language_settings: { writeStyle } })
    }
  }

  return NextResponse.json({ success: true })
}
