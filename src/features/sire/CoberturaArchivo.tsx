import { useEffect, useState } from "react"
import { CalendarRange, X } from "lucide-react"

type Modo = "mes" | "dia" | "rango" | "dias"

interface Props {
  periodo: string
  fechasDetectadas: string[]
  esPle: boolean
  /** [] = mes completo (sin filtro) · lista = días declarados · undefined = incompleto */
  onChange: (fechas: string[] | undefined) => void
}

function esContiguo(fechas: string[]): boolean {
  for (let i = 1; i < fechas.length; i++) {
    const a = new Date(fechas[i - 1] + "T00:00:00Z").getTime()
    const b = new Date(fechas[i] + "T00:00:00Z").getTime()
    if (b - a !== 86_400_000) return false
  }
  return true
}

function expandirRango(desde: string, hasta: string): string[] {
  const out: string[] = []
  const fin = new Date(hasta + "T00:00:00Z").getTime()
  let t = new Date(desde + "T00:00:00Z").getTime()
  while (t <= fin && out.length <= 31) {
    out.push(new Date(t).toISOString().slice(0, 10))
    t += 86_400_000
  }
  return out
}

function fmt(d: string) {
  return `${d.slice(8, 10)}/${d.slice(5, 7)}`
}

export function CoberturaArchivo({ periodo, fechasDetectadas, esPle, onChange }: Props) {
  const [modo, setModo] = useState<Modo>("mes")
  const [dia, setDia] = useState("")
  const [desde, setDesde] = useState("")
  const [hasta, setHasta] = useState("")
  const [dias, setDias] = useState<string[]>([])
  const [nueva, setNueva] = useState("")

  useEffect(() => {
    const f = fechasDetectadas
    if (esPle || f.length >= 28) {
      setModo("mes")
    } else if (f.length === 1) {
      setModo("dia")
      setDia(f[0])
    } else if (f.length > 1 && esContiguo(f)) {
      setModo("rango")
      setDesde(f[0])
      setHasta(f[f.length - 1])
    } else if (f.length > 1) {
      setModo("dias")
      setDias(f)
    } else {
      setModo("mes")
    }
  }, [fechasDetectadas, esPle])

  useEffect(() => {
    if (modo === "mes") onChange([])
    else if (modo === "dia") onChange(dia ? [dia] : undefined)
    else if (modo === "rango")
      onChange(desde && hasta && desde <= hasta ? expandirRango(desde, hasta) : undefined)
    else onChange(dias.length > 0 ? dias : undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modo, dia, desde, hasta, dias])

  const periodoFmt = periodo.length === 6 ? `${periodo.slice(0, 4)}/${periodo.slice(4)}` : ""
  const detectadoTxt =
    fechasDetectadas.length === 0
      ? null
      : fechasDetectadas.length > 6
        ? `${fechasDetectadas.length} días entre ${fmt(fechasDetectadas[0])} y ${fmt(fechasDetectadas[fechasDetectadas.length - 1])}`
        : fechasDetectadas.map(fmt).join(", ")

  const radio = (m: Modo, label: string) => (
    <label className="flex items-center gap-2 text-sm cursor-pointer">
      <input type="radio" name="cobertura" checked={modo === m} onChange={() => setModo(m)} />
      {label}
    </label>
  )

  return (
    <div className="space-y-3 rounded-lg border-2 border-border bg-muted/40 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <CalendarRange className="size-4" />
        Cobertura del archivo
        <span className="font-normal text-muted-foreground">— ¿qué días cubre?</span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {radio("mes", `Mes completo${periodoFmt ? ` (${periodoFmt})` : ""}`)}
        {radio("dia", "Un día específico")}
        {radio("rango", "Rango de días")}
        {radio("dias", "Días específicos")}
      </div>

      {modo === "dia" && (
        <input
          type="date"
          value={dia}
          onChange={(e) => setDia(e.target.value)}
          className="h-8 rounded-md border bg-card px-2 text-sm"
        />
      )}

      {modo === "rango" && (
        <div className="flex items-center gap-2 text-sm">
          <input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className="h-8 rounded-md border bg-card px-2 text-sm"
          />
          <span className="text-muted-foreground">a</span>
          <input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className="h-8 rounded-md border bg-card px-2 text-sm"
          />
        </div>
      )}

      {modo === "dias" && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {dias.map((d) => (
              <span
                key={d}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 font-mono text-xs text-primary"
              >
                {fmt(d)}
                <button
                  type="button"
                  onClick={() => setDias(dias.filter((x) => x !== d))}
                  className="cursor-pointer hover:text-destructive"
                  aria-label={`Quitar ${d}`}
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={nueva}
              onChange={(e) => setNueva(e.target.value)}
              className="h-8 rounded-md border bg-card px-2 text-sm"
            />
            <button
              type="button"
              onClick={() => {
                if (nueva && !dias.includes(nueva)) setDias([...dias, nueva].sort())
                setNueva("")
              }}
              className="h-8 cursor-pointer rounded-md border bg-card px-3 text-sm hover:bg-muted"
            >
              Agregar día
            </button>
          </div>
        </div>
      )}

      {detectadoTxt && (
        <p className="text-xs text-muted-foreground">
          ℹ Detectado en tu archivo: {detectadoTxt}. Si el archivo debía cubrir más días (ej. un
          día sin registros), decláralos — así el reporte mostrará lo que SUNAT tenga en esos días.
        </p>
      )}
    </div>
  )
}
