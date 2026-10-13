import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Calculator, Plus, X } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { computePreview, downloadComputed, saveComputed } from "@/features/datafilter/api"
import { ResultView } from "@/features/datafilter/components/ResultView"
import { useAnalysisResult } from "@/features/datafilter/hooks/useAnalysisResult"
import { apiError } from "@/shared/lib/api/error"
import { Button } from "@/shared/ui/button"
import { Input } from "@/shared/ui/input"
import { Select } from "@/shared/ui/select"

import type {
  ComputedColumn,
  Delimiter,
  DownloadFormat,
  Expression,
  FilterGroup,
  FunctionName,
} from "@/features/datafilter/types"

interface PanelProps {
  datasetId: number
  columns: string[]
  filter: FilterGroup | null
}

interface FunctionMeta {
  value: FunctionName
  label: string
  min: number
  max: number | null
  argLabels: string[]
  hint?: string
}

const FUNCTIONS: FunctionMeta[] = [
  { value: "concat", label: "Unir texto (CONCAT)", min: 2, max: null, argLabels: ["Parte"], hint: 'Añade un "Valor fijo" con un espacio " " para separar.' },
  { value: "upper", label: "MAYÚSCULAS", min: 1, max: 1, argLabels: ["Texto"] },
  { value: "lower", label: "minúsculas", min: 1, max: 1, argLabels: ["Texto"] },
  { value: "trim", label: "Quitar espacios sobrantes", min: 1, max: 1, argLabels: ["Texto"] },
  { value: "length", label: "Longitud del texto", min: 1, max: 1, argLabels: ["Texto"] },
  { value: "substr", label: "Extraer texto (SUBSTR)", min: 2, max: 3, argLabels: ["Texto", "Inicio", "Longitud"] },
  { value: "replace", label: "Reemplazar texto", min: 3, max: 3, argLabels: ["Texto", "Buscar", "Reemplazo"] },
  { value: "add", label: "Sumar (+)", min: 2, max: 2, argLabels: ["Valor A", "Valor B"] },
  { value: "sub", label: "Restar (−)", min: 2, max: 2, argLabels: ["Valor A", "Valor B"] },
  { value: "mul", label: "Multiplicar (×)", min: 2, max: 2, argLabels: ["Valor A", "Valor B"] },
  { value: "div", label: "Dividir (÷)", min: 2, max: 2, argLabels: ["Dividendo", "Divisor"] },
  { value: "round", label: "Redondear", min: 1, max: 2, argLabels: ["Número", "Decimales"] },
  { value: "year", label: "Año de una fecha", min: 1, max: 1, argLabels: ["Fecha"] },
  { value: "month", label: "Mes de una fecha", min: 1, max: 1, argLabels: ["Fecha"] },
  { value: "day", label: "Día de una fecha", min: 1, max: 1, argLabels: ["Fecha"] },
  { value: "datediff_days", label: "Días entre dos fechas", min: 2, max: 2, argLabels: ["Fecha A", "Fecha B"] },
  { value: "if", label: "Condición SI (si… entonces… si no…)", min: 4, max: 4, argLabels: ["Izquierda", "Derecha", "Entonces", "Si no"] },
]

const COMPARATORS: Array<{ value: FunctionName; label: string }> = [
  { value: "eq", label: "= igual a" },
  { value: "ne", label: "≠ distinto de" },
  { value: "gt", label: "> mayor que" },
  { value: "gte", label: "≥ mayor o igual que" },
  { value: "lt", label: "< menor que" },
  { value: "lte", label: "≤ menor o igual que" },
]

