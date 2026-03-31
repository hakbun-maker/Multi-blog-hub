import { NextResponse } from 'next/server'
import { runKeywordDiscoverPipeline } from '@/lib/monetize/pipeline/keyword-discover'

// Vercel Cron: runs at UTC 20:00 (KST 05:00)
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const results = await runKeywordDiscoverPipeline()

    const summary = {
      totalUsers: results.length,
      totalKeywordsFound: results.reduce(
        (acc, r) => acc + r.goldFound + r.eventFound + r.seasonFound,
        0
      ),
      totalSaved: results.reduce((acc, r) => acc + r.totalSaved, 0),
      totalDistributed: results.reduce((acc, r) => acc + r.distributed, 0),
      totalEventClusters: results.reduce((acc, r) => acc + r.eventClustersCreated, 0),
      usersWithErrors: results.filter(r => r.errors.length > 0).length,
    }

    return NextResponse.json({ summary, results })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Cron/keyword-discover] Fatal error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
