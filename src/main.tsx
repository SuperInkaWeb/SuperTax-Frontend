import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"

import { App } from "@/app/App"
import { Auth0ProviderWithNavigate } from "@/app/Auth0ProviderWithNavigate"
import { Auth0Bridge } from "@/features/auth/Auth0Bridge"

import "./index.css"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Auth0ProviderWithNavigate>
        <Auth0Bridge />
        <App />
      </Auth0ProviderWithNavigate>
    </BrowserRouter>
  </StrictMode>,
)
