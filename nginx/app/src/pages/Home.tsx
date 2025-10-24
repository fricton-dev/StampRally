import { useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { TicketIcon, GiftIcon, TrophyIcon, XMarkIcon } from "@heroicons/react/24/solid"

import defaultStampImage from "../assets/stamp.png"
import CouponIcon from "../components/CouponIcon"
import { nextThreshold } from "../lib/stamps"
import { useAppStore, useTenantId } from "../lib/store"

const clampPercentage = (value: number) => Math.max(0, Math.min(100, value))
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
const ANIMATION_DURATION = 600
const MAX_STAMP_SLOTS_RENDERED = 200

const ICON_MAP: Record<string, typeof TicketIcon | null> = {
  ticket: TicketIcon,
  gift: GiftIcon,
  trophy: TrophyIcon,
}

export default function Home() {
  const tenantId = useTenantId()
  const progress = useAppStore((state) => state.progress)
  const tenant = useAppStore((state) => state.tenant)
  const recentRewardCoupons = useAppStore((state) => state.recentRewardCoupons)
  const clearRecentRewardCoupons = useAppStore((state) => state.clearRecentRewardCoupons)
  const stampImg = tenant.stampImageUrl ?? defaultStampImage

  const sortedRules = useMemo(() => [...tenant.rules].sort((a, b) => a.threshold - b.threshold), [tenant.rules])

  const { maxStamps, progressPct } = useMemo(() => {
    const configured = typeof tenant.maxStampCount === "number" ? tenant.maxStampCount : null
    const highestRule = sortedRules.length > 0 ? sortedRules[sortedRules.length - 1].threshold : 0
    const base = Math.max(progress.stamps, highestRule, configured ?? 0)
    const safeMax = Math.max(1, Math.round(base))
    const pct = Math.min(100, (progress.stamps / safeMax) * 100)
    return { maxStamps: safeMax, progressPct: pct }
  }, [progress.stamps, sortedRules, tenant.maxStampCount])

  const markers = useMemo(() => {
    if (maxStamps <= 0) return []
    return sortedRules
      .filter((rule) => rule.threshold > 0 && rule.threshold <= maxStamps)
      .map((rule) => ({
        threshold: rule.threshold,
        label: rule.label,
        position: Math.min(100, (rule.threshold / maxStamps) * 100),
        reached: progress.stamps >= rule.threshold,
      }))
  }, [sortedRules, maxStamps, progress.stamps])

  const nxt = useMemo(() => nextThreshold(progress.stamps, tenant), [progress.stamps, tenant])

  const animationFrameRef = useRef<number | null>(null)
  const previousValuesRef = useRef({ stamps: progress.stamps, pct: progressPct })
  const [displayedStamps, setDisplayedStamps] = useState(progress.stamps)
  const [displayedPct, setDisplayedPct] = useState(progressPct)
  const [showRewardModal, setShowRewardModal] = useState(false)
  const [showStampBook, setShowStampBook] = useState(false)

  useEffect(() => {
    previousValuesRef.current = { stamps: progress.stamps, pct: progressPct }
    setDisplayedStamps(progress.stamps)
    setDisplayedPct(progressPct)
  }, [])

  useEffect(() => {
    const startValues = previousValuesRef.current
    const targetValues = { stamps: progress.stamps, pct: progressPct }
    previousValuesRef.current = targetValues

    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    if (startValues.stamps === targetValues.stamps && startValues.pct === targetValues.pct) {
      setDisplayedStamps(targetValues.stamps)
      setDisplayedPct(targetValues.pct)
      return
    }

    const startTime = performance.now()

    const step = (now: number) => {
      const elapsed = now - startTime
      const ratio = Math.min(1, elapsed / ANIMATION_DURATION)
      const eased = easeOutCubic(ratio)
      const nextStamps = Math.round(startValues.stamps + (targetValues.stamps - startValues.stamps) * eased)
      const nextPct = startValues.pct + (targetValues.pct - startValues.pct) * eased
      setDisplayedStamps(nextStamps)
      setDisplayedPct(nextPct)
      if (ratio < 1) {
        animationFrameRef.current = requestAnimationFrame(step)
      }
    }

    setDisplayedStamps(startValues.stamps)
    setDisplayedPct(startValues.pct)
    animationFrameRef.current = requestAnimationFrame(step)

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
    }
  }, [progress.stamps, progressPct])

  useEffect(() => {
    if (recentRewardCoupons.length > 0) {
      setShowRewardModal(true)
    }
  }, [recentRewardCoupons])

  const handleCloseRewardModal = () => {
    setShowRewardModal(false)
    clearRecentRewardCoupons()
  }

  const progressPercentage = clampPercentage(displayedPct)
  const maxRenderableSlots = Math.min(maxStamps, MAX_STAMP_SLOTS_RENDERED)
  const stampSlots = useMemo(
    () => Array.from({ length: maxRenderableSlots }, (_, index) => index + 1),
    [maxRenderableSlots],
  )
  const stampBookTruncated = maxStamps > MAX_STAMP_SLOTS_RENDERED

  return (
    <div className="mx-auto max-w-md p-4 pb-16">
      <section className="mb-4 rounded-xl bg-white/80 p-4 shadow-sm">
        <div className="text-sm text-gray-600">現在のスタンプ数</div>
        <div className="mt-1 flex items-center gap-3 text-4xl font-extrabold">
          {displayedStamps}
          <img src={stampImg} alt="stamp" className="h-10 w-10" />
        </div>
        <div className="mt-1 text-sm text-gray-600">
          次の特典「<span className="font-semibold text-gray-800">{nxt.label}</span>」まであと{" "}
          <b className="text-orange-600">{nxt.remaining}</b> 個
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>進捗</span>
            <span className="text-gray-600">
              {Math.min(displayedStamps, maxStamps)}/{maxStamps}
            </span>
          </div>
          <div className="relative mt-2 pt-8">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-8">
              {markers.map((marker) => (
                <div
                  key={marker.threshold}
                  className="absolute flex flex-col items-center gap-1"
                  style={{ left: `${marker.position}%`, transform: "translateX(-50%)" }}
                >
                  <div
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      marker.reached ? "bg-orange-500 text-white shadow" : "bg-white text-orange-600 border border-orange-300"
                    }`}
                  >
                    {marker.threshold}
                  </div>
                  <div className={`h-4 w-0.5 ${marker.reached ? "bg-orange-500" : "bg-orange-200"}`} />
                  <div
                    className={`h-2 w-2 rounded-full ${marker.reached ? "bg-orange-500" : "bg-orange-200"}`}
                    aria-hidden="true"
                  />
                </div>
              ))}
            </div>
            <div className="relative h-5 w-full overflow-hidden rounded-full border border-orange-200 bg-gradient-to-r from-orange-100 via-white to-orange-100 shadow-inner">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 shadow-md transition-all"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        </div>

        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowStampBook((prev) => !prev)}
            className="flex w-full items-center justify-between rounded-lg border border-orange-200 bg-white px-3 py-2 text-sm font-semibold text-orange-600 shadow-sm transition hover:border-orange-400 hover:text-orange-700"
            aria-expanded={showStampBook}
            aria-controls="stamp-book-panel"
          >
            スタンプ帳を{showStampBook ? "閉じる" : "表示"}
            <span className="text-xs font-normal text-gray-500">最大 {maxStamps} 個</span>
          </button>
          {showStampBook && (
            <div
              id="stamp-book-panel"
              className="mt-3 rounded-lg border border-orange-100 bg-orange-50/80 p-4 shadow-inner"
            >
              <div className="grid grid-cols-5 gap-2 sm:grid-cols-6">
                {stampSlots.map((slot) => {
                  const filled = progress.stamps >= slot
                  return (
                    <div
                      key={slot}
                      className={`flex flex-col items-center justify-center rounded-lg border px-2 py-2 text-xs font-semibold ${
                        filled
                          ? "border-orange-300 bg-white text-orange-600 shadow-sm"
                          : "border-gray-200 bg-white/70 text-gray-400"
                      }`}
                    >
                      <img
                        src={stampImg}
                        alt=""
                        aria-hidden="true"
                        className={`h-6 w-6 ${filled ? "" : "opacity-30"}`}
                      />
                      <span className="mt-1">{slot}</span>
                    </div>
                  )
                })}
              </div>
              {stampBookTruncated && (
                <p className="mt-2 text-[11px] text-gray-500">※ {MAX_STAMP_SLOTS_RENDERED + 1} 個目以降は省略して表示しています。</p>
              )}
            </div>
          )}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <Link
          to={`/tenant/${tenantId}/scan`}
          className="rounded-xl bg-orange-400 p-4 text-center text-sm text-white shadow transition hover:scale-105"
        >
          QRコードを読み取る
        </Link>
        <Link
          to={`/tenant/${tenantId}/map`}
          className="rounded-xl bg-orange-400 p-4 text-center text-sm text-white shadow transition hover:scale-105"
        >
          お店を探す
        </Link>
      </div>

      <section className="mt-6">
        <div className="overflow-hidden rounded-lg border border-orange-100">
          <div className="bg-orange-500 px-4 py-3 text-white">
            <h3 className="text-sm font-semibold">特典一覧</h3>
          </div>
          <div className="space-y-3 border-t border-orange-100 bg-orange-50/90 p-3">
            {tenant.rules.map((rule) => {
              const achieved = progress.stamps >= rule.threshold
              const Icon = rule.icon ? ICON_MAP[rule.icon] ?? null : null
              return (
                <div
                  key={rule.threshold}
                  className="flex items-center justify-between rounded-lg bg-white p-3 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-50">
                      {Icon ? (
                        <Icon className="h-6 w-6 text-orange-600" />
                      ) : (
                        <img src={stampImg} alt="" aria-hidden="true" className="h-6 w-6" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{rule.label}</div>
                      <div className="text-xs text-gray-500">{rule.threshold} 個集める</div>
                    </div>
                  </div>
                  <div>
                    {achieved ? (
                      <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-3 py-1 text-xs text-white">
                        達成
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
                        未達成
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
            {tenant.rules.length === 0 && (
              <p className="text-center text-xs text-gray-500">まだ特典が設定されていません。</p>
            )}
          </div>
        </div>
      </section>

      {showRewardModal && recentRewardCoupons.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <button
              type="button"
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
              onClick={handleCloseRewardModal}
              aria-label="閉じる"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
            <h3 className="text-lg font-bold text-gray-900">新しいクーポンを獲得しました！</h3>
            <p className="mt-1 text-sm text-gray-600">さっそくクーポン一覧で詳細をチェックしましょう。</p>
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
              onClick={handleCloseRewardModal}
              className="mt-6 w-full rounded-xl bg-orange-500 py-2 text-sm font-semibold text-white shadow hover:bg-orange-600"
            >
              次のスタンプを集めに行こう！
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
