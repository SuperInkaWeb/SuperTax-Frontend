import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, Replace, X } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { downloadReplace, replacePreview, saveReplace } from "@/features/datafilter/api"
import { ResultView } from "@/features/datafilter/components/ResultView"
import { apiError } from "@/shared/lib/api/error"
import { Button } from "@/shared/ui/button"
import { Input } from "@/shared/ui/input"
import { Select } from "@/shared/ui/select"

import type {
  Delimiter,
  DownloadFormat,
  FilterGroup,
  MatchMode,
  PreviewResponse,
  ReplacementRule,
} from "@/features/datafilter/types"

interface PanelProps {
  datasetId: number
  columns: string[]
  filter: FilterGroup | null
}

interface Regla {
  id: number
  column: string
  mode: MatchMode
  search: string
  replace: string
  case_sensitive: boolean
}

let contador = 0
const PAGINA = 100

export function ReplacePanel({ datasetId, columns, filter }: PanelProps) {
  const queryClient = useQueryClient()
  const [reglas, setReglas] = useState<Regla[]>([])
  const [descargando, setDescargando] = useState(false)

  function nueva(): Regla {
    return { id: contador++, column: columns[0] ?? "", mode: "exact", search: "", replace: "", case_sensitive: true }
  }
  function actualizar(id: number, cambios: Partial<Regla>) {
    setReglas((prev) => prev.map((r) => (r.id === id ? { ...r, ...cambios } : r)))
  }

  const payload = (): ReplacementRule[] =>
    reglas
      .filter((r) => r.column && r.search)
      .map(({ column, mode, search, replace, case_sensitive }) => ({
        column, mode, search, replace, case_sensitive,
      }))

  const ver = useMutation({
    mutationFn: () =>
      replacePreview(datasetId, { filter, replacements: payload(), limit: PAGINA, offset: 0 }),
  })
  const res: PreviewResponse | undefined = ver.data

  const guardar = useMutation({
    mutationFn: (name: string) =>
      saveReplace(datasetId, { filter, replacements: payload(), name }),
    onSuccess: () => {
      toast.success("Guardando… aparecerá en Datasets al terminar")
      queryClient.invalidateQueries({ queryKey: ["datafilter", "datasets"] })
    },
    onError: (e) => toast.error(apiError(e, "No se pudo guardar")),
  })

  async function descargar(format: DownloadFormat, delimiter: Delimiter | undefined) {
    setDescargando(true)
    try {
      await downloadReplace(datasetId, { filter, replacements: payload(), format, delimiter })
    } catch (e) {
      toast.error(apiError(e, "No se pudo descargar"))
    } finally {
      setDescargando(false)
    }
  }

  const sinReglas = payload().length === 0

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {reglas.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center gap-2">
            <Select
              value={r.column}
              onChange={(e) => actualizar(r.id, { column: e.target.value })}
              className="w-44"
            >
              {columns.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
            <Select
              value={r.mode}
              onChange={(e) => actualizar(r.id, { mode: e.target.value as MatchMode })}
              className="w-36"
            >
              <option value="exact">Valor exacto</option>
              <option value="contains">Contiene</option>
            </Select>
            <Input
              value={r.search}
              onChange={(e) => actualizar(r.id, { search: e.target.value })}
              placeholder="buscar"
              className="w-40"
            />
            <Input
              value={r.replace}
              onChange={(e) => actualizar(r.id, { replace: e.target.value })}
              placeholder="reemplazar por"
              className="w-40"
            />
            {r.mode === "exact" && (
              <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={r.case_sensitive}
                  onChange={(e) => actualizar(r.id, { case_sensitive: e.target.checked })}
                />
                May/min
              </label>
            )}
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setReglas((prev) => prev.filter((x) => x.id !== r.id))}
              aria-label="Quitar regla"
            >
              <X className="size-4" />
            </Button>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setReglas((prev) => [...prev, nueva()])}
            disabled={columns.length === 0}
          >
            <Plus className="size-4" />
            Añadir regla
          </Button>
          <Button size="sm" onClick={() => ver.mutate()} disabled={sinReglas || ver.isPending}>
            <Replace className="size-4" />
            Ver resultado
          </Button>
        </div>
      </div>

      <ResultView
        loading={ver.isPending}
        error={ver.isError ? apiError(ver.error, "No se pudo aplicar") : null}
        columns={res?.columns ?? []}
        rows={res?.rows ?? []}
        total={res?.total_matched ?? null}
        onDownload={descargar}
        downloading={descargando}
        onSave={(name) => guardar.mutate(name)}
        saving={guardar.isPending}
        placeholder="Añade reglas de reemplazo y pulsa “Ver resultado”."
      />
    </div>
  )
}
