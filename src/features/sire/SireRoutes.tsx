import { Route, Routes } from "react-router-dom"

import { CredencialesPage } from "@/features/sire/CredencialesPage"
import { FormatoPage } from "@/features/sire/FormatoPage"
import { JobsPage } from "@/features/sire/JobsPage"
import { NuevaConciliacionPage } from "@/features/sire/NuevaConciliacionPage"
import { SireLayout } from "@/features/sire/SireLayout"

export function SireRoutes() {
  return (
    <Routes>
      <Route element={<SireLayout />}>
        <Route index element={<JobsPage />} />
        <Route path="nueva" element={<NuevaConciliacionPage />} />
        <Route path="credenciales" element={<CredencialesPage />} />
        <Route path="formato" element={<FormatoPage />} />
      </Route>
    </Routes>
  )
}
