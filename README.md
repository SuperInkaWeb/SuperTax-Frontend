# plataforma-frontend

SPA única de la plataforma (Escaneo · SUNAT · SIRE). React + Vite + TypeScript +
shadcn (base-nova) + Tailwind v4 + Auth0 + TanStack Query.

## Estructura

```
src/
├─ app/         # shell: router, providers, layout (AppShell/Sidebar/Topbar/CompanySwitcher)
├─ shared/      # transversal: ui, lib (api-client, authBridge, config), stores, types, hooks
└─ features/    # por dominio (espejo de los módulos del backend)
   ├─ auth/     # login + puente Auth0
   ├─ dashboard/
   └─ sire/     # conciliaciones
```

Cada `feature` se carga bajo su ruta; el sidebar muestra los módulos y marca los
que aún no están disponibles. La empresa activa (Modelo B) se guarda en el store
y viaja en cada petición como cabecera `X-Company-Id`.

Documentación detallada en [`docs/`](./docs/) (arquitectura, features, UI/estado,
despliegue). Empieza por [`docs/README.md`](./docs/README.md).

## Puesta en marcha

Requisitos: Node 20+, y el `plataforma-backend` corriendo en `http://localhost:8000`.

```bash
npm install
copy .env.example .env      # (cp en bash) — rellena las claves de Auth0
npm run dev
```

- App: http://localhost:5173

## Variables de entorno

| Variable | Uso |
|---|---|
| `VITE_API_URL` | URL del backend (por defecto `http://localhost:8000`) |
| `VITE_AUTH0_DOMAIN` / `VITE_AUTH0_CLIENT_ID` / `VITE_AUTH0_AUDIENCE` | Tenant Auth0 único |

Sin las claves de Auth0 la app arranca y muestra la pantalla de login con un
aviso; al configurarlas, el botón habilita el inicio de sesión.

## Calidad

```bash
npm run build   # typecheck (tsc) + build de producción
npm run lint    # oxlint
```
