import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/shared/lib/utils"

import type { HTMLAttributes } from "react"

const alertVariants = cva(
  "relative flex w-full items-start gap-2.5 rounded-lg border px-4 py-3 text-sm [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "border-border bg-card text-foreground",
        destructive: "border-destructive/40 bg-destructive/10 text-destructive [&>svg]:text-destructive",
        warning:
          "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
        info: "border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
      },
    },
    defaultVariants: { variant: "default" },
  },
)

export function Alert({
  className,
  variant,
  ...props
}: HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>) {
  return <div role="alert" className={cn(alertVariants({ variant }), className)} {...props} />
}

export function AlertDescription({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("min-w-0 [&_p]:leading-relaxed", className)} {...props} />
}
