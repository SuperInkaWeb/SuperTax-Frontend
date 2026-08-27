/**
 * Google Picker para elegir el Excel de entrada desde el Drive del usuario.
 *
 * Con el scope acotado `drive.file`, el backend no puede leer archivos arbitrarios
 * del Drive. En su lugar, el usuario elige el archivo con el Picker (usando un token
 * de Google del lado del navegador) y aquí mismo se descarga y se devuelve como un
 * `File`, que luego se sube al backend como una carga normal.
 *
 * Requiere VITE_GOOGLE_CLIENT_ID y VITE_GOOGLE_API_KEY.
 */
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY as string | undefined
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
const SCOPE = "https://www.googleapis.com/auth/drive.file"
// Bajo `drive.file`, el Picker solo concede acceso al archivo elegido si conoce el
// número de proyecto (App ID), que es el prefijo numérico del client_id.
const APP_ID = CLIENT_ID?.split("-")[0] ?? ""
const MIME_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

interface TokenClient {
  requestAccessToken: () => void
}
interface PickerDoc {
  id: string
  name: string
}
interface PickerData {
  action: string
  docs: PickerDoc[]
}
interface PickerBuilder {
  setOAuthToken: (t: string) => PickerBuilder
  setDeveloperKey: (k: string) => PickerBuilder
  setAppId: (id: string) => PickerBuilder
  addView: (v: unknown) => PickerBuilder
  setCallback: (cb: (data: PickerData) => void) => PickerBuilder
  build: () => { setVisible: (v: boolean) => void }
}
interface GoogleNS {
  accounts: {
    oauth2: {
      initTokenClient: (cfg: {
        client_id: string
        scope: string
        callback: (resp: { access_token?: string; error?: string }) => void
        error_callback?: (err: { type?: string; message?: string }) => void
      }) => TokenClient
    }
  }
  picker: {
    DocsView: new (viewId: unknown) => unknown
    ViewId: { SPREADSHEETS: unknown }
    PickerBuilder: new () => PickerBuilder
    Action: { PICKED: string; CANCEL: string }
  }
}
interface Gapi {
  load: (name: string, cb: () => void) => void
}
declare global {
  interface Window {
    gapi: Gapi
    google: GoogleNS
  }
}

let pickerCargado = false

function cargarScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve()
      return
    }
    const s = document.createElement("script")
    s.src = src
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error(`No se pudo cargar ${src}`))
    document.head.appendChild(s)
  })
}

async function asegurarLibrerias(): Promise<void> {
  await Promise.all([
    cargarScript("https://apis.google.com/js/api.js"),
    cargarScript("https://accounts.google.com/gsi/client"),
  ])
  if (!pickerCargado) {
    await new Promise<void>((resolve) => window.gapi.load("picker", () => resolve()))
    pickerCargado = true
  }
}

function pedirToken(): Promise<string> {
  return new Promise((resolve, reject) => {
    const cliente = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID as string,
      scope: SCOPE,
      callback: (resp) => {
        if (resp.access_token) resolve(resp.access_token)
        else reject(new Error(resp.error || "No se pudo autorizar Google Drive"))
      },
      error_callback: (err) => {
        const msg =
          err.type === "popup_closed"
            ? "Cerraste la ventana de Google antes de autorizar"
            : err.type === "popup_failed_to_open"
              ? "El navegador bloqueó la ventana de Google. Permite las ventanas emergentes."
              : err.message || "No se pudo autorizar Google Drive"
        reject(new Error(msg))
      },
    })
    cliente.requestAccessToken()
  })
}

function abrirPicker(token: string): Promise<PickerDoc | null> {
  return new Promise((resolve) => {
    const vista = new window.google.picker.DocsView(window.google.picker.ViewId.SPREADSHEETS)
    const picker = new window.google.picker.PickerBuilder()
      .setOAuthToken(token)
      .setDeveloperKey(API_KEY as string)
      .setAppId(APP_ID)
      .addView(vista)
      .setCallback((data) => {
        if (data.action === window.google.picker.Action.PICKED) resolve(data.docs[0] ?? null)
        else if (data.action === window.google.picker.Action.CANCEL) resolve(null)
      })
      .build()
    picker.setVisible(true)
  })
}

async function descargarComoFile(doc: PickerDoc, token: string): Promise<File> {
  const headers = { Authorization: `Bearer ${token}` }
  const meta = (await fetch(
    `https://www.googleapis.com/drive/v3/files/${doc.id}?fields=mimeType`,
    { headers },
  ).then((r) => r.json())) as { mimeType?: string }

  const esSheet = meta.mimeType === "application/vnd.google-apps.spreadsheet"
  const url = esSheet
    ? `https://www.googleapis.com/drive/v3/files/${doc.id}/export?mimeType=${encodeURIComponent(MIME_XLSX)}`
    : `https://www.googleapis.com/drive/v3/files/${doc.id}?alt=media`

  const resp = await fetch(url, { headers })
  if (!resp.ok) throw new Error("No se pudo descargar el archivo de Drive")
  const blob = await resp.blob()
  let nombre = doc.name || "excel.xlsx"
  if (esSheet && !nombre.toLowerCase().endsWith(".xlsx")) nombre += ".xlsx"
  return new File([blob], nombre, { type: MIME_XLSX })
}

/** true si la app tiene configuradas las variables de Google (client id + api key). */
export function drivePickerDisponible(): boolean {
  return Boolean(API_KEY && CLIENT_ID)
}

/** Abre el Picker; devuelve el Excel elegido como File, o null si se cancela. */
export async function elegirExcelDeDrive(): Promise<File | null> {
  if (!drivePickerDisponible()) {
    throw new Error("Google Drive no está configurado en esta instalación.")
  }
  await asegurarLibrerias()
  const token = await pedirToken()
  const doc = await abrirPicker(token)
  if (!doc) return null
  return descargarComoFile(doc, token)
}
