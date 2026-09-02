import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'

/**
 * The application shell.
 *
 * The sidebar is static from `lg` up and collapses to an overlay below it,
 * which keeps the dense desktop layout intact while staying usable on a
 * tablet or phone.
 */
export function AppLayout() {
  const [navOpen, setNavOpen] = useState(false)

  return (
    <div className="flex h-full">
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenuClick={() => setNavOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1400px] p-4 sm:p-5">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
