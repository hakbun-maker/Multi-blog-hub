import { NextResponse } from 'next/server'
import { runAutoPublishPipeline } from '@/lib/monetize/pipeline/auto-publish'

// Vercel Cron: runs at UTC 21:00 (KST 06:00)
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const results = await runAutoPublishPipeline()

    const summary = {
      total: results.length,
      published: results.filter(r => r.status === 'auto_published').length,
      queued: results.filter(r => r.status === 'review_queue').length,
      skipped: results.filter(r => r.status === 'skipped').length,
      errors: results.filter(r => r.status === 'error').length,
    }

    return NextResponse.json({ summary, results })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
