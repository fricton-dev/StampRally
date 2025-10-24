import { useEffect, useRef, useState } from "react"
import type { FormEvent } from "react"

import QRScanner from "../components/QRScanner"
import StampSuccessModal from "../components/StampSuccessModal"
import CouponIcon from "../components/CouponIcon"
import { XMarkIcon } from "@heroicons/react/24/solid"
import { recordStamp } from "../lib/api"
import { useAuthStore } from "../lib/authStore"
import { useAppStore, useTenantId } from "../lib/store"
import { STAMP_PREFIX } from "../lib/stamps"

const STRINGS = {
  invalidQr: "QR\u30b3\u30fc\u30c9\u306e\u5f62\u5f0f\u304c\u6b63\u3057\u304f\u3042\u308a\u307e\u305b\u3093\u3002",
  wrongTenant: "\u5225\u306e\u30c6\u30ca\u30f3\u30c8\u306eQR\u30b3\u30fc\u30c9\u3067\u3059\u3002",
  loginRequired: "\u30b9\u30bf\u30f3\u30d7\u3092\u62bc\u3059\u306b\u306f\u30ed\u30b0\u30a4\u30f3\u304c\u5fc5\u8981\u3067\u3059\u3002",
  spotNotFoundPrefix: "\u5bfe\u8c61\u306e\u30b9\u30dd\u30c3\u30c8\u304c\u898b\u3064\u304b\u308a\u307e\u305b\u3093:\u0020",
  alreadyStamped: "\u3053\u306e\u30b9\u30dd\u30c3\u30c8\u306f\u3059\u3067\u306b\u30b9\u30bf\u30f3\u30d7\u6e08\u307f\u3067\u3059\u3002",
  successSuffix: "\u0020\u306e\u30b9\u30bf\u30f3\u30d7\u3092\u7372\u5f97\u3057\u307e\u3057\u305f\uff01",
  processFailed: "\u30b9\u30bf\u30f3\u30d7\u306e\u51e6\u7406\u306b\u5931\u6557\u3057\u307e\u3057\u305f\u3002",
  manualAria: "QR\u30b3\u30fc\u30c9\u6587\u5b57\u5217\u306e\u624b\u5165\u529b",
  manualPlaceholder:
    "\u4f8b:\u0020STAMP:\u0074\u0065\u006e\u0061\u006e\u0074\u002d\u0069\u0064:\u0073\u0074\u006f\u0072\u0065\u002d\u0069\u0064",
  manualButton: "\u624b\u5165\u529b\u3067\u30b9\u30bf\u30f3\u30d7",
  cameraNote: "\u203b\u0020\u30ab\u30e1\u30e9\u3078\u306e\u30a2\u30af\u30bb\u30b9\u8a31\u53ef\u304c\u5fc5\u8981\u3067\u3059\u3002",
  headerTitle: "QR スキャン",
} as const

type StatusMessage = {
  type: "success" | "error" | "info"
  text: string
}

type SuccessState = {
  storeId: string
  storeName: string
  storeImageUrl?: string
}

