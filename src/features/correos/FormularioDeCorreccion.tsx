import { useMutation } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"

import {
  approveRecord,
  correctRecord,
  rejectRecord,
  type RecordSummary,
} from "@/features/correos/api"
import { useAbrirDocumento } from "@/features/correos/hooks/useAbrirDocumento"
import { apiError } from "@/shared/lib/api/error"
import { Badge } from "@/shared/ui/badge"
import { Button } from "@/shared/ui/button"
import { Input } from "@/shared/ui/input"

// Campos corregibles y su etiqueta, en el orden del formulario (coinciden con los
// que acepta el backend). El mismo formulario sirve en la cola de revisión y en la
// edición del listado, para que el conjunto no se duplique ni se desincronice.
const CAMPOS: { clave: keyof RecordSummary; etiqueta: string }[] = [
  { clave: "ruc_contribuyente", etiqueta: "RUC del arrendador" },
  { clave: "nombre_contribuyente", etiqueta: "Nombre / Razón social" },
  { clave: "tipo_doc_inquilino", etiqueta: "Tipo doc. inquilino" },
  { clave: "ruc_inquilino", etiqueta: "RUC del arrendatario" },
  { clave: "nombre_inquilino", etiqueta: "Inquilino" },
  { clave: "tipo_de_bien", etiqueta: "Tipo de bien" },
  { clave: "periodo", etiqueta: "Periodo (AAAAMM)" },
  { clave: "fecha_de_pago", etiqueta: "Fecha de pago (DD/MM/AAAA)" },
  { clave: "numero_de_operacion", etiqueta: "N.º de operación" },
  { clave: "monto_alquiler", etiqueta: "Monto de alquiler" },
  { clave: "tributo_resultante", etiqueta: "Tributo resultante" },
  { clave: "importe_pagado", etiqueta: "Importe pagado" },
  { clave: "intereses_moratorios", etiqueta: "Intereses moratorios" },
]

export function FormularioDeCorreccion({
  registro,
  onResuelto,
}: {
  registro: RecordSummary
  onResuelto: () => void
}) {
  const dudosos = new Set(registro.campos_dudosos)
  const inicial = () =>
    Object.fromEntries(CAMPOS.map(({ clave }) => [clave, String(registro[clave] ?? "")]))
  const [valores, setValores] = useState<Record<string, string>>(inicial)
  const documento = useAbrirDocumento()

  // Solo se envía lo que cambió: mandar el formulario entero marcaría como
  // "corregidos a mano" campos que nadie tocó, subiendo su confianza a 1.0.
  const cambios = Object.fromEntries(
    CAMPOS.map(({ clave }) => [clave, valores[clave] ?? ""]).filter(
      ([clave, valor]) => valor !== String(registro[clave as keyof RecordSummary] ?? ""),
    ),
  )
  const hayCambios = Object.keys(cambios).length > 0

  const guardar = useMutation({
    mutationFn: () =>
      hayCambios ? correctRecord(registro.id, cambios) : approveRecord(registro.id),
    onSuccess: () => {
      toast.success(hayCambios ? "Registro corregido y aprobado" : "Registro aprobado")
      onResuelto()
    },
    onError: (err) => toast.error(apiError(err, "No se pudo guardar")),
  })

  const rechazar = useMutation({
    mutationFn: () => rejectRecord(registro.id),
    onSuccess: () => {
      toast.success("Registro rechazado")
      onResuelto()
    },
    onError: (err) => toast.error(apiError(err)),
  })

  const ocupado = guardar.isPending || rechazar.isPending

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        guardar.mutate()
      }}
      className="@container flex flex-col gap-4"
    >
      <OrigenDelCorreo registro={registro} />

      <div className="grid gap-4 @lg:grid-cols-2">
        {CAMPOS.map(({ clave, etiqueta }) => {
          const k = clave as string
          const dudoso = dudosos.has(k)
          const confianza = registro.confianza_por_campo[k]
          return (
            <label key={k} className="flex flex-col gap-1 text-sm">
              <span className="flex items-center gap-2">
                {etiqueta}
                {dudoso && (
                  <Badge tone="info">
                    {confianza !== undefined ? `${Math.round(confianza * 100)}%` : "dudoso"}
                  </Badge>
                )}
              </span>
              <Input
                value={valores[k] ?? ""}
                onChange={(e) => setValores((prev) => ({ ...prev, [k]: e.target.value }))}
                className={dudoso ? "border-primary" : undefined}
              />
            </label>
          )
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={documento.cargando}
          onClick={() => void documento.abrir(registro.id)}
        >
          {documento.error ? "Reintentar" : "Ver documento"}
        </Button>
        <Button type="submit" disabled={ocupado}>
          {hayCambios ? "Guardar y aprobar" : "Aprobar sin cambios"}
        </Button>
        <Button type="button" variant="destructive" disabled={ocupado} onClick={() => rechazar.mutate()}>
          Rechazar
        </Button>
      </div>
    </form>
  )
}

function OrigenDelCorreo({ registro }: { registro: RecordSummary }) {
  const { origen } = registro
  if (!origen.remitente && !origen.asunto && !origen.nombre_adjunto) return null
  const recibido = origen.recibido_en ? new Date(origen.recibido_en).toLocaleString() : null
  return (
    <dl className="grid gap-x-6 gap-y-2.5 rounded-md border bg-muted/40 p-3 text-sm @lg:grid-cols-2">
      <Dato etiqueta="De" valor={origen.remitente} />
      <Dato etiqueta="Asunto" valor={origen.asunto} />
      <Dato etiqueta="Archivo" valor={origen.nombre_adjunto} />
      <Dato etiqueta="Recibido" valor={recibido} />
    </dl>
  )
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string | null }) {
  if (!valor) return null
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{etiqueta}</dt>
      <dd className="min-w-0 break-words font-medium">{valor}</dd>
    </div>
  )
}
