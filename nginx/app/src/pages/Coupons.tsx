import { useMemo, useState } from "react"

import CouponIcon from "../components/CouponIcon"
import { useAppStore } from "../lib/store"
import { useAuthStore } from "../lib/authStore"
import { markCouponUsed as markCouponUsedApi } from "../lib/api"
import { getLocaleForLanguage, useLanguage } from "../lib/i18n"
import type { AppLanguage } from "../types"

type ParseOptions = {
  endOfDay?: boolean
}

const parseDateValue = (value?: string | null, options: ParseOptions = {}): Date | null => {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null

  if (trimmed.includes("T")) {
    const parsed = new Date(trimmed)
    if (!Number.isNaN(parsed.getTime())) return parsed
  }

  const parts = trimmed.split("-")
  if (parts.length !== 3) return null

  const [yearStr, monthStr, dayStr] = parts
  const year = Number(yearStr)
  const month = Number(monthStr)
  const day = Number(dayStr)
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null

  if (options.endOfDay) {
    return new Date(year, month - 1, day, 23, 59, 59, 999)
  }
  return new Date(year, month - 1, day, 0, 0, 0, 0)
}

const formatDateForDisplay = (value: Date | null, includeTime: boolean, locale: string): string => {
  if (!value) return ""
  const options: Intl.DateTimeFormatOptions = { year: "numeric", month: "numeric", day: "numeric" }
  if (includeTime) {
    options.hour = "2-digit"
    options.minute = "2-digit"
  }
  return new Intl.DateTimeFormat(locale, options).format(value)
}

const TEXT_MAP: Record<
  AppLanguage,
  {
    availableHeader: string
    usagePeriodPrefix: string
    usageWindowRange: (start: string, end: string) => string
    usageWindowFrom: (start: string) => string
    usageWindowUntil: (end: string) => string
    usageRestrictionBeforeWithDate: (start: string) => string
    usageRestrictionBeforeNoDate: string
    usageRestrictionAfter: string
    availableEmptyAfterWindow: string
    availableEmptyDefault: string
    useButton: string
    notStartedLabel: string
    unavailableLabel: string
    expiredHeader: string
    expiredEmpty: string
    expiredBadge: string
    usedHeader: string
    usedEmpty: string
    usedBadge: string
    cannotUseNow: string
    loginRequired: string
    confirmUse: string
    updated: string
    updateFailed: string
  }
> = {
  ja: {
    availableHeader: "使用可能クーポン",
    usagePeriodPrefix: "利用期間: ",
    usageWindowRange: (start, end) => `${start} 〜 ${end}`,
    usageWindowFrom: (start) => `${start} 以降`,
    usageWindowUntil: (end) => `${end} まで`,
    usageRestrictionBeforeWithDate: (start) => `クーポンの利用期間は ${start} からです。`,
    usageRestrictionBeforeNoDate: "クーポンの利用期間はまだ開始していません。",
    usageRestrictionAfter: "クーポンの利用期間は終了しました。",
    availableEmptyAfterWindow: "現在利用できるクーポンはありません。期限切れのクーポンをご確認ください。",
    availableEmptyDefault: "使用できるクーポンはまだありません。",
    useButton: "使用する",
    notStartedLabel: "開始前",
    unavailableLabel: "利用不可",
    expiredHeader: "期限切れクーポン",
    expiredEmpty: "期限切れのクーポンはありません。",
    expiredBadge: "期限切れ",
    usedHeader: "使用済みクーポン",
    usedEmpty: "使用済みのクーポンはありません。",
    usedBadge: "使用済み",
    cannotUseNow: "現在はクーポンを利用できません。",
    loginRequired: "クーポンを利用するにはログインが必要です。",
    confirmUse: "この操作は取り消せません。クーポンを使用しますか？",
    updated: "クーポンを使用済みにしました。",
    updateFailed: "クーポンの更新に失敗しました。",
  },
  en: {
    availableHeader: "Available coupons",
    usagePeriodPrefix: "Usage window: ",
    usageWindowRange: (start, end) => `${start} - ${end}`,
    usageWindowFrom: (start) => `Starting ${start}`,
    usageWindowUntil: (end) => `Until ${end}`,
    usageRestrictionBeforeWithDate: (start) => `Coupons can be used from ${start}.`,
    usageRestrictionBeforeNoDate: "The usage window has not started yet.",
    usageRestrictionAfter: "The usage window has ended.",
    availableEmptyAfterWindow: "No coupons can be used now. Please review expired coupons.",
    availableEmptyDefault: "No coupons are available yet.",
    useButton: "Use",
    notStartedLabel: "Not started",
    unavailableLabel: "Unavailable",
    expiredHeader: "Expired coupons",
    expiredEmpty: "No expired coupons.",
    expiredBadge: "Expired",
    usedHeader: "Used coupons",
    usedEmpty: "No used coupons.",
    usedBadge: "Used",
    cannotUseNow: "Coupons cannot be used right now.",
    loginRequired: "Log in to use coupons.",
    confirmUse: "This action cannot be undone. Use this coupon?",
    updated: "Marked the coupon as used.",
    updateFailed: "Failed to update the coupon.",
  },
  zh: {
    availableHeader: "可使用的優惠券",
    usagePeriodPrefix: "使用期間：",
    usageWindowRange: (start, end) => `${start} ～ ${end}`,
    usageWindowFrom: (start) => `${start} 起`,
    usageWindowUntil: (end) => `至 ${end}`,
    usageRestrictionBeforeWithDate: (start) => `優惠券可從 ${start} 開始使用。`,
    usageRestrictionBeforeNoDate: "優惠券的使用時間尚未開始。",
    usageRestrictionAfter: "優惠券的使用時間已結束。",
    availableEmptyAfterWindow: "現在沒有可使用的優惠券，請查看已過期的優惠券。",
    availableEmptyDefault: "還沒有可使用的優惠券。",
    useButton: "使用",
    notStartedLabel: "未開始",
    unavailableLabel: "不可用",
    expiredHeader: "已過期的優惠券",
    expiredEmpty: "沒有過期的優惠券。",
    expiredBadge: "已過期",
    usedHeader: "已使用的優惠券",
    usedEmpty: "沒有已使用的優惠券。",
    usedBadge: "已使用",
    cannotUseNow: "目前無法使用優惠券。",
    loginRequired: "使用優惠券前請先登入。",
    confirmUse: "此操作無法撤銷，確認使用優惠券嗎？",
    updated: "已將優惠券標記為已使用。",
    updateFailed: "更新優惠券失敗。",
  },
}

