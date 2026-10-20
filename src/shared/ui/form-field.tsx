import { Label } from "@/shared/ui/label"

import type { ReactNode } from "react"

interface FormFieldProps {
  label: string
  htmlFor?: string
  error?: string
  hint?: string
  children: ReactNode
}

/**
 * Fila de formulario: etiqueta + control + mensaje de error o ayuda. Presentacional;
 * el control se conecta con react-hook-form en el padre (ver `useZodForm`). El error
 * tiene prioridad sobre la ayuda.
 */
export function FormField({ label, htmlFor, error, hint, children }: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}
