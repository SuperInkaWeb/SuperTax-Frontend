import { useAuth0 } from "@auth0/auth0-react"
import { Link, Navigate } from "react-router-dom"

import { AUTH0_DOMAIN } from "@/shared/lib/config"
import { Button } from "@/shared/ui/button"
import { Spinner } from "@/shared/ui/spinner"

export function LoginPage() {
  const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0()
  const auth0Configurado = AUTH0_DOMAIN.length > 0

  function iniciar() {
    void loginWithRedirect()
  }

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Spinner />
      </div>
    )
  }
  if (isAuthenticated) return <Navigate to="/dashboard" replace />

  return (
    <div className="grid min-h-screen place-items-center bg-background p-6">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div>
          <h1 className="text-2xl font-semibold">Plataforma</h1>
          <p className="mt-1 text-sm text-muted-foreground">Escaneo · SUNAT · SIRE</p>
        </div>
        {auth0Configurado ? (
          <>
            <Button className="w-full" onClick={iniciar}>
              Iniciar sesión
            </Button>
            <p className="text-sm text-muted-foreground">
              ¿No tienes cuenta?{" "}
              <Link to="/solicitar-acceso" className="font-medium text-foreground underline">
                Solicitar acceso
              </Link>
            </p>
          </>
        ) : (
          <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            Configura <code>VITE_AUTH0_DOMAIN</code>, <code>VITE_AUTH0_CLIENT_ID</code> y{" "}
            <code>VITE_AUTH0_AUDIENCE</code> en <code>.env</code> para habilitar el login.
          </p>
        )}
      </div>
    </div>
  )
}
