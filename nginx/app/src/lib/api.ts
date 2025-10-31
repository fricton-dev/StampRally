import {
  API_BASE_URL,
} from "./config"
import type {
  AuthResponse,
  AuthToken,
  Coupon,
  RewardRule,
  StampResult,
  Store,
  TenantConfig,
  ThemeColor,
  CouponUsageMode,
  TenantDashboardStats,
  TenantCreateResponse,
  TenantLoginResponse,
  TenantSeed,
  UserProfile,
  UserProgress,
} from "../types"

type RequestOptions = {
  method?: string
  body?: unknown
  token?: string | null
  headers?: Record<string, string>
}

type ErrorDetail = {
  detail?:
    | string
    | { msg?: string; detail?: string }
    | Array<{ msg?: string; detail?: string }>
}

const buildUrl = (path: string): string => {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path
  }
  if (path.startsWith("/")) {
    return `${API_BASE_URL}${path}`
  }
  return `${API_BASE_URL}/${path}`
}

const extractErrorMessage = (payload: unknown, fallback: string): string => {
  if (!payload || typeof payload !== "object") {
    return fallback
  }
  const detail = (payload as ErrorDetail).detail
  if (!detail) return fallback
  if (typeof detail === "string") {
    return detail
  }
  if (Array.isArray(detail)) {
    const first = detail[0]
    if (first?.msg) return first.msg
    if (first?.detail) return first.detail
    return fallback
  }
  if (typeof detail === "object") {
    if (detail.msg) return detail.msg
    if (detail.detail) return detail.detail
  }
  return fallback
}

const apiRequest = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const url = buildUrl(path)
  const headers: Record<string, string> = {
    ...(options.headers ?? {}),
  }

  let body: BodyInit | undefined
  if (options.body !== undefined) {
    if (options.body instanceof FormData || options.body instanceof URLSearchParams || options.body instanceof Blob) {
      body = options.body
    } else if (typeof options.body === "string") {
      headers["Content-Type"] = "application/json"
      body = options.body
    } else {
      headers["Content-Type"] = "application/json"
      body = JSON.stringify(options.body)
    }
  }

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`
  }

  const response = await fetch(url, {
    method: options.method ?? (options.body ? "POST" : "GET"),
    headers,
    body,
  })

  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`
    try {
      const payload = (await response.json()) as unknown
      message = extractErrorMessage(payload, message)
    } catch {
      // ignore json parse errors
    }
    const error = new Error(message)
    ;(error as Error & { status?: number }).status = response.status
    throw error
  }

  if (response.status === 204) {
    return undefined as T
  }

  const data = (await response.json()) as T
  return data
}

export const fetchTenantSeed = (tenantId: string): Promise<TenantSeed> =>
  apiRequest<TenantSeed>(`/tenants/${tenantId}`)

export const fetchTenantDashboardStats = (
  token: string,
  tenantId: string,
  params?: { days?: number },
): Promise<TenantDashboardStats> => {
  const days = params?.days
  const query = typeof days === "number" && Number.isFinite(days) ? `?days=${Math.floor(days)}` : ""
  return apiRequest<TenantDashboardStats>(`/tenants/${tenantId}/dashboard-stats${query}`, {
    token,
  })
}

export const tenantLogin = (tenantId: string, password: string): Promise<TenantLoginResponse> =>
  apiRequest<TenantLoginResponse>("/tenants/login", {
    method: "POST",
    body: { tenant_id: tenantId, password },
  })

export const tenantResetPassword = (payload: {
  tenantId: string
  currentPassword: string
  newPassword: string
}): Promise<void> =>
  apiRequest<void>("/tenants/reset-password", {
    method: "POST",
    body: {
      tenant_id: payload.tenantId,
      current_password: payload.currentPassword,
      new_password: payload.newPassword,
    },
  })

export const createTenant = (payload: {
  tenantId?: string
  companyName: string
  businessType?: string
  adminName?: string
  adminEmail: string
  adminPhone?: string
  initialPassword?: string
  backgroundImageUrl?: string
}): Promise<TenantCreateResponse> =>
  apiRequest<TenantCreateResponse>("/tenants", {
    method: "POST",
    body: {
      tenant_id: payload.tenantId,
      company_name: payload.companyName,
      business_type: payload.businessType,
      admin_name: payload.adminName,
      admin_email: payload.adminEmail,
      admin_phone: payload.adminPhone,
      initial_password: payload.initialPassword,
      background_image_url: payload.backgroundImageUrl,
    },
  })

