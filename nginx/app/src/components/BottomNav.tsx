import type { ComponentType } from "react"
import { NavLink, matchPath, useLocation } from "react-router-dom"
import {
  BuildingStorefrontIcon,
  HomeIcon,
  MapPinIcon,
  PresentationChartBarIcon,
  QrCodeIcon,
  SparklesIcon,
  TicketIcon,
} from "@heroicons/react/24/outline"

import { useTenantId } from "../lib/store"

type NavItem = {
  to: string
  label: string
  icon: ComponentType<{ className?: string }>
  end?: boolean
  isActive?: (pathname: string) => boolean
}

const baseItemClass =
  "flex-1 px-2 py-2 flex flex-col items-center justify-center gap-1 text-xs font-medium text-white transition-colors"

export default function BottomNav() {
  const tenantId = useTenantId()
  const location = useLocation()
  const currentTenantPath = `/tenant/${tenantId}`
  const isAdminSection = location.pathname.startsWith(`${currentTenantPath}/admin`)

  const navItems: NavItem[] = isAdminSection
    ? [
        {
          to: `${currentTenantPath}/admin/dashboard`,
          label: "ダッシュボード",
          icon: PresentationChartBarIcon,
          end: true,
        },
        {
          to: `${currentTenantPath}/admin/stores`,
          label: "店舗一覧",
          icon: BuildingStorefrontIcon,
          isActive: (pathname) =>
            Boolean(
              matchPath({ path: `${currentTenantPath}/admin/stores`, end: true }, pathname) ||
                matchPath({ path: `${currentTenantPath}/admin/stores/:storeId/edit`, end: true }, pathname),
            ),
        },
        {
          to: `${currentTenantPath}/admin/campaign`,
          label: "キャンペーン",
          icon: SparklesIcon,
          end: true,
        },
        {
          to: `${currentTenantPath}/admin/coupons`,
          label: "クーポン管理",
          icon: TicketIcon,
        },
      ]
    : [
        { to: currentTenantPath, label: "ホーム", icon: HomeIcon, end: true },
        { to: `${currentTenantPath}/scan`, label: "QR", icon: QrCodeIcon },
        { to: `${currentTenantPath}/map`, label: "マップ", icon: MapPinIcon },
        { to: `${currentTenantPath}/coupons`, label: "クーポン", icon: TicketIcon },
      ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-orange-600">
      <div className="mx-auto flex max-w-md">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `${baseItemClass} ${
                (item.isActive ? item.isActive(location.pathname) : isActive)
                  ? "bg-white/25 font-semibold"
                  : "bg-transparent"
              }`
            }
            aria-label={item.label}
          >
            <item.icon className="h-6 w-6 stroke-white" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
