import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { CheckCircle2, Eye, EyeOff, KeyRound } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { getCredentials, setCredentials } from "@/features/sunat/api"
import { apiError } from "@/shared/lib/api/error"
import { useActiveCompany } from "@/shared/stores/activeCompany"
import { Alert, AlertDescription } from "@/shared/ui/alert"
import { Badge } from "@/shared/ui/badge"
import { Button } from "@/shared/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card"
import { Input } from "@/shared/ui/input"
import { Label } from "@/shared/ui/label"
import { Spinner } from "@/shared/ui/spinner"

import type { FormEvent } from "react"

export function CredencialesPage() {
  const companyId = useActiveCompany((s) => s.companyId)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ["sunat", "credentials", companyId],
    queryFn: getCredentials,
    enabled: companyId != null,
  })

  const [ruc, setRuc] = useState("")
  const [usuario, setUsuario] = useState("")
  const [clave, setClave] = useState("")
  const [showClave, setShowClave] = useState(false)

  useEffect(() => {
    if (data?.configured) {
      setRuc(data.ruc ?? "")
      setUsuario(data.usuario ?? "")
    }
  }, [data])

  const configuradas = data?.configured ?? false

  const guardar = useMutation({
    mutationFn: () => setCredentials({ ruc, usuario, clave }),
    onSuccess: () => {
      toast.success("Credenciales guardadas")
      setClave("")
      queryClient.invalidateQueries({ queryKey: ["sunat", "credentials"] })
    },
    onError: (e) => toast.error(apiError(e, "No se pudieron guardar")),
  })

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
          Credenciales SOL
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Usuario y clave SOL con acceso al portal de SUNAT (se cifran antes de guardarse).
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
          <CardTitle className="text-base text-foreground">Credenciales SUNAT SOL</CardTitle>
          <CardDescription>
            Se usan para el login automatizado en el portal de SUNAT durante las descargas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="ruc">RUC</Label>
                <Input
                  id="ruc"
                  value={ruc}
                  onChange={(e) => setRuc(e.target.value)}
                  maxLength={11}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="usuario">Usuario SOL</Label>
                <Input
                  id="usuario"
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="clave">Clave SOL</Label>
              <div className="relative">
                <Input
                  id="clave"
                  type={showClave ? "text" : "password"}
                  value={clave}
                  onChange={(e) => setClave(e.target.value)}
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
            <Button type="submit" disabled={guardar.isPending}>
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
