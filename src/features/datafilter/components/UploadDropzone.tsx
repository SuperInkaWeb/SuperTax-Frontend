import { useRef, useState } from "react"

import { cn } from "@/shared/lib/utils"
import { Button } from "@/shared/ui/button"
import { Spinner } from "@/shared/ui/spinner"

import type { DragEvent } from "react"

const ACCEPTED = ".csv,.txt,.xlsx,.xls"

interface UploadDropzoneProps {
  onUpload: (files: File[]) => void
  busy: boolean
  progress?: number | null // 0..100 mientras se sube
}

/** Zona de subida: arrastrar-y-soltar o elegir; acepta varios archivos. */
export function UploadDropzone({ onUpload, busy, progress }: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  function emit(fileList: FileList | null) {
    if (fileList && fileList.length > 0) onUpload(Array.from(fileList))
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragging(false)
    emit(event.dataTransfer.files)
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors",
        dragging ? "border-primary bg-primary/5" : "border-input bg-background",
      )}
    >
      <p className="text-sm text-muted-foreground">
        Arrastra archivos aquí o{" "}
        <button
          type="button"
          className="font-medium text-foreground underline underline-offset-2"
          onClick={() => inputRef.current?.click()}
        >
          selecciónalos
        </button>
      </p>
      <p className="text-xs text-muted-foreground">
        CSV, TXT o Excel (.xlsx/.xls) — se aceptan varios a la vez
      </p>
      {busy && (
        <div className="mt-1 w-full max-w-xs">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Spinner />
            <span>Subiendo… {progress != null ? `${progress}%` : ""}</span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width]"
              style={{ width: `${progress ?? 0}%` }}
            />
          </div>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        multiple
        className="hidden"
        onChange={(e) => {
          emit(e.target.files)
          e.target.value = ""
        }}
      />
      <Button type="button" variant="outline" size="sm" className="mt-1" disabled={busy} onClick={() => inputRef.current?.click()}>
        Elegir archivos
      </Button>
    </div>
  )
}
