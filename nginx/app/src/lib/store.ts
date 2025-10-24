import { create } from "zustand"

import { DEFAULT_TENANT_ID } from "./config"
import type { Coupon, Store, TenantConfig, TenantId, TenantSeed, UserProgress } from "../types"

type AppState = {
  tenantId: TenantId
  tenant: TenantConfig
  stores: Store[]
  progress: UserProgress
  recentRewardCoupons: Coupon[]
  lastSeed: TenantSeed | null
  setTenantSeed: (seed: TenantSeed) => void
  setProgress: (progress: UserProgress) => void
  applyStampResult: (payload: {
    stamps: number
    newCoupons: Coupon[]
    stampedStoreIds: string[]
  }) => void
  markCouponUsed: (id: string) => void
  clearRecentRewardCoupons: () => void
  resetProgressToSeed: () => void
}

const cloneStores = (stores: Store[]): Store[] =>
  stores.map((store) => ({ ...store }))

const cloneTenant = (tenant: TenantConfig): TenantConfig => ({
  ...tenant,
  rules: tenant.rules.map((rule) => ({ ...rule })),
})

const cloneProgress = (progress: UserProgress): UserProgress => ({
  tenantId: progress.tenantId,
  stamps: progress.stamps,
  coupons: progress.coupons.map((coupon) => ({ ...coupon })),
  stampedStoreIds: progress.stampedStoreIds ? [...progress.stampedStoreIds] : [],
})

const applyStampedFlags = (stores: Store[], stampedIds: string[] = []) => {
  const stampedSet = new Set(stampedIds)
  return stores.map((store) => ({
    ...store,
    hasStamped: stampedSet.has(store.id),
  }))
}

const emptySeed: TenantSeed = {
  tenant: {
    id: DEFAULT_TENANT_ID,
    tenantName: "Loading",
    rules: [],
    themeColor: "orange",
    maxStampCount: null,
  },
  stores: [],
  initialProgress: {
    tenantId: DEFAULT_TENANT_ID,
    stamps: 0,
    coupons: [],
    stampedStoreIds: [],
  },
}

const seedToState = (seed: TenantSeed) => {
  const tenantSnapshot = cloneTenant(seed.tenant)
  const storesSnapshot = cloneStores(seed.stores)
  const progressSnapshot = cloneProgress(seed.initialProgress)
  const stampedIds = progressSnapshot.stampedStoreIds ?? []
  return {
    tenantId: tenantSnapshot.id,
    tenant: tenantSnapshot,
    stores: applyStampedFlags(storesSnapshot, stampedIds),
    progress: progressSnapshot,
    lastSeed: {
      tenant: cloneTenant(seed.tenant),
      stores: cloneStores(seed.stores),
      initialProgress: cloneProgress(seed.initialProgress),
    },
  }
}

const mergeCoupons = (existing: Coupon[], additions: Coupon[]): Coupon[] => {
  if (additions.length === 0) return existing
  const existingIds = new Set(existing.map((coupon) => coupon.id))
  const merged = [...existing]
  additions.forEach((coupon) => {
    if (!existingIds.has(coupon.id)) {
      merged.push({ ...coupon })
      existingIds.add(coupon.id)
    }
  })
  return merged
}

export const useAppStore = create<AppState>((set) => ({
  ...seedToState(emptySeed),
  recentRewardCoupons: [],

  setTenantSeed: (seed) => {
    const partial = seedToState(seed)
    set({
      ...partial,
      recentRewardCoupons: [],
    })
  },

  setProgress: (progress) =>
    set((state) => {
      const progressClone = cloneProgress(progress)
      const stampedIds = progressClone.stampedStoreIds ?? []
      return {
        progress: progressClone,
        stores: applyStampedFlags(cloneStores(state.stores), stampedIds),
        recentRewardCoupons: [],
      }
    }),

  applyStampResult: ({ stamps, newCoupons, stampedStoreIds }) =>
    set((state) => {
      const nextCoupons = mergeCoupons(state.progress.coupons, newCoupons)
      const progress: UserProgress = {
        tenantId: state.progress.tenantId,
        stamps,
        coupons: nextCoupons,
        stampedStoreIds,
      }
      const recent =
        newCoupons.length > 0
          ? [...state.recentRewardCoupons, ...newCoupons]
          : state.recentRewardCoupons
      return {
        progress,
        stores: applyStampedFlags(cloneStores(state.stores), stampedStoreIds),
        recentRewardCoupons: recent,
      }
    }),

  markCouponUsed: (id) =>
    set((state) => ({
      progress: {
        ...state.progress,
        coupons: state.progress.coupons.map((coupon) =>
          coupon.id === id ? { ...coupon, used: true } : coupon
        ),
      },
    })),

  clearRecentRewardCoupons: () => set({ recentRewardCoupons: [] }),

  resetProgressToSeed: () =>
    set((state) => {
      if (!state.lastSeed) {
        const fallbackProgress: UserProgress = {
          tenantId: state.tenantId,
          stamps: 0,
          coupons: [],
          stampedStoreIds: [],
        }
        return {
          progress: fallbackProgress,
          stores: applyStampedFlags(cloneStores(state.stores), []),
          recentRewardCoupons: [],
        }
      }
      const { tenant, stores, initialProgress } = state.lastSeed
      const tenantSnapshot = cloneTenant(tenant)
      const storesSnapshot = cloneStores(stores)
      const progressSnapshot = cloneProgress(initialProgress)
      const stampedIds = progressSnapshot.stampedStoreIds ?? []
      return {
        tenantId: tenantSnapshot.id,
        tenant: tenantSnapshot,
        stores: applyStampedFlags(storesSnapshot, stampedIds),
        progress: progressSnapshot,
        recentRewardCoupons: [],
      }
    }),
}))

export const useTenantId = () => useAppStore((state) => state.tenantId)
