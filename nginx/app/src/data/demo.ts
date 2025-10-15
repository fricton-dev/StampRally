import tenantTexture from "../assets/tenant-texture.svg"
import type { TenantSeed, TenantId } from "../types"

export const defaultTenantId: TenantId = "takizawa"

export const demoTenants: Record<TenantId, TenantSeed> = {
  takizawa: {
    tenant: {
      id: "takizawa",
      tenantName: "TAKIZAWA",
      rules: [
        { threshold: 3, label: "Free drink ticket", icon: "ticket" },
        { threshold: 6, label: "Special sweets set", icon: "gift" },
        { threshold: 9, label: "20% OFF voucher", icon: "trophy" },
      ],
      stampImageUrl: undefined,
      backgroundImageUrl: tenantTexture,
      themeColor: "orange",
    },
    stores: [
      {
        id: "takizawa-s1",
        tenantId: "takizawa",
        name: "Ukai Elementary School",
        lat: 39.74172,
        lng: 141.08414,
        description: "A friendly local elementary school",
        imageUrl: "https://picsum.photos/seed/takizawa-a/400/200",
      },
      {
        id: "takizawa-s2",
        tenantId: "takizawa",
        name: "Shinogi Elementary School",
        lat: 39.71539,
        lng: 141.06533,
        description: "A lively and popular school",
        imageUrl: "https://picsum.photos/seed/takizawa-b/400/200",
      },
      {
        id: "takizawa-s3",
        tenantId: "takizawa",
        name: "Tsukigaoka Elementary School",
        lat: 39.734899,
        lng: 141.103943,
        description: "Small community-oriented school",
        imageUrl: "https://picsum.photos/seed/takizawa-c/400/200",
      },
    ],
    initialProgress: {
      tenantId: "takizawa",
      stamps: 1,
      coupons: [
        {
          id: "takizawa-welcome",
          tenantId: "takizawa",
          title: "Welcome drink coupon",
          description: "Complimentary drink on your first visit",
          used: false,
        },
      ],
      stampedStoreIds: [],
    },
  },
  morioka: {
    tenant: {
      id: "morioka",
      tenantName: "MORIOKA STREET",
      rules: [
        { threshold: 2, label: "Greeting present", icon: "gift" },
        { threshold: 5, label: "10% OFF checkout", icon: "ticket" },
        { threshold: 8, label: "Anniversary present", icon: "trophy" },
      ],
      stampImageUrl: "https://picsum.photos/seed/stamp-morioka/120/120",
      backgroundImageUrl: tenantTexture,
      themeColor: "teal",
    },
    stores: [
      {
        id: "morioka-s1",
        tenantId: "morioka",
        name: "Morioka Coffee Roastery",
        lat: 39.7017,
        lng: 141.1543,
        description: "Specialty coffee and sweets",
        imageUrl: "https://picsum.photos/seed/morioka-a/400/200",
      },
      {
        id: "morioka-s2",
        tenantId: "morioka",
        name: "Zaimoku Bakery",
        lat: 39.7039,
        lng: 141.1462,
        description: "Fresh bread from early morning",
        imageUrl: "https://picsum.photos/seed/morioka-b/400/200",
      },
      {
        id: "morioka-s3",
        tenantId: "morioka",
        name: "Cross Teas & Goods",
        lat: 39.7045,
        lng: 141.1527,
        description: "Nordic-inspired lifestyle store",
        imageUrl: "https://picsum.photos/seed/morioka-c/400/200",
      },
    ],
    initialProgress: {
      tenantId: "morioka",
      stamps: 1,
      coupons: [
        {
          id: "morioka-first",
          tenantId: "morioka",
          title: "First visit coupon",
          description: "10% off one purchase",
          used: false,
        },
      ],
      stampedStoreIds: [],
    },
  },
}

export function findDemoTenant(tenantId: TenantId): TenantSeed | undefined {
  return demoTenants[tenantId]
}
