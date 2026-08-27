# UI y estado

## UI — shadcn (base-nova) sobre `@base-ui/react`

Los componentes base viven en `src/shared/ui/` (button, card, input, select,
alert, badge, spinner, confirm, …). Son **shadcn variante base-nova**, que se
apoya en **`@base-ui/react`** (no en Radix). Implicaciones:

- La API de algunos primitivos difiere de la versión Radix de shadcn (props y
  subcomponentes distintos). Al portar o copiar componentes de ejemplos shadcn
  "clásicos", revisar la API de `@base-ui`.
- Estilado con **Tailwind v4** (`@tailwindcss/vite`), utilidades componibles con
  `clsx` + `tailwind-merge` (`cn`), variantes con `class-variance-authority`.
- Iconos: `lucide-react`. Tipografías: Plus Jakarta Sans + IBM Plex Mono
  (`@fontsource`). Toasts: `sonner`. Animaciones: `tw-animate-css`.

Regla del proyecto: componentes pequeños, presentación separada de la lógica
(hooks) y de los servicios (`api.ts`).

## Estado del servidor — TanStack Query

Todo dato que viene del backend se gestiona con **`@tanstack/react-query`**:

- Lecturas: `useQuery({ queryKey, queryFn })` — `queryFn` llama a una función de
  `api.ts`. Las `queryKey` suelen incluir la empresa activa (`["sunat","drive",companyId]`)
  para invalidarse al cambiar de empresa.
- Escrituras: `useMutation` + `queryClient.invalidateQueries` para refrescar.
- Errores: `toast.error(apiError(err, "mensaje"))`.

El `QueryClientProvider` se monta en `app/providers.tsx`.

## Estado del cliente — zustand

Estado global ligero en `src/shared/stores/`:

| Store | Rol |
|---|---|
| `activeCompany` | empresa activa (Modelo B). El cliente axios lee `companyId` y lo envía como `X-Company-Id` |
| `auth` | estado de sesión del lado del cliente |
| `theme` | tema (claro/oscuro) |

`activeCompany` es el pegamento del multi-tenant en el frontend: cambiarla desde el
`CompanySwitcher` cambia el `X-Company-Id` de todas las peticiones siguientes, e
invalida las queries dependientes.

## Manejo de errores de API (`shared/lib/api/error.ts`)

`apiError(err, fallback)` extrae el mensaje del envelope del backend cuando es un
error de axios. Para errores que **no** son de axios (p. ej. los que lanza el
Google Picker), usar el mensaje del propio `Error`:

```ts
const detalle = err instanceof Error ? err.message : apiError(err)
toast.error(detalle || "mensaje por defecto")
```
