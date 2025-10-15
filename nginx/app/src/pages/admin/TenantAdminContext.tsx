import { createContext, useContext } from "react"

import type { TenantAdminSession } from "../../lib/tenantAdminSession"
import type { TenantSeed } from "../../types"

export type TenantAdminContextValue = {
  tenantId: string
  session: TenantAdminSession
  seed: TenantSeed
  refreshSeed: () => Promise<TenantSeed>
}

export const TenantAdminContext = createContext<TenantAdminContextValue | null>(null)

export const useTenantAdmin = (): TenantAdminContextValue => {
  const context = useContext(TenantAdminContext)
  if (!context) {
    throw new Error("TenantAdminLayout の外ではテナント管理コンテキストを利用できません。")
  }
  return context
}
