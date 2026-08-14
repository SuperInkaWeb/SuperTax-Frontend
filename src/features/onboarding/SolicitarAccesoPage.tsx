import { useMutation } from "@tanstack/react-query"
import { CheckCircle2 } from "lucide-react"
import { useState } from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"

import { crearSolicitudAcceso } from "@/features/onboarding/api"
import { apiError } from "@/shared/lib/api/error"
import { Button, buttonVariants } from "@/shared/ui/button"
import { Card, CardContent } from "@/shared/ui/card"
import { Input } from "@/shared/ui/input"
import { Label } from "@/shared/ui/label"

import type { FormEvent } from "react"

const RUC_LENGTH = 11

export function SolicitarAccesoPage() {
  const [nombre, setNombre] = useState("")
  const [email, setEmail] = useState("")
  const [empresaNombre, setEmpresaNombre] = useState("")
  const [ruc, setRuc] = useState("")
  const [telefono, setTelefono] = useState("")
  const [mensaje, setMensaje] = useState("")

  const enviar = useMutation({
    mutationFn: () =>
      crearSolicitudAcceso({
        nombre,
        email,
        empresa_nombre: empresaNombre,
        ruc,
        telefono: telefono || undefined,
        mensaje: mensaje || undefined,
      }),
    onError: (err) => toast.error(apiError(err, "No se pudo enviar la solicitud")),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (ruc.length !== RUC_LENGTH) {
      toast.error("El RUC debe tener 11 dígitos")
      return
    }
    enviar.mutate()
  }

  if (enviar.isSuccess) {
    return (
      <div className="grid min-h-screen place-items-center bg-background p-6">
        <div className="w-full max-w-md space-y-4 text-center">
          <CheckCircle2 className="mx-auto size-12 text-primary" />
          <h1 className="text-2xl font-semibold">Solicitud enviada</h1>
          <p className="text-sm text-muted-foreground">
            Recibimos tu solicitud. Cuando sea aprobada, llegará un correo a{" "}
            <span className="font-medium text-foreground">{email}</span> para que
            establezcas tu contraseña e ingreses.
          </p>
          <Link to="/login" className={buttonVariants({ variant: "outline" })}>
            Volver al inicio de sesión
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="grid min-h-screen place-items-center bg-background p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Solicitar acceso</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Déjanos tus datos y te habilitaremos el acceso a la plataforma.
          </p>
        </div>

        <Card>
          <CardContent className="pt-5">
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="nombre">Nombre completo</Label>
                <Input
                  id="nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  maxLength={150}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="empresa">Razón social</Label>
                <Input
                  id="empresa"
                  value={empresaNombre}
                  onChange={(e) => setEmpresaNombre(e.target.value)}
                  maxLength={200}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ruc">RUC</Label>
                <Input
                  id="ruc"
                  inputMode="numeric"
                  value={ruc}
                  onChange={(e) => setRuc(e.target.value.replace(/\D/g, ""))}
                  maxLength={RUC_LENGTH}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="telefono">Teléfono (opcional)</Label>
                <Input
                  id="telefono"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  maxLength={20}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mensaje">Mensaje (opcional)</Label>
                <textarea
                  id="mensaje"
                  value={mensaje}
                  onChange={(e) => setMensaje(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <Button type="submit" className="w-full" disabled={enviar.isPending}>
                {enviar.isPending ? "Enviando…" : "Enviar solicitud"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          ¿Ya tienes cuenta?{" "}
          <Link to="/login" className="font-medium text-foreground underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  )
}
