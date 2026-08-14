import { Auth0Provider } from "@auth0/auth0-react"
import { useNavigate } from "react-router-dom"

import { AUTH0_AUDIENCE, AUTH0_CLIENT_ID, AUTH0_DOMAIN } from "@/shared/lib/config"

import type { AppState } from "@auth0/auth0-react"
import type { ReactNode } from "react"

/**
 * Envuelve al Auth0Provider para que, tras el callback de login, la vuelta se
 * haga con la navegación de React Router (SPA) en lugar del replaceState por
 * defecto. Así la app re-renderiza limpio en /dashboard y no queda en blanco.
 * Requiere estar dentro de un <BrowserRouter> para poder usar useNavigate.
 */
export function Auth0ProviderWithNavigate({ children }: { children: ReactNode }) {
  const navigate = useNavigate()

  function alVolverDeAuth0(appState?: AppState) {
    navigate(appState?.returnTo ?? "/dashboard", { replace: true })
  }

  return (
    <Auth0Provider
      domain={AUTH0_DOMAIN}
      clientId={AUTH0_CLIENT_ID}
      authorizationParams={{
        redirect_uri: `${window.location.origin}/dashboard`,
        audience: AUTH0_AUDIENCE,
      }}
      useRefreshTokens
      cacheLocation="localstorage"
      onRedirectCallback={alVolverDeAuth0}
    >
      {children}
    </Auth0Provider>
  )
}