export default function Scan() {
  const tenantId = useTenantId()
  const tenant = useAppStore((state) => state.tenant)
  const stores = useAppStore((state) => state.stores)
  const applyStampResult = useAppStore((state) => state.applyStampResult)
  const recentRewardCoupons = useAppStore((state) => state.recentRewardCoupons)
  const clearRecentRewardCoupons = useAppStore((state) => state.clearRecentRewardCoupons)
  const token = useAuthStore((state) => state.token)

  const lastScanRef = useRef<string | null>(null)
  const [status, setStatus] = useState<StatusMessage | null>(null)
  const [manualText, setManualText] = useState("")
  const [successState, setSuccessState] = useState<SuccessState | null>(null)
  const [showCouponModal, setShowCouponModal] = useState(false)

  const showStatus = (type: StatusMessage["type"], text: string) => {
    setStatus({ type, text })
  }

  const onText = async (rawText: string) => {
    const text = rawText.trim()
    if (text.length === 0 || lastScanRef.current === text) {
      return
    }
    lastScanRef.current = text

    if (!text.startsWith(STAMP_PREFIX)) {
      showStatus("error", STRINGS.invalidQr)
      return
    }

    const payload = text.slice(STAMP_PREFIX.length).trim()
    if (payload.length === 0) {
      showStatus("error", STRINGS.invalidQr)
      return
    }

    const parts = payload
      .split(":")
      .map((part) => part.trim())
      .filter(Boolean)

    if (parts.length === 0) {
      showStatus("error", STRINGS.invalidQr)
      return
    }

    const scannedTenantId = parts.length === 1 ? tenantId : parts[0]
    const storeId = parts.length === 1 ? parts[0] : parts.slice(1).join(":")

    if (scannedTenantId !== tenantId) {
      showStatus("error", STRINGS.wrongTenant)
      return
    }

    if (!token) {
      showStatus("error", STRINGS.loginRequired)
      return
    }

    try {
      const result = await recordStamp(token, storeId)

      if (result.status === "store-not-found") {
        showStatus("error", `${STRINGS.spotNotFoundPrefix}${storeId}`)
        return
      }

      applyStampResult({
        stamps: result.stamps,
        newCoupons: result.new_coupons ?? [],
        stampedStoreIds: result.stampedStoreIds ?? [],
      })

      if (result.status === "already_stamped") {
        showStatus("info", STRINGS.alreadyStamped)
        return
      }

      const matchedStore = stores.find((store) => store.id === storeId)
      const storeName = result.store?.name ?? matchedStore?.name ?? storeId

      const successMessage = `${storeName}${STRINGS.successSuffix}`
      showStatus("success", successMessage)
      setSuccessState({
        storeId,
        storeName,
        storeImageUrl: matchedStore?.imageUrl,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : STRINGS.processFailed
      showStatus("error", message)
    }
  }

  const handleManualSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const text = manualText.trim()
    if (!text) {
      return
    }

    lastScanRef.current = null
    await onText(text)
    setManualText("")
  }

  const statusStyle =
    status?.type === "error"
      ? "text-red-600"
      : status?.type === "info"
        ? "text-orange-600"
        : "text-emerald-600"

  useEffect(() => {
    if (!successState && recentRewardCoupons.length > 0) {
      setShowCouponModal(true)
    }
  }, [recentRewardCoupons, successState])

  const handleCloseSuccess = () => {
    lastScanRef.current = null
    setSuccessState(null)
    if (recentRewardCoupons.length > 0) {
      setShowCouponModal(true)
    }
  }

  const handleCloseCouponModal = () => {
    setShowCouponModal(false)
    clearRecentRewardCoupons()
  }

  return (
    <div className="mx-auto max-w-md p-4 pb-16">
      <div className="mb-4 overflow-hidden rounded-lg">
        <div className="bg-orange-500 px-4 py-3 text-white">
          <h2 className="text-sm font-semibold">{STRINGS.headerTitle}</h2>
        </div>
        <div className="border border-orange-100 bg-orange-50/90 p-4">
          <QRScanner onText={onText} />
          <form className="mt-4 flex flex-col gap-2 sm:flex-row" onSubmit={handleManualSubmit}>
            <input
              aria-label={STRINGS.manualAria}
              autoComplete="off"
              className="w-full rounded border border-orange-200 bg-white px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400"
              onChange={(event) => setManualText(event.target.value)}
              placeholder={STRINGS.manualPlaceholder}
              value={manualText}
            />
            <button
              className="w-full rounded bg-orange-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-orange-600 sm:w-auto"
              type="submit"
            >
              {STRINGS.manualButton}
            </button>
          </form>
          {status && <div className={`mt-3 text-sm font-medium ${statusStyle}`}>{status.text}</div>}
        </div>
      </div>
      <p className="text-xs text-gray-500">{STRINGS.cameraNote}</p>

      <StampSuccessModal
        open={Boolean(successState)}
        storeName={successState?.storeName ?? ""}
        storeImageUrl={successState?.storeImageUrl}
        stampImageUrl={tenant.stampImageUrl ?? undefined}
        stampFallbackText={tenant.stampMark ?? undefined}
        onClose={handleCloseSuccess}
      />

      {showCouponModal && recentRewardCoupons.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={handleCloseCouponModal} />
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <button
              type="button"
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
              onClick={handleCloseCouponModal}
              aria-label="閉じる"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
            <h3 className="text-lg font-bold text-gray-900">新しいクーポンを獲得しました！</h3>
            <p className="mt-1 text-sm text-gray-600">クーポン一覧で詳細を確認しましょう。</p>
            <div className="mt-4 max-h-60 space-y-3 overflow-y-auto pr-1">
              {recentRewardCoupons.map((coupon) => (
                <div
                  key={coupon.id}
                  className="flex items-center gap-3 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2"
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-orange-100 bg-white">
                    <CouponIcon icon={coupon.icon} className="h-6 w-6 text-orange-500" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-orange-700">{coupon.title}</div>
                    {coupon.description ? (
                      <div className="mt-1 text-xs text-orange-600">{coupon.description}</div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={handleCloseCouponModal}
              className="mt-6 w-full rounded-xl bg-orange-500 py-2 text-sm font-semibold text-white shadow hover:bg-orange-600"
            >
              続けてスタンプする
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
