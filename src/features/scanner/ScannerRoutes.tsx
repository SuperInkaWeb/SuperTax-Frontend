import { Route, Routes } from "react-router-dom"

import { DocumentosPage } from "@/features/scanner/DocumentosPage"
import { ScannerLayout } from "@/features/scanner/ScannerLayout"
import { SubirPage } from "@/features/scanner/SubirPage"

export function ScannerRoutes() {
  return (
    <Routes>
      <Route element={<ScannerLayout />}>
        <Route index element={<SubirPage />} />
        <Route path="documentos" element={<DocumentosPage />} />
      </Route>
    </Routes>
  )
}
