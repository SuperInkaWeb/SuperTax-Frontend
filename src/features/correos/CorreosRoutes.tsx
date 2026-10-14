import { Route, Routes } from "react-router-dom"

import { NotFoundPage } from "@/app/NotFoundPage"
import { AuditoriaPage } from "@/features/correos/AuditoriaPage"
import { BuzonesPage } from "@/features/correos/BuzonesPage"
import { CorreosLayout } from "@/features/correos/CorreosLayout"
import { EscaneosPage } from "@/features/correos/EscaneosPage"
import { OAuthCallbackPage } from "@/features/correos/OAuthCallbackPage"
import { RevisionPage } from "@/features/correos/RevisionPage"

export function CorreosRoutes() {
  return (
    <Routes>
      {/* Retorno del consentimiento OAuth: fuera del layout con pestañas. */}
      <Route path="oauth/callback" element={<OAuthCallbackPage />} />
      <Route element={<CorreosLayout />}>
        <Route index element={<BuzonesPage />} />
        <Route path="escaneos" element={<EscaneosPage />} />
        <Route path="revision" element={<RevisionPage />} />
        <Route path="auditoria" element={<AuditoriaPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
