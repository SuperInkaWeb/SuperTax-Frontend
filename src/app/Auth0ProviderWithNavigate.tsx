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
      // La vuelta de OAuth de un buzón (Gmail/Outlook) llega a esta ruta con sus
      // propios `?code&state`. Sin esto, el SDK de Auth0 los confundiría con SU
      // callback de login, fallaría al canjearlos y terminaría en /login. Se le
      // indica que ignore el callback ahí: la sesión se restaura de localStorage y
      // OAuthCallbackPage completa la vinculación del buzón.
      skipRedirectCallback={window.location.pathname === "/correos/oauth/callback"}
    >
      {children}
    </Auth0Provider>
  )
}
