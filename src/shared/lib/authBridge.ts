/**
 * Puente entre el SDK de Auth0 y el cliente HTTP.
 *
 * Desacopla axios del SDK: el interceptor pide el token por aquí, y el
 * `Auth0Bridge` registra cómo obtenerlo. Así ningún módulo depende de Auth0
 * directamente para autenticarse.
 */
type TokenGetter = () => Promise<string>
type LogoutFn = () => void

let tokenGetter: TokenGetter | null = null
let logoutFn: LogoutFn | null = null

export function registrarTokenGetter(fn: TokenGetter) {
  tokenGetter = fn
}

export function registrarLogout(fn: LogoutFn) {
  logoutFn = fn
}

export async function obtenerToken(): Promise<string | null> {
  if (!tokenGetter) return null
  try {
    return await tokenGetter()
  } catch {
    return null
  }
}

export function cerrarSesion() {
  if (logoutFn) logoutFn()
  else window.location.href = "/login"
}
