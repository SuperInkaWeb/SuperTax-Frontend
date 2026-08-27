# Documentación — plataforma-frontend

SPA única de la plataforma (**Escaneo · SUNAT · SIRE**): React 19 + Vite +
TypeScript + shadcn (base-nova / `@base-ui/react`) + Tailwind v4 + Auth0 +
TanStack Query + zustand.

Para lo cross-cutting del sistema (arquitectura del backend, módulos, seguridad,
despliegue completo), ver la carpeta `docs/` del **plataforma-backend**. Aquí se
documenta lo específico de la SPA.

## Índice

- [architecture.md](architecture.md) — shell, routing, providers, cliente HTTP, multi-tenant
- [features.md](features.md) — qué hay en cada `feature`
- [ui-and-state.md](ui-and-state.md) — UI (shadcn/base-ui, Tailwind v4) y estado (Query, zustand)
- [operations/deploy.md](operations/deploy.md) — despliegue en Vercel
- [operations/env-vars.md](operations/env-vars.md) — variables `VITE_*` (todas públicas)

## Puesta en marcha (rápida)

Requisitos: Node 20+, y el backend en `http://localhost:8000`.

```bash
npm install
copy .env.example .env      # (cp en bash) — rellena las claves de Auth0
npm run dev                 # http://localhost:5173
```

## Calidad

```bash
npm run build   # typecheck (tsc -b) + build de producción (vite)
npm run lint    # oxlint
```
