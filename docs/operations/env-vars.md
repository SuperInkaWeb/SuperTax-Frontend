# Variables de entorno (frontend)

Todas las variables del frontend empiezan con **`VITE_`** y son **públicas por
diseño**: Vite las **incrusta en el bundle** en tiempo de build, así que cualquiera
puede leerlas en el navegador. En Vercel se declaran como **Config**, no como
Secret. Cambiar una exige **redeploy** (no basta con reiniciar).

| Variable | Uso |
|---|---|
| `VITE_API_URL` | URL del backend (`baseURL` de axios). Local: `http://localhost:8000` |
| `VITE_AUTH0_DOMAIN` | tenant Auth0 |
| `VITE_AUTH0_CLIENT_ID` | Client ID de la app SPA (el mismo `AUTH0_SPA_CLIENT_ID` del backend) |
| `VITE_AUTH0_AUDIENCE` | audience de la API Auth0 |
| `VITE_GOOGLE_CLIENT_ID` | Google Picker (elegir Excel de Drive) |
| `VITE_GOOGLE_API_KEY` | Google Picker (elegir Excel de Drive) |

Sin las claves de Auth0 la app arranca y muestra el login con un aviso; al
configurarlas se habilita el inicio de sesión.

## ¿Y los secretos?

El **único** secreto real de Google es `GOOGLE_CLIENT_SECRET`, que vive en el
**backend** (Railway), nunca aquí. El `VITE_GOOGLE_CLIENT_ID` y el App ID (prefijo
del client_id que usa el Picker) son públicos.

> Poner un secreto en una `VITE_*` equivale a publicarlo. Nunca lo hagas.

Despliegue completo en [deploy.md](deploy.md).
