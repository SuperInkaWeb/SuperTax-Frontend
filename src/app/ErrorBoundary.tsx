import { Component } from "react"

import { Button } from "@/shared/ui/button"

import type { ErrorInfo, ReactNode } from "react"

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

/** Captura errores de render y muestra un fallback en vez de una pantalla en blanco. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary capturó:", error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="grid min-h-screen place-items-center bg-background p-6">
          <div className="max-w-md space-y-4 text-center">
            <h1 className="text-2xl font-semibold">Algo salió mal</h1>
            <p className="text-sm text-muted-foreground">
              Ocurrió un error inesperado en la aplicación. Recarga la página para continuar; si
              persiste, avísanos.
            </p>
            <Button onClick={() => window.location.reload()}>Recargar la página</Button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
