import { Download } from "lucide-react"
import { useState } from "react"

import { Button } from "@/shared/ui/button"
import { Select } from "@/shared/ui/select"

import type { Delimiter, DownloadFormat } from "@/features/datafilter/types"

const DELIMITADORES: Array<{ value: Delimiter; label: string }> = [
  { value: "tab", label: "Tabulación" },
  { value: "semicolon", label: "Punto y coma (;)" },
  { value: "comma", label: "Coma (,)" },
  { value: "pipe", label: "Barra (|)" },
]

interface DownloadBarProps {
  onDownload: (format: DownloadFormat, delimiter: Delimiter | undefined) => void
  pending?: boolean
}

/** Elige formato (y separador si es TXT) y dispara la descarga del resultado completo. */
export function DownloadBar({ onDownload, pending }: DownloadBarProps) {
  const [format, setFormat] = useState<DownloadFormat>("csv")
  const [delimiter, setDelimiter] = useState<Delimiter>("tab")

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={format}
        onChange={(e) => setFormat(e.target.value as DownloadFormat)}
        className="w-40"
      >
        <option value="csv">CSV</option>
        <option value="xlsx">Excel (.xlsx)</option>
        <option value="txt">Texto (.txt)</option>
      </Select>
      {format === "txt" && (
        <Select
          value={delimiter}
          onChange={(e) => setDelimiter(e.target.value as Delimiter)}
          className="w-48"
        >
          {DELIMITADORES.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </Select>
      )}
      <Button
        variant="outline"
        disabled={pending}
        onClick={() => onDownload(format, format === "txt" ? delimiter : undefined)}
      >
        <Download className="size-4" />
        {pending ? "Preparando…" : "Descargar"}
      </Button>
    </div>
  )
}
