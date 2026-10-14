import { useEffect, useRef, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { toast } from "sonner"

import { completeMailbox } from "@/features/correos/api"
import { apiError } from "@/shared/lib/api/error"
import { Button } from "@/shared/ui/button"
import { Spinner } from "@/shared/ui/spinner"

/**
 * Retorno del consentimiento OAuth del proveedor de correo. Lee `code` y `state`
 * de la query, completa la vinculación contra el backend y vuelve a los buzones.
 * El `state` cifrado ata la petición a esta empresa/usuario (anti-CSRF).
 */
export function OAuthCallbackPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const yaCorrio = useRef(false)

  useEffect(() => {
    if (yaCorrio.current) return // evita el doble disparo de StrictMode
    yaCorrio.current = true

    const code = params.get("code")
    const state = params.get("state")
    const errorProveedor = params.get("error")

    if (errorProveedor) {
      setError("Cancelaste la conexión o el proveedor la rechazó.")
      return
    }
    if (!code || !state) {
      setError("Faltan datos en la respuesta del proveedor.")
      return
    }

    completeMailbox(code, state)
      .then((buzon) => {
        toast.success(`Buzón conectado: ${buzon.account_email || buzon.provider}`)
        navigate("/correos", { replace: true })
      })
      .catch((err) => setError(apiError(err, "No se pudo completar la conexión")))
  }, [params, navigate])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      {error ? (
        <>
          <p className="max-w-sm text-sm text-muted-foreground">{error}</p>
          <Button onClick={() => navigate("/correos", { replace: true })}>Volver a buzones</Button>
        </>
      ) : (
        <>
          <Spinner />
          <p className="text-sm text-muted-foreground">Completando la conexión del buzón…</p>
        </>
      )}
    </div>
  )
}
