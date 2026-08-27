# Features

Cada carpeta en `src/features/` es un dominio autocontenido: sus páginas,
componentes, y un `api.ts` que habla con el backend por el cliente axios
compartido. Los tres de negocio espejan los módulos del backend.

| Feature | Ruta | Qué hace |
|---|---|---|
| `auth` | `/login` | inicio de sesión (Auth0) + puente |
| `onboarding` | `/solicitar-acceso` | solicitud de acceso de nuevos usuarios |
| `dashboard` | `/dashboard` | portada tras el login |
| `company` | (dentro de admin/layout) | empresa activa, equipo/miembros |
| `sunat` | `/sunat/*` | descarga de comprobantes (ver abajo) |
| `sire` | `/sire/*` | conciliación de registros |
| `scanner` | `/scanner/*` | extracción OCR + IA de documentos |
| `tickets` | `/soporte` | tickets de soporte |
| `admin` | `/admin/*` | administración de plataforma (usuarios, roles, módulos) |

## Feature `sunat` (la más rica)

Archivos clave:

- `SunatRoutes.tsx` — subrutas del módulo.
- `DescargarPage.tsx` — flujo principal: origen del Excel (subir o **Elegir de
  Google Drive**), previsualización con **mapeo de columnas**, selección de
  comprobantes, opciones de entrega, inicio y logs en vivo.
- `EntregaFields.tsx` — correo (Gmail) y "Subir a Google Drive".
- `DrivePage.tsx` — conectar/desconectar Google Drive (para **subir** resultados).
- `drivePicker.ts` — Google Picker para **elegir** el Excel de entrada (scope
  `drive.file`, `setAppId`). Ver la doc de Drive del backend.
- `api.ts` — `previewExcel`, `iniciar`, `forzarFaltantes`, `cancelar`, logs SSE,
  estado/conexión de Drive.

> Las **dos** conexiones a Google del módulo SUNAT (conectar Drive para subir vs.
> elegir con Picker para la entrada) son independientes; se explican en la doc del
> backend: `docs/integrations/google-drive.md`.

## Feature `scanner`

- `ScannerRoutes.tsx`, páginas de subida y resultados.
- `constants.ts` — grupos y tipos (incl. "Laboral": asistencia + boleta de pago;
  `TIPOS_MULTIREGISTRO`).
- `filas.ts` — aplana registros multi-fila a filas/columnas.
- `TablaRegistros.tsx` — tabla de registros con columna *Archivo*.
- `BotonExportar.tsx` — exporta a Excel "todo junto" o "por documento".

## Feature `sire`

- `SireRoutes.tsx`, páginas de conciliación, subida de archivo con mapeo de
  columnas y descarga del reporte.

## Patrón común

Los datos del servidor se leen/mutan con **TanStack Query** (`useQuery`/
`useMutation`) sobre las funciones de `api.ts`; los errores se muestran con
`sonner` (`toast`) usando el helper `apiError`. Ver [ui-and-state.md](ui-and-state.md).
