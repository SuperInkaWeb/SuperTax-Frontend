import { Input } from "@/shared/ui/input"
import { Select } from "@/shared/ui/select"

import type { EntregaOptions } from "@/features/sunat/api"

interface Props {
  value: EntregaOptions
  onChange: (patch: Partial<EntregaOptions>) => void
}

export function EntregaFields({ value, onChange }: Props) {
  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={value.usar_correo}
          onChange={(e) => onChange({ usar_correo: e.target.checked })}
        />
        Enviar por correo (Gmail)
      </label>
      {value.usar_correo && (
        <div className="grid gap-3 pl-6 sm:grid-cols-2">
          <Input
            placeholder="Gmail remitente"
            value={value.gmail_user}
            onChange={(e) => onChange({ gmail_user: e.target.value })}
          />
          <Input
            type="password"
            placeholder="Contraseña de aplicación"
            value={value.gmail_pass}
            onChange={(e) => onChange({ gmail_pass: e.target.value })}
          />
          <Input
            placeholder="Correo destino"
            value={value.destino}
            onChange={(e) => onChange({ destino: e.target.value })}
          />
          <Select
            value={value.modo_correo}
            onChange={(e) => onChange({ modo_correo: e.target.value })}
          >
            <option value="individual">Un correo por comprobante</option>
            <option value="agrupado">Un solo correo agrupado</option>
          </Select>
        </div>
      )}

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={value.usar_drive}
          onChange={(e) => onChange({ usar_drive: e.target.checked })}
        />
        Subir a Google Drive
      </label>
      {value.usar_drive && (
        <p className="pl-6 text-xs text-muted-foreground">
          Los archivos se guardan en una carpeta propia de la app en tu Drive.
        </p>
      )}
    </div>
  )
}