export const registerUser = (payload: {
  tenantId: string
  username: string
  email: string
  password: string
  gender: string
  age: number
  role?: string
}): Promise<AuthResponse> =>
  apiRequest<AuthResponse>("/users/register", {
    method: "POST",
    body: {
      tenant_id: payload.tenantId,
      username: payload.username,
      email: payload.email,
      password: payload.password,
      gender: payload.gender,
      age: payload.age,
      role: payload.role,
    },
  })

export const loginUser = (payload: {
  identifier: string
  password: string
  tenantId?: string
}): Promise<AuthToken> =>
  apiRequest<AuthToken>("/auth/login/json", {
    method: "POST",
    body: {
      identifier: payload.identifier,
      password: payload.password,
      tenant_id: payload.tenantId,
    },
  })

export const fetchCurrentUser = (token: string): Promise<UserProfile> =>
  apiRequest<UserProfile>("/auth/me", { token })

export const fetchUserProgress = (token: string): Promise<UserProgress> =>
  apiRequest<UserProgress>("/users/me/progress", { token })

export const recordStamp = (token: string, storeId: string): Promise<StampResult> =>
  apiRequest<StampResult>("/users/me/stamps", {
    method: "POST",
    token,
    body: { store_id: storeId },
  })

export const markCouponUsed = (token: string, couponId: string): Promise<Coupon> =>
  apiRequest<Coupon>(`/users/me/coupons/${couponId}/use`, {
    method: "PATCH",
    token,
  })

export const addTenantStore = (
  token: string,
  tenantId: string,
  payload: {
    storeId?: string
    name: string
    lat: number
    lng: number
    description?: string
    imageUrl?: string
    stampMark?: string
  },
): Promise<Store> =>
  apiRequest<Store>(`/tenants/${tenantId}/stores`, {
    method: "POST",
    token,
    body: {
      store_id: payload.storeId,
      name: payload.name,
      lat: payload.lat,
      lng: payload.lng,
      description: payload.description,
      image_url: payload.imageUrl,
      stamp_mark: payload.stampMark,
    },
  })

export const deleteTenantStore = (
  token: string,
  tenantId: string,
  storeId: string,
): Promise<void> =>
  apiRequest<void>(`/tenants/${tenantId}/stores/${storeId}`, {
    method: "DELETE",
    token,
  })

export const upsertTenantRewardRule = (
  token: string,
  tenantId: string,
  payload: {
    threshold: number
    label: string
    icon?: string
    expiresAt?: string | null
  },
): Promise<RewardRule> =>
  apiRequest<RewardRule>(`/tenants/${tenantId}/reward-rules`, {
    method: "POST",
    token,
    body: {
      threshold: payload.threshold,
      label: payload.label,
      icon: payload.icon,
      expires_at: payload.expiresAt ?? undefined,
    },
  })

export const deleteTenantRewardRule = (token: string, tenantId: string, threshold: number): Promise<void> =>
  apiRequest<void>(`/tenants/${tenantId}/reward-rules/${threshold}`, {
    method: "DELETE",
    token,
  })

export type UploadImageResponse = {
  url: string
  filename: string
  content_type: string
  size: number
}

export const uploadTenantImage = (token: string, file: File): Promise<UploadImageResponse> => {
  const formData = new FormData()
  formData.append("file", file)
  return apiRequest<UploadImageResponse>("/uploads/images", {
    method: "POST",
    token,
    body: formData,
  })
}

export const updateTenantCampaign = (
  token: string,
  tenantId: string,
  payload: {
    campaignStart?: string
    campaignEnd?: string
    campaignTimezone?: string
    language?: string
    couponUsageMode?: CouponUsageMode
    couponUsageStart?: string
    couponUsageEnd?: string
    campaignDescription?: string
    backgroundImageUrl?: string
    stampImageUrl?: string
    themeColor?: ThemeColor
    maxStamps?: number
  },
): Promise<TenantConfig> =>
  apiRequest<TenantConfig>(`/tenants/${tenantId}/campaign`, {
    method: "PUT",
    token,
    body: {
      campaign_start: payload.campaignStart,
      campaign_end: payload.campaignEnd,
      campaign_timezone: payload.campaignTimezone,
      language: payload.language,
      coupon_usage_mode: payload.couponUsageMode,
      coupon_usage_start: payload.couponUsageStart,
      coupon_usage_end: payload.couponUsageEnd,
      campaign_description: payload.campaignDescription,
      background_image_url: payload.backgroundImageUrl,
      stamp_image_url: payload.stampImageUrl,
      theme_color: payload.themeColor,
      max_stamps: payload.maxStamps,
    },
  })
