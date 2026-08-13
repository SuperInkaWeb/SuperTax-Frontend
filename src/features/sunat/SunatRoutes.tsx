import { Route, Routes } from "react-router-dom"

import { CredencialesPage } from "@/features/sunat/CredencialesPage"
import { DescargarPage } from "@/features/sunat/DescargarPage"
import { DrivePage } from "@/features/sunat/DrivePage"
import { HistorialPage } from "@/features/sunat/HistorialPage"
import { SunatLayout } from "@/features/sunat/SunatLayout"

export function SunatRoutes() {
  return (
    <Routes>
      <Route element={<SunatLayout />}>
        <Route index element={<DescargarPage />} />
        <Route path="credenciales" element={<CredencialesPage />} />
        <Route path="drive" element={<DrivePage />} />
        <Route path="historial" element={<HistorialPage />} />
      </Route>
    </Routes>
  )
}
