import { Navigate, Route, Routes } from "react-router-dom"

import { NotFoundPage } from "@/app/NotFoundPage"
import { AdministradoresPage } from "@/features/admin/AdministradoresPage"
import { AdminLayout } from "@/features/admin/AdminLayout"
import { EmpresasPage } from "@/features/admin/EmpresasPage"
import { EquipoPage } from "@/features/admin/EquipoPage"
import { MiembrosPage } from "@/features/admin/MiembrosPage"
import { SolicitudesAccesoPage } from "@/features/admin/SolicitudesAccesoPage"
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
        <Route path="equipo" element={<EquipoPage />} />
        <Route path="administradores" element={<AdministradoresPage />} />
        <Route path="solicitudes-acceso" element={<SolicitudesAccesoPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
