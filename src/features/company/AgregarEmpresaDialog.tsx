import { useMutation } from "@tanstack/react-query"
import { isAxiosError } from "axios"
import { useState } from "react"
import { toast } from "sonner"

import { createMyCompany, solicitarAccesoEmpresa } from "@/features/company/api"
import { apiError } from "@/shared/lib/api/error"
import { getMe } from "@/shared/lib/api/me"
import { useActiveCompany } from "@/shared/stores/activeCompany"
import { useAuthStore } from "@/shared/stores/auth"
import { Button } from "@/shared/ui/button"
import { Input } from "@/shared/ui/input"
import { Label } from "@/shared/ui/label"

import type { FormEvent } from "react"

const RUC_LENGTH = 11

export function AgregarEmpresaDialog({ onClose }: { onClose: () => void }) {
  const setUser = useAuthStore((s) => s.setUser)
  const companies = useAuthStore((s) => s.user?.companies ?? [])
  const setCompanyId = useActiveCompany((s) => s.setCompanyId)
  const [ruc, setRuc] = useState("")
  const [razonSocial, setRazonSocial] = useState("")
  // El RUC ya pertenece a otro estudio: en vez de crear, se ofrece solicitar acceso.
  const [rucOcupado, setRucOcupado] = useState(false)

  const crear = useMutation({
    mutationFn: () => createMyCompany({ ruc, razon_social: razonSocial }),
    onSuccess: async (nueva) => {
      // Recarga /me para que la empresa aparezca en el selector, y la deja activa.
      const me = await getMe()
      setUser(me)
      setCompanyId(nueva.id)
      toast.success("Empresa agregada. Un administrador activará sus módulos.")
      onClose()
    },
    onError: (err) => {
      if (isAxiosError(err) && err.response?.status === 409) {
        // Si el RUC ya está en TU estudio (ya lo ves), no tiene sentido solicitar
        // acceso: solo se ofrece cuando pertenece a OTRO estudio.
        if (companies.some((c) => c.ruc === ruc)) {
          toast.error("Esa empresa ya está en tu estudio")
          return
        }
        setRucOcupado(true)
        return
      }
      toast.error(apiError(err, "No se pudo crear la empresa"))
    },
  })

  const solicitar = useMutation({
    mutationFn: () => solicitarAccesoEmpresa({ ruc }),
    onSuccess: () => {
      toast.success("Solicitud enviada al administrador del estudio dueño")
      onClose()
    },
    onError: (err) => toast.error(apiError(err, "No se pudo enviar la solicitud")),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (ruc.length !== RUC_LENGTH) {
      toast.error("El RUC debe tener 11 dígitos")
      return
    }
    crear.mutate()
  }

  const onRucChange = (valor: string) => {
    setRuc(valor.replace(/\D/g, ""))
    setRucOcupado(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-lg border bg-card p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">Agregar empresa</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Registra un RUC nuevo. Quedarás como su administrador; un administrador
          de plataforma activará sus módulos.
        </p>
        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="nueva-ruc">RUC</Label>
            <Input
              id="nueva-ruc"
              inputMode="numeric"
              value={ruc}
              onChange={(e) => onRucChange(e.target.value)}
              maxLength={RUC_LENGTH}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nueva-razon">Razón social</Label>
            <Input
              id="nueva-razon"
              value={razonSocial}
              onChange={(e) => setRazonSocial(e.target.value)}
              maxLength={200}
              required
            />
          </div>

          {rucOcupado && (
            <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
              Ese RUC ya está registrado por otro estudio. Puedes{" "}
              <span className="font-medium">solicitar acceso</span> a su administrador.
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            {rucOcupado ? (
              <Button
                type="button"
                disabled={solicitar.isPending}
                onClick={() => solicitar.mutate()}
              >
                {solicitar.isPending ? "Enviando…" : "Solicitar acceso"}
              </Button>
            ) : (
              <Button type="submit" disabled={crear.isPending}>
                {crear.isPending ? "Creando…" : "Crear"}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
