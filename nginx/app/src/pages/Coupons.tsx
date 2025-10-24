import { useState } from "react"

import CouponIcon from "../components/CouponIcon"
import { useAppStore } from "../lib/store"
import { useAuthStore } from "../lib/authStore"
import { markCouponUsed as markCouponUsedApi } from "../lib/api"

export default function Coupons() {
  const progress = useAppStore((state) => state.progress)
  const markCouponUsed = useAppStore((state) => state.markCouponUsed)
  const token = useAuthStore((state) => state.token)

  const [message, setMessage] = useState<string | null>(null)

  const availableCoupons = progress.coupons.filter((coupon) => !coupon.used)
  const usedCoupons = progress.coupons.filter((coupon) => coupon.used)

  const confirmUse = async (id: string) => {
    if (!token) {
      setMessage("クーポンを利用するにはログインが必要です。")
      return
    }
    const confirmed = window.confirm("この操作は取り消せません。クーポンを使用しますか？")
    if (!confirmed) {
      return
    }
    try {
      await markCouponUsedApi(token, id)
      markCouponUsed(id)
      setMessage("クーポンを使用済みにしました。")
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "クーポンの更新に失敗しました。"
      setMessage(errorMessage)
    }
  }

  return (
    <div className="max-w-md mx-auto p-4 pb-16 space-y-4">
      {message && (
        <div className="rounded-md bg-orange-50 px-3 py-2 text-xs text-orange-700">{message}</div>
      )}
      <section className="overflow-hidden rounded-lg border border-orange-100 bg-white/90">
        <div className="bg-orange-500 px-4 py-3 text-white">
          <h4 className="text-sm font-semibold">使用可能クーポン</h4>
        </div>
        <div className="space-y-3 border-t border-orange-100 bg-orange-50/90 p-3">
          {availableCoupons.length === 0 ? (
            <div className="text-sm text-gray-500">使用できるクーポンはまだありません。</div>
          ) : (
            availableCoupons.map((coupon) => (
              <div key={coupon.id} className="flex items-center justify-between gap-3 rounded-lg bg-white p-3 shadow-sm">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg border border-orange-100 bg-orange-50">
                    <CouponIcon icon={coupon.icon} className="h-7 w-7 text-orange-500" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900">{coupon.title}</div>
                    {coupon.description && (
                      <div className="text-xs text-gray-500">{coupon.description}</div>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  className="flex-shrink-0 rounded bg-rose-500 px-3 py-1 text-xs font-semibold text-white shadow hover:bg-rose-600"
                  onClick={() => confirmUse(coupon.id)}
                >
                  使用する
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-gray-200 bg-white/90">
        <div className="bg-gray-100 px-4 py-3 text-gray-800">
          <h4 className="text-sm font-semibold">使用済みクーポン</h4>
        </div>
        <div className="space-y-3 border-t border-gray-200 bg-orange-50/90 p-3">
          {usedCoupons.length === 0 ? (
            <div className="text-sm text-gray-500">使用済みのクーポンはありません。</div>
          ) : (
            usedCoupons.map((coupon) => (
              <div
                key={coupon.id}
                className="flex items-center justify-between gap-3 rounded-lg bg-white p-3 text-sm text-gray-600 shadow-sm opacity-70"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-gray-50">
                    <CouponIcon icon={coupon.icon} className="h-7 w-7 text-gray-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900">{coupon.title}</div>
                    {coupon.description && (
                      <div className="text-xs text-gray-500">{coupon.description}</div>
                    )}
                  </div>
                </div>
                <div className="flex-shrink-0 text-xs text-gray-500">使用済み</div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}
