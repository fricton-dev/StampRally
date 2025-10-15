export type TenantId = string

export type ThemeColor = "orange" | "teal" | "green" | "pink"

export type Store = {
  id: string
  tenantId: TenantId
  name: string
  lat: number
  lng: number
  description?: string
  imageUrl?: string
  hasStamped?: boolean
  stampMark?: string
}

export type RewardRule = {
  threshold: number
  label: string
  icon?: string
}

export type Coupon = {
  id: string
  tenantId: TenantId
  title: string
  description?: string
  used: boolean
}

export type TenantConfig = {
  id: TenantId
  tenantName: string
  rules: RewardRule[]
  stampMark?: string
  stampImageUrl?: string
  backgroundImageUrl?: string
  campaignStart?: string
  campaignEnd?: string
  campaignDescription?: string
  themeColor?: ThemeColor
}

export type UserProgress = {
  tenantId: TenantId
  stamps: number
  coupons: Coupon[]
  stampedStoreIds?: string[]
}

export type TenantSeed = {
  tenant: TenantConfig
  stores: Store[]
  initialProgress: UserProgress
}

export type DailyMetric = {
  date: string
  count: number
}

export type CouponDailyStat = {
  couponId: string
  title: string
  description?: string | null
  acquired: DailyMetric[]
  used: DailyMetric[]
  totalAcquired: number
  totalUsed: number
}

export type TenantDashboardStats = {
  rangeStart: string
  rangeEnd: string
  days: number
  totalUsers: number
  totalStamps: number
  dailyUsers: DailyMetric[]
  dailyStamps: DailyMetric[]
  coupons: CouponDailyStat[]
}

export type UserProfile = {
  id: number
  username: string
  email: string
  role: string
  tenant_id: TenantId
  gender?: string | null
}

export type AuthToken = {
  access_token: string
  token_type: string
}

export type AuthResponse = {
  user: UserProfile
  access_token: string
  token_type: string
}

export type TenantLoginResponse = {
  tenant_id: TenantId
  company_name: string
  access_token: string
  token_type: string
  must_change_password: boolean
}

export type TenantCreateResponse = {
  tenant_id: TenantId
  company_name: string
  admin_email: string
  initial_password: string
  must_change_password: boolean
}

export type StampResult = {
  status: "stamped" | "already_stamped" | "store-not-found"
  store?: {
    id: string
    tenantId: TenantId
    name: string
  }
  stamps: number
  new_coupons: Coupon[]
  stampedStoreIds: string[]
}
