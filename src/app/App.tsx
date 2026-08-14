import { useAuth0 } from "@auth0/auth0-react"
import { lazy, Suspense } from "react"
import { Navigate, Route, Routes } from "react-router-dom"

import { AppShell } from "@/app/layout/AppShell"
import { Providers } from "@/app/providers"
import { LoginPage } from "@/features/auth/LoginPage"
import { SolicitarAccesoPage } from "@/features/onboarding/SolicitarAccesoPage"
import { Spinner } from "@/shared/ui/spinner"

import type { ReactNode } from "react"

// Cada feature se descarga solo al entrar a su ruta (code-splitting por módulo).
const DashboardPage = lazy(() =>
  import("@/features/dashboard/DashboardPage").then((m) => ({ default: m.DashboardPage })),
)
const SireRoutes = lazy(() =>
  import("@/features/sire/SireRoutes").then((m) => ({ default: m.SireRoutes })),
)
const SunatRoutes = lazy(() =>
  import("@/features/sunat/SunatRoutes").then((m) => ({ default: m.SunatRoutes })),
)
const ScannerRoutes = lazy(() =>
  import("@/features/scanner/ScannerRoutes").then((m) => ({ default: m.ScannerRoutes })),
)
const AdminRoutes = lazy(() =>
  import("@/features/admin/AdminRoutes").then((m) => ({ default: m.AdminRoutes })),
)

function Cargando() {
  return (
    <div className="grid min-h-screen place-items-center">
      <Spinner />
    </div>
  )
}

function Protected({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth0()
  if (isLoading) return <Cargando />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

export function App() {
  return (
    <Providers>
      <Suspense fallback={<Cargando />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/solicitar-acceso" element={<SolicitarAccesoPage />} />
          <Route
            element={
              <Protected>
                <AppShell />
              </Protected>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/sire/*" element={<SireRoutes />} />
            <Route path="/sunat/*" element={<SunatRoutes />} />
            <Route path="/scanner/*" element={<ScannerRoutes />} />
            <Route path="/admin/*" element={<AdminRoutes />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </Providers>
  )
}
