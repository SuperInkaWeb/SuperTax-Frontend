/**
 * Controlador de un resultado de análisis paginado y ordenable (compute/replace/
 * dedupe/pivote). Mantiene offset + orden y re-ejecuta el fetcher del panel al
 * cambiar de página u orden. El panel decide cómo traducir el orden a su request.
 */
import { useCallback, useRef, useState } from "react"

import { apiError } from "@/shared/lib/api/error"

import type { ResultSort } from "@/features/datafilter/components/DataTable"

export interface ResultData {
  columns: string[]
  rows: Array<Record<string, unknown>>
  total_matched: number
  totals?: Record<string, unknown> | null
  total_original?: number | null
}

type Fetcher = (offset: number, sort: ResultSort | null) => Promise<ResultData>

export interface AnalysisResult {
  ran: boolean
  loading: boolean
  error: string | null
  data: ResultData | null
  offset: number
  sort: ResultSort | null
  limit: number
  run: (fetcher: Fetcher) => void
  changePage: (offset: number) => void
  changeSort: (column: string) => void
}

export function useAnalysisResult(limit = 100): AnalysisResult {
  const [ran, setRan] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ResultData | null>(null)
  const [offset, setOffset] = useState(0)
  const [sort, setSort] = useState<ResultSort | null>(null)
  const fetcherRef = useRef<Fetcher | null>(null)

  const exec = useCallback(async (off: number, srt: ResultSort | null) => {
    const fetcher = fetcherRef.current
    if (!fetcher) return
    setLoading(true)
    setError(null)
    try {
      setData(await fetcher(off, srt))
    } catch (e) {
      setError(apiError(e, "No se pudo ejecutar la operación"))
    } finally {
      setLoading(false)
    }
  }, [])

  const run = useCallback(
    (fetcher: Fetcher) => {
      fetcherRef.current = fetcher
      setRan(true)
      setOffset(0)
      setSort(null)
      void exec(0, null)
    },
    [exec],
  )

  const changePage = useCallback(
    (nuevo: number) => {
      setOffset(nuevo)
      void exec(nuevo, sort)
    },
    [exec, sort],
  )

  const changeSort = useCallback(
    (column: string) => {
      const next: ResultSort =
        !sort || sort.column !== column
          ? { column, direction: "asc" }
          : { column, direction: sort.direction === "asc" ? "desc" : "asc" }
      setSort(next)
      setOffset(0)
      void exec(0, next)
    },
    [exec, sort],
  )

  return { ran, loading, error, data, offset, sort, limit, run, changePage, changeSort }
}
