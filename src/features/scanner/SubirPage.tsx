import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"

import { updateDocumento, uploadAuto } from "@/features/scanner/api"
import { CamposEditor } from "@/features/scanner/CamposEditor"
import { apiError } from "@/shared/lib/api/error"
import { Badge } from "@/shared/ui/badge"
import { Button } from "@/shared/ui/button"
import { Card, CardContent } from "@/shared/ui/card"
import { Input } from "@/shared/ui/input"

import type { UploadResult } from "@/features/scanner/api"

export function SubirPage() {
  const queryClient = useQueryClient()
  const [file, setFile] = useState<File | null>(null)
  const [resultado, setResultado] = useState<UploadResult | null>(null)

  const subir = useMutation({
    mutationFn: () => uploadAuto(file as File),
    onSuccess: (data) => {
      setResultado(data)
      toast.success(`Documento clasificado: ${data.tipo_etiqueta}`)
      queryClient.invalidateQueries({ queryKey: ["scanner", "documentos"] })
    },
    onError: (err) => toast.error(apiError(err, "No se pudo procesar el documento")),
  })

  const guardar = useMutation({
    mutationFn: (campos: Record<string, unknown>) =>
      updateDocumento((resultado as UploadResult).id, campos),
    onSuccess: () => {
      toast.success("Campos guardados")
      queryClient.invalidateQueries({ queryKey: ["scanner", "documentos"] })
    },
    onError: (err) => toast.error(apiError(err, "No se pudieron guardar")),
  })

  const conIa = resultado?.campos?.procesado_con_ia === true

  return (
    <div className="space-y-6">
      <Card className="max-w-xl">
        <CardContent className="space-y-4 pt-5">
          <Input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.bmp,.tiff,.xlsx"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <Button
            onClick={() => {
              if (!file) {
                toast.error("Selecciona un documento")
                return
              }
              setResultado(null)
              subir.mutate()
            }}
            disabled={subir.isPending}
          >
            {subir.isPending ? "Procesando…" : "Procesar documento"}
          </Button>
        </CardContent>
      </Card>

      {resultado && (
        <Card>
          <CardContent className="space-y-4 pt-5">
            <div className="flex items-center gap-3">
              <span className="font-medium">{resultado.tipo_etiqueta}</span>
              {conIa ? (
                <Badge tone="info">Procesado con IA</Badge>
              ) : (
                <Badge tone="success">
                  Confianza {Math.round((resultado.confianza ?? 0) * 100)}%
                </Badge>
              )}
            </div>
            <CamposEditor
              campos={resultado.campos}
              onGuardar={(campos) => guardar.mutate(campos)}
              guardando={guardar.isPending}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
