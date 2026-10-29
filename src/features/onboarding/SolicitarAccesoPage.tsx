import { useMutation } from "@tanstack/react-query"
import { ArrowLeft, CheckCircle2 } from "lucide-react"
import { useState } from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"

import { crearSolicitudAcceso, verificarRuc } from "@/features/onboarding/api"
import { apiError } from "@/shared/lib/api/error"
import { Button, buttonVariants } from "@/shared/ui/button"
import { Card, CardContent } from "@/shared/ui/card"
import { Input } from "@/shared/ui/input"
import { Label } from "@/shared/ui/label"

import type { VerificarRucResult } from "@/features/onboarding/api"
import type { FormEvent, ReactNode } from "react"

const RUC_LENGTH = 11

export function SolicitarAccesoPage() {
  const [paso, setPaso] = useState<1 | 2>(1)
  const [ruc, setRuc] = useState("")
  const [verificacion, setVerificacion] = useState<VerificarRucResult | null>(null)
  const [nombre, setNombre] = useState("")
  const [email, setEmail] = useState("")
  const [razonSocial, setRazonSocial] = useState("")
  const [telefono, setTelefono] = useState("")
  const [mensaje, setMensaje] = useState("")

  const esAccesoExistente = verificacion?.existe === true

  const verificar = useMutation({
    mutationFn: () => verificarRuc(ruc),
    onSuccess: (res) => {
      setVerificacion(res)
      setPaso(2)
    },
    onError: (err) => toast.error(apiError(err, "No se pudo verificar el RUC")),
  })

  const enviar = useMutation({
    mutationFn: () =>
      crearSolicitudAcceso({
        nombre,
        email,
        ruc,
        empresa_nombre: esAccesoExistente ? undefined : razonSocial,
        telefono: esAccesoExistente ? undefined : telefono || undefined,
        mensaje: mensaje || undefined,
      }),
    onError: (err) => toast.error(apiError(err, "No se pudo enviar la solicitud")),
  })

  function onContinuar(e: FormEvent) {
    e.preventDefault()
    if (ruc.length !== RUC_LENGTH) {
      toast.error("El RUC debe tener 11 dígitos")
      return
    }
    verificar.mutate()
  }

  function onEnviar(e: FormEvent) {
    e.preventDefault()
    enviar.mutate()
  }

  function volverAPaso1() {
    setPaso(1)
    setVerificacion(null)
  }

  if (enviar.isSuccess) {
    const esAcceso = enviar.data?.tipo === "acceso_empresa"
    return (
      <Pantalla>
        <div className="space-y-4 text-center">
          <CheckCircle2 className="mx-auto size-12 text-primary" />
          <h1 className="text-2xl font-semibold">Solicitud enviada</h1>
          <p className="text-sm text-muted-foreground">
            {esAcceso ? (
              <>
                Esa empresa ya está registrada por un estudio. Enviamos tu solicitud de
                acceso a su administrador. Cuando la apruebe, llegará un correo a{" "}
                <span className="font-medium text-foreground">{email}</span> para que
                establezcas tu contraseña e ingreses.
              </>
            ) : (
              <>
                Recibimos tu solicitud. Cuando sea aprobada, llegará un correo a{" "}
                <span className="font-medium text-foreground">{email}</span> para que
                establezcas tu contraseña e ingreses.
              </>
            )}
          </p>
          <Link to="/login" className={buttonVariants({ variant: "outline" })}>
            Volver al inicio de sesión
          </Link>
        </div>
      </Pantalla>
    )
  }

  // ── Paso 1: el RUC decide el camino ──
  if (paso === 1) {
    return (
      <Pantalla>
        <Encabezado
          titulo="Solicitar acceso"
          descripcion="Ingresa el RUC de la empresa para empezar."
        />
        <Card>
          <CardContent className="pt-5">
            <form onSubmit={onContinuar} className="space-y-4">
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
              <Button type="submit" className="w-full" disabled={verificar.isPending}>
                {verificar.isPending ? "Verificando…" : "Continuar"}
              </Button>
            </form>
          </CardContent>
        </Card>
        <YaTienesCuenta />
      </Pantalla>
    )
  }

  // ── Paso 2: según exista o no el RUC ──
  return (
    <Pantalla>
      <Encabezado
        titulo={esAccesoExistente ? "Solicitar acceso" : "Registra tu estudio"}
        descripcion={`RUC ${ruc}`}
      />
      <Card>
        <CardContent className="space-y-4 pt-5">
          {esAccesoExistente ? (
            <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
              Esta empresa ya está registrada:{" "}
              <span className="font-medium">{verificacion?.razon_social}</span>. Tu
              solicitud irá a su administrador, que decidirá si te da acceso.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Este RUC está libre. Se registrará como tu primera empresa y quedarás como
              administrador del estudio (lo revisa un administrador de la plataforma).
            </p>
          )}

          <form onSubmit={onEnviar} className="space-y-4">
            {!esAccesoExistente && (
              <div className="space-y-1.5">
                <Label htmlFor="razon">Razón social</Label>
                <Input
                  id="razon"
                  value={razonSocial}
                  onChange={(e) => setRazonSocial(e.target.value)}
                  maxLength={200}
                  required
                />
              </div>
            )}
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
            {!esAccesoExistente && (
              <div className="space-y-1.5">
                <Label htmlFor="telefono">Teléfono (opcional)</Label>
                <Input
                  id="telefono"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  maxLength={20}
                />
              </div>
            )}
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

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={volverAPaso1}
                className="shrink-0"
              >
                <ArrowLeft className="size-4" />
                Cambiar RUC
              </Button>
              <Button type="submit" className="flex-1" disabled={enviar.isPending}>
                {enviar.isPending
                  ? "Enviando…"
                  : esAccesoExistente
                    ? "Solicitar acceso"
                    : "Registrar"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <YaTienesCuenta />
    </Pantalla>
  )
}

function Pantalla({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center bg-background p-6">
      <div className="w-full max-w-md space-y-6">{children}</div>
    </div>
  )
}

function Encabezado({ titulo, descripcion }: { titulo: string; descripcion: string }) {
  return (
    <div className="text-center">
      <h1 className="text-2xl font-semibold">{titulo}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{descripcion}</p>
    </div>
  )
}

function YaTienesCuenta() {
  return (
    <p className="text-center text-sm text-muted-foreground">
      ¿Ya tienes cuenta?{" "}
      <Link to="/login" className="font-medium text-foreground underline">
        Inicia sesión
      </Link>
    </p>
  )
}
