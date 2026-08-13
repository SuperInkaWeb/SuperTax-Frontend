import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"

import { getCredentials, setCredentials } from "@/features/sunat/api"
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
    queryKey: ["sunat", "credentials", companyId],
    queryFn: getCredentials,
    enabled: companyId != null,
  })

  const [ruc, setRuc] = useState("")
  const [usuario, setUsuario] = useState("")
  const [clave, setClave] = useState("")

  const guardar = useMutation({
    mutationFn: () => setCredentials({ ruc, usuario, clave }),
    onSuccess: () => {
      toast.success("Credenciales guardadas")
      setClave("")
      queryClient.invalidateQueries({ queryKey: ["sunat", "credentials"] })
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
            ? `Configuradas — RUC ${data.ruc}`
            : "Aún no hay credenciales SOL configuradas."}
        </p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="ruc">RUC</Label>
              <Input id="ruc" value={ruc} onChange={(e) => setRuc(e.target.value)} maxLength={11} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="usuario">Usuario SOL</Label>
              <Input id="usuario" value={usuario} onChange={(e) => setUsuario(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="clave">Clave SOL</Label>
              <Input id="clave" type="password" value={clave} onChange={(e) => setClave(e.target.value)} required />
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
