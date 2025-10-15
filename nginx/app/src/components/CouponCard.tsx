import type { Coupon } from "../types"

export default function CouponCard({ coupon, onUse }:{coupon:Coupon; onUse:()=>void}) {
  return (
  <div className={`rounded-lg p-3 bg-white/90 shadow-sm ${coupon.used?"opacity-50":""}`}>
      <div className="font-semibold">{coupon.title}</div>
      <div className="text-sm text-gray-600">{coupon.description}</div>
      <div className="mt-2">
        <button
          className="px-3 py-1 rounded bg-rose-600 text-white disabled:opacity-50"
          disabled={coupon.used}
          onClick={onUse}
        >
          {coupon.used ? "使用済み" : "使用する"}
        </button>
      </div>
    </div>
  )
}
