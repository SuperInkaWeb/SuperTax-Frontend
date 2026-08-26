import { ClipboardList, Receipt, Zap } from "lucide-react"

import type { LucideIcon } from "lucide-react"

/** Campos internos que nunca se muestran en tablas ni paneles. */
export const CAMPOS_OCULTAR = new Set([
  "id",
  "created_at",
  "file_url",
  "tipo_comprobante",
  "tipo_documento",
  "tipo_etiqueta",
  "confianza",
  "advertencia",
  "procesado_con_ia",
  "confianza_lectura",
])

export interface SubTipo {
  id: string
  label: string
}

export interface Grupo {
  id: string
  label: string
  icon: LucideIcon
  tipos: SubTipo[]
}

export const GRUPOS: Grupo[] = [
  {
    id: "comprobantes",
    label: "Comprobantes",
    icon: Receipt,
    tipos: [
      { id: "factura_electronica", label: "Factura Electrónica" },
      { id: "boleta_venta", label: "Boleta de Venta" },
      { id: "recibo_honorarios", label: "Rec. Honorarios" },
      { id: "nota_credito", label: "Nota de Crédito" },
      { id: "nota_debito", label: "Nota de Débito" },
    ],
  },
  {
    id: "servicios",
    label: "Servicios",
    icon: Zap,
    tipos: [
      { id: "recibo_luz", label: "Luz" },
      { id: "recibo_agua", label: "Agua" },
      { id: "recibo_gas", label: "Gas" },
      { id: "recibo_telefonia", label: "Telefonía" },
    ],
  },
  {
    id: "laboral",
    label: "Laboral",
    icon: ClipboardList,
    tipos: [
      { id: "asistencia", label: "Planilla de Asistencia" },
      { id: "boleta_pago", label: "Boleta de Pago" },
    ],
  },
]

/** Mapa tipo → grupo (derivado de GRUPOS). */
export const TIPO_A_GRUPO: Record<string, string> = {}
GRUPOS.forEach((g) => g.tipos.forEach((t) => (TIPO_A_GRUPO[t.id] = g.id)))

/**
 * Tipos "multi-registro": cada documento contiene una lista de `registros`
 * (una planilla = muchos trabajadores/días). Se muestran/exportan expandidos
 * (una fila por registro), no como una sola fila con `total_registros`.
 */
export const TIPOS_MULTIREGISTRO = new Set(["asistencia", "boleta_pago"])
