import { useState } from "react"
import { Outlet } from "react-router-dom"

import { Sidebar, SidebarDrawer } from "@/app/layout/Sidebar"
import { Topbar } from "@/app/layout/Topbar"
import { ConfirmHost } from "@/shared/ui/confirm"

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <SidebarDrawer open={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenu={() => setMobileOpen(true)} />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
      <ConfirmHost />
    </div>
  )
}
