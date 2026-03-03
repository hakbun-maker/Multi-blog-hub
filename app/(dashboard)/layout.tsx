// 인증 필요 레이아웃 - AppSidebar + AppHeader 포함
// TODO: P1-S0-T1에서 구현

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen">
      {/* TODO: AppSidebar */}
      <aside className="w-60 bg-white border-r border-gray-200 flex-shrink-0">
        <div className="p-4">
          <p className="font-bold text-primary-600">Multi Blog Hub</p>
        </div>
      </aside>
      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {/* TODO: AppHeader */}
        <div className="p-6">{children}</div>
      </main>
    </div>
  )
}
