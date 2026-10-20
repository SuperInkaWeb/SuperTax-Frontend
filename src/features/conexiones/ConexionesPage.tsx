import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Check, Cloud, KeyRound, Mail } from "lucide-react"
import { useState } from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"

import { useConexiones } from "@/features/conexiones/store"
import { listMailboxes } from "@/features/correos/api"
import {
  getCredentials as getSireCred,
  setCredentials as setSireCred,
} from "@/features/sire/api"
import {
  disconnectDrive,
  getCredentials as getSunatCred,
  getDriveAuthUrl,
  getDriveStatus,
  setCredentials as setSunatCred,
} from "@/features/sunat/api"
import { apiError } from "@/shared/lib/api/error"
import { useActiveCompany } from "@/shared/stores/activeCompany"
import { useAuthStore } from "@/shared/stores/auth"
import { Badge } from "@/shared/ui/badge"
import { Button } from "@/shared/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card"
import { Drawer } from "@/shared/ui/drawer"
import { EmptyState } from "@/shared/ui/empty-state"
import { FormField } from "@/shared/ui/form-field"
import { Input } from "@/shared/ui/input"

function Configurado({ ok }: { ok: boolean }) {
  return ok ? (
    <Badge tone="success">
      <Check className="size-3" /> Configurado
    </Badge>
  ) : (
    <Badge tone="neutral">Sin configurar</Badge>
  )
}

/** Credencial SOL (usuario + clave), compartida por Descarga SUNAT y SIRE. */
function SolCard({ sunat, sire, ruc }: { sunat: boolean; sire: boolean; ruc: string }) {
  const queryClient = useQueryClient()
  const [usuario, setUsuario] = useState("")
  const [clave, setClave] = useState("")

  const sunatCred = useQuery({ queryKey: ["sunat", "cred"], queryFn: getSunatCred, enabled: sunat })
  const sireCred = useQuery({ queryKey: ["sire", "cred"], queryFn: getSireCred, enabled: sire })

  const usuarioActual = sunatCred.data?.usuario ?? sireCred.data?.usuario_sol ?? ""
  const configurado = Boolean(sunatCred.data?.configured || sireCred.data?.configured)

  const guardar = useMutation({
    mutationFn: async () => {
      const ops: Promise<unknown>[] = []
      if (sunat) ops.push(setSunatCred({ ruc, usuario, clave }))
      // En SIRE se reenvía el client_id conocido y el secret vacío (se conserva);
      // así se actualiza solo el usuario/clave SOL sin tocar las credenciales de API.
      if (sire) {
        ops.push(
          setSireCred({
            usuario_sol: usuario,
            clave_sol: clave,
            client_id: sireCred.data?.client_id ?? "",
            client_secret: "",
          }),
        )
      }
      await Promise.all(ops)
    },
    onSuccess: () => {
      toast.success("Credenciales SOL guardadas")
      setClave("")
      queryClient.invalidateQueries({ queryKey: ["sunat", "cred"] })
      queryClient.invalidateQueries({ queryKey: ["sire", "cred"] })
    },
    onError: (err) => toast.error(apiError(err, "No se pudieron guardar")),
  })

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <KeyRound className="size-4 text-primary" /> Credenciales SOL
        </CardTitle>
        <Configurado ok={configurado} />
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Usuario y clave SOL de SUNAT. Se usan en{" "}
          {sunat && sire ? "Descarga SUNAT y SIRE" : sunat ? "Descarga SUNAT" : "SIRE"}. Tu RUC
          ({ruc || "—"}) se toma de la empresa activa. La clave se cifra y nunca se muestra.
        </p>
        <div className="grid gap-4 @container sm:grid-cols-2">
          <FormField label="Usuario SOL" htmlFor="sol-usuario">
            <Input
              id="sol-usuario"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              placeholder={usuarioActual || "usuario secundario SOL"}
            />
          </FormField>
          <FormField label="Clave SOL" htmlFor="sol-clave" hint={configurado ? "Déjala para reemplazar la guardada" : undefined}>
            <Input id="sol-clave" type="password" value={clave} onChange={(e) => setClave(e.target.value)} autoComplete="off" />
          </FormField>
        </div>
        <Button disabled={guardar.isPending || !usuario || !clave} onClick={() => guardar.mutate()}>
          Guardar credenciales SOL
        </Button>
      </CardContent>
    </Card>
  )
}

