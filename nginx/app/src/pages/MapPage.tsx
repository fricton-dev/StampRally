import { useEffect, useMemo, useRef, useState } from "react"
import * as L from "leaflet"
import "leaflet/dist/leaflet.css"

import { storesWithDistance } from "../lib/geo"
import { useAppStore } from "../lib/store"
import { useLanguage } from "../lib/i18n"
import type { AppLanguage, Store } from "../types"

type FilterMode = "all" | "unstamped" | "stamped"

const DEFAULT_CENTER: L.LatLngExpression = [35.681236, 139.767125]

const TEXT_MAP: Record<
  AppLanguage,
  {
    nearestTitle: string
    listTitle: string
    filterAll: string
    filterUnstamped: string
    filterStamped: string
    badgeUnstamped: string
    badgeStamped: string
    distanceUnknown: string
    nearestEmptyNoLocation: string
    nearestEmptyAll: string
    nearestEmptyUnstamped: string
    nearestEmptyStamped: string
    listEmptyAll: string
    listEmptyUnstamped: string
    listEmptyStamped: string
  }
> = {
  ja: {
    nearestTitle: "最寄りのお店",
    listTitle: "店舗一覧",
    filterAll: "すべて",
    filterUnstamped: "未達成",
    filterStamped: "達成済み",
    badgeUnstamped: "未達成",
    badgeStamped: "達成済み",
    distanceUnknown: "距離情報なし",
    nearestEmptyNoLocation: "現在地情報を取得できませんでした。",
    nearestEmptyAll: "現在表示できる店舗はありません。",
    nearestEmptyUnstamped: "未達成の店舗はありません。",
    nearestEmptyStamped: "達成済みの店舗はまだありません。",
    listEmptyAll: "表示できる店舗がありません。",
    listEmptyUnstamped: "未達成の店舗はありません。",
    listEmptyStamped: "達成済みの店舗はまだありません。",
  },
  en: {
    nearestTitle: "Nearest Store",
    listTitle: "Store List",
    filterAll: "All",
    filterUnstamped: "Not stamped",
    filterStamped: "Stamped",
    badgeUnstamped: "Not stamped",
    badgeStamped: "Stamped",
    distanceUnknown: "Distance unknown",
    nearestEmptyNoLocation: "Unable to determine your location.",
    nearestEmptyAll: "No stores available to display.",
    nearestEmptyUnstamped: "No unstamped stores available.",
    nearestEmptyStamped: "No stamped stores yet.",
    listEmptyAll: "No stores available.",
    listEmptyUnstamped: "No unstamped stores available.",
    listEmptyStamped: "No stamped stores yet.",
  },
  zh: {
    nearestTitle: "附近的店铺",
    listTitle: "店铺列表",
    filterAll: "全部",
    filterUnstamped: "未盖章",
    filterStamped: "已盖章",
    badgeUnstamped: "未盖章",
    badgeStamped: "已盖章",
    distanceUnknown: "距离未知",
    nearestEmptyNoLocation: "无法获取您的位置信息。",
    nearestEmptyAll: "目前没有可显示的店铺。",
    nearestEmptyUnstamped: "没有未盖章的店铺。",
    nearestEmptyStamped: "还没有已盖章的店铺。",
    listEmptyAll: "没有可显示的店铺。",
    listEmptyUnstamped: "没有未盖章的店铺。",
    listEmptyStamped: "还没有已盖章的店铺。",
  },
}

const formatDistance = (meters: number | null | undefined) => {
  if (meters == null || !Number.isFinite(meters)) {
    return null
  }
  const value = meters as number
  if (value >= 1000) {
    const km = value / 1000
    const display = km >= 10 ? km.toFixed(0) : km.toFixed(1)
    return `${display.replace(/\.0$/, "")}km`
  }
  return `${Math.round(value)}m`
}

type StoreWithMaybeDistance = {
  store: Store
  distance: number | null
}

const markerHtml = (color: string, withCheck = false) =>
  `<span style="
    display:inline-flex;
    align-items:center;
    justify-content:center;
    width:24px;
    height:24px;
    border-radius:9999px;
    background:${color};
    border:3px solid #ffffff;
    box-shadow:0 4px 10px rgba(0,0,0,0.3);
    font-size:14px;
    font-weight:700;
    color:${withCheck ? "#ffffff" : "transparent"};
  ">${withCheck ? "&#10003;" : ""}</span>`

