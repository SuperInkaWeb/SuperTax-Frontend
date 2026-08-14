import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"
import { toast } from "sonner"

import { disconnectDrive, getDriveAuthUrl, getDriveStatus } from "@/features/sunat/api"
import { apiError } from "@/shared/lib/api/error"
import { useActiveCompany } from "@/shared/stores/activeCompany"
import { Button } from "@/shared/ui/button"
import { Card, CardContent } from "@/shared/ui/card"
import { confirmar } from "@/shared/ui/confirm"
import { Spinner } from "@/shared/ui/spinner"

export function DrivePage() {
  const companyId = useActiveCompany((s) => s.companyId)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ["sunat", "drive", companyId],
    queryFn: getDriveStatus,
    enabled: companyId != null,
  })

  // Cuando el popup de Google avisa que conectó, refrescamos el estado.
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.data?.type === "DRIVE_CONNECTED") {
        queryClient.invalidateQueries({ queryKey: ["sunat", "drive"] })
        toast.success("Google Drive conectado")
      }
    }
    window.addEventListener("message", onMessage)
    return () => window.removeEventListener("message", onMessage)
  }, [queryClient])

  const conectar = useMutation({
    mutationFn: getDriveAuthUrl,
    onSuccess: (url) => {
      window.open(url, "drive-oauth", "width=520,height=640")
    },
    onError: (err) => toast.error(apiError(err, "No se pudo iniciar la conexión")),
  })

  const desconectar = useMutation({
    mutationFn: disconnectDrive,
    onSuccess: () => {
      toast.success("Google Drive desconectado")
      queryClient.invalidateQueries({ queryKey: ["sunat", "drive"] })
    },
    onError: (err) => toast.error(apiError(err, "No se pudo desconectar")),
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    )
  }

  return (
    <Card className="max-w-xl">
      <CardContent className="flex items-center justify-between pt-5">
        <p className="text-sm">
          {data?.connected
            ? "Google Drive está conectado."
            : "Google Drive no está conectado."}
        </p>
        {data?.connected ? (
          <Button
            variant="outline"
            disabled={desconectar.isPending}
            onClick={async () => {
              const ok = await confirmar({
                title: "¿Desconectar Google Drive?",
                description: "Las descargas ya no podrán subirse a Drive hasta reconectar.",
                confirmLabel: "Desconectar",
                destructive: true,
              })
              if (ok) desconectar.mutate()
            }}
          >
            Desconectar
          </Button>
        ) : (
          <Button onClick={() => conectar.mutate()} disabled={conectar.isPending}>
            Conectar Drive
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
