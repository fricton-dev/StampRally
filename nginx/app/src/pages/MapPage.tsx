import { useEffect, useRef, useState } from "react"
import * as L from "leaflet"
import "leaflet/dist/leaflet.css"
import { useAppStore } from "../lib/store"
// StoreCard import removed - rendering inline cards here
import { nearestUnstamped, storesWithDistance } from "../lib/geo"

const formatDistance = (meters: number) => {
  if (meters >= 1000) {
    const km = meters / 1000
    const display = km >= 10 ? km.toFixed(0) : km.toFixed(1)
    return `${display.replace(/\.0$/, "")}km`
  }
  return `${Math.round(meters)}m`
}

export default function MapPage() {
  const stores = useAppStore(state => state.stores)
  const mapRef = useRef<L.Map | null>(null)
  const nodeRef = useRef<HTMLDivElement | null>(null)
  const [pos, setPos] = useState<{lat:number; lng:number} | null>(null)
  const nearest = pos ? nearestUnstamped(pos, stores) : null
  const storesWithDist = pos ? storesWithDistance(pos, stores) : null

  useEffect(() => {
    if (!nodeRef.current || mapRef.current) return
    const map = L.map(nodeRef.current).setView([35.681, 139.767], 12) // 東京駅あたり
    mapRef.current = map
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map)

    stores.forEach(s => {
      const marker = L.marker([s.lat, s.lng]).addTo(map)
      marker.bindPopup(`<b>${s.name}</b><br/>${s.description}`)
    })

    // 現在地（許可があれば）
    if (navigator.geolocation) { // [JS] 組み込み
      navigator.geolocation.getCurrentPosition(
        (p) => {
          const here = { lat: p.coords.latitude, lng: p.coords.longitude }
          setPos(here)
          L.marker([here.lat, here.lng], { title: "現在地" }).addTo(map)
          map.setView([here.lat, here.lng], 14)
        },
        () => {}
      )
    }
  }, [stores])

  return (
    <div className="pb-16 max-w-md mx-auto p-4">
      {/* Map section */}
      <div className="rounded-lg overflow-hidden mb-3">
        <div className="p-2 bg-orange-50/90 border border-orange-100">
          <div ref={nodeRef} className="h-56 rounded overflow-hidden mb-2 z-0" />
        </div>
      </div>

      {/* Nearest store section */}
      <div className="rounded-lg overflow-hidden mb-4">
        <div className="bg-orange-500 text-white px-4 py-3">
          <h3 className="text-sm font-semibold">最寄りのお店</h3>
        </div>
        <div className="p-3 bg-orange-50/90 border border-orange-100">
          {nearest ? (
            <div className="mb-3 p-3 bg-white rounded-lg shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {nearest.store.imageUrl && (
                    <div className="w-14 h-14 rounded overflow-hidden flex-shrink-0">
                      <img src={nearest.store.imageUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                    <div>
                      <div className="font-semibold text-gray-900">{nearest.store.name}</div>
                      <div className="text-xs text-gray-400 mt-1">{formatDistance(nearest.distance)}</div>
                    </div>
                </div>
                <div>
                  {nearest.store.hasStamped ? (
                    <div className="inline-flex items-center gap-2 text-xs px-3 py-1 bg-emerald-500 text-white rounded-full">達成</div>
                  ) : (
                    <div className="inline-flex items-center gap-2 text-xs px-3 py-1 bg-gray-100 text-gray-600 rounded-full">未達成</div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-3 text-sm text-gray-500">現在地情報が許可されていないか、近くに未達成の店舗がありません。</div>
          )}
        </div>
      </div>

      {/* Stores list section */}
      <div className="rounded-lg overflow-hidden">
        <div className="bg-orange-500 text-white px-4 py-3">
          <h3 className="text-sm font-semibold">店舗一覧</h3>
        </div>
        <div className="p-3 bg-orange-50/90 border border-orange-100">
            <div className="space-y-3">
            {storesWithDist ? (
              storesWithDist.map(({store, distance}) => (
                <div key={store.id} className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm">
                  <div className="flex items-center gap-3">
                    {store.imageUrl && (
                      <div className="w-14 h-14 rounded overflow-hidden flex-shrink-0">
                        <img src={store.imageUrl} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div>
                      <div className="font-semibold text-gray-900">{store.name}</div>
                      <div className="text-xs text-gray-400 mt-1">{formatDistance(distance)}</div>
                    </div>
                  </div>
                  <div>
                    {store.hasStamped ? (
                      <div className="inline-flex items-center gap-2 text-xs px-3 py-1 bg-emerald-500 text-white rounded-full">達成</div>
                    ) : (
                      <div className="inline-flex items-center gap-2 text-xs px-3 py-1 bg-gray-100 text-gray-600 rounded-full">未達成</div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              stores.map(s => (
                <div key={s.id} className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm">
                  <div className="flex items-center gap-3">
                    {s.imageUrl && (
                      <div className="w-14 h-14 rounded overflow-hidden flex-shrink-0">
                        <img src={s.imageUrl} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div>
                      <div className="font-semibold text-gray-900">{s.name}</div>
                    </div>
                  </div>
                  <div>
                    {s.hasStamped ? (
                      <div className="inline-flex items-center gap-2 text-xs px-3 py-1 bg-emerald-500 text-white rounded-full">達成</div>
                    ) : (
                      <div className="inline-flex items-center gap-2 text-xs px-3 py-1 bg-gray-100 text-gray-600 rounded-full">未達成</div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

    </div>
  )
}
