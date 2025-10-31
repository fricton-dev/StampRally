import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Outlet, useNavigate, useParams } from "react-router-dom"

import { fetchTenantSeed, updateTenantCampaign } from "../../lib/api"
import {
  clearTenantSession,
  readTenantSession,
  type TenantAdminSession,
} from "../../lib/tenantAdminSession"
import { useAppStore } from "../../lib/store"
import type { TenantSeed } from "../../types"
import { TenantAdminContext, type TenantAdminContextValue } from "./TenantAdminContext"

type Status = "checking" | "loading" | "ready" | "error"

const TEXT = {
  missingTenantId: "URLにテナントIDが含まれていません。アドレスをご確認ください。",
  verifyingSession: "管理者ログイン状態を確認しています…",
  loadingTenant: "テナント情報を読み込んでいます…",
  loadFailed: "テナント情報の読み込みに失敗しました。再度お試しください。",
  retry: "再試行",
  backToLogin: "管理者ログインへ戻る",
} as const

const DEFAULT_TIMEZONE_FALLBACK = "UTC+09:00"

const detectDeviceTimezoneOffset = (): string | null => {
  if (typeof window === "undefined") {
    return null
  }
  try {
    const offsetMinutes = -new Date().getTimezoneOffset()
    if (!Number.isFinite(offsetMinutes)) {
      return null
    }
    const sign = offsetMinutes >= 0 ? "+" : "-"
    const absolute = Math.abs(offsetMinutes)
    const hours = Math.floor(absolute / 60)
    const minutes = absolute % 60
    if (hours > 14 || (hours === 14 && minutes !== 0)) {
      return null
    }
    return `UTC${sign}${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
  } catch {
    return null
  }
}

export default function TenantAdminLayout(): ReactNode {
  const { tenantId } = useParams<{ tenantId: string }>()
  const navigate = useNavigate()
  const [session, setSession] = useState<TenantAdminSession | null>(null)
  const [seed, setSeed] = useState<TenantSeed | null>(null)
  const [status, setStatus] = useState<Status>("checking")
  const [error, setError] = useState<string | null>(null)
  const setGlobalTenant = useAppStore((state) => state.setTenantSeed)
  const timezoneSyncRef = useRef<{
    lastAttempt?: string
    lastApplied?: string
    inFlight?: boolean
  }>({})

  useEffect(() => {
    if (!tenantId) {
      setError(TEXT.missingTenantId)
      setStatus("error")
      return
    }

    const stored = readTenantSession(tenantId)
    if (!stored) {
      clearTenantSession()
      navigate(`/tenant/${tenantId}/auth/admin`, { replace: true })
      return
    }

    setSession(stored)
    setStatus("loading")
  }, [tenantId, navigate])

  const loadSeed = useCallback(async () => {
    if (!tenantId) {
      throw new Error(TEXT.missingTenantId)
    }
    const result = await fetchTenantSeed(tenantId)
    setSeed(result)
    setGlobalTenant(result)
    return result
  }, [tenantId, setGlobalTenant])

  useEffect(() => {
    if (status !== "loading" || !session) {
      return
    }

    let cancelled = false
    setError(null)

    loadSeed()
      .then(() => {
        if (!cancelled) setStatus("ready")
      })
      .catch((err) => {
        if (cancelled) return
        const message = err instanceof Error ? err.message : TEXT.loadFailed
        setError(message)
        setStatus("error")
      })

    return () => {
      cancelled = true
    }
  }, [status, session, loadSeed])

  const refreshSeed = useCallback(async () => loadSeed(), [loadSeed])

  useEffect(() => {
    if (!tenantId || !session?.accessToken || !seed) {
      return
    }
    const deviceTimezone = detectDeviceTimezoneOffset()
    if (!deviceTimezone) {
      return
    }
    const currentTimezone = seed.tenant.campaignTimezone ?? DEFAULT_TIMEZONE_FALLBACK

    if (
      timezoneSyncRef.current.lastAttempt === deviceTimezone &&
      timezoneSyncRef.current.lastApplied === currentTimezone
    ) {
      return
    }

    if (currentTimezone === deviceTimezone) {
      timezoneSyncRef.current = {
        lastAttempt: deviceTimezone,
        lastApplied: currentTimezone,
        inFlight: false,
      }
      return
    }

    if (timezoneSyncRef.current.inFlight || timezoneSyncRef.current.lastAttempt === deviceTimezone) {
      return
    }

    timezoneSyncRef.current = {
      lastAttempt: deviceTimezone,
      lastApplied: currentTimezone,
      inFlight: true,
    }

    let cancelled = false

    updateTenantCampaign(session.accessToken, tenantId, {
      campaignTimezone: deviceTimezone,
    })
      .then(() => {
        if (cancelled) return
        timezoneSyncRef.current = {
          lastAttempt: deviceTimezone,
          lastApplied: deviceTimezone,
          inFlight: false,
        }
        return refreshSeed()
      })
      .catch((err) => {
        if (cancelled) return
        console.warn("Failed to synchronize campaign timezone automatically", err)
        timezoneSyncRef.current = {
          lastAttempt: deviceTimezone,
          lastApplied: currentTimezone,
          inFlight: false,
        }
      })

    return () => {
      cancelled = true
      timezoneSyncRef.current.inFlight = false
    }
  }, [tenantId, session?.accessToken, seed, refreshSeed])

  const contextValue = useMemo<TenantAdminContextValue | null>(() => {
    if (!tenantId || !session || !seed) {
      return null
    }
    return {
      tenantId,
      session,
      seed,
      refreshSeed,
    }
  }, [tenantId, session, seed, refreshSeed])

  if (!tenantId) {
    return (
      <div className="mx-auto max-w-md p-6 text-sm text-red-600">
        {TEXT.missingTenantId}
      </div>
    )
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-md p-6 text-sm text-gray-600">
        {TEXT.verifyingSession}
      </div>
    )
  }

  if (status === "loading" || status === "checking" || !contextValue) {
    return (
      <div className="mx-auto max-w-md p-6 text-sm text-gray-600">
        {TEXT.loadingTenant}
      </div>
    )
  }

  if (status === "error" || !seed) {
    return (
      <div className="mx-auto max-w-md space-y-4 p-6 text-sm text-red-600">
        <p>{error ?? TEXT.loadFailed}</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded bg-orange-500 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-orange-600"
            onClick={() => setStatus("loading")}
          >
            {TEXT.retry}
          </button>
          <button
            type="button"
            className="rounded bg-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 shadow hover:bg-gray-300"
            onClick={() => navigate(`/tenant/${tenantId}/auth/admin`, { replace: true })}
          >
            {TEXT.backToLogin}
          </button>
        </div>
      </div>
    )
  }

  return (
    <TenantAdminContext.Provider value={contextValue}>
      <Outlet />
    </TenantAdminContext.Provider>
  )
}