export default function Coupons() {
  const progress = useAppStore((state) => state.progress)
  const tenant = useAppStore((state) => state.tenant)
  const markCouponUsed = useAppStore((state) => state.markCouponUsed)
  const token = useAuthStore((state) => state.token)

  const language = useLanguage()
  const locale = getLocaleForLanguage(language)
  const TEXT = TEXT_MAP[language]

  const [message, setMessage] = useState<string | null>(null)

  const usageWindow = useMemo(() => {
    const mode = tenant.couponUsageMode ?? "campaign"
    const rawStart = mode === "custom" ? tenant.couponUsageStart ?? "" : tenant.campaignStart ?? ""
    const rawEnd = mode === "custom" ? tenant.couponUsageEnd ?? "" : tenant.campaignEnd ?? ""
    const startHasTime = Boolean(rawStart && rawStart.includes("T"))
    const endHasTime = Boolean(rawEnd && rawEnd.includes("T"))

    return {
      start: parseDateValue(rawStart, { endOfDay: false }),
      end: parseDateValue(rawEnd, { endOfDay: !endHasTime && Boolean(rawEnd) }),
      startHasTime,
      endHasTime,
      hasWindow: Boolean(rawStart || rawEnd),
    }
  }, [
    tenant.campaignEnd,
    tenant.campaignStart,
    tenant.couponUsageEnd,
    tenant.couponUsageMode,
    tenant.couponUsageStart,
  ])

  const nowMs = Date.now()
  const startMs = usageWindow.start ? usageWindow.start.getTime() : null
  const endMs = usageWindow.end ? usageWindow.end.getTime() : null
  const isBeforeWindow = typeof startMs === "number" ? nowMs < startMs : false
  const isAfterWindow = typeof endMs === "number" ? nowMs > endMs : false
  const isWithinWindow = !isBeforeWindow && !isAfterWindow

  const usageRestrictionMessage = !isWithinWindow
    ? isBeforeWindow
      ? usageWindow.start
        ? TEXT.usageRestrictionBeforeWithDate(
            formatDateForDisplay(usageWindow.start, usageWindow.startHasTime, locale),
          )
        : TEXT.usageRestrictionBeforeNoDate
      : TEXT.usageRestrictionAfter
    : null

  const availableCoupons = progress.coupons.filter((coupon) => !coupon.used && !isAfterWindow)
  const expiredCoupons = isAfterWindow
    ? progress.coupons.filter((coupon) => !coupon.used)
    : []
  const usedCoupons = progress.coupons.filter((coupon) => coupon.used)

  const usagePeriodLabel = (() => {
    if (!usageWindow.hasWindow) return null
    const startText = usageWindow.start
      ? formatDateForDisplay(usageWindow.start, usageWindow.startHasTime, locale)
      : null
    const endText = usageWindow.end
      ? formatDateForDisplay(usageWindow.end, usageWindow.endHasTime, locale)
      : null

    if (startText && endText) {
      return TEXT.usageWindowRange(startText, endText)
    }
    if (startText) {
      return TEXT.usageWindowFrom(startText)
    }
    if (endText) {
      return TEXT.usageWindowUntil(endText)
    }
    return null
  })()

  const confirmUse = async (id: string) => {
    if (!isWithinWindow) {
      setMessage(usageRestrictionMessage ?? TEXT.cannotUseNow)
      return
    }
    if (!token) {
      setMessage(TEXT.loginRequired)
      return
    }
    const confirmed = window.confirm(TEXT.confirmUse)
    if (!confirmed) {
      return
    }
    try {
      await markCouponUsedApi(token, id)
      markCouponUsed(id)
      setMessage(TEXT.updated)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : TEXT.updateFailed
      setMessage(errorMessage)
    }
  }

  return (
    <div className="max-w-md mx-auto space-y-4 p-4 pb-16">
      {message && (
        <div className="rounded-md bg-orange-50 px-3 py-2 text-xs text-orange-700">{message}</div>
      )}

      <section className="overflow-hidden rounded-lg border border-orange-100 bg-white/90">
        <div className="bg-orange-500 px-4 py-3 text-white">
          <h4 className="text-sm font-semibold">{TEXT.availableHeader}</h4>
        </div>
        <div className="space-y-3 border-t border-orange-100 bg-orange-50/90 p-3">
          {usagePeriodLabel ? (
            <div className="rounded-lg border border-orange-200 bg-white/80 px-3 py-2 text-xs text-orange-700">
              {TEXT.usagePeriodPrefix}
              {usagePeriodLabel}
            </div>
          ) : null}
          {usageRestrictionMessage ? (
            <div className="rounded-lg border border-dashed border-orange-200 bg-white/60 px-3 py-2 text-xs text-orange-600">
              {usageRestrictionMessage}
            </div>
          ) : null}

          {availableCoupons.length === 0 ? (
            <div className="text-sm text-gray-500">
              {isAfterWindow ? TEXT.availableEmptyAfterWindow : TEXT.availableEmptyDefault}
            </div>
          ) : (
            availableCoupons.map((coupon) => (
              <div
                key={coupon.id}
                className="flex items-center justify-between gap-3 rounded-lg bg-white p-3 shadow-sm"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-orange-100 bg-white">
                    <CouponIcon icon={coupon.icon ?? undefined} className="h-7 w-7 text-orange-500" fillImage />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900">{coupon.title}</div>
                    {coupon.description ? (
                      <div className="text-xs text-gray-500">{coupon.description}</div>
                    ) : null}
                  </div>
                </div>
                <button
                  type="button"
                  className="flex-shrink-0 rounded bg-rose-500 px-3 py-1 text-xs font-semibold text-white shadow transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:bg-rose-300 disabled:text-rose-50"
                  onClick={() => confirmUse(coupon.id)}
                  disabled={!isWithinWindow}
                >
                  {isWithinWindow ? TEXT.useButton : isBeforeWindow ? TEXT.notStartedLabel : TEXT.unavailableLabel}
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-gray-200 bg-white/90">
        <div className="bg-gray-200 px-4 py-3 text-gray-800">
          <h4 className="text-sm font-semibold">{TEXT.expiredHeader}</h4>
        </div>
        <div className="space-y-3 border-t border-gray-200 bg-gray-50/90 p-3">
          {expiredCoupons.length === 0 ? (
            <div className="text-sm text-gray-500">{TEXT.expiredEmpty}</div>
          ) : (
            expiredCoupons.map((coupon) => (
              <div
                key={coupon.id}
                className="flex items-center justify-between gap-3 rounded-lg bg-white p-3 text-sm text-gray-600 shadow-sm"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-white">
                    <CouponIcon icon={coupon.icon ?? undefined} className="h-7 w-7 text-gray-400" fillImage />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900">{coupon.title}</div>
                    {coupon.description ? (
                      <div className="text-xs text-gray-500">{coupon.description}</div>
                    ) : null}
                  </div>
                </div>
                <span className="flex-shrink-0 rounded-full bg-gray-200 px-3 py-1 text-xs font-semibold text-gray-600">
                  {TEXT.expiredBadge}
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-gray-200 bg-white/90">
        <div className="bg-gray-100 px-4 py-3 text-gray-800">
          <h4 className="text-sm font-semibold">{TEXT.usedHeader}</h4>
        </div>
        <div className="space-y-3 border-t border-gray-200 bg-orange-50/90 p-3">
          {usedCoupons.length === 0 ? (
            <div className="text-sm text-gray-500">{TEXT.usedEmpty}</div>
          ) : (
            usedCoupons.map((coupon) => (
              <div
                key={coupon.id}
                className="flex items-center justify-between gap-3 rounded-lg bg-white p-3 text-sm text-gray-600 shadow-sm opacity-70"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-white">
                    <CouponIcon icon={coupon.icon ?? undefined} className="h-7 w-7 text-gray-400" fillImage />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900">{coupon.title}</div>
                    {coupon.description ? (
                      <div className="text-xs text-gray-500">{coupon.description}</div>
                    ) : null}
                  </div>
                </div>
                <div className="flex-shrink-0 text-xs text-gray-500">{TEXT.usedBadge}</div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}
