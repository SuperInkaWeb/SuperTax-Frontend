import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { AlertCircle, CheckCircle2, Eye, EyeOff, KeyRound } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { getCredentials, setCredentials } from "@/features/sire/api"
import { apiError } from "@/shared/lib/api/error"
import { useActiveCompany } from "@/shared/stores/activeCompany"
import { Alert, AlertDescription } from "@/shared/ui/alert"
import { Badge } from "@/shared/ui/badge"
import { Button } from "@/shared/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card"
import { Input } from "@/shared/ui/input"
import { Label } from "@/shared/ui/label"
import { Separator } from "@/shared/ui/separator"
import { Spinner } from "@/shared/ui/spinner"

import type { ChangeEvent, FormEvent } from "react"

export function CredencialesPage() {
  const companyId = useActiveCompany((s) => s.companyId)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ["sire", "credentials", companyId],
    queryFn: getCredentials,
    enabled: companyId != null,
  })

  const [form, setForm] = useState({
    client_id: "",
    client_secret: "",
    usuario_sol: "",
    clave_sol: "",
  })
  const [showSecret, setShowSecret] = useState(false)
  const [showClave, setShowClave] = useState(false)

  // Precarga los campos no sensibles (los secretos nunca se devuelven).
  useEffect(() => {
    if (data?.configured) {
      setForm((f) => ({
        ...f,
        client_id: data.client_id ?? "",
        usuario_sol: data.usuario_sol ?? "",
      }))
    }
  }, [data])

  const configuradas = data?.configured ?? false

  const guardar = useMutation({
    mutationFn: () =>
      setCredentials({
        usuario_sol: form.usuario_sol,
        clave_sol: form.clave_sol,
        client_id: form.client_id,
        client_secret: form.client_secret,
      }),
    onSuccess: () => {
      toast.success("Credenciales guardadas")
      setForm((f) => ({ ...f, clave_sol: "", client_secret: "" }))
      queryClient.invalidateQueries({ queryKey: ["sire", "credentials"] })
    },
    onError: (e) => toast.error(apiError(e, "No se pudieron guardar")),
  })

  const set = (k: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    guardar.mutate()
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <KeyRound className="size-5" />
          Credenciales SUNAT
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Configura las credenciales de tu empresa para acceder a la API SIRE de SUNAT.
        </p>
      </div>

      {configuradas && (
        <Alert>
          <CheckCircle2 />
          <AlertDescription className="flex items-center gap-2">
            Las credenciales están configuradas
            <Badge tone="success">Activas</Badge>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-foreground">Credenciales OAuth SUNAT</CardTitle>
          <CardDescription>
            Obtén estas credenciales en el portal SOL de SUNAT bajo{" "}
            <strong>Aplicaciones → API SIRE</strong>. El client_secret y la clave se cifran antes de
            guardarse.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="client_id">Client ID</Label>
              <Input
                id="client_id"
                value={form.client_id}
                onChange={set("client_id")}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="client_secret">Client Secret</Label>
              <div className="relative">
                <Input
                  id="client_secret"
                  type={showSecret ? "text" : "password"}
                  value={form.client_secret}
                  onChange={set("client_secret")}
                  placeholder={
                    configuradas ? "••••••••• (dejar en blanco si no cambia)" : "Tu client secret"
                  }
                  required={!configuradas}
                  className="pr-10"
                />
                <button
                  type="button"
                  aria-label={showSecret ? "Ocultar" : "Mostrar"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowSecret((v) => !v)}
                >
                  {showSecret ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <Separator />

            <div className="space-y-1.5">
              <Label htmlFor="usuario_sol">Usuario SOL</Label>
              <Input
                id="usuario_sol"
                value={form.usuario_sol}
                onChange={set("usuario_sol")}
                placeholder="CSEBUZON"
                required
              />
              <p className="text-xs text-muted-foreground">
                Usuario secundario SOL con acceso a SIRE.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="clave_sol">Clave SOL</Label>
              <div className="relative">
                <Input
                  id="clave_sol"
                  type={showClave ? "text" : "password"}
                  value={form.clave_sol}
                  onChange={set("clave_sol")}
                  placeholder={
                    configuradas ? "••••••••• (dejar en blanco si no cambia)" : "Tu clave SOL"
                  }
                  required={!configuradas}
                  className="pr-10"
                />
                <button
                  type="button"
                  aria-label={showClave ? "Ocultar" : "Mostrar"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowClave((v) => !v)}
                >
                  {showClave ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {guardar.isError && (
              <Alert variant="destructive">
                <AlertCircle />
                <AlertDescription>
                  {apiError(guardar.error, "Error al guardar las credenciales")}
                </AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={guardar.isPending}>
              {guardar.isPending
                ? "Guardando…"
                : configuradas
                  ? "Actualizar credenciales"
                  : "Guardar credenciales"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
