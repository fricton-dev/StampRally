import {
  TENANT_TOKEN_INFO_KEY,
  TENANT_TOKEN_STORAGE_KEY,
} from "./config"

export type TenantAdminSessionInfo = {
  tenantId: string
  mustChangePassword: boolean
  companyName?: string
}

export type TenantAdminSession = TenantAdminSessionInfo & {
  accessToken: string
}

const isBrowser = () => typeof window !== "undefined"
const SESSION_EVENT_NAME = "tenant-admin-session-changed"

const broadcastTenantSessionChange = () => {
  if (!isBrowser()) {
    return
  }
  window.dispatchEvent(new CustomEvent(SESSION_EVENT_NAME))
}

const readInfo = (): TenantAdminSessionInfo | null => {
  if (!isBrowser()) {
    return null
  }
  try {
    const raw = window.localStorage.getItem(TENANT_TOKEN_INFO_KEY)
    if (!raw) {
      return null
    }
    const parsed = JSON.parse(raw) as Partial<TenantAdminSessionInfo>
    if (!parsed.tenantId) {
      return null
    }
    return {
      tenantId: parsed.tenantId,
      mustChangePassword: Boolean(parsed.mustChangePassword),
      companyName:
        typeof parsed.companyName === "string" && parsed.companyName.trim().length > 0
          ? parsed.companyName
          : undefined,
    }
  } catch (error) {
    console.warn("Failed to parse stored tenant admin info:", error)
    return null
  }
}

export const getStoredTenantInfo = (): TenantAdminSessionInfo | null => readInfo()

export const getStoredTenantToken = (): string | null => {
  if (!isBrowser()) {
    return null
  }
  return window.localStorage.getItem(TENANT_TOKEN_STORAGE_KEY)
}

export const readTenantSession = (tenantId?: string): TenantAdminSession | null => {
  if (!isBrowser()) {
    return null
  }
  const info = readInfo()
  const token = getStoredTenantToken()
  if (!info || !token) {
    return null
  }
  if (tenantId && info.tenantId !== tenantId) {
    return null
  }
  return {
    ...info,
    accessToken: token,
  }
}

export const subscribeTenantSessionChange = (listener: () => void) => {
  if (!isBrowser()) {
    return () => {}
  }
  const handler = () => listener()
  window.addEventListener(SESSION_EVENT_NAME, handler)
  return () => {
    window.removeEventListener(SESSION_EVENT_NAME, handler)
  }
}

export const persistTenantSession = (payload: TenantAdminSession) => {
  if (!isBrowser()) {
    return
  }
  const info: TenantAdminSessionInfo = {
    tenantId: payload.tenantId,
    mustChangePassword: payload.mustChangePassword,
    companyName: payload.companyName,
  }
  window.localStorage.setItem(TENANT_TOKEN_STORAGE_KEY, payload.accessToken)
  window.localStorage.setItem(TENANT_TOKEN_INFO_KEY, JSON.stringify(info))
  broadcastTenantSessionChange()
}

export const clearTenantSession = () => {
  if (!isBrowser()) {
    return
  }
  window.localStorage.removeItem(TENANT_TOKEN_STORAGE_KEY)
  window.localStorage.removeItem(TENANT_TOKEN_INFO_KEY)
  broadcastTenantSessionChange()
}
