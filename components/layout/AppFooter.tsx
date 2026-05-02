export function AppFooter() {
  const year = new Date().getFullYear()
  return (
    <footer className="border-t border-gray-200 bg-white px-6 py-4 mt-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-gray-500">
        <div>© {year} Multi Blog Hub · 운영: 학분</div>
        <nav className="flex items-center gap-4">
          <a href="/about" target="_blank" rel="noopener noreferrer" className="hover:text-gray-900 hover:underline">서비스 소개</a>
          <a href="/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-gray-900 hover:underline">개인정보처리방침</a>
          <a href="/terms" target="_blank" rel="noopener noreferrer" className="hover:text-gray-900 hover:underline">이용약관</a>
          <a href="mailto:leansha@gmail.com" className="hover:text-gray-900 hover:underline">문의</a>
        </nav>
      </div>
    </footer>
  )
}
