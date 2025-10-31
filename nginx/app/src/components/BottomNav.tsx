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
import { useLanguage } from "../lib/i18n"
import type { AppLanguage } from "../types"

const NAV_TEXT: Record<
  AppLanguage,
  {
    adminDashboard: string
    adminStores: string
    adminCampaign: string
    adminCoupons: string
    home: string
    scan: string
    map: string
    coupons: string
  }
> = {
  ja: {
    adminDashboard: "ダッシュボード",
    adminStores: "店舗一覧",
    adminCampaign: "キャンペーン",
    adminCoupons: "クーポン管理",
    home: "ホーム",
    scan: "QR",
    map: "マップ",
    coupons: "クーポン",
  },
  en: {
    adminDashboard: "Dashboard",
    adminStores: "Stores",
    adminCampaign: "Campaign",
    adminCoupons: "Coupons",
    home: "Home",
    scan: "QR",
    map: "Map",
    coupons: "Coupons",
  },
  zh: {
    adminDashboard: "儀表板",
    adminStores: "店鋪清單",
    adminCampaign: "活動設定",
    adminCoupons: "票券管理",
    home: "首頁",
    scan: "QR",
    map: "地圖",
    coupons: "票券",
  },
}

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
  const language = useLanguage()
  const TEXT = NAV_TEXT[language]
  const tenantId = useTenantId()
  const location = useLocation()
  const currentTenantPath = `/tenant/${tenantId}`
  const isAdminSection = location.pathname.startsWith(`${currentTenantPath}/admin`)

  const navItems: NavItem[] = isAdminSection
    ? [
        {
          to: `${currentTenantPath}/admin/dashboard`,
          label: TEXT.adminDashboard,
          icon: PresentationChartBarIcon,
          end: true,
        },
        {
          to: `${currentTenantPath}/admin/stores`,
          label: TEXT.adminStores,
          icon: BuildingStorefrontIcon,
          isActive: (pathname) =>
            Boolean(
              matchPath({ path: `${currentTenantPath}/admin/stores`, end: true }, pathname) ||
                matchPath({ path: `${currentTenantPath}/admin/stores/:storeId/edit`, end: true }, pathname),
            ),
        },
        {
          to: `${currentTenantPath}/admin/campaign`,
          label: TEXT.adminCampaign,
          icon: SparklesIcon,
          end: true,
        },
        {
          to: `${currentTenantPath}/admin/coupons`,
          label: TEXT.adminCoupons,
          icon: TicketIcon,
        },
      ]
    : [
        { to: currentTenantPath, label: TEXT.home, icon: HomeIcon, end: true },
        { to: `${currentTenantPath}/scan`, label: TEXT.scan, icon: QrCodeIcon },
        { to: `${currentTenantPath}/map`, label: TEXT.map, icon: MapPinIcon },
        { to: `${currentTenantPath}/coupons`, label: TEXT.coupons, icon: TicketIcon },
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
