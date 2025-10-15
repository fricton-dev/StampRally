import { useRef, useState } from "react"
import type { FormEvent } from "react"
import { useNavigate } from "react-router-dom"

import QRScanner from "../components/QRScanner"
import { useAppStore, useTenantId } from "../lib/store"
import { recordStamp } from "../lib/api"
import { useAuthStore } from "../lib/authStore"

const STAMP_PREFIX = "STAMP:"

type StatusMessage = {
  type: "success" | "error" | "info"
  text: string
}

export default function Scan() {
  const tenantId = useTenantId()
  const applyStampResult = useAppStore((state) => state.applyStampResult)
  const token = useAuthStore((state) => state.token)

  const lastScanRef = useRef<string | null>(null)
  const [status, setStatus] = useState<StatusMessage | null>(null)
  const [manualText, setManualText] = useState("")
  const navigate = useNavigate()

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
      showStatus("error", "QRコードの形式が正しくありません。")
      return
    }

    const payload = text.slice(STAMP_PREFIX.length).trim()
    if (payload.length === 0) {
      showStatus("error", "QRコードの形式が正しくありません。")
      return
    }

    const parts = payload.split(":").map((part) => part.trim()).filter(Boolean)
    if (parts.length === 0) {
      showStatus("error", "QRコードの形式が正しくありません。")
      return
    }

    const scannedTenantId = parts.length === 1 ? tenantId : parts[0]
    const storeId = parts.length === 1 ? parts[0] : parts.slice(1).join(":")

    if (scannedTenantId !== tenantId) {
      showStatus("error", "別のテナントのQRコードです。")
      return
    }

    if (!token) {
      showStatus("error", "スタンプを押すにはログインが必要です。")
      return
    }

    try {
      const result = await recordStamp(token, storeId)

      if (result.status === "store-not-found") {
        showStatus("error", `対象のスポットが見つかりません: ${storeId}`)
        return
      }

      applyStampResult({
        stamps: result.stamps,
        newCoupons: result.new_coupons ?? [],
        stampedStoreIds: result.stampedStoreIds ?? [],
      })

      if (result.status === "already_stamped") {
        showStatus("info", "このスポットはすでにスタンプ済みです。")
        return
      }

      const storeName = result.store?.name ?? storeId
      const successMessage = `${storeName} のスタンプを獲得しました！`
      showStatus("success", successMessage)
      window.alert(successMessage)
      navigate(`/tenant/${tenantId}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : "スタンプ処理に失敗しました。"
      showStatus("error", message)
    }
  }

  const handleManualSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const text = manualText.trim()
    if (!text) {
      return
    }

    // Reset guard so manual entry can re-run the same value
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

  return (
    <div className="max-w-md mx-auto p-4 pb-16">
      <div className="mb-4 overflow-hidden rounded-lg">
        <div className="bg-orange-500 px-4 py-3 text-white">
          <h2 className="text-sm font-semibold">QR スキャン</h2>
        </div>
        <div className="border border-orange-100 bg-orange-50/90 p-4">
          <QRScanner onText={onText} />
          <form className="mt-4 flex flex-col gap-2 sm:flex-row" onSubmit={handleManualSubmit}>
            <input
              aria-label="QRコード文字列の手入力"
              autoComplete="off"
              className="w-full rounded border border-orange-200 bg-white px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400"
              onChange={(event) => setManualText(event.target.value)}
              placeholder="例: STAMP:tenant-id:store-id"
              value={manualText}
            />
            <button
              className="w-full rounded bg-orange-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-orange-600 sm:w-auto"
              type="submit"
            >
              手入力でスタンプ
            </button>
          </form>
          {status && <div className={`mt-3 text-sm font-medium ${statusStyle}`}>{status.text}</div>}
        </div>
      </div>
      <p className="text-xs text-gray-500">※ カメラへのアクセス許可が必要です。</p>
    </div>
  )
}