const COMPARATOR_SYMBOL: Partial<Record<FunctionName, string>> = {
  eq: "=", ne: "≠", gt: ">", gte: "≥", lt: "<", lte: "≤",
}
const INFIX_TOKENS: Partial<Record<FunctionName, string>> = { add: "+", sub: "−", mul: "×", div: "÷" }
const FN_TOKENS: Partial<Record<FunctionName, string>> = {
  concat: "UNIR", upper: "MAYÚS", lower: "minús", trim: "LIMPIAR", length: "LARGO",
  substr: "EXTRAER", replace: "REEMPLAZAR", round: "REDONDEAR",
  year: "AÑO", month: "MES", day: "DÍA", datediff_days: "DÍAS_ENTRE",
}
const FUNCTION_META = new Map(FUNCTIONS.map((f) => [f.value, f]))

interface ArgDraft {
  source: "column" | "literal"
  column: string
  literal: string
}

interface ColumnDraft {
  name: string
  fn: FunctionName
  args: ArgDraft[]
  comparator: FunctionName // solo cuando fn === "if"
}

function newArg(): ArgDraft {
  return { source: "column", column: "", literal: "" }
}
function newColumnDraft(): ColumnDraft {
  return { name: "", fn: "concat", args: [newArg(), newArg()], comparator: "gt" }
}

/** "10.5" → número; preserva códigos con ceros ("08" queda "08", no 8). */
function coerceLiteral(raw: string): string | number {
  const trimmed = raw.trim()
  if (trimmed === "") return raw
  const asNumber = Number(trimmed)
  return !Number.isNaN(asNumber) && String(asNumber) === trimmed ? asNumber : raw
}

function argLabel(meta: FunctionMeta, index: number): string {
  if (index < meta.argLabels.length) return meta.argLabels[index]
  const last = meta.argLabels[meta.argLabels.length - 1] ?? "Valor"
  return `${last} ${index + 1}`
}

function argText(arg: ArgDraft | undefined): string {
  if (!arg) return "?"
  if (arg.source === "column") return arg.column || "?"
  if (arg.literal.trim() === "") return "?"
  const value = coerceLiteral(arg.literal)
  return typeof value === "number" ? String(value) : `"${arg.literal}"`
}

function previewFormula(draft: ColumnDraft): string {
  const name = draft.name.trim() || "(sin nombre)"
  if (draft.fn === "if") {
    const symbol = COMPARATOR_SYMBOL[draft.comparator] ?? "?"
    const [left, right, thenArg, elseArg] = draft.args
    return `${name} = SI(${argText(left)} ${symbol} ${argText(right)}, ${argText(thenArg)}, ${argText(elseArg)})`
  }
  const parts = draft.args.map(argText)
  const infix = INFIX_TOKENS[draft.fn]
  if (infix && parts.length >= 2) return `${name} = ${parts.join(` ${infix} `)}`
  const token = FN_TOKENS[draft.fn] ?? draft.fn
  return `${name} = ${token}(${parts.join(", ")})`
}

