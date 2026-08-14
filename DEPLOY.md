# Despliegue — Frontend (Vercel)

Guía completa (backend + base de datos + Auth0 + referencias cruzadas):
ver `DEPLOY.md` en el repo **plataforma-backend**.

## Resumen Vercel

1. Importa este repo en [vercel.com](https://vercel.com). Framework: **Vite**
   (autodetectado). Build: `npm run build`, Output: `dist`.
2. El `vercel.json` ya trae el rewrite SPA (recargar `/soporte` u otra ruta no da 404).
3. Variables de entorno:

   | Variable | Valor |
   |---|---|
   | `VITE_API_URL` | dominio del `web` de Railway, p. ej. `https://plataforma-web-production.up.railway.app` |
   | `VITE_AUTH0_DOMAIN` | `tu-tenant.us.auth0.com` |
   | `VITE_AUTH0_CLIENT_ID` | Client ID de la app SPA en Auth0 |
   | `VITE_AUTH0_AUDIENCE` | `https://api.plataforma` |

4. Deploy. Copia el dominio de Vercel y añádelo en Auth0 (Callback/Logout/Web Origins)
   y en `CORS_ORIGINS` del backend.

> Las `VITE_*` se incrustan en tiempo de build: si cambias una, haz **redeploy**.
