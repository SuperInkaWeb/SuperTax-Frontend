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

const OPERACIONES: Array<{ value: FunctionName; label: string }> = [
  { value: "add", label: "+ sumar" },
  { value: "sub", label: "− restar" },
  { value: "mul", label: "× multiplicar" },
  { value: "div", label: "÷ dividir" },
  { value: "concat", label: "unir (texto)" },
]

type OperandoTipo = "column" | "literal"

interface ColumnaUI {
  id: number
  name: string
  fn: FunctionName
  aTipo: OperandoTipo
  a: string
  bTipo: OperandoTipo
  b: string
}

let contador = 0

/** "123"/"1.5" → número; el resto queda como texto. */
function coerce(texto: string): string | number {
  const t = texto.trim()
  return t !== "" && /^-?\d+(\.\d+)?$/.test(t) ? Number(t) : t
}

function operando(tipo: OperandoTipo, valor: string, columns: string[]): Expression {
  return tipo === "column"
    ? { kind: "column", name: valor || columns[0] || "" }
    : { kind: "literal", value: coerce(valor) }
}

export function ComputePanel({ datasetId, columns, filter }: PanelProps) {
  const queryClient = useQueryClient()
  const [descargando, setDescargando] = useState(false)

  function nueva(): ColumnaUI {
    return {
      id: contador++, name: "", fn: "add",
      aTipo: "column", a: columns[0] ?? "", bTipo: "literal", b: "",
    }
  }
  const [filas, setFilas] = useState<ColumnaUI[]>([nueva()])

  function actualizar(id: number, cambios: Partial<ColumnaUI>) {
    setFilas((prev) => prev.map((f) => (f.id === id ? { ...f, ...cambios } : f)))
  }

  const payload = (): ComputedColumn[] =>
    filas
      .filter((f) => f.name.trim())
      .map((f) => ({
        name: f.name.trim(),
        expression: {
          kind: "function",
          fn: f.fn,
          args: [operando(f.aTipo, f.a, columns), operando(f.bTipo, f.b, columns)],
        },
      }))

  const result = useAnalysisResult()

  function ejecutar() {
    result.run((offset, sort) =>
      computePreview(datasetId, {
        filter, columns: payload(),
        order_column: sort?.column ?? null, order_direction: sort?.direction,
        limit: result.limit, offset,
      }),
    )
  }

  const guardar = useMutation({
    mutationFn: (name: string) => saveComputed(datasetId, { filter, columns: payload(), name }),
    onSuccess: () => {
      toast.success("Guardando… aparecerá en Datasets al terminar")
      queryClient.invalidateQueries({ queryKey: ["datafilter", "datasets"] })
    },
    onError: (e) => toast.error(apiError(e, "No se pudo guardar")),
  })

  async function descargar(format: DownloadFormat, delimiter: Delimiter | undefined) {
    setDescargando(true)
    try {
      await downloadComputed(datasetId, { filter, columns: payload(), format, delimiter })
    } catch (e) {
      toast.error(apiError(e, "No se pudo descargar"))
    } finally {
      setDescargando(false)
    }
  }

  function operandoUI(
    tipo: OperandoTipo, valor: string,
    onTipo: (t: OperandoTipo) => void, onValor: (v: string) => void,
  ) {
    return (
      <div className="flex items-center gap-1">
        <Select value={tipo} onChange={(e) => onTipo(e.target.value as OperandoTipo)} className="w-28">
          <option value="column">Columna</option>
          <option value="literal">Valor</option>
        </Select>
        {tipo === "column" ? (
          <Select value={valor} onChange={(e) => onValor(e.target.value)} className="w-40">
            {columns.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        ) : (
          <Input value={valor} onChange={(e) => onValor(e.target.value)} placeholder="valor" className="w-28" />
        )}
      </div>
    )
  }

  const sinColumnas = payload().length === 0

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {filas.map((f) => (
          <div key={f.id} className="flex flex-wrap items-center gap-2">
            <Input
              value={f.name}
              onChange={(e) => actualizar(f.id, { name: e.target.value })}
              placeholder="nombre nuevo"
              className="w-40"
            />
            <span className="text-sm text-muted-foreground">=</span>
            {operandoUI(f.aTipo, f.a, (t) => actualizar(f.id, { aTipo: t }), (v) => actualizar(f.id, { a: v }))}
            <Select
              value={f.fn}
              onChange={(e) => actualizar(f.id, { fn: e.target.value as FunctionName })}
              className="w-40"
            >
              {OPERACIONES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
            {operandoUI(f.bTipo, f.b, (t) => actualizar(f.id, { bTipo: t }), (v) => actualizar(f.id, { b: v }))}
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setFilas((prev) => prev.filter((x) => x.id !== f.id))}
              aria-label="Quitar columna"
            >
              <X className="size-4" />
            </Button>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setFilas((prev) => [...prev, nueva()])}>
            <Plus className="size-4" />
            Añadir columna
          </Button>
          <Button size="sm" onClick={ejecutar} disabled={sinColumnas || result.loading}>
            <Calculator className="size-4" />
            Ver resultado
          </Button>
        </div>
      </div>

      <ResultView
        result={result}
        onDownload={descargar}
        downloading={descargando}
        onSave={(name) => guardar.mutate(name)}
        saving={guardar.isPending}
        placeholder="Define columnas calculadas y pulsa “Ver resultado”."
      />
    </div>
  )
}