export function ComputePanel({ datasetId, columns, filter }: PanelProps) {
  const queryClient = useQueryClient()
  const result = useAnalysisResult()
  const [drafts, setDrafts] = useState<ColumnDraft[]>([newColumnDraft()])
  const [error, setError] = useState<string | null>(null)
  const [descargando, setDescargando] = useState(false)

  function updateDraft(index: number, patch: Partial<ColumnDraft>) {
    setDrafts((cur) => cur.map((d, i) => (i === index ? { ...d, ...patch } : d)))
  }
  function updateArg(colIndex: number, argIndex: number, patch: Partial<ArgDraft>) {
    setDrafts((cur) =>
      cur.map((d, i) =>
        i === colIndex
          ? { ...d, args: d.args.map((a, j) => (j === argIndex ? { ...a, ...patch } : a)) }
          : d,
      ),
    )
  }
  function changeFn(index: number, fn: FunctionName) {
    const meta = FUNCTION_META.get(fn)!
    setDrafts((cur) =>
      cur.map((d, i) => {
        if (i !== index) return d
        const args = [...d.args]
        while (args.length < meta.min) args.push(newArg())
        if (meta.max !== null && args.length > meta.max) args.length = meta.max
        return { ...d, fn, args }
      }),
    )
  }

  function fail(message: string): null {
    setError(message)
    return null
  }

  function validateAndBuild(): ComputedColumn[] | null {
    const names = new Set<string>()
    const built: ComputedColumn[] = []
    for (const draft of drafts) {
      const name = draft.name.trim()
      if (!name) return fail("Cada columna nueva necesita un nombre.")
      if (columns.includes(name)) return fail(`Ya existe una columna llamada "${name}".`)
      if (names.has(name)) return fail(`Nombre de columna repetido: "${name}".`)
      names.add(name)

      const toExpr = (arg: ArgDraft | undefined): Expression | null => {
        if (!arg) return fail(`Falta un valor en "${name}".`)
        if (arg.source === "column") {
          if (!arg.column) return fail(`Elige la columna en "${name}".`)
          return { kind: "column", name: arg.column }
        }
        if (arg.literal.trim() === "") return fail(`Escribe el valor en "${name}".`)
        return { kind: "literal", value: coerceLiteral(arg.literal) }
      }

      if (draft.fn === "if") {
        const left = toExpr(draft.args[0])
        const right = toExpr(draft.args[1])
        const thenExpr = toExpr(draft.args[2])
        const elseExpr = toExpr(draft.args[3])
        if (!left || !right || !thenExpr || !elseExpr) return null
        const condition: Expression = { kind: "function", fn: draft.comparator, args: [left, right] }
        built.push({ name, expression: { kind: "function", fn: "if", args: [condition, thenExpr, elseExpr] } })
        continue
      }

      const args: Expression[] = []
      for (const arg of draft.args) {
        const expr = toExpr(arg)
        if (!expr) return null
        args.push(expr)
      }
      built.push({ name, expression: { kind: "function", fn: draft.fn, args } })
    }
    return built
  }

  function ejecutar() {
    const cols = validateAndBuild()
    if (!cols) return
    setError(null)
    result.run((offset, sort) =>
      computePreview(datasetId, {
        filter, columns: cols,
        order_column: sort?.column ?? null, order_direction: sort?.direction,
        limit: result.limit, offset,
      }),
    )
  }

  const guardar = useMutation({
    mutationFn: ({ name, cols }: { name: string; cols: ComputedColumn[] }) =>
      saveComputed(datasetId, { filter, columns: cols, name }),
    onSuccess: () => {
      toast.success("Guardando… aparecerá en Datasets al terminar")
      queryClient.invalidateQueries({ queryKey: ["datafilter", "datasets"] })
    },
    onError: (e) => toast.error(apiError(e, "No se pudo guardar")),
  })

  function alGuardar(name: string) {
    const cols = validateAndBuild()
    if (cols) guardar.mutate({ name, cols })
  }

  async function descargar(format: DownloadFormat, delimiter: Delimiter | undefined) {
    const cols = validateAndBuild()
    if (!cols) return
    setDescargando(true)
    try {
      await downloadComputed(datasetId, { filter, columns: cols, format, delimiter })
    } catch (e) {
      toast.error(apiError(e, "No se pudo descargar"))
    } finally {
      setDescargando(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {drafts.map((draft, index) => {
          const meta = FUNCTION_META.get(draft.fn)!
          const canAddArg = meta.max === null || draft.args.length < meta.max
          const isIf = draft.fn === "if"

          const argFields = (argIndex: number) => {
            const arg = draft.args[argIndex]
            if (!arg) return null
            return (
              <>
                <Select
                  className="w-32"
                  value={arg.source}
                  onChange={(e) => updateArg(index, argIndex, { source: e.target.value as ArgDraft["source"] })}
                >
                  <option value="column">Columna</option>
                  <option value="literal">Valor fijo</option>
                </Select>
                {arg.source === "column" ? (
                  <Select
                    className="flex-1"
                    value={arg.column}
                    onChange={(e) => updateArg(index, argIndex, { column: e.target.value })}
                  >
                    <option value="">Elige columna…</option>
                    {columns.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <Input
                    className="flex-1"
                    placeholder="Texto o número"
                    value={arg.literal}
                    onChange={(e) => updateArg(index, argIndex, { literal: e.target.value })}
                  />
                )}
              </>
            )
          }

          return (
            <div key={index} className="space-y-2 rounded-lg border bg-muted/30 p-3">
              <div className="flex flex-wrap items-end gap-3">
                <label className="min-w-[200px] flex-1">
                  <span className="mb-1 block text-xs font-medium text-muted-foreground">
                    Nombre de la columna nueva
                  </span>
                  <Input
                    placeholder="p. ej. Nombre completo"
                    value={draft.name}
                    onChange={(e) => updateDraft(index, { name: e.target.value })}
                  />
                </label>
                <label className="w-56">
                  <span className="mb-1 block text-xs font-medium text-muted-foreground">Función</span>
                  <Select value={draft.fn} onChange={(e) => changeFn(index, e.target.value as FunctionName)}>
                    {FUNCTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                </label>
                {drafts.length > 1 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="mb-1"
                    onClick={() => setDrafts((cur) => cur.filter((_, i) => i !== index))}
                  >
                    Quitar
                  </Button>
                )}
              </div>

              {isIf ? (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-muted-foreground">Si se cumple la condición…</span>
                    <div className="flex flex-wrap items-center gap-2">
                      {argFields(0)}
                      <Select
                        className="w-48"
                        value={draft.comparator}
                        onChange={(e) => updateDraft(index, { comparator: e.target.value as FunctionName })}
                      >
                        {COMPARATORS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </Select>
                      {argFields(1)}
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <span className="text-xs font-medium text-muted-foreground">Entonces (si se cumple)</span>
                      <div className="flex items-center gap-2">{argFields(2)}</div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs font-medium text-muted-foreground">Si no (si no se cumple)</span>
                      <div className="flex items-center gap-2">{argFields(3)}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {draft.args.map((_, argIndex) => (
                    <div key={argIndex} className="flex items-center gap-2">
                      <span className="w-24 shrink-0 text-xs font-medium text-muted-foreground">
                        {argLabel(meta, argIndex)}
                      </span>
                      {argFields(argIndex)}
                      {draft.args.length > meta.min && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() =>
                            setDrafts((cur) =>
                              cur.map((d, i) =>
                                i === index ? { ...d, args: d.args.filter((_, j) => j !== argIndex) } : d,
                              ),
                            )
                          }
                          aria-label="Quitar argumento"
                        >
                          <X className="size-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {canAddArg && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setDrafts((cur) =>
                          cur.map((d, i) => (i === index ? { ...d, args: [...d.args, newArg()] } : d)),
                        )
                      }
                    >
                      <Plus className="size-4" />
                      argumento
                    </Button>
                  )}
                  {meta.hint && <p className="text-xs text-muted-foreground">{meta.hint}</p>}
                </div>
              )}

              <div className="flex items-center gap-2 rounded-md border bg-background px-2 py-1.5">
                <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Fórmula
                </span>
                <code className="truncate font-mono text-[11px]">{previewFormula(draft)}</code>
              </div>
            </div>
          )
        })}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setDrafts((cur) => [...cur, newColumnDraft()])}
          >
            <Plus className="size-4" />
            Añadir otra columna
          </Button>
          <Button size="sm" onClick={ejecutar} disabled={result.loading}>
            <Calculator className="size-4" />
            Ver resultado
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      <ResultView
        result={result}
        onDownload={descargar}
        downloading={descargando}
        onSave={alGuardar}
        saving={guardar.isPending}
        placeholder="Define columnas calculadas y pulsa “Ver resultado”."
      />
    </div>
  )
}
