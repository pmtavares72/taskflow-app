import { AiPanel } from './AiPanel'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'
import { SearchOverlay } from '@/components/search/SearchOverlay'

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <SearchOverlay />
      {/* AI Panel — solo desktop (≥900px) */}
      <div className="hidden lg:block">
        <AiPanel />
      </div>

      {/* Sidebar nav — solo desktop (≥768px) */}
      <Sidebar />

      {/* Contenido principal */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: 'var(--bg)',
        // padding inferior en móvil para el BottomNav
        paddingBottom: 0,
      }}>
        {children}
      </main>

      {/* Bottom nav — solo móvil (<768px) */}
      <BottomNav />
    </div>
  )
}
