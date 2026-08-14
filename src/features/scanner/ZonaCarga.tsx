import { AlertCircle, CheckCircle2, Loader2, Upload, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"

interface Item {
  id: string
  file: File
  estado: "pendiente" | "procesando" | "ok" | "error"
  pct: number
  error: string | null
}

interface Props {
  /** Se llama por cada archivo; reporta progreso de subida (0-100). */
  onArchivo: (file: File, onProgress: (pct: number) => void) => Promise<void>
  /** Al cambiar, limpia la cola (p. ej. al cambiar de pestaña). */
  limpiar: unknown
}

const ACCEPT = ".pdf,.jpg,.jpeg,.png,.bmp,.tiff,.xlsx"

export function ZonaCarga({ onArchivo, limpiar }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [arrastrando, setArrastrando] = useState(false)
  const [cola, setCola] = useState<Item[]>([])
  const procesandoRef = useRef(false)

  useEffect(() => {
    setCola([])
    procesandoRef.current = false
  }, [limpiar])

  function encolar(files: FileList) {
    const nuevos: Item[] = Array.from(files).map((file) => ({
      id: Math.random().toString(36).slice(2),
      file,
      estado: "pendiente",
      pct: 0,
      error: null,
    }))
    setCola((prev) => {
      const siguiente = [...prev, ...nuevos]
      if (!procesandoRef.current) void procesarCola(siguiente)
      return siguiente
    })
  }

  async function procesarCola(colaInicial: Item[]) {
    procesandoRef.current = true
    let actual = colaInicial

    for (const item of actual) {
      if (item.estado !== "pendiente") continue
      actual = actual.map((it) =>
        it.id === item.id ? { ...it, estado: "procesando", pct: 0 } : it,
      )
      setCola([...actual])
      try {
        await onArchivo(item.file, (pct) => {
          actual = actual.map((it) => (it.id === item.id ? { ...it, pct } : it))
          setCola([...actual])
        })
        actual = actual.map((it) => (it.id === item.id ? { ...it, estado: "ok", pct: 100 } : it))
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error al procesar"
        actual = actual.map((it) => (it.id === item.id ? { ...it, estado: "error", error: msg } : it))
      }
      setCola([...actual])
    }

    setCola((latest) => {
      if (latest.some((it) => it.estado === "pendiente")) {
        queueMicrotask(() => void procesarCola(latest))
      } else {
        procesandoRef.current = false
      }
      return latest
    })
  }

  const ocupado = cola.some((it) => it.estado === "procesando" || it.estado === "pendiente")

  return (
    <div className="flex flex-col gap-3">
      <div
        role="button"
        aria-label="Zona para subir documentos"
        tabIndex={0}
        onDragOver={(e) => {
          e.preventDefault()
          setArrastrando(true)
        }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={(e) => {
          e.preventDefault()
          setArrastrando(false)
          if (e.dataTransfer.files.length) encolar(e.dataTransfer.files)
        }}
        onClick={() => !ocupado && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !ocupado) {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
        className={`relative rounded-xl border-2 border-dashed p-10 text-center transition-all ${
          arrastrando
            ? "border-primary bg-primary/5"
            : "border-border bg-card hover:border-primary/50 hover:bg-muted/30"
        } ${ocupado ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) encolar(e.target.files)
            e.target.value = ""
          }}
        />
        <div className="flex flex-col items-center gap-3">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10">
            <Upload className="size-6 text-primary" />
          </div>
          <div>
            <p className="text-base font-semibold">Arrastra uno o varios documentos aquí</p>
            <p className="mt-0.5 text-sm text-muted-foreground">o haz clic para seleccionar</p>
          </div>
          <div className="flex flex-wrap justify-center gap-1">
            {["PDF", "JPG", "PNG", "XLSX"].map((f) => (
              <span
                key={f}
                className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
              >
                {f}
              </span>
            ))}
          </div>
          <p className="text-xs font-medium text-primary">
            Tipo detectado automáticamente — factura, boleta, recibo, planilla…
          </p>
        </div>
      </div>

      {cola.length > 0 && (
        <div className="flex flex-col gap-2">
          {cola.map((item) => (
            <div
              key={item.id}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm ${
                item.estado === "ok"
                  ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30"
                  : item.estado === "error"
                    ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30"
                    : item.estado === "procesando"
                      ? "border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30"
                      : "border-border bg-muted/40"
              }`}
            >
              <div className="shrink-0">
                {item.estado === "procesando" && (
                  <Loader2 className="size-[18px] animate-spin text-blue-500" />
                )}
                {item.estado === "ok" && <CheckCircle2 className="size-[18px] text-emerald-500" />}
                {item.estado === "error" && <AlertCircle className="size-[18px] text-red-500" />}
                {item.estado === "pendiente" && (
                  <div className="size-4 rounded-full border-2 border-muted-foreground/40" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{item.file.name}</p>
                {item.estado === "procesando" && (
                  <div className="mt-1.5">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-blue-100 dark:bg-blue-900">
                      <div
                        className="h-1.5 rounded-full bg-blue-500 transition-all"
                        style={{ width: `${item.pct}%` }}
                      />
                    </div>
                    <p className="mt-0.5 text-xs text-blue-500">
                      {item.pct < 100 ? `Subiendo… ${item.pct}%` : "Analizando con OCR…"}
                    </p>
                  </div>
                )}
                {item.estado === "error" && (
                  <p className="mt-0.5 text-xs text-red-500">{item.error}</p>
                )}
                {item.estado === "ok" && (
                  <p className="mt-0.5 text-xs text-emerald-600">Procesado correctamente</p>
                )}
                {item.estado === "pendiente" && (
                  <p className="mt-0.5 text-xs text-muted-foreground">En espera…</p>
                )}
              </div>

              {item.estado !== "procesando" && (
                <button
                  type="button"
                  aria-label="Quitar"
                  onClick={() => setCola((prev) => prev.filter((it) => it.id !== item.id))}
                  className="shrink-0 text-muted-foreground/60 hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