/** Credenciales de la API SIRE (client_id + client_secret), específicas de SIRE. */
function ApiSireCard() {
  const queryClient = useQueryClient()
  const [clientId, setClientId] = useState("")
  const [clientSecret, setClientSecret] = useState("")

  const cred = useQuery({ queryKey: ["sire", "cred"], queryFn: getSireCred })

  const guardar = useMutation({
    mutationFn: () =>
      setSireCred({
        usuario_sol: cred.data?.usuario_sol ?? "",
        clave_sol: "",
        client_id: clientId || (cred.data?.client_id ?? ""),
        client_secret: clientSecret,
      }),
    onSuccess: () => {
      toast.success("Credenciales de API SIRE guardadas")
      setClientSecret("")
      queryClient.invalidateQueries({ queryKey: ["sire", "cred"] })
    },
    onError: (err) => toast.error(apiError(err, "No se pudieron guardar")),
  })

  const configurado = Boolean(cred.data?.client_id)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <KeyRound className="size-4 text-primary" /> API SIRE
        </CardTitle>
        <Configurado ok={configurado} />
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Client ID y Client Secret de SUNAT SOL → Aplicaciones → API SIRE. Necesarios solo para
          conciliar con SIRE. El secret se cifra antes de guardarse.
        </p>
        <div className="grid gap-4 @container sm:grid-cols-2">
          <FormField label="Client ID" htmlFor="sire-cid">
            <Input id="sire-cid" value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder={cred.data?.client_id ?? "xxxxxxxx-xxxx-…"} />
          </FormField>
          <FormField label="Client Secret" htmlFor="sire-cs" hint={configurado ? "Déjalo para reemplazar el guardado" : undefined}>
            <Input id="sire-cs" type="password" value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} autoComplete="off" />
          </FormField>
        </div>
        <Button disabled={guardar.isPending || !clientSecret} onClick={() => guardar.mutate()}>
          Guardar API SIRE
        </Button>
      </CardContent>
    </Card>
  )
}

function DriveCard() {
  const queryClient = useQueryClient()
  const status = useQuery({ queryKey: ["sunat", "drive"], queryFn: getDriveStatus })

  const conectar = useMutation({
    mutationFn: getDriveAuthUrl,
    onSuccess: (url) => {
      window.open(url, "drive-oauth", "width=520,height=640")
    },
    onError: (err) => toast.error(apiError(err, "No se pudo iniciar la conexión")),
  })
  const desconectar = useMutation({
    mutationFn: disconnectDrive,
    onSuccess: () => {
      toast.success("Google Drive desconectado")
      queryClient.invalidateQueries({ queryKey: ["sunat", "drive"] })
    },
    onError: (err) => toast.error(apiError(err, "No se pudo desconectar")),
  })

  const conectado = Boolean(status.data?.connected)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Cloud className="size-4 text-primary" /> Google Drive
        </CardTitle>
        <Configurado ok={conectado} />
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Guarda las descargas de SUNAT en una carpeta propia de la app.
        </p>
        {conectado ? (
          <Button variant="outline" size="sm" disabled={desconectar.isPending} onClick={() => desconectar.mutate()}>
            Desconectar
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled={conectar.isPending} onClick={() => conectar.mutate()}>
            Conectar
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

function BuzonesCard() {
  const buzones = useQuery({ queryKey: ["correos", "mailboxes"], queryFn: listMailboxes })
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Mail className="size-4 text-primary" /> Buzones de correo
        </CardTitle>
        <Configurado ok={(buzones.data?.length ?? 0) > 0} />
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {buzones.data?.length
            ? `${buzones.data.length} buzón(es) conectado(s) para Automatización de correos.`
            : "Conecta Gmail u Outlook para escanear adjuntos."}
        </p>
        <Link to="/correos" className="shrink-0 text-sm font-medium text-primary hover:underline">
          Gestionar buzones
        </Link>
      </CardContent>
    </Card>
  )
}

function ConexionesPanel() {
  const companyId = useActiveCompany((s) => s.companyId)
  const user = useAuthStore((s) => s.user)
  const empresa = user?.companies.find((c) => c.id === companyId)
  const modulos = empresa?.modules ?? []

  if (companyId == null || !empresa) {
    return (
      <EmptyState
        icon={KeyRound}
        title="No tienes una empresa activa"
        description="Selecciona una empresa en la barra superior para gestionar sus conexiones."
      />
    )
  }

  const sunat = modulos.includes("sunat")
  const sire = modulos.includes("sire")
  const correos = modulos.includes("correos")

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Gestiona en un solo lugar las credenciales e integraciones de tus módulos. Las credenciales
        SOL se configuran una vez y las comparten SUNAT y SIRE.
      </p>
      {!sunat && !sire && !correos ? (
        <EmptyState
          icon={KeyRound}
          title="Nada que configurar"
          description="Esta empresa no tiene módulos que requieran credenciales o conexiones."
        />
      ) : (
        <>
          {(sunat || sire) && <SolCard sunat={sunat} sire={sire} ruc={empresa.ruc} />}
          {sire && <ApiSireCard />}
          {sunat && <DriveCard />}
          {correos && <BuzonesCard />}
        </>
      )}
    </div>
  )
}

/** Overlay global de Conexiones (se monta una vez en el AppShell). */
export function ConexionesDrawer() {
  const { open, cerrar } = useConexiones()
  return (
    <Drawer open={open} onClose={cerrar} title="Conexiones" className="max-w-2xl">
      {open ? <ConexionesPanel /> : null}
    </Drawer>
  )
}
