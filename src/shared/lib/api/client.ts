import axios from "axios"

import { cerrarSesion, obtenerToken } from "@/shared/lib/authBridge"
import { API_URL } from "@/shared/lib/config"
import { useActiveCompany } from "@/shared/stores/activeCompany"

export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
})

// Cada petición lleva el token Auth0 y la empresa activa (multi-tenant).
api.interceptors.request.use(async (config) => {
  const token = await obtenerToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  const companyId = useActiveCompany.getState().companyId
  if (companyId != null) config.headers["X-Company-Id"] = String(companyId)
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) cerrarSesion()
    return Promise.reject(error)
  },
)
