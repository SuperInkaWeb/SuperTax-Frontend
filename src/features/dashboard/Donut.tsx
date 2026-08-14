interface Segmento {
  label: string
  value: number
  color: string
}

interface Props {
  data: Segmento[]
  size?: number
  thickness?: number
  centro?: string
  subcentro?: string
}

/** Donut ligero en SVG (sin dependencias). */
export function Donut({ data, size = 150, thickness = 18, centro, subcentro }: Props) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1
  const r = (size - thickness) / 2
  const c = 2 * Math.PI * r
  let acumulado = 0

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            className="stroke-muted"
            strokeWidth={thickness}
          />
          {data.map((d, i) => {
            const len = (d.value / total) * c
            const el = (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={d.color}
                strokeWidth={thickness}
                strokeDasharray={`${len} ${c - len}`}
                strokeDashoffset={-acumulado}
                strokeLinecap="butt"
              />
            )
            acumulado += len
            return el
          })}
        </g>
      </svg>
      {centro && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-xl font-bold">{centro}</span>
          {subcentro && <span className="text-[10px] text-muted-foreground">{subcentro}</span>}
        </div>
      )}
    </div>
  )
}
