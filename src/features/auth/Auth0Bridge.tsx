import { useAuth0 } from "@auth0/auth0-react"
import { useEffect } from "react"

import { getMe } from "@/shared/lib/api/me"
import { registrarLogout, registrarTokenGetter } from "@/shared/lib/authBridge"
import { AUTH0_AUDIENCE } from "@/shared/lib/config"
import { useActiveCompany } from "@/shared/stores/activeCompany"
import { useAuthStore } from "@/shared/stores/auth"

/**
 * Conecta el SDK de Auth0 con el resto de la app:
 * - registra cómo obtener el access token (para el interceptor de axios),
 * - registra el logout,
 * - al autenticarse carga /me y fija una empresa activa válida.
 */
export function Auth0Bridge() {
  const { isAuthenticated, getAccessTokenSilently, logout } = useAuth0()
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)

  useEffect(() => {
    registrarTokenGetter(() =>
      getAccessTokenSilently({ authorizationParams: { audience: AUTH0_AUDIENCE } }),
    )
    registrarLogout(() => {
      setUser(null)
      logout({ logoutParams: { returnTo: `${window.location.origin}/login` } })
    })
  }, [getAccessTokenSilently, logout, setUser])

  useEffect(() => {
    if (!isAuthenticated || user) return
    let cancelado = false
    getMe()
      .then((me) => {
        if (cancelado) return
        setUser(me)
        const { companyId, setCompanyId } = useActiveCompany.getState()
        const activaValida = me.companies.some((c) => c.id === companyId)
        if (!activaValida) setCompanyId(me.companies[0]?.id ?? null)
      })
      .catch(() => {
        if (!cancelado) setUser(null)
      })
    return () => {
      cancelado = true
    }
  }, [isAuthenticated, user, setUser])

  return null
}
