import { useEffect, useMemo, useRef, useState } from "react"
import * as L from "leaflet"
import "leaflet/dist/leaflet.css"

import { nearestUnstamped, storesWithDistance } from "../lib/geo"
import { useAppStore } from "../lib/store"
import type { Store } from "../types"

type SortMode = "unstamped-first" | "stamped-first"

const DEFAULT_CENTER: L.LatLngExpression = [35.681236, 139.767125]

const TEXT = {
  nearestTitle: "\u6700\u5bc4\u308a\u306e\u304a\u5e97",
  listTitle: "\u5e97\u8217\u4e00\u89a7",
  sortUnstamped: "\u672a\u9054\u6210",
  sortStamped: "\u9054\u6210\u6e08\u307f",
  badgeUnstamped: "\u672a\u9054\u6210",
  badgeStamped: "\u9054\u6210\u6e08\u307f",
  distanceUnknown: "\u8ddd\u96e2\u60c5\u5831\u306a\u3057",
  nearestEmpty:
    "\u73fe\u5728\u5730\u60c5\u5831\u304c\u53d6\u5f97\u3067\u304d\u306a\u3044\u304b\u3001\u672a\u9054\u6210\u306e\u5e97\u8217\u304c\u8fd1\u304f\u306b\u3042\u308a\u307e\u305b\u3093\u3002",
  listEmpty: "\u8868\u793a\u3067\u304d\u308b\u5e97\u8217\u304c\u3042\u308a\u307e\u305b\u3093\u3002",
} as const

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

const markerHtml = (color: string) =>
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
  "></span>`

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
  const [sortMode, setSortMode] = useState<SortMode>("unstamped-first")
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null)

  const mapRef = useRef<L.Map | null>(null)
  const nodeRef = useRef<HTMLDivElement | null>(null)
  const markersRef = useRef<L.LayerGroup | null>(null)
  const userMarkerRef = useRef<L.Marker | null>(null)

  const stampedIcon = useMemo(
    () =>
      L.divIcon({
        className: "stamped-marker",
        html: markerHtml("#9ca3af"),
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

  const nearest = useMemo(() => {
    if (!position) {
      return null
    }
    return nearestUnstamped(position, stores)
  }, [position, stores])

  const storesWithDistances = useMemo(() => {
    if (!position) {
      return null
    }
    return storesWithDistance(position, stores)
  }, [position, stores])

  const sortedStores = useMemo(() => {
    const base: StoreWithMaybeDistance[] = storesWithDistances
      ? storesWithDistances.map((item) => ({ store: item.store, distance: item.distance }))
      : stores.map((store) => ({ store, distance: null }))

    const multiplier = sortMode === "unstamped-first" ? 1 : -1

    return base.sort((a, b) => {
      const aStamped = Boolean(a.store.hasStamped)
      const bStamped = Boolean(b.store.hasStamped)
      if (aStamped !== bStamped) {
        return aStamped ? multiplier : -multiplier
      }
      if (a.distance !== null && b.distance !== null) {
        return a.distance - b.distance
      }
      if (a.distance !== null) return -1
      if (b.distance !== null) return 1
      return a.store.name.localeCompare(b.store.name)
    })
  }, [storesWithDistances, stores, sortMode])

  const renderStatusBadge = (stamped?: boolean) =>
    stamped ? (
      <span className="inline-flex items-center rounded-full bg-gray-200 px-3 py-1 text-xs font-semibold text-gray-600">
        {TEXT.badgeStamped}
      </span>
    ) : (
      <span className="inline-flex items-center rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-600">
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
            <p className="text-sm text-gray-500">{TEXT.nearestEmpty}</p>
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
                sortMode === "unstamped-first"
                  ? "border-orange-500 bg-orange-500 text-white shadow"
                  : "border-gray-200 bg-white text-gray-600 hover:border-orange-300 hover:text-orange-600"
              }`}
              onClick={() => setSortMode("unstamped-first")}
            >
              {TEXT.sortUnstamped}
            </button>
            <button
              type="button"
              className={`flex-1 rounded-full border px-3 py-2 text-sm font-semibold transition ${
                sortMode === "stamped-first"
                  ? "border-orange-500 bg-orange-500 text-white shadow"
                  : "border-gray-200 bg-white text-gray-600 hover:border-orange-300 hover:text-orange-600"
              }`}
              onClick={() => setSortMode("stamped-first")}
            >
              {TEXT.sortStamped}
            </button>
          </div>

          <div className="space-y-3">
            {sortedStores.map(({ store, distance }) => (
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
            {sortedStores.length === 0 && (
              <p className="text-sm text-gray-500">{TEXT.listEmpty}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
