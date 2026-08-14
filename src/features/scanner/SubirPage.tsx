import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { getScannerJob, updateDocumento, uploadAuto } from "@/features/scanner/api"
import { CamposEditor } from "@/features/scanner/CamposEditor"
import { apiError } from "@/shared/lib/api/error"
import { Badge } from "@/shared/ui/badge"
import { Button } from "@/shared/ui/button"
import { Card, CardContent } from "@/shared/ui/card"
import { Input } from "@/shared/ui/input"

import type { Documento } from "@/features/scanner/api"

export function SubirPage() {
  const queryClient = useQueryClient()
  const [file, setFile] = useState<File | null>(null)
  const [jobId, setJobId] = useState<number | null>(null)
  const [documento, setDocumento] = useState<Documento | null>(null)

  const subir = useMutation({
    mutationFn: () => uploadAuto(file as File),
    onSuccess: (data) => {
      setDocumento(null)
      setJobId(data.job_id)
    },
    onError: (err) => toast.error(apiError(err, "No se pudo subir el documento")),
  })

  // Polling del job hasta que el worker lo complete o falle.
  const jobQuery = useQuery({
    queryKey: ["scanner", "job", jobId],
    queryFn: () => getScannerJob(jobId as number),
    enabled: jobId != null && documento == null,
    refetchInterval: (query) => {
      const estado = query.state.data?.status
      return estado === "completado" || estado === "error" ? false : 1500
    },
  })

  useEffect(() => {
    const data = jobQuery.data
    if (!data) return
    if (data.status === "completado" && data.documento) {
      setDocumento(data.documento)
      setJobId(null)
      toast.success(
        `Documento clasificado: ${data.documento.tipo_etiqueta ?? data.documento.tipo_documento}`,
      )
      queryClient.invalidateQueries({ queryKey: ["scanner", "documentos"] })
    } else if (data.status === "error") {
      setJobId(null)
      toast.error(data.error_message ?? "No se pudo procesar el documento")
    }
  }, [jobQuery.data, queryClient])

  const guardar = useMutation({
    mutationFn: (campos: Record<string, unknown>) =>
      updateDocumento((documento as Documento).id, campos),
    onSuccess: () => {
      toast.success("Campos guardados")
      queryClient.invalidateQueries({ queryKey: ["scanner", "documentos"] })
    },
    onError: (err) => toast.error(apiError(err, "No se pudieron guardar")),
  })

  const procesando = subir.isPending || (jobId != null && documento == null)
  const conIa = documento?.campos?.procesado_con_ia === true

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
              setDocumento(null)
              subir.mutate()
            }}
            disabled={procesando}
          >
            {procesando ? "Procesando…" : "Procesar documento"}
          </Button>
        </CardContent>
      </Card>

      {documento && (
        <Card>
          <CardContent className="space-y-4 pt-5">
            <div className="flex items-center gap-3">
              <span className="font-medium">
                {documento.tipo_etiqueta ?? documento.tipo_documento}
              </span>
              {conIa ? (
                <Badge tone="info">Procesado con IA</Badge>
              ) : (
                <Badge tone="success">
                  Confianza {Math.round((documento.confianza ?? 0) * 100)}%
                </Badge>
              )}
            </div>
            <CamposEditor
              campos={documento.campos}
              onGuardar={(campos) => guardar.mutate(campos)}
              guardando={guardar.isPending}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
