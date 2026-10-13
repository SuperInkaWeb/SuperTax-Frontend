/**
 * Datos para la grilla tipo hoja: carga páginas bajo demanda (windowing).
 *
 * Mantiene una caché dispersa de filas por índice absoluto y pide al servidor solo
 * las páginas visibles. No carga millones de filas en el navegador: reutiliza el
 * endpoint de preview paginado. Como el navegador no puede pintar un contenedor de
 * millones × altura de fila, la vista se recorta a MAX_SHEET_ROWS y `baseOffset`
 * desplaza la ventana para alcanzar cualquier fila (la descarga/análisis siguen
 * operando sobre TODAS las filas en el servidor; el recorte es solo visual).
 */
import { useCallback, useEffect, useRef, useState } from "react"

import { previewDataset } from "@/features/datafilter/api"
import { apiError } from "@/shared/lib/api/error"

import type { FilterGroup, SortSpec } from "@/features/datafilter/types"

const PAGE_SIZE = 200
export const MAX_SHEET_ROWS = 500_000

type Row = Record<string, unknown>

export interface SheetData {
  columns: string[]
  total: number | null // filas que coinciden (reales, sin recortar)
  rowCount: number // filas navegables en el bloque actual (recortadas a MAX_SHEET_ROWS)
  capped: boolean // el total supera un bloque
  loading: boolean
  error: string | null
  getRow: (index: number) => Row | undefined // `index` relativo al bloque
  ensureRange: (start: number, end: number) => void
}

export function useSheetData(
  datasetId: number | null,
  filter: FilterGroup | null,
  sort: SortSpec | null,
  ready: boolean,
  search: string,
  baseOffset: number,
): SheetData {
  const [columns, setColumns] = useState<string[]>([])
  const [total, setTotal] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [, setVersion] = useState(0) // fuerza re-render al llegar una página

  const rowsRef = useRef<Map<number, Row>>(new Map())
  const pagesRef = useRef<Set<number>>(new Set())
  const reqRef = useRef(0) // invalida respuestas obsoletas tras un reinicio

  const filterRef = useRef(filter)
  filterRef.current = filter
  const sortRef = useRef(sort)
  sortRef.current = sort
  const datasetRef = useRef(datasetId)
  datasetRef.current = datasetId
  const searchRef = useRef(search)
  searchRef.current = search
  const baseOffsetRef = useRef(baseOffset)
  baseOffsetRef.current = baseOffset

  const filterKey = JSON.stringify(filter)
  const sortKey = sort ? `${sort.column}:${sort.direction}` : ""

  const fetchPage = useCallback((page: number) => {
    const id = datasetRef.current
    if (id == null || pagesRef.current.has(page)) return
    pagesRef.current.add(page)
    const myReq = reqRef.current
    const first = page === 0
    if (first) setLoading(true)
    previewDataset(id, {
      filter: filterRef.current,
      select: [],
      sort: sortRef.current ? [sortRef.current] : [],
      limit: PAGE_SIZE,
      offset: baseOffsetRef.current + page * PAGE_SIZE,
      search: searchRef.current.trim() || null,
    })
      .then((response) => {
        if (myReq !== reqRef.current) return
        if (first) {
          setColumns(response.columns)
          setTotal(response.total_matched)
          setError(null)
        }
        response.rows.forEach((row, i) => rowsRef.current.set(page * PAGE_SIZE + i, row))
        setVersion((v) => v + 1)
      })
      .catch((err) => {
        if (myReq !== reqRef.current) return
        pagesRef.current.delete(page) // permite reintentar al volver a scrollear
        if (first) setError(apiError(err, "No se pudo cargar la vista"))
      })
      .finally(() => {
        if (first && myReq === reqRef.current) setLoading(false)
      })
  }, [])

  useEffect(() => {
    reqRef.current += 1
    rowsRef.current = new Map()
    pagesRef.current = new Set()
    setColumns([])
    setTotal(null)
    setError(null)
    if (datasetId == null || !ready) {
      setLoading(false)
      return
    }
    fetchPage(0)
  }, [datasetId, filterKey, sortKey, ready, search, baseOffset, fetchPage])

  const getRow = useCallback((index: number) => rowsRef.current.get(index), [])

  const ensureRange = useCallback(
    (start: number, end: number) => {
      const firstPage = Math.max(0, Math.floor(start / PAGE_SIZE))
      const lastPage = Math.floor(end / PAGE_SIZE)
      for (let page = firstPage; page <= lastPage; page += 1) fetchPage(page)
    },
    [fetchPage],
  )

  const rowCount = total == null ? 0 : Math.max(0, Math.min(total - baseOffset, MAX_SHEET_ROWS))
  const capped = total != null && total > MAX_SHEET_ROWS

  return { columns, total, rowCount, capped, loading, error, getRow, ensureRange }
}
