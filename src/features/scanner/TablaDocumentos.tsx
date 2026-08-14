import { Bot, Save, Search } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { updateDocumento } from "@/features/scanner/api"
import { valorCampo } from "@/features/scanner/filas"
import { validarCampo } from "@/features/scanner/validacion"
import { apiError } from "@/shared/lib/api/error"

import type { Documento } from "@/features/scanner/api"

const POR_PAGINA = 20

interface Props {
  docs: Documento[]
  columnas: string[]
  camposLabels: Record<string, string>
  onActualizar: () => void
  onVerDetalle: (doc: Documento) => void
  onHayEdiciones: (hay: boolean) => void
}

export function TablaDocumentos({
  docs,
  columnas,
  camposLabels,
  onActualizar,
  onVerDetalle,
  onHayEdiciones,
}: Props) {
  const [busqueda, setBusqueda] = useState("")
  const [pagina, setPagina] = useState(1)
  const [editando, setEditando] = useState<Record<number, Record<string, string>>>({})
  const [errores, setErrores] = useState<Record<number, Record<string, string>>>({})

  useEffect(() => {
    onHayEdiciones(Object.keys(editando).length > 0)
  }, [editando, onHayEdiciones])

  const filtradas = useMemo(() => {
    if (!busqueda.trim()) return docs
    const q = busqueda.toLowerCase()
    return docs.filter((d) =>
      columnas.some((c) => valorCampo(d.campos[c]).toLowerCase().includes(q)),
    )
  }, [docs, columnas, busqueda])

  useEffect(() => setPagina(1), [filtradas])

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA))
  const enPagina = filtradas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA)

  function cambiarCelda(id: number, campo: string, valor: string) {
    setEditando((prev) => ({ ...prev, [id]: { ...prev[id], [campo]: valor } }))
    const err = validarCampo(campo, valor)
    setErrores((prev) => {
      const s = { ...prev, [id]: { ...prev[id] } }
      if (err) s[id][campo] = err
      else delete s[id][campo]
      return s
    })
  }

  async function guardarFila(doc: Documento) {
    const cambios = editando[doc.id]
    if (!cambios) return
    if (Object.keys(errores[doc.id] || {}).length) {
      toast.error("Corrige los campos marcados antes de guardar")
      return
    }
    try {
      await updateDocumento(doc.id, cambios)
      toast.success("Fila guardada")
      setEditando((prev) => {
        const s = { ...prev }
        delete s[doc.id]
        return s
      })
      setErrores((prev) => {
        const s = { ...prev }
        delete s[doc.id]
        return s
      })
      onActualizar()
    } catch (e) {
      toast.error(apiError(e, "No se pudo guardar"))
    }
  }

  if (columnas.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Ninguna columna seleccionada. Marca al menos una en el panel de la izquierda.
      </p>
    )
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar en todos los campos…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full rounded-xl border bg-muted/40 py-2 pl-8 pr-4 text-sm focus:border-primary/50 focus:outline-none"
          />
        </div>
        <span className="text-sm text-muted-foreground">
          {filtradas.length} de {docs.length}
          {totalPaginas > 1 && ` · pág ${pagina}/${totalPaginas}`}
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="min-w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              {columnas.map((col) => (
                <th
                  key={col}
                  className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  {camposLabels[col] ?? col}
                </th>
              ))}
              <th className="w-20 px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {enPagina.map((doc) => {
              const ia = doc.campos.procesado_con_ia === true
              return (
                <tr
                  key={doc.id}
                  onClick={() => onVerDetalle(doc)}
                  className={`cursor-pointer transition-colors hover:bg-muted/50 ${ia ? "bg-amber-50/40 dark:bg-amber-950/20" : ""}`}
                >
                  {columnas.map((col) => {
                    const edit = editando[doc.id]?.[col]
                    const err = errores[doc.id]?.[col]
                    return (
                      <td key={col} className="px-4 py-2.5">
                        <input
                          type="text"
                          value={edit !== undefined ? edit : valorCampo(doc.campos[col])}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => cambiarCelda(doc.id, col, e.target.value)}
                          title={err || undefined}
                          className={`w-full min-w-24 border-b bg-transparent px-1 py-0.5 focus:outline-none ${
                            err ? "border-red-400" : "border-transparent hover:border-border focus:border-primary/50"
                          }`}
                        />
                        {err && <p className="mt-0.5 text-[10px] leading-tight text-red-500">{err}</p>}
                      </td>
                    )
                  })}
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      {ia && <Bot className="size-4 shrink-0 text-amber-500" />}
                      {editando[doc.id] && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            void guardarFila(doc)
                          }}
                          className="flex items-center gap-1 whitespace-nowrap rounded-lg bg-primary px-2 py-1 text-xs text-primary-foreground hover:bg-primary/90"
                        >
                          <Save className="size-3" /> Guardar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {totalPaginas > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            onClick={() => setPagina((p) => Math.max(1, p - 1))}
            disabled={pagina === 1}
            className="rounded-lg border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
          >
            ← Anterior
          </button>
          <span className="text-sm text-muted-foreground">
            {pagina} / {totalPaginas}
          </span>
          <button
            onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
            disabled={pagina === totalPaginas}
            className="rounded-lg border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  )
}
