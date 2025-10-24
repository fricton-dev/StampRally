import { useEffect, useState } from "react"
import { createBrowserRouter, Navigate, useParams } from "react-router-dom"

import RootLayout from "../components/RootLayout"
import Home from "../pages/Home"
import Scan from "../pages/Scan"
import MapPage from "../pages/MapPage"
import Coupons from "../pages/Coupons"
import UserAuthPage from "../pages/UserAuthPage"
import AdminAuthPage from "../pages/AdminAuthPage"
import TenantAdminDashboard from "../pages/TenantAdminDashboard"
import TenantOnboardingPage from "../pages/TenantOnboardingPage"
import { useAppStore, useTenantId } from "./store"
import { DEFAULT_TENANT_ID } from "./config"
import { fetchTenantSeed, fetchUserProgress } from "./api"
import { demoTenants } from "../data/demo"
import { useAuthStore } from "./authStore"
import TenantAdminLayout from "../pages/admin/TenantAdminLayout"
import TenantAdminStoresPage from "../pages/admin/TenantAdminStoresPage"
import TenantAdminStoreEditorPage from "../pages/admin/TenantAdminStoreEditorPage"
import TenantAdminCouponsPage from "../pages/admin/TenantAdminCouponsPage"
import TenantAdminCampaignPage from "../pages/admin/TenantAdminCampaignPage"

function TenantRoute() {
  const { tenantId } = useParams()
  const resolvedId = tenantId ?? DEFAULT_TENANT_ID
  const setTenantSeed = useAppStore((state) => state.setTenantSeed)
  const setProgress = useAppStore((state) => state.setProgress)
  const currentTenantId = useTenantId()
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setStatus("loading")
    setError(null)

    const load = async () => {
      try {
        const seed = await fetchTenantSeed(resolvedId)
        if (cancelled) return
        setTenantSeed(seed)
        if (token && user?.tenant_id === resolvedId) {
          try {
            const progress = await fetchUserProgress(token)
            if (!cancelled) {
              setProgress(progress)
            }
          } catch (progressError) {
            console.warn("Failed to fetch user progress:", progressError)
            if (!cancelled) {
              setProgress(seed.initialProgress)
            }
          }
        } else {
          setProgress(seed.initialProgress)
        }
        setStatus("ready")
      } catch (err) {
        console.error("Failed to load tenant from server:", err)
        if (cancelled) return
        const fallback = demoTenants[resolvedId]
        if (fallback) {
          console.warn("Falling back to demo tenant data for:", resolvedId)
          setTenantSeed(fallback)
          setProgress(fallback.initialProgress)
          setStatus("ready")
        } else {
          const message = err instanceof Error ? err.message : "Failed to load tenant"
          setError(message)
          setStatus("error")
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [resolvedId, token, user?.tenant_id, setTenantSeed, setProgress])

  if (status === "loading" || currentTenantId !== resolvedId) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-gray-600">
        Loading tenant data...
      </div>
    )
  }

  if (status === "error") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-4 text-center text-sm text-red-600">
        <p>{error ?? "Failed to load tenant"}</p>
        <a
          href={`/tenant/${DEFAULT_TENANT_ID}`}
          className="rounded-lg bg-orange-500 px-4 py-2 text-white shadow"
        >
          Go to default tenant
        </a>
      </div>
    )
  }

  return <RootLayout />
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to={`/tenant/${DEFAULT_TENANT_ID}`} replace />,
  },
  {
    path: "/internal/tenants/new",
    element: <TenantOnboardingPage />,
  },
  {
    path: "/tenant/:tenantId",
    element: <TenantRoute />,
    children: [
      { index: true, element: <Home /> },
      { path: "map", element: <MapPage /> },
      { path: "scan", element: <Scan /> },
      { path: "coupons", element: <Coupons /> },
      { path: "auth", element: <Navigate to="auth/user" replace /> },
      { path: "auth/user", element: <UserAuthPage /> },
      { path: "auth/admin", element: <AdminAuthPage /> },
      {
        path: "admin",
        element: <TenantAdminLayout />,
        children: [
          { index: true, element: <Navigate to="dashboard" replace /> },
          { path: "dashboard", element: <TenantAdminDashboard /> },
          { path: "stores", element: <TenantAdminStoresPage /> },
          { path: "stores/new", element: <TenantAdminStoreEditorPage /> },
          { path: "stores/:storeId/edit", element: <TenantAdminStoreEditorPage /> },
          { path: "campaign", element: <TenantAdminCampaignPage /> },
          { path: "coupons", element: <TenantAdminCouponsPage /> },
        ],
      },
    ],
  },
  {
    path: "*",
    element: <Navigate to={`/tenant/${DEFAULT_TENANT_ID}`} replace />,
  },
])
