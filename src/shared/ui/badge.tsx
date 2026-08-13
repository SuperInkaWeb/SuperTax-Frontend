import { cn } from "@/shared/lib/utils"

import type { HTMLAttributes } from "react"

type Tone = "neutral" | "info" | "success" | "danger"

const TONES: Record<Tone, string> = {
  neutral: "bg-secondary text-secondary-foreground",
  info: "bg-accent text-accent-foreground",
  success: "bg-primary/15 text-primary",
  danger: "bg-destructive/15 text-destructive",
}

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone
}

export function Badge({ tone = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        TONES[tone],
        className,
      )}
      {...props}
    />
  )
}
