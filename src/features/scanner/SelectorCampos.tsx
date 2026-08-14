interface Props {
  camposDisponibles: string[]
  camposLabels: Record<string, string>
  /** null = todas · [] = ninguna · [...] = lista explícita */
  seleccionados: string[] | null
  onChange: (s: string[]) => void
}

export function SelectorCampos({ camposDisponibles, camposLabels, seleccionados, onChange }: Props) {
  if (!camposDisponibles.length) return null
  const lista = seleccionados === null ? [...camposDisponibles] : seleccionados

  function toggle(campo: string) {
    if (lista.includes(campo)) onChange(lista.filter((c) => c !== campo))
    else onChange([...lista, campo])
  }

  return (
    <div>
      <div className="flex max-h-80 flex-col gap-1 overflow-y-auto pr-1">
        {camposDisponibles.map((campo) => {
          const activo = seleccionados === null || lista.includes(campo)
          return (
            <label key={campo} className="flex cursor-pointer items-center gap-2 py-0.5">
              <input type="checkbox" checked={activo} onChange={() => toggle(campo)} />
              <span className={`truncate text-xs ${activo ? "" : "text-muted-foreground"}`}>
                {camposLabels[campo] ?? campo}
              </span>
            </label>
          )
        })}
      </div>
      {seleccionados !== null && seleccionados.length < camposDisponibles.length && (
        <p className="mt-3 border-t pt-2 text-xs text-muted-foreground">
          {seleccionados.length} de {camposDisponibles.length} visibles
        </p>
      )}
    </div>
  )
}
