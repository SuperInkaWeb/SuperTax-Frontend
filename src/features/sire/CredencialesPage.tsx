import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"

import { getCredentials, setCredentials } from "@/features/sire/api"
import { apiError } from "@/shared/lib/api/error"
import { useActiveCompany } from "@/shared/stores/activeCompany"
import { Button } from "@/shared/ui/button"
import { Card, CardContent } from "@/shared/ui/card"
import { Input } from "@/shared/ui/input"
import { Label } from "@/shared/ui/label"
import { Spinner } from "@/shared/ui/spinner"

import type { FormEvent } from "react"

export function CredencialesPage() {
  const companyId = useActiveCompany((s) => s.companyId)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ["sire", "credentials", companyId],
    queryFn: getCredentials,
    enabled: companyId != null,
  })

  const [usuarioSol, setUsuarioSol] = useState("")
  const [claveSol, setClaveSol] = useState("")
  const [clientId, setClientId] = useState("")
  const [clientSecret, setClientSecret] = useState("")

  const guardar = useMutation({
    mutationFn: () =>
      setCredentials({
        usuario_sol: usuarioSol,
        clave_sol: claveSol,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    onSuccess: () => {
      toast.success("Credenciales guardadas")
      setClaveSol("")
      setClientSecret("")
      queryClient.invalidateQueries({ queryKey: ["sire", "credentials"] })
    },
    onError: (err) => toast.error(apiError(err, "No se pudieron guardar")),
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
    <Card className="max-w-xl">
      <CardContent className="space-y-4 pt-5">
        <p className="text-sm text-muted-foreground">
          {data?.configured
            ? `Configuradas — usuario SOL "${data.usuario_sol}"`
            : "Aún no hay credenciales SUNAT configuradas."}
        </p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="usuario_sol">Usuario SOL</Label>
              <Input
                id="usuario_sol"
                value={usuarioSol}
                onChange={(e) => setUsuarioSol(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="clave_sol">Clave SOL</Label>
              <Input
                id="clave_sol"
                type="password"
                value={claveSol}
                onChange={(e) => setClaveSol(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="client_id">Client ID</Label>
              <Input
                id="client_id"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="client_secret">Client Secret</Label>
              <Input
                id="client_secret"
                type="password"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                required
              />
            </div>
          </div>
          <Button type="submit" disabled={guardar.isPending}>
            {guardar.isPending ? "Guardando…" : "Guardar credenciales"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
