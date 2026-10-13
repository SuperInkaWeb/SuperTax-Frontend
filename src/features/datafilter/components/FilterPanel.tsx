import { Filter, Plus, X } from "lucide-react"
import { useState } from "react"

import { Button } from "@/shared/ui/button"
import { Input } from "@/shared/ui/input"
import { Select } from "@/shared/ui/select"

import type {
  Combinator,
  FilterGroup,
  FilterLeaf,
  Operator,
} from "@/features/datafilter/types"

const OPERADORES: Array<{ value: Operator; label: string }> = [
  { value: "eq", label: "=" },
  { value: "ne", label: "≠" },
  { value: "gt", label: ">" },
  { value: "gte", label: "≥" },
  { value: "lt", label: "<" },
  { value: "lte", label: "≤" },
  { value: "contains", label: "contiene" },
  { value: "not_contains", label: "no contiene" },
  { value: "starts_with", label: "empieza con" },
  { value: "ends_with", label: "termina con" },
  { value: "in", label: "en lista" },
  { value: "not_in", label: "no en lista" },
  { value: "between", label: "entre" },
  { value: "is_null", label: "vacío" },
  { value: "is_not_null", label: "no vacío" },
]

const SIN_VALOR = new Set<Operator>(["is_null", "is_not_null"])
const LISTA = new Set<Operator>(["in", "not_in"])

interface Condicion {
  id: number
  column: string
  operator: Operator
  value: string
  value2: string
}

let contador = 0
function nueva(column: string): Condicion {
  return { id: contador++, column, operator: "eq", value: "", value2: "" }
}

/** Convierte "123"/"1.5" a número; el resto se deja como texto (DuckDB castea). */
function coerce(texto: string): string | number {
  const t = texto.trim()
  return t !== "" && /^-?\d+(\.\d+)?$/.test(t) ? Number(t) : t
}

function aHoja(c: Condicion): FilterLeaf {
  if (SIN_VALOR.has(c.operator)) return { type: "condition", column: c.column, operator: c.operator }
  if (c.operator === "between") {
    return {
      type: "condition", column: c.column, operator: c.operator,
      value: [coerce(c.value), coerce(c.value2)],
    }
  }
  if (LISTA.has(c.operator)) {
    return {
      type: "condition", column: c.column, operator: c.operator,
      value: c.value.split(",").map((v) => coerce(v)).filter((v) => v !== ""),
    }
  }
  return { type: "condition", column: c.column, operator: c.operator, value: coerce(c.value) }
}

interface FilterPanelProps {
  columns: string[]
  onApply: (filter: FilterGroup | null) => void
}

/** Constructor de filtros: lista plana de condiciones unidas por Y/O. */
export function FilterPanel({ columns, onApply }: FilterPanelProps) {
  const [combinator, setCombinator] = useState<Combinator>("and")
  const [condiciones, setCondiciones] = useState<Condicion[]>([])

  function actualizar(id: number, cambios: Partial<Condicion>) {
    setCondiciones((prev) => prev.map((c) => (c.id === id ? { ...c, ...cambios } : c)))
  }

  function aplicar() {
    const utiles = condiciones.filter((c) => c.column)
    if (utiles.length === 0) {
      onApply(null)
      return
    }
    onApply({ type: "group", combinator, children: utiles.map(aHoja) })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Filter className="size-4" />
        Filtros
        {condiciones.length > 1 && (
          <Select
            value={combinator}
            onChange={(e) => setCombinator(e.target.value as Combinator)}
            className="ml-2 w-28"
          >
            <option value="and">Cumplen todo</option>
            <option value="or">Cumple alguno</option>
          </Select>
        )}
      </div>

      {condiciones.map((c) => {
        const sinValor = SIN_VALOR.has(c.operator)
        return (
          <div key={c.id} className="flex flex-wrap items-center gap-2">
            <Select
              value={c.column}
              onChange={(e) => actualizar(c.id, { column: e.target.value })}
              className="w-44"
            >
              {columns.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </Select>
            <Select
              value={c.operator}
              onChange={(e) => actualizar(c.id, { operator: e.target.value as Operator })}
              className="w-40"
            >
              {OPERADORES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
            {!sinValor && (
              <Input
                value={c.value}
                onChange={(e) => actualizar(c.id, { value: e.target.value })}
                placeholder={LISTA.has(c.operator) ? "valor1, valor2" : "valor"}
                className="w-44"
              />
            )}
            {c.operator === "between" && (
              <Input
                value={c.value2}
                onChange={(e) => actualizar(c.id, { value2: e.target.value })}
                placeholder="hasta"
                className="w-32"
              />
            )}
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setCondiciones((prev) => prev.filter((x) => x.id !== c.id))}
              aria-label="Quitar condición"
            >
              <X className="size-4" />
            </Button>
          </div>
        )
      })}

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setCondiciones((prev) => [...prev, nueva(columns[0] ?? "")])}
          disabled={columns.length === 0}
        >
          <Plus className="size-4" />
          Añadir condición
        </Button>
        <Button size="sm" onClick={aplicar}>
          Aplicar
        </Button>
      </div>
    </div>
  )
}
