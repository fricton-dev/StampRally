import { useCallback, useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"

import { useAppStore, useTenantId } from "../lib/store"
import { useAuthStore } from "../lib/authStore"
import {
  readTenantSession,
  subscribeTenantSessionChange,
  type TenantAdminSession,
} from "../lib/tenantAdminSession"
import { TENANT_TOKEN_INFO_KEY, TENANT_TOKEN_STORAGE_KEY } from "../lib/config"

export default function Header() {
  const tenant = useAppStore((state) => state.tenant)
  const tenantId = useTenantId()
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const navigate = useNavigate()
  const [adminSession, setAdminSession] = useState<TenantAdminSession | null>(() =>
    readTenantSession(tenantId),
  )

  useEffect(() => {
    const syncSession = () => {
      setAdminSession(readTenantSession(tenantId))
    }
    syncSession()

    const handleStorage = (event: StorageEvent) => {
      if (
        event.key === null ||
        event.key === TENANT_TOKEN_INFO_KEY ||
        event.key === TENANT_TOKEN_STORAGE_KEY
      ) {
        syncSession()
      }
    }

    const unsubscribe = subscribeTenantSessionChange(syncSession)
    if (typeof window !== "undefined") {
      window.addEventListener("storage", handleStorage)
      window.addEventListener("focus", syncSession)
    }

    return () => {
      unsubscribe()
      if (typeof window !== "undefined") {
        window.removeEventListener("storage", handleStorage)
        window.removeEventListener("focus", syncSession)
      }
    }
  }, [tenantId])

  const handleLogout = useCallback(() => {
    logout()
    navigate(`/tenant/${tenantId}`)
  }, [logout, navigate, tenantId])

  const isAdminPreview = !user && adminSession && adminSession.tenantId === tenantId

  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-14 bg-gradient-to-r from-orange-500 to-orange-500 text-white shadow-md">
      <div className="mx-auto flex h-full max-w-md items-center justify-between px-4">
        <div className="text-sm font-semibold tracking-wider">{tenant.tenantName}</div>
        <div className="text-xs">
          {user ? (
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-white/20 px-3 py-1 text-[11px] font-semibold">
                {user.username}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-full bg-white/20 px-3 py-1 font-semibold hover:bg-white/30"
              >
                ログアウト
              </button>
            </div>
          ) : isAdminPreview ? (
            <div className="flex items-center gap-2">
              <Link
                to={`/tenant/${tenantId}`}
                className="rounded-full bg-white/20 px-3 py-1 font-semibold hover:bg-white/30"
              >
                デモ確認
              </Link>
              <Link
                to={`/tenant/${tenantId}/admin/dashboard`}
                className="rounded-full bg-white px-3 py-1 font-semibold text-orange-600 shadow hover:bg-orange-50"
              >
                管理画面
              </Link>
            </div>
          ) : (
            <Link
              to={`/tenant/${tenantId}/auth/user`}
              className="rounded-full bg-white/20 px-3 py-1 font-semibold hover:bg-white/30"
            >
              ログイン
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
