import { useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { nextThreshold } from "../lib/stamps"
import { useAppStore, useTenantId } from "../lib/store"
import defaultStampImage from "../assets/stamp.png"
import { TicketIcon, GiftIcon, TrophyIcon, XMarkIcon } from "@heroicons/react/24/solid"

const clampPercentage = (value: number) => Math.max(0, Math.min(100, value))
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
const ANIMATION_DURATION = 600

//gitのテスト

export default function Home() {
  const tenantId = useTenantId()
  const progress = useAppStore((s) => s.progress)
  const tenant = useAppStore((s) => s.tenant)
  const recentRewardCoupons = useAppStore((s) => s.recentRewardCoupons)
  const clearRecentRewardCoupons = useAppStore((s) => s.clearRecentRewardCoupons)
  const stampImg = tenant.stampImageUrl ?? defaultStampImage

  const { target, pct } = useMemo(() => {
    const sortedRules = [...tenant.rules].sort((a, b) => a.threshold - b.threshold)
    const upcomingRule = sortedRules.find((rule) => progress.stamps < rule.threshold) ?? null
    const targetValue = upcomingRule
      ? upcomingRule.threshold
      : sortedRules.length > 0
        ? sortedRules[sortedRules.length - 1].threshold
        : progress.stamps
    const pctValue = targetValue > 0 ? Math.min(100, (progress.stamps / targetValue) * 100) : 100
    return { nextRule: upcomingRule, target: targetValue, pct: pctValue }
  }, [progress.stamps, tenant.rules])
  const nxt = useMemo(() => nextThreshold(progress.stamps, tenant), [progress.stamps, tenant])

  const animationFrameRef = useRef<number | null>(null)
  const previousValuesRef = useRef({ stamps: progress.stamps, pct })
  const [displayedStamps, setDisplayedStamps] = useState(progress.stamps)
  const [displayedPct, setDisplayedPct] = useState(pct)
  const [showRewardModal, setShowRewardModal] = useState(false)

  useEffect(() => {
    previousValuesRef.current = { stamps: progress.stamps, pct }
    setDisplayedStamps(progress.stamps)
    setDisplayedPct(pct)
  }, [])

  useEffect(() => {
    const startValues = previousValuesRef.current
    const targetValues = { stamps: progress.stamps, pct }
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
  }, [progress.stamps, pct])

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

  return (
    <div className="pb-16 max-w-md mx-auto p-4">
      <section className="rounded-xl p-4 mb-4 bg-white/80 shadow-sm">
        <div>
          <div>
            <div className="text-sm text-gray-600">現在のスタンプ数</div>
            <div className="text-4xl font-extrabold flex items-center gap-3">
              {displayedStamps}
              <img src={stampImg} alt="stamp" className="w-10 h-10" />
            </div>
            <div className="mt-1 text-sm">次の特典「{nxt.label}」まであと <b>{nxt.remaining}</b> 個</div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-500">進捗</div>
              <div className="text-xs text-gray-600">{displayedStamps}/{target}</div>
            </div>
            <div className="w-full bg-white/30 rounded-full h-4 mt-2 overflow-hidden shadow-sm">
              <div
                className="h-4 bg-gradient-to-r from-orange-400 to-orange-600 shadow-md transition-all"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <Link to={`/tenant/${tenantId}/scan`} className="rounded-xl p-4 text-center text-sm text-white bg-orange-400 shadow hover:scale-105 transition">
          QRコード読み取り
        </Link>
        <Link to={`/tenant/${tenantId}/map`} className="rounded-xl p-4 text-center text-sm text-white bg-orange-400 shadow hover:scale-105 transition">
          店舗を探す
        </Link>
      </div>

      <section className="mt-6">
        <div className="rounded-lg overflow-hidden">
          <div className="bg-orange-500 text-white px-4 py-3">
            <h3 className="text-sm font-semibold">特典一覧</h3>
          </div>
          <div className="p-3 bg-orange-50/90 border border-orange-100 space-y-3">
            {tenant.rules.map((rule) => {
              const achieved = progress.stamps >= rule.threshold
              const Icon = rule.icon === "ticket" ? TicketIcon : rule.icon === "gift" ? GiftIcon : rule.icon === "trophy" ? TrophyIcon : null
              return (
                <div key={rule.threshold} className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center">
                      {Icon ? <Icon className="w-6 h-6 text-orange-600" /> : <img src={stampImg} alt="stamp" className="w-6 h-6" />}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{rule.label}</div>
                      <div className="text-xs text-gray-500">{rule.threshold} 個で達成</div>
                    </div>
                  </div>
                  <div>
                    {achieved ? (
                      <div className="inline-flex items-center gap-2 text-xs px-3 py-1 bg-emerald-500 text-white rounded-full">達成</div>
                    ) : (
                      <div className="inline-flex items-center gap-2 text-xs px-3 py-1 bg-gray-100 text-gray-600 rounded-full">未達成</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {showRewardModal && recentRewardCoupons.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <button
              type="button"
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
              onClick={handleCloseRewardModal}
              aria-label="閉じる"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
            <h3 className="text-lg font-bold text-gray-900">新しいクーポンを獲得しました！</h3>
            <p className="mt-1 text-sm text-gray-600">お店で使える特典をチェックしましょう。</p>
            <div className="mt-4 space-y-3 max-h-60 overflow-y-auto pr-1">
              {recentRewardCoupons.map((coupon) => (
                <div key={coupon.id} className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2">
                  <div className="text-sm font-semibold text-orange-700">{coupon.title}</div>
                  <div className="text-xs text-orange-600 mt-1">{coupon.description}</div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={handleCloseRewardModal}
              className="mt-6 w-full rounded-xl bg-orange-500 py-2 text-sm font-semibold text-white shadow hover:bg-orange-600"
            >
              次の特典も目指す！
            </button>
          </div>
        </div>
      )}

      
    </div>
  )
}
