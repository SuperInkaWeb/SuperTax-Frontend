import { create } from "zustand"

import { Button } from "@/shared/ui/button"

interface ConfirmOptions {
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
}

interface ConfirmState {
  open: boolean
  options: ConfirmOptions
  resolver: ((v: boolean) => void) | null
  ask: (o: ConfirmOptions) => Promise<boolean>
  cerrar: (v: boolean) => void
}

const useConfirmStore = create<ConfirmState>((set, get) => ({
  open: false,
  options: { title: "" },
  resolver: null,
  ask: (options) =>
    new Promise<boolean>((resolve) => set({ open: true, options, resolver: resolve })),
  cerrar: (v) => {
    get().resolver?.(v)
    set({ open: false, resolver: null })
  },
}))

/** Pide confirmación al usuario. Devuelve true si confirma. */
export function confirmar(options: ConfirmOptions): Promise<boolean> {
  return useConfirmStore.getState().ask(options)
}

/** Se monta una vez (en el AppShell) y renderiza el diálogo de confirmación. */
export function ConfirmHost() {
  const { open, options, cerrar } = useConfirmStore()
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-black/40 p-4"
      onClick={() => cerrar(false)}
      onKeyDown={(e) => e.key === "Escape" && cerrar(false)}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        className="w-full max-w-sm rounded-lg border bg-card p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">{options.title}</h2>
        {options.description && (
          <p className="mt-1.5 text-sm text-muted-foreground">{options.description}</p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => cerrar(false)}>
            {options.cancelLabel ?? "Cancelar"}
          </Button>
          <Button
            variant={options.destructive ? "destructive" : "default"}
            onClick={() => cerrar(true)}
          >
            {options.confirmLabel ?? "Confirmar"}
          </Button>
        </div>
      </div>
    </div>
  )
}
