import { useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { XMarkIcon } from "@heroicons/react/24/solid"

import defaultStampImage from "../assets/stamp.png"
import CouponIcon from "../components/CouponIcon"
import { nextThreshold } from "../lib/stamps"
import { useAppStore, useTenantId } from "../lib/store"
import { useLanguage } from "../lib/i18n"
import type { AppLanguage } from "../types"

const clampPercentage = (value: number) => Math.max(0, Math.min(100, value))
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
const ANIMATION_DURATION = 600
const MAX_STAMP_SLOTS_RENDERED = 200

const TEXT_MAP: Record<
  AppLanguage,
  {
    currentStampCount: string
    nextRewardPrefix: string
    nextRewardMiddle: string
    nextRewardSuffix: string
    progressLabel: string
    markerReached: (threshold: number) => string
    markerTarget: (threshold: number) => string
    stampBookButton: (isOpen: boolean) => string
    stampBookMax: (max: number) => string
    stampBookTruncated: (start: number) => string
    scanButton: string
    mapButton: string
    rewardsTitle: string
    collectRequirement: (threshold: number) => string
    achieved: string
    notAchieved: string
    noRewards: string
    modalCloseAria: string
    modalTitle: string
    modalDescription: string
    modalAction: string
  }
> = {
  ja: {
    currentStampCount: "現在のスタンプ数",
    nextRewardPrefix: "次の特典「",
    nextRewardMiddle: "」まであと ",
    nextRewardSuffix: " 個",
    progressLabel: "進捗",
    markerReached: (threshold) => `${threshold}個達成済み`,
    markerTarget: (threshold) => `${threshold}個でクーポン獲得`,
    stampBookButton: (isOpen) => `スタンプ帳を${isOpen ? "閉じる" : "表示"}`,
    stampBookMax: (max) => `最大 ${max} 個`,
    stampBookTruncated: (start) => `※ ${start} 個目以降は省略して表示しています。`,
    scanButton: "QRコードを読み取る",
    mapButton: "お店を探す",
    rewardsTitle: "特典一覧",
    collectRequirement: (threshold) => `${threshold} 個集める`,
    achieved: "達成",
    notAchieved: "未達成",
    noRewards: "まだ特典が設定されていません。",
    modalCloseAria: "閉じる",
    modalTitle: "新しいクーポンを獲得しました！",
    modalDescription: "さっそくクーポン一覧で詳細をチェックしましょう。",
    modalAction: "次のスタンプを集めに行こう！",
  },
  en: {
    currentStampCount: "Current stamps",
    nextRewardPrefix: "Next reward \"",
    nextRewardMiddle: "\" in ",
    nextRewardSuffix: " more stamps",
    progressLabel: "Progress",
    markerReached: (threshold) => `${threshold} stamps collected`,
    markerTarget: (threshold) => `${threshold} stamps for a reward`,
    stampBookButton: (isOpen) => (isOpen ? "Hide stamp book" : "Show stamp book"),
    stampBookMax: (max) => `Max ${max} stamps`,
    stampBookTruncated: (start) => `※ Entries after stamp ${start} are hidden.`,
    scanButton: "Scan QR code",
    mapButton: "Find stores",
    rewardsTitle: "Rewards",
    collectRequirement: (threshold) => `Collect ${threshold} stamps`,
    achieved: "Completed",
    notAchieved: "Not yet",
    noRewards: "No rewards configured yet.",
    modalCloseAria: "Close",
    modalTitle: "You got a new coupon!",
    modalDescription: "Open the coupon list to see more details.",
    modalAction: "Collect the next stamp!",
  },
  zh: {
    currentStampCount: "目前的印章数量",
    nextRewardPrefix: "距离下一个奖励「",
    nextRewardMiddle: "」还差 ",
    nextRewardSuffix: " 个印章",
    progressLabel: "进度",
    markerReached: (threshold) => `已集满 ${threshold} 个印章`,
    markerTarget: (threshold) => `集满 ${threshold} 个印章可获奖励`,
    stampBookButton: (isOpen) => (isOpen ? "隐藏印章册" : "显示印章册"),
    stampBookMax: (max) => `最多 ${max} 个`,
    stampBookTruncated: (start) => `※ 从第 ${start} 个印章起的格子不再显示。`,
    scanButton: "扫描 QR 码",
    mapButton: "寻找店铺",
    rewardsTitle: "奖励列表",
    collectRequirement: (threshold) => `集满 ${threshold} 个印章`,
    achieved: "已达成",
    notAchieved: "未达成",
    noRewards: "尚未设置任何奖励。",
    modalCloseAria: "关闭",
    modalTitle: "获得新的优惠券！",
    modalDescription: "快到优惠券列表查看详情。",
    modalAction: "去收集下一个印章！",
  },
}

export default function Home() {
  const tenantId = useTenantId()
  const progress = useAppStore((state) => state.progress)
  const tenant = useAppStore((state) => state.tenant)
  const recentRewardCoupons = useAppStore((state) => state.recentRewardCoupons)
  const clearRecentRewardCoupons = useAppStore((state) => state.clearRecentRewardCoupons)
  const stampImg = tenant.stampImageUrl ?? defaultStampImage
  const language = useLanguage()
  const TEXT = TEXT_MAP[language]

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
        <div className="text-sm text-gray-600">{TEXT.currentStampCount}</div>
        <div className="mt-1 flex items-center gap-3 text-4xl font-extrabold">
          {displayedStamps}
          <img src={stampImg} alt="stamp" className="h-10 w-10" />
        </div>
        <div className="mt-1 text-sm text-gray-600">
          {TEXT.nextRewardPrefix}
          <span className="font-semibold text-gray-800">{nxt.label}</span>
          {TEXT.nextRewardMiddle}
          <b className="text-orange-600">{nxt.remaining}</b>
          {TEXT.nextRewardSuffix}
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{TEXT.progressLabel}</span>
            <span className="text-gray-600">
              {Math.min(displayedStamps, maxStamps)}/{maxStamps}
            </span>
          </div>
            <div className="relative mt-2 pt-9">
              <div className="pointer-events-none absolute inset-x-3 top-0 h-8">
                {markers.map((marker) => (
                  <div
                    key={marker.threshold}
                    className="absolute flex flex-col items-center"
                    style={{ left: `${marker.position}%`, transform: "translateX(-50%)" }}
                  >
                    <div className="relative flex flex-col items-center">
                      <span
                        className={`pointer-events-none absolute left-1/2 top-full -mt-[1px] h-0 w-0 -translate-x-1/2 border-x-[6.5px] border-x-transparent ${
                          marker.reached ? "border-t-orange-500" : "border-t-orange-300"
                        }`}
                        aria-hidden="true"
                      />
                      {!marker.reached && (
                        <span
                          className="pointer-events-none absolute left-1/2 top-full -mt-[2.5px] h-0 w-0 -translate-x-1/2 border-x-[6px] border-x-transparent border-t-white"
                          aria-hidden="true"
                        />
                      )}
                      <div
                        className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-semibold ${
                          marker.reached
                            ? "bg-orange-500 text-white shadow-md"
                            : "border border-orange-300 bg-white text-orange-600"
                        }`}
                      >
                        {marker.reached ? (
                          <span aria-hidden="true" className="text-xs leading-none">
                            ✓
                          </span>
                        ) : (
                          marker.threshold
                        )}
                        <span className="sr-only">
                          {marker.reached
                            ? TEXT.markerReached(marker.threshold)
                            : TEXT.markerTarget(marker.threshold)}
                        </span>
                      </div>
                    </div>
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
            {TEXT.stampBookButton(showStampBook)}
            <span className="text-xs font-normal text-gray-500">{TEXT.stampBookMax(maxStamps)}</span>
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
                <p className="mt-2 text-[11px] text-gray-500">{TEXT.stampBookTruncated(MAX_STAMP_SLOTS_RENDERED + 1)}</p>
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
          {TEXT.scanButton}
        </Link>
        <Link
          to={`/tenant/${tenantId}/map`}
          className="rounded-xl bg-orange-400 p-4 text-center text-sm text-white shadow transition hover:scale-105"
        >
          {TEXT.mapButton}
        </Link>
      </div>

      <section className="mt-6">
        <div className="overflow-hidden rounded-lg border border-orange-100">
          <div className="bg-orange-500 px-4 py-3 text-white">
            <h3 className="text-sm font-semibold">{TEXT.rewardsTitle}</h3>
          </div>
          <div className="space-y-3 border-t border-orange-100 bg-orange-50/90 p-3">
            {tenant.rules.map((rule) => {
              const achieved = progress.stamps >= rule.threshold
              const iconValue = rule.icon?.trim()
              return (
                <div
                  key={rule.threshold}
                  className="flex items-center justify-between rounded-lg bg-white p-3 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border border-orange-100 bg-white">
                      {iconValue ? (
                        <CouponIcon icon={iconValue} className="h-6 w-6 text-orange-600" fillImage />
                      ) : (
                        <img src={stampImg} alt="" aria-hidden="true" className="h-6 w-6" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{rule.label}</div>
                      <div className="text-xs text-gray-500">{TEXT.collectRequirement(rule.threshold)}</div>
                    </div>
                  </div>
                  <div>
                    {achieved ? (
                      <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-3 py-1 text-xs text-white">
                        {TEXT.achieved}
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
                        {TEXT.notAchieved}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
            {tenant.rules.length === 0 && (
              <p className="text-center text-xs text-gray-500">{TEXT.noRewards}</p>
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
              aria-label={TEXT.modalCloseAria}
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
            <h3 className="text-lg font-bold text-gray-900">{TEXT.modalTitle}</h3>
            <p className="mt-1 text-sm text-gray-600">{TEXT.modalDescription}</p>
            <div className="mt-4 max-h-60 space-y-3 overflow-y-auto pr-1">
              {recentRewardCoupons.map((coupon) => (
                <div
                  key={coupon.id}
                  className="flex items-center gap-3 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2"
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-orange-100 bg-white">
                    <CouponIcon icon={coupon.icon ?? undefined} className="h-6 w-6 text-orange-500" fillImage />
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
              {TEXT.modalAction}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
