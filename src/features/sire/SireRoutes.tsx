import { Route, Routes } from "react-router-dom"

import { NotFoundPage } from "@/app/NotFoundPage"
import { CredencialesPage } from "@/features/sire/CredencialesPage"
import { FormatoPage } from "@/features/sire/FormatoPage"
import { JobDetailPage } from "@/features/sire/JobDetailPage"
import { JobsPage } from "@/features/sire/JobsPage"
import { NuevaConciliacionPage } from "@/features/sire/NuevaConciliacionPage"
import { SireLayout } from "@/features/sire/SireLayout"

export function SireRoutes() {
  return (
    <Routes>
      {/* El detalle es página completa (sin las pestañas del módulo). */}
      <Route path="jobs/:id" element={<JobDetailPage />} />
      <Route element={<SireLayout />}>
        <Route index element={<JobsPage />} />
        <Route path="nueva" element={<NuevaConciliacionPage />} />
        <Route path="credenciales" element={<CredencialesPage />} />
        <Route path="formato" element={<FormatoPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
