import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, type UseFormProps, type UseFormReturn } from "react-hook-form"

import type { z } from "zod"

/**
 * `useForm` de react-hook-form con validación zod ya enchufada. El esquema zod
 * puede reflejar las reglas de Pydantic del backend, así la validación de cliente
 * y servidor no se desincroniza.
 */
export function useZodForm<S extends z.ZodType>(
  schema: S,
  options?: Omit<UseFormProps<z.infer<S>>, "resolver">,
): UseFormReturn<z.infer<S>> {
  return useForm<z.infer<S>>({ ...options, resolver: zodResolver(schema) })
}
