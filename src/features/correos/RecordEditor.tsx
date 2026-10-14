import { useMutation } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"

import { approveRecord, correctRecord, type RecordSummary } from "@/features/correos/api"
import { apiError } from "@/shared/lib/api/error"
import { Button } from "@/shared/ui/button"
import { Input } from "@/shared/ui/input"
import { Label } from "@/shared/ui/label"

// Campos corregibles (coinciden con los que acepta el backend). `date` para la
// fecha de pago; el resto, texto que el backend interpreta con sus objetos de valor.
const CAMPOS: { key: keyof RecordSummary; label: string; type?: string }[] = [
  { key: "ruc_contribuyente", label: "RUC arrendador" },
  { key: "nombre_contribuyente", label: "Nombre / Razón social" },
  { key: "ruc_inquilino", label: "RUC inquilino" },
  { key: "nombre_inquilino", label: "Inquilino" },
  { key: "tipo_doc_inquilino", label: "Tipo doc. inquilino" },
  { key: "tipo_de_bien", label: "Tipo de bien" },
  { key: "periodo", label: "Periodo (AAAAMM)" },
  { key: "fecha_de_pago", label: "Fecha de pago", type: "date" },
  { key: "numero_de_operacion", label: "N° operación" },
  { key: "monto_alquiler", label: "Monto alquiler" },
  { key: "tributo_resultante", label: "Tributo resultante" },
  { key: "importe_pagado", label: "Importe pagado" },
  { key: "intereses_moratorios", label: "Intereses moratorios" },
]

export function RecordEditor({
  record,
  onClose,
  onSaved,
}: {
  record: RecordSummary
  onClose: () => void
  onSaved: () => void
}) {
  const inicial = Object.fromEntries(
    CAMPOS.map((c) => [c.key, (record[c.key] as string | null) ?? ""]),
  ) as Record<string, string>
  const [valores, setValores] = useState<Record<string, string>>(inicial)

  const guardar = useMutation({
    mutationFn: async () => {
      const diff = Object.fromEntries(
        CAMPOS.map((c) => c.key as string)
          .filter((k) => valores[k] !== inicial[k] && valores[k].trim() !== "")
          .map((k) => [k, valores[k].trim()]),
      )
      // Sin cambios: solo se aprueba (el PATCH exige al menos una corrección).
      if (Object.keys(diff).length === 0) return approveRecord(record.id)
      return correctRecord(record.id, diff)
    },
    onSuccess: () => {
      toast.success("Registro guardado y aprobado")
      onSaved()
    },
    onError: (err) => toast.error(apiError(err, "No se pudo guardar")),
  })

  const dudoso = (campo: string) => record.campos_dudosos.includes(campo)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-auto rounded-lg bg-background p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">Corregir registro #{record.id}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Los campos corregidos quedan como verificados por una persona. Al guardar, el registro
          se aprueba.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {CAMPOS.map((c) => {
            const key = c.key as string
            return (
              <div key={key} className="space-y-1.5">
                <Label htmlFor={key}>
                  {c.label}
                  {dudoso(key) && <span className="ml-1 text-destructive">•</span>}
                </Label>
                <Input
                  id={key}
                  type={c.type ?? "text"}
                  value={valores[key]}
                  onChange={(e) => setValores((v) => ({ ...v, [key]: e.target.value }))}
                />
              </div>
            )
          })}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={guardar.isPending} onClick={() => guardar.mutate()}>
            Guardar y aprobar
          </Button>
        </div>
      </div>
    </div>
  )
}
