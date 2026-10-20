import { AlertTriangle } from "lucide-react"

import { Button } from "@/shared/ui/button"
import { EmptyState } from "@/shared/ui/empty-state"
import { Spinner } from "@/shared/ui/spinner"

import type { UseQueryResult } from "@tanstack/react-query"
import type { ReactNode } from "react"

interface AsyncBoundaryProps<T> {
  query: UseQueryResult<T>
  children: (data: T) => ReactNode
  /** Qué mostrar cuando la consulta trae datos "vacíos" (opcional). */
  empty?: ReactNode
  isEmpty?: (data: T) => boolean
  loading?: ReactNode
  /** Reemplaza el error genérico (p. ej. un 403 "sin permisos", donde reintentar no aplica). */
  error?: ReactNode
}

/**
 * Envoltura única para los cuatro estados de una consulta de react-query:
 * cargando, error (con Reintentar), vacío y datos. Evita el fallo recurrente de
 * mostrar un error como si fuera "no hay datos": cada estado es distinguible.
 */
export function AsyncBoundary<T>({
  query,
  children,
  empty,
  isEmpty,
  loading,
  error,
}: AsyncBoundaryProps<T>) {
  if (query.isError) {
    return (
      error ?? (
        <EmptyState
          icon={AlertTriangle}
          title="No se pudo cargar"
          description="Ocurrió un error al consultar los datos. Intenta de nuevo."
          action={
            <Button variant="outline" onClick={() => void query.refetch()}>
              Reintentar
            </Button>
          }
        />
      )
    )
  }
  // `data` es undefined mientras carga y también en consultas deshabilitadas.
  if (query.data === undefined) {
    return (
      loading ?? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      )
    )
  }
  if (empty && isEmpty?.(query.data)) return <>{empty}</>
  return <>{children(query.data)}</>
}
