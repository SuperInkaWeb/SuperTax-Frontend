import { Link } from "react-router-dom"

import { buttonVariants } from "@/shared/ui/button"

export function NotFoundPage() {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="space-y-3 text-center">
        <p className="font-mono text-5xl font-bold text-muted-foreground">404</p>
        <p className="text-sm text-muted-foreground">La página que buscas no existe o se movió.</p>
        <Link to="/dashboard" className={buttonVariants({ variant: "outline" })}>
          Ir al inicio
        </Link>
      </div>
    </div>
  )
}
