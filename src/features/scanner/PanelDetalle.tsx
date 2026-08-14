import { useMutation } from "@tanstack/react-query"
import { Bot, Save, X } from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"

import { updateDocumento } from "@/features/scanner/api"
import { esColumna, valorCampo } from "@/features/scanner/filas"
import { validarCampo } from "@/features/scanner/validacion"
import { apiError } from "@/shared/lib/api/error"

import type { Documento } from "@/features/scanner/api"

interface Props {
  doc: Documento
  camposLabels: Record<string, string>
  onCerrar: () => void
  onGuardado: () => void
}

export function PanelDetalle({ doc, camposLabels, onCerrar, onGuardado }: Props) {
  const campos = useMemo(
    () => Object.entries(doc.campos).filter(([k, v]) => esColumna(k, v)),
    [doc],
  )
  const [valores, setValores] = useState<Record<string, string>>({})
  const [errores, setErrores] = useState<Record<string, string>>({})

  const conIa = doc.campos.procesado_con_ia === true

  function cambiar(campo: string, valor: string) {
    setValores((prev) => ({ ...prev, [campo]: valor }))
    const err = validarCampo(campo, valor)
    setErrores((prev) => {
      const s = { ...prev }
      if (err) s[campo] = err
      else delete s[campo]
      return s
    })
  }

  const guardar = useMutation({
    mutationFn: () => updateDocumento(doc.id, valores),
    onSuccess: () => {
      toast.success("Cambios guardados")
      setValores({})
      setErrores({})
      onGuardado()
    },
    onError: (e) => toast.error(apiError(e, "No se pudo guardar")),
  })

  function onGuardar() {
    const errs: Record<string, string> = { ...errores }
    Object.entries(valores).forEach(([k, v]) => {
      const err = validarCampo(k, v)
      if (err) errs[k] = err
    })
    if (Object.keys(errs).length) {
      setErrores(errs)
      toast.error("Corrige los campos marcados antes de guardar")
      return
    }
    guardar.mutate()
  }

  const hayCambios = Object.keys(valores).length > 0
  const hayErrores = Object.keys(errores).length > 0

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onCerrar} />
      <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {doc.tipo_etiqueta ?? doc.tipo_documento}
            </p>
            <p className="mt-0.5 max-w-xs truncate text-sm font-bold">{doc.nombre_archivo}</p>
          </div>
          <button
            onClick={onCerrar}
            aria-label="Cerrar"
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-[18px]" />
          </button>
        </div>

        {conIa && (
          <div className="mx-4 mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
            <Bot className="mt-0.5 size-4 shrink-0 text-amber-500" />
            <p className="text-xs text-amber-700 dark:text-amber-500">
              Procesado con IA — verifica los datos manualmente.
            </p>
          </div>
        )}

        <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-5 py-4">
          {campos.map(([campo, original]) => {
            const editado = valores[campo] !== undefined
            const val = editado ? valores[campo] : valorCampo(original)
            const error = errores[campo]
            return (
              <div key={campo}>
                <label className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {camposLabels[campo] ?? campo}
                  {editado && !error && <span className="text-[10px] font-semibold text-primary">✎</span>}
                </label>
                <input
                  type="text"
                  value={val}
                  onChange={(e) => cambiar(campo, e.target.value)}
                  className={`mt-1 w-full rounded-lg border bg-muted/40 px-3 py-2 text-sm focus:bg-card focus:outline-none ${
                    error
                      ? "border-red-400"
                      : editado
                        ? "border-primary/50"
                        : "border-border focus:border-primary/50"
                  }`}
                />
                {error && <p className="mt-0.5 text-xs text-red-500">⚠ {error}</p>}
              </div>
            )
          })}
          {campos.length === 0 && (
            <p className="text-sm text-muted-foreground">Este documento no tiene campos editables.</p>
          )}
        </div>

        <div className="flex items-center gap-3 border-t px-5 py-4">
          {hayErrores && (
            <span className="text-xs font-medium text-red-500">
              {Object.keys(errores).length} campo(s) con error
            </span>
          )}
          <button
            onClick={onGuardar}
            disabled={!hayCambios || guardar.isPending || hayErrores}
            className="ml-auto flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save className="size-3.5" />
            {guardar.isPending ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </div>
    </>
  )
}