const userMarkerHtml =
  `<span style="
    display:inline-flex;
    align-items:center;
    justify-content:center;
    width:28px;
    height:28px;
    border-radius:9999px;
    background:#2563eb;
    border:3px solid #ffffff;
    box-shadow:0 4px 10px rgba(37,99,235,0.45);
  "></span>`

export default function MapPage() {
  const stores = useAppStore((state) => state.stores)
  const language = useLanguage()
  const TEXT = TEXT_MAP[language]
  const [filterMode, setFilterMode] = useState<FilterMode>("all")
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null)

  const mapRef = useRef<L.Map | null>(null)
  const nodeRef = useRef<HTMLDivElement | null>(null)
  const markersRef = useRef<L.LayerGroup | null>(null)
  const userMarkerRef = useRef<L.Marker | null>(null)

  const stampedIcon = useMemo(
    () =>
      L.divIcon({
        className: "stamped-marker",
        html: markerHtml("#9ca3af", true),
        iconSize: [28, 28],
        iconAnchor: [14, 24],
        popupAnchor: [0, -20],
      }),
    [],
  )

  const unstampedIcon = useMemo(
    () =>
      L.divIcon({
        className: "unstamped-marker",
        html: markerHtml("#f97316"),
        iconSize: [28, 28],
        iconAnchor: [14, 24],
        popupAnchor: [0, -20],
      }),
    [],
  )

  const userIcon = useMemo(
    () =>
      L.divIcon({
        className: "user-marker",
        html: userMarkerHtml,
        iconSize: [32, 32],
        iconAnchor: [16, 28],
      }),
    [],
  )

  useEffect(() => {
    if (!nodeRef.current || mapRef.current) {
      return
    }

    const map = L.map(nodeRef.current, {
      center: DEFAULT_CENTER,
      zoom: 13,
      zoomControl: false,
    })
    mapRef.current = map

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map)

    markersRef.current = L.layerGroup().addTo(map)
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const layer = markersRef.current
    if (!map || !layer) {
      return
    }
    layer.clearLayers()

    stores.forEach((store) => {
      const marker = L.marker([store.lat, store.lng], {
        icon: store.hasStamped ? stampedIcon : unstampedIcon,
        title: store.name,
      })
      marker.bindPopup(
        `<div style="min-width:160px;">
          <strong>${store.name}</strong><br/>
          ${store.description ? `<span>${store.description}</span>` : ""}
        </div>`,
      )
      marker.addTo(layer)
    })
  }, [stores, stampedIcon, unstampedIcon])

  useEffect(() => {
    if (!navigator.geolocation) {
      return
    }
    navigator.geolocation.getCurrentPosition(
      (result) => {
        const coords = { lat: result.coords.latitude, lng: result.coords.longitude }
        setPosition(coords)

        const map = mapRef.current
        if (!map) {
          return
        }

        if (userMarkerRef.current) {
          userMarkerRef.current.setLatLng(coords)
        } else {
          userMarkerRef.current = L.marker([coords.lat, coords.lng], {
            icon: userIcon,
            title: "Current location",
          }).addTo(map)
        }
        map.setView([coords.lat, coords.lng], 15)
      },
      () => {},
      { enableHighAccuracy: true, timeout: 5000 },
    )
  }, [userIcon])

  const storesWithDistances = useMemo(() => {
    if (!position) {
      return null
    }
    return storesWithDistance(position, stores)
  }, [position, stores])

  const filteredStores = useMemo(() => {
    const base: StoreWithMaybeDistance[] = storesWithDistances
      ? storesWithDistances.map((item) => ({ store: item.store, distance: item.distance }))
      : stores.map((store) => ({ store, distance: null }))

    const filtered = base.filter(({ store }) => {
      if (filterMode === "stamped") {
        return Boolean(store.hasStamped)
      }
      if (filterMode === "unstamped") {
        return !store.hasStamped
      }
      return true
    })

    return filtered.sort((a, b) => {
      if (a.distance !== null && b.distance !== null) {
        return a.distance - b.distance
      }
      if (a.distance !== null) return -1
      if (b.distance !== null) return 1
      return a.store.name.localeCompare(b.store.name)
    })
  }, [storesWithDistances, stores, filterMode])

  const nearest = filteredStores.length > 0 ? filteredStores[0] : null

  const nearestEmptyMessage = useMemo(() => {
    if (!position) {
      return TEXT.nearestEmptyNoLocation
    }
    if (filterMode === "stamped") {
      return TEXT.nearestEmptyStamped
    }
    if (filterMode === "unstamped") {
      return TEXT.nearestEmptyUnstamped
    }
    return TEXT.nearestEmptyAll
  }, [filterMode, position])

  const listEmptyMessage =
    filterMode === "stamped"
      ? TEXT.listEmptyStamped
      : filterMode === "unstamped"
        ? TEXT.listEmptyUnstamped
        : TEXT.listEmptyAll

  const renderStatusBadge = (stamped?: boolean) =>
    stamped ? (
      <span className="inline-flex flex-shrink-0 items-center whitespace-nowrap rounded-full bg-gray-200 px-3 py-1 text-xs font-semibold text-gray-600">
        {TEXT.badgeStamped}
      </span>
    ) : (
      <span className="inline-flex flex-shrink-0 items-center whitespace-nowrap rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-600">
        {TEXT.badgeUnstamped}
      </span>
    )

  return (
    <div className="mx-auto max-w-md p-4 pb-20">
      <div className="mb-4 overflow-hidden rounded-xl border border-orange-100 bg-orange-50/80">
        <div className="h-64 w-full" ref={nodeRef} />
      </div>

      <div className="mb-6 overflow-hidden rounded-xl border border-orange-100 bg-white shadow-sm">
        <div className="bg-orange-500 px-4 py-3 text-white">
          <h2 className="text-sm font-semibold">{TEXT.nearestTitle}</h2>
        </div>
        <div className="space-y-3 px-4 py-4">
          {nearest ? (
            <div className="rounded-lg border border-orange-100 bg-orange-50/60 p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  {nearest.store.imageUrl ? (
                    <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg border border-orange-100 bg-gray-100">
                      <img
                        src={nearest.store.imageUrl}
                        alt={`${nearest.store.name} thumbnail`}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : null}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900">{nearest.store.name}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {formatDistance(nearest.distance) ?? TEXT.distanceUnknown}
                    </p>
                  </div>
                </div>
                {renderStatusBadge(nearest.store.hasStamped)}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">{nearestEmptyMessage}</p>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-orange-100 bg-white shadow-sm">
        <div className="bg-orange-500 px-4 py-3 text-white">
          <h2 className="text-sm font-semibold">{TEXT.listTitle}</h2>
        </div>
        <div className="px-4 py-4">
          <div className="mb-4 flex gap-2">
            <button
              type="button"
              className={`flex-1 rounded-full border px-3 py-2 text-sm font-semibold transition ${
                filterMode === "all"
                  ? "border-orange-500 bg-orange-500 text-white shadow"
                  : "border-gray-200 bg-white text-gray-600 hover:border-orange-300 hover:text-orange-600"
              }`}
              onClick={() => setFilterMode("all")}
            >
              {TEXT.filterAll}
            </button>
            <button
              type="button"
              className={`flex-1 rounded-full border px-3 py-2 text-sm font-semibold transition ${
                filterMode === "unstamped"
                  ? "border-orange-500 bg-orange-500 text-white shadow"
                  : "border-gray-200 bg-white text-gray-600 hover:border-orange-300 hover:text-orange-600"
              }`}
              onClick={() => setFilterMode((current) => (current === "unstamped" ? "all" : "unstamped"))}
            >
              {TEXT.filterUnstamped}
            </button>
            <button
              type="button"
              className={`flex-1 rounded-full border px-3 py-2 text-sm font-semibold transition ${
                filterMode === "stamped"
                  ? "border-orange-500 bg-orange-500 text-white shadow"
                  : "border-gray-200 bg-white text-gray-600 hover:border-orange-300 hover:text-orange-600"
              }`}
              onClick={() => setFilterMode((current) => (current === "stamped" ? "all" : "stamped"))}
            >
              {TEXT.filterStamped}
            </button>
          </div>

          <div className="space-y-3">
            {filteredStores.map(({ store, distance }) => (
              <div key={store.id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="flex min-w-0 items-center gap-3">
                  {store.imageUrl ? (
                    <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg border border-orange-100 bg-gray-100">
                      <img
                        src={store.imageUrl}
                        alt={`${store.name} thumbnail`}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : null}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900">{store.name}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {formatDistance(distance) ?? TEXT.distanceUnknown}
                    </p>
                  </div>
                </div>
                {renderStatusBadge(store.hasStamped)}
              </div>
            ))}
            {filteredStores.length === 0 && (
              <p className="text-sm text-gray-500">{listEmptyMessage}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
