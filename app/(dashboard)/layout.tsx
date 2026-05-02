import { AppSidebar } from '@/components/layout/AppSidebar'
import { AppHeader } from '@/components/layout/AppHeader'
import { AppFooter } from '@/components/layout/AppFooter'
import { SidebarProvider } from '@/components/layout/SidebarContext'
import { PlanProvider } from '@/components/plan/PlanContext'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // users 테이블에서 display_name 조회 (설정에서 변경한 표시이름 반영)
  let headerName = user?.user_metadata?.name
  if (user) {
    const { data: profile } = await supabase
      .from('users')
      .select('display_name, name')
      .eq('id', user.id)
      .single()
    if (profile) {
      headerName = profile.display_name || profile.name || headerName
    }
  }

  return (
    <SidebarProvider>
      <PlanProvider>
        <div className="flex min-h-screen bg-gray-50">
          <AppSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <AppHeader
              userEmail={user?.email}
              userName={headerName}
            />
            <main className="flex-1 p-6 pb-20 md:pb-6 overflow-auto">
              {children}
            </main>
            <AppFooter />
          </div>
        </div>
      </PlanProvider>
    </SidebarProvider>
  )
}
