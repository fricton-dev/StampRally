import { Outlet } from "react-router-dom"
import Header from "./Header"
import { useAppStore } from "../lib/store"
import BottomNav from "./BottomNav"

export default function RootLayout() {
  const tenant = useAppStore((state) => state.tenant)
  const hasBackground = Boolean(tenant.backgroundImageUrl)
  const themeColor = tenant.themeColor ?? "orange"

  return (
    <div data-theme={themeColor} className={`relative min-h-screen ${hasBackground ? "bg-neutral-100" : "bg-neutral-50"}`}>
      {hasBackground && (
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
          <img
            src={tenant.backgroundImageUrl}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-white/25" />
        </div>
      )}

      <div className="relative z-10 min-h-screen">
        <Header />
        <main className="pt-16 pb-6"> {/* leave space for fixed header & bottom nav */}
          <Outlet />
        </main>
        <BottomNav />
      </div>
    </div>
  )
}
