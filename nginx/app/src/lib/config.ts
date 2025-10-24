const trimTrailingSlash = (value: string | undefined | null): string | undefined => {
  if (!value) return undefined
  return value.endsWith("/") ? value.slice(0, -1) : value
}

const resolveApiBaseUrl = (): string => {
  const envValue = trimTrailingSlash(import.meta.env?.VITE_API_BASE_URL)
  if (envValue) {
    return envValue
  }

  if (import.meta.env.DEV) {
    // During Vite dev server we default to the FastAPI container.
    return "http://localhost:8000/api"
  }

  return "/api"
}

export const API_BASE_URL = resolveApiBaseUrl()

export const DEFAULT_TENANT_ID =
  import.meta.env?.VITE_DEFAULT_TENANT_ID ?? "takizawa"

export const AUTH_TOKEN_STORAGE_KEY = "stamprally.auth.token"
export const TENANT_TOKEN_STORAGE_KEY = "stamprally.tenant.token"
export const TENANT_TOKEN_INFO_KEY = "stamprally.tenant.info"
