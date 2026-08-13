import { Navigate, Route, Routes } from "react-router-dom"

import { AdminLayout } from "@/features/admin/AdminLayout"
import { EmpresasPage } from "@/features/admin/EmpresasPage"
import { MiembrosPage } from "@/features/admin/MiembrosPage"
import { SolicitudesPage } from "@/features/admin/SolicitudesPage"
import { useAuthStore } from "@/shared/stores/auth"

export function AdminRoutes() {
  const esPlatformAdmin = useAuthStore((s) => s.user?.is_platform_admin ?? false)
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route
          index
          element={esPlatformAdmin ? <EmpresasPage /> : <Navigate to="miembros" replace />}
        />
        <Route path="solicitudes" element={<SolicitudesPage />} />
        <Route path="miembros" element={<MiembrosPage />} />
      </Route>
    </Routes>
  )
}
