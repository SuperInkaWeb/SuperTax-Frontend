import { Auth0Provider } from "@auth0/auth0-react"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import { App } from "@/app/App"
import { Auth0Bridge } from "@/features/auth/Auth0Bridge"
import { AUTH0_AUDIENCE, AUTH0_CLIENT_ID, AUTH0_DOMAIN } from "@/shared/lib/config"

import "./index.css"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Auth0Provider
      domain={AUTH0_DOMAIN}
      clientId={AUTH0_CLIENT_ID}
      authorizationParams={{
        redirect_uri: `${window.location.origin}/dashboard`,
        audience: AUTH0_AUDIENCE,
      }}
      useRefreshTokens
      cacheLocation="localstorage"
    >
      <Auth0Bridge />
      <App />
    </Auth0Provider>
  </StrictMode>,
)
