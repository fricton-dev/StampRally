import type { Store } from "../types"

const EARTH_RADIUS_METERS = 6_371_000

const toRad = (value: number) => (value * Math.PI) / 180

export function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h))
}

export function nearestUnstamped(current: { lat: number; lng: number }, stores: Store[]) {
  const list = stores.filter((store) => !store.hasStamped)
  if (list.length === 0) {
    return null
  }
  const [nearest] = list
    .map((store) => ({
      store,
      distance: distanceMeters(current, { lat: store.lat, lng: store.lng }),
    }))
    .sort((a, b) => a.distance - b.distance)
  return nearest ? { store: nearest.store, distance: nearest.distance } : null
}

export function storesWithDistance(current: { lat: number; lng: number }, stores: Store[]) {
  return stores.map((store) => ({
    store,
    distance: distanceMeters(current, { lat: store.lat, lng: store.lng }),
  }))
}

export type GeocodeCandidate = {
  lat: number
  lng: number
  displayName: string
}

const GSI_ADDRESS_ENDPOINT = "https://msearch.gsi.go.jp/address-search/AddressSearch"

type GsiFeature = {
  geometry?: { coordinates?: unknown }
  properties?: { title?: unknown }
}

const ERROR_MESSAGES = {
  network: "\u4f4d\u7f6e\u60c5\u5831\u30b5\u30fc\u30d3\u30b9\u306b\u63a5\u7d9a\u3067\u304d\u307e\u305b\u3093\u3067\u3057\u305f\u3002",
  lookup: "\u7def\u5ea6\u30fb\u7d4c\u5ea6\u306e\u53d6\u5f97\u306b\u5931\u6557\u3057\u307e\u3057\u305f\u3002",
  malformed: "\u4f4d\u7f6e\u60c5\u5831\u30b5\u30fc\u30d3\u30b9\u306e\u5fdc\u7b54\u5f62\u5f0f\u304c\u4e0d\u6b63\u3067\u3059\u3002",
} as const

export async function geocodeAddress(query: string, options?: { limit?: number }): Promise<GeocodeCandidate[]> {
  const trimmed = query.trim()
  if (!trimmed) {
    return []
  }

  const params = new URLSearchParams({ q: trimmed })
  const requestUrl = `${GSI_ADDRESS_ENDPOINT}?${params.toString()}`

  let response: Response
  try {
    response = await fetch(requestUrl, {
      headers: { Accept: "application/json" },
    })
  } catch {
    throw new Error(ERROR_MESSAGES.network)
  }

  if (!response.ok) {
    throw new Error(ERROR_MESSAGES.lookup)
  }

  const payload = (await response.json()) as unknown
  if (!Array.isArray(payload)) {
    throw new Error(ERROR_MESSAGES.malformed)
  }

  const results: GeocodeCandidate[] = []
  for (const item of payload as GsiFeature[]) {
    if (!item || typeof item !== "object") {
      continue
    }
    const coords = Array.isArray(item.geometry?.coordinates) ? item.geometry.coordinates : null
    const title = item.properties?.title
    if (!coords || coords.length < 2 || typeof title !== "string") {
      continue
    }
    const lng = Number(coords[0])
    const lat = Number(coords[1])
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      continue
    }
    results.push({
      lat,
      lng,
      displayName: title,
    })
  }

  const limit = options?.limit
  if (typeof limit === "number" && Number.isFinite(limit) && limit > 0) {
    return results.slice(0, Math.floor(limit))
  }
  return results
}
