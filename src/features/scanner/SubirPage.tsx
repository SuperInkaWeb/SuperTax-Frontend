import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Bot } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { esperarDocumento, getTipos, uploadAuto } from "@/features/scanner/api"
import { ResultadoCard } from "@/features/scanner/ResultadoCard"
import { ZonaCarga } from "@/features/scanner/ZonaCarga"
import { apiError } from "@/shared/lib/api/error"

import type { Documento } from "@/features/scanner/api"

interface Resultado {
  documento: Documento
  key: string
}

export function SubirPage() {
  const queryClient = useQueryClient()
  const [resultados, setResultados] = useState<Resultado[]>([])
  const [tipoForzado, setTipoForzado] = useState("")

  const { data: tipos } = useQuery({ queryKey: ["scanner", "tipos"], queryFn: getTipos })

  async function manejarArchivo(file: File, onProgress: (pct: number) => void) {
    const creado = await uploadAuto(file, onProgress, tipoForzado)
    const documento = await esperarDocumento(creado.job_id)
    if (documento.campos?.procesado_con_ia === true) {
      toast("Procesado con IA — verifica los datos", { icon: "🤖" })
    } else {
      toast.success(`${documento.tipo_etiqueta ?? documento.tipo_documento} detectado`)
    }
    setResultados((prev) => [{ documento, key: crypto.randomUUID() }, ...prev])
    queryClient.invalidateQueries({ queryKey: ["scanner", "documentos"] })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="tipo-doc" className="text-sm font-medium">
          Tipo de documento
        </label>
        <select
          id="tipo-doc"
          value={tipoForzado}
          onChange={(e) => setTipoForzado(e.target.value)}
          className="h-9 rounded-md border border-border bg-card px-2 text-sm text-foreground"
        >
          <option value="">Automático (detectar)</option>
          {Object.entries(tipos ?? {}).map(([key, { etiqueta }]) => (
            <option key={key} value={key}>
              {etiqueta}
            </option>
          ))}
        </select>
        {tipoForzado && (
          <span className="text-xs text-muted-foreground">
            Se aplicará a los archivos que subas ahora (salta la detección automática).
          </span>
        )}
      </div>

      <ZonaCarga
        onArchivo={(file, onProgress) =>
          manejarArchivo(file, onProgress).catch((e) => {
            // El error se muestra en la cola; además avisamos por toast.
            toast.error(apiError(e, "No se pudo procesar el documento"))
            throw e
          })
        }
        limpiar={0}
      />

      {resultados.map((r) => {
        const conIa = r.documento.campos?.procesado_con_ia === true
        return (
          <div key={r.key} className="space-y-2">
            {conIa && (
              <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
                <Bot className="mt-0.5 size-5 shrink-0 text-amber-500" />
                <div>
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-400">
                    Documento procesado con Inteligencia Artificial
                  </p>
                  <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-500">
                    La IA intentó reconstruir el contenido — <strong>puede contener errores</strong>.
                    Verifica manualmente.
                  </p>
                </div>
              </div>
            )}
            <ResultadoCard
              resultado={r.documento}
              camposLabels={tipos?.[r.documento.tipo_documento]?.campos ?? {}}
              onCerrar={() => setResultados((prev) => prev.filter((x) => x.key !== r.key))}
            />
          </div>
        )
      })}
    </div>
  )
}
