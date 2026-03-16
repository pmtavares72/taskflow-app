import { AiPanel } from './AiPanel'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'
import { SearchOverlay } from '@/components/search/SearchOverlay'

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <SearchOverlay />
      {/* AI Panel — solo desktop (≥1024px) */}
      <div className="hidden lg:block">
        <AiPanel />
      </div>

      {/* Sidebar nav — solo desktop (≥768px) */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Contenido principal */}
      <main className="pb-16 md:pb-0" style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: 'var(--bg)',
      }}>
        {children}
      </main>

      {/* Bottom nav — solo móvil (<768px) */}
      <BottomNav />
    </div>
  )
}
