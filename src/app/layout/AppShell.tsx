import { Outlet } from "react-router-dom"

import { Sidebar } from "@/app/layout/Sidebar"
import { Topbar } from "@/app/layout/Topbar"

export function AppShell() {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
