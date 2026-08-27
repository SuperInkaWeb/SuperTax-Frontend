# Arquitectura del frontend

## Estructura

```
src/
├─ app/         shell: router (App.tsx), providers, layout (AppShell/Sidebar/Topbar/…)
├─ shared/      transversal: ui, lib (api-client, authBridge, config), stores, types, hooks
└─ features/    por dominio — espejo de los módulos del backend
   ├─ auth/        login + puente Auth0
   ├─ onboarding/  solicitar acceso
   ├─ dashboard/
   ├─ company/     empresa / equipo
   ├─ sunat/  sire/  scanner/   ← módulos de negocio
   ├─ tickets/     soporte
   └─ admin/        administración de plataforma
```

Cada `feature` es autocontenido (páginas, `api.ts`, componentes) y se monta bajo
su ruta. El diseño **espeja los módulos del backend**: `features/sunat` ↔
`modules/sunat`, etc.

## Routing y code-splitting (`app/App.tsx`)

- `react-router-dom` v7. Cada feature se carga con `lazy()` → **un chunk por
  módulo**, se descarga solo al entrar a su ruta.
- Rutas públicas: `/login`, `/solicitar-acceso`.
- El resto cuelga de `<Protected><AppShell/></Protected>`: `Protected` usa
  `useAuth0()` y redirige a `/login` si no hay sesión. `AppShell` es el layout
  (sidebar, topbar, company switcher, campana de notificaciones, búsqueda global).

## Autenticación — Auth0 + puente (`shared/lib/authBridge.ts`)

Para que **ningún módulo dependa de Auth0 directamente**, hay un puente:

- `Auth0ProviderWithNavigate` monta el SDK (`@auth0/auth0-react`) y registra en el
  puente cómo obtener el token (`registrarTokenGetter`) y cómo cerrar sesión
  (`registrarLogout`).
- El cliente HTTP pide el token al puente (`obtenerToken`), sin conocer Auth0.

## Cliente HTTP y multi-tenant (`shared/lib/api/client.ts`)

Un único `axios` con dos interceptores:

```ts
// Request: cada petición lleva identidad + empresa activa
config.headers.Authorization = `Bearer ${await obtenerToken()}`
config.headers["X-Company-Id"] = String(activeCompany.companyId)

// Response: un 401 cierra la sesión
if (error.response?.status === 401) cerrarSesion()
```

`X-Company-Id` sale del store `activeCompany` (Modelo B): es lo que el backend usa
para resolver y validar la empresa activa. `VITE_API_URL` define el `baseURL`.

## Providers (`app/providers.tsx`)

Envuelven la app: Auth0, `QueryClientProvider` (TanStack Query), tema, toasts
(`sonner`), `ErrorBoundary`. Ver [ui-and-state.md](ui-and-state.md).

## Convenciones

- Imports absolutos con alias `@/…`.
- Nombres y textos de UI en español; código en el estándar del proyecto
  (componentes pequeños, lógica en hooks, servicios en `api.ts`).
