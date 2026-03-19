import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateRevenueGuide } from '@/lib/monetize/engines/revenue-calculator'
import type { BlogLanguage } from '@/types/monetize'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { targetAmount, currentBlogCount, primaryCategory, language } = body

  // Validate inputs
  if (!targetAmount || !currentBlogCount || !primaryCategory || !language) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  try {
    const result = calculateRevenueGuide({
      targetAmount,
      currentBlogCount,
      primaryCategory,
      language: language as BlogLanguage,
    })

    return NextResponse.json({ data: result })
  } catch (error) {
    console.error('Revenue guide calculation error:', error)
    return NextResponse.json({ error: 'Calculation failed' }, { status: 500 })
  }
}
