import { Route, Routes } from "react-router-dom"

import { NotFoundPage } from "@/app/NotFoundPage"
import { WorkspacePage } from "@/features/datafilter/WorkspacePage"

export function DatafilterRoutes() {
  return (
    <Routes>
      <Route index element={<WorkspacePage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
