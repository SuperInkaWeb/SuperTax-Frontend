import {
  Droplets,
  FileCheck,
  FileMinus,
  FileText,
  Flame,
  Phone,
  Users,
  X,
  Zap,
} from "lucide-react"

import type { Documento } from "@/features/scanner/api"
import type { LucideIcon } from "lucide-react"

const ICONO_TIPO: Record<string, { icon: LucideIcon; color: string }> = {
  factura_electronica: { icon: FileText, color: "text-blue-500" },
  boleta_venta: { icon: FileText, color: "text-blue-500" },
  recibo_honorarios: { icon: FileCheck, color: "text-violet-500" },
  nota_credito: { icon: FileMinus, color: "text-emerald-500" },
  nota_debito: { icon: FileMinus, color: "text-red-500" },
  recibo_luz: { icon: Zap, color: "text-yellow-500" },
  recibo_agua: { icon: Droplets, color: "text-cyan-500" },
  recibo_gas: { icon: Flame, color: "text-orange-500" },
  recibo_telefonia: { icon: Phone, color: "text-indigo-500" },
  asistencia: { icon: Users, color: "text-teal-500" },
}

function colorConfianza(c: number): string {
  if (c >= 0.8) return "bg-emerald-100 text-emerald-700"
  if (c >= 0.5) return "bg-amber-100 text-amber-700"
  return "bg-red-100 text-red-700"
}

function formatearValor(val: unknown): string | null {
  if (val === null || val === undefined || val === "") return null
  if (typeof val === "boolean") return val ? "Sí" : "No"
  if (typeof val === "number") return val.toLocaleString("es-PE")
  if (Array.isArray(val)) return `${val.length} registros`
  if (typeof val === "object") return JSON.stringify(val)
  return String(val)
}

interface Props {
  resultado: Documento
  camposLabels: Record<string, string>
  onCerrar: () => void
}

export function ResultadoCard({ resultado, camposLabels, onCerrar }: Props) {
  const { tipo_etiqueta, tipo_documento, confianza, campos } = resultado
  const meta = ICONO_TIPO[tipo_documento] ?? { icon: FileText, color: "text-muted-foreground" }
  const Icono = meta.icon

  const conValor: { key: string; label: string; valor: string }[] = []
  const sinValor: { key: string; label: string }[] = []

  Object.entries(campos).forEach(([key, val]) => {
    if (["file_url", "tipo_comprobante", "registros", "total_registros"].includes(key)) return
    const label = camposLabels[key] ?? key
    const valorFmt = formatearValor(val)
    if (valorFmt !== null) conValor.push({ key, label, valor: valorFmt })
    else sinValor.push({ key, label })
  })

  const total = conValor.length + sinValor.length
  const pct = total > 0 ? Math.round((conValor.length / total) * 100) : 0
  const registros = campos.registros as Record<string, unknown>[] | undefined

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b bg-muted/40 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl border bg-card shadow-sm">
            <Icono className={`size-[22px] ${meta.color}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold">{tipo_etiqueta ?? tipo_documento}</h3>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${colorConfianza(confianza ?? 0)}`}
              >
                {Math.round((confianza ?? 0) * 100)}% confianza
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {conValor.length} de {total} campos extraídos ({pct}%)
            </p>
          </div>
        </div>
        <button
          onClick={onCerrar}
          aria-label="Cerrar"
          className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-[18px]" />
        </button>
      </div>

      <div className="h-1 bg-muted">
        <div
          className={`h-full transition-all ${pct >= 70 ? "bg-emerald-400" : pct >= 40 ? "bg-amber-400" : "bg-red-400"}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="p-6">
        {registros ? (
          <div>
            <p className="mb-3 text-sm font-semibold text-muted-foreground">
              {registros.length} registro(s) encontrado(s)
            </p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-muted/60">
                    {registros[0] &&
                      Object.keys(registros[0])
                        .filter((k) => k !== "file_url")
                        .map((k) => (
                          <th key={k} className="border-b px-3 py-2 text-left font-medium text-muted-foreground">
                            {camposLabels[k] ?? k}
                          </th>
                        ))}
                  </tr>
                </thead>
                <tbody>
                  {registros.slice(0, 5).map((r, i) => (
                    <tr key={i} className="border-b hover:bg-muted/40">
                      {Object.entries(r)
                        .filter(([k]) => k !== "file_url")
                        .map(([k, v]) => (
                          <td key={k} className="px-3 py-2">
                            {formatearValor(v) ?? <span className="text-muted-foreground/50">—</span>}
                          </td>
                        ))}
                    </tr>
                  ))}
                  {registros.length > 5 && (
                    <tr>
                      <td colSpan={99} className="px-3 py-2 text-center text-xs text-muted-foreground">
                        … y {registros.length - 5} registros más
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div>
            {conValor.length > 0 && (
              <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3">
                {conValor.map(({ key, label, valor }) => (
                  <div key={key} className="rounded-xl bg-muted/50 p-3">
                    <p className="mb-0.5 text-xs text-muted-foreground">{label}</p>
                    <p className="truncate text-sm font-semibold" title={valor}>
                      {valor}
                    </p>
                  </div>
                ))}
              </div>
            )}
            {sinValor.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer select-none text-xs text-muted-foreground hover:text-foreground">
                  {sinValor.length} campo(s) no detectado(s) — ver cuáles
                </summary>
                <div className="mt-2 flex flex-wrap gap-1">
                  {sinValor.map(({ key, label }) => (
                    <span
                      key={key}
                      className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
