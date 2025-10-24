import type { TenantConfig } from "../types"

export const STAMP_PREFIX = "STAMP:"

export const buildStampPayload = (tenantId: string, storeId: string): string =>
  `${STAMP_PREFIX}${tenantId}:${storeId}`

export function nextThreshold(stamps: number, config: TenantConfig) {
  const upcoming = [...config.rules]
    .filter((rule) => stamps < rule.threshold)
    .sort((a, b) => a.threshold - b.threshold)[0]

  if (upcoming) {
    return { remaining: upcoming.threshold - stamps, label: upcoming.label }
  }

  const max = typeof config.maxStampCount === "number" ? config.maxStampCount : null
  if (max && max > stamps) {
    return { remaining: max - stamps, label: "\u30b3\u30f3\u30d7\u30ea\u30fc\u30c8" }
  }

  return { remaining: 0, label: "\u30b3\u30f3\u30d7\u30ea\u30fc\u30c8" }
}
