import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Dimension = 'blog' | 'category' | 'language' | 'type'

export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const dimension = (searchParams.get('dimension') || 'blog') as Dimension
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Validate dimension
    const validDimensions: Dimension[] = ['blog', 'category', 'language', 'type']
    if (!validDimensions.includes(dimension)) {
      return NextResponse.json(
        { error: `Invalid dimension. Must be one of: ${validDimensions.join(', ')}` },
        { status: 400 }
      )
    }

    // Get user's blog IDs
    const { data: userBlogs, error: blogsError } = await supabase
      .from('blogs')
      .select('id')
      .eq('user_id', user.id)

    if (blogsError) throw blogsError
    const userBlogIds = userBlogs?.map(b => b.id) || []

    if (userBlogIds.length === 0) {
      return NextResponse.json({ data: [] })
    }

    // Build base query
    let query = supabase
      .from('revenue_analytics')
      .select('blog_id, actual_revenue, estimated_revenue, page_views, rpm, analytics_date')
      .in('blog_id', userBlogIds)

    // Apply date filters
    if (startDate) {
      query = query.gte('analytics_date', startDate)
    }
    if (endDate) {
      query = query.lte('analytics_date', endDate)
    }

    const { data: analyticsData, error: analyticsError } = await query

    if (analyticsError) throw analyticsError

    // Process data based on dimension
    let result: Record<string, any> = {}

    if (dimension === 'blog') {
      // Group by blog
      const { data: blogs, error: blogListError } = await supabase
        .from('blogs')
        .select('id, name')
        .in('id', userBlogIds)

      if (blogListError) throw blogListError

      result = {}
      blogs?.forEach(blog => {
        const blogData = analyticsData?.filter(a => a.blog_id === blog.id) || []
        result[blog.name] = {
          blogId: blog.id,
          totalRevenue: Math.round(blogData.reduce((sum, a) => sum + (a.actual_revenue || 0), 0) * 100) / 100,
          estimatedRevenue: Math.round(blogData.reduce((sum, a) => sum + (a.estimated_revenue || 0), 0) * 100) / 100,
          totalPageViews: blogData.reduce((sum, a) => sum + (a.page_views || 0), 0),
          averageRpm: blogData.length ? Math.round((blogData.reduce((sum, a) => sum + (a.rpm || 0), 0) / blogData.length) * 100) / 100 : 0,
          dataPoints: blogData.length,
        }
      })
    } else if (dimension === 'category') {
      // Group by category from blogs
      const { data: blogsWithCategory, error: blogCategoryError } = await supabase
        .from('blogs')
        .select('id, category')
        .in('id', userBlogIds)

      if (blogCategoryError) throw blogCategoryError

      const categoryMap = new Map<string, string[]>()
      blogsWithCategory?.forEach(blog => {
        const category = blog.category || 'Uncategorized'
        if (!categoryMap.has(category)) {
          categoryMap.set(category, [])
        }
        categoryMap.get(category)!.push(blog.id)
      })

      result = {}
      categoryMap.forEach((blogIds, category) => {
        const categoryData = analyticsData?.filter(a => blogIds.includes(a.blog_id)) || []
        result[category] = {
          totalRevenue: Math.round(categoryData.reduce((sum, a) => sum + (a.actual_revenue || 0), 0) * 100) / 100,
          estimatedRevenue: Math.round(categoryData.reduce((sum, a) => sum + (a.estimated_revenue || 0), 0) * 100) / 100,
          totalPageViews: categoryData.reduce((sum, a) => sum + (a.page_views || 0), 0),
          averageRpm: categoryData.length ? Math.round((categoryData.reduce((sum, a) => sum + (a.rpm || 0), 0) / categoryData.length) * 100) / 100 : 0,
          dataPoints: categoryData.length,
        }
      })
    } else if (dimension === 'language') {
      // Group by language from blogs
      const { data: blogsWithLanguage, error: blogLanguageError } = await supabase
        .from('blogs')
        .select('id, language')
        .in('id', userBlogIds)

      if (blogLanguageError) throw blogLanguageError

      const languageMap = new Map<string, string[]>()
      blogsWithLanguage?.forEach(blog => {
        const language = blog.language || 'Unknown'
        if (!languageMap.has(language)) {
          languageMap.set(language, [])
        }
        languageMap.get(language)!.push(blog.id)
      })

      result = {}
      languageMap.forEach((blogIds, language) => {
        const languageData = analyticsData?.filter(a => blogIds.includes(a.blog_id)) || []
        result[language] = {
          totalRevenue: Math.round(languageData.reduce((sum, a) => sum + (a.actual_revenue || 0), 0) * 100) / 100,
          estimatedRevenue: Math.round(languageData.reduce((sum, a) => sum + (a.estimated_revenue || 0), 0) * 100) / 100,
          totalPageViews: languageData.reduce((sum, a) => sum + (a.page_views || 0), 0),
          averageRpm: languageData.length ? Math.round((languageData.reduce((sum, a) => sum + (a.rpm || 0), 0) / languageData.length) * 100) / 100 : 0,
          dataPoints: languageData.length,
        }
      })
    } else if (dimension === 'type') {
      // Group by type from scheduled_posts
      const { data: posts, error: postsError } = await supabase
        .from('scheduled_posts')
        .select('blog_id, type')
        .in('blog_id', userBlogIds)

      if (postsError) throw postsError

      const typeMap = new Map<string, string[]>()
      posts?.forEach(post => {
        const type = post.type || 'article'
        if (!typeMap.has(type)) {
          typeMap.set(type, [])
        }
        if (!typeMap.get(type)!.includes(post.blog_id)) {
          typeMap.get(type)!.push(post.blog_id)
        }
      })

      result = {}
      typeMap.forEach((blogIds, type) => {
        const typeData = analyticsData?.filter(a => blogIds.includes(a.blog_id)) || []
        result[type] = {
          totalRevenue: Math.round(typeData.reduce((sum, a) => sum + (a.actual_revenue || 0), 0) * 100) / 100,
          estimatedRevenue: Math.round(typeData.reduce((sum, a) => sum + (a.estimated_revenue || 0), 0) * 100) / 100,
          totalPageViews: typeData.reduce((sum, a) => sum + (a.page_views || 0), 0),
          averageRpm: typeData.length ? Math.round((typeData.reduce((sum, a) => sum + (a.rpm || 0), 0) / typeData.length) * 100) / 100 : 0,
          dataPoints: typeData.length,
        }
      })
    }

    return NextResponse.json({
      data: result,
      filters: {
        dimension,
        startDate,
        endDate,
      },
    })
  } catch (error: any) {
    console.error('Analytics API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
