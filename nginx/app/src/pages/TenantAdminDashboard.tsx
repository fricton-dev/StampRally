import { type ChangeEvent, useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"

import { fetchTenantDashboardStats, updateTenantCampaign } from "../lib/api"
import type { AppLanguage, CouponDailyStat, DailyMetric, TenantDashboardStats, ThemeColor } from "../types"
import { useTenantAdmin } from "./admin/TenantAdminContext"
import { LANGUAGE_OPTIONS, getLanguageLabel, getLocaleForLanguage, normalizeLanguage } from "../lib/i18n"
import { useDashboardText } from "../lib/adminTexts"

const THEME_SWATCH_HEX: Record<ThemeColor, string> = {
  orange: "#f97316",
  teal: "#14b8a6",
  green: "#22c55e",
  pink: "#ec4899",
}

const THEME_LABELS: Record<AppLanguage, Record<ThemeColor, string>> = {
  ja: {
    orange: "オレンジ",
    teal: "ティール",
    green: "グリーン",
    pink: "ピンク",
  },
  en: {
    orange: "Orange",
    teal: "Teal",
    green: "Green",
    pink: "Pink",
  },
  zh: {
    orange: "橘色",
    teal: "青綠色",
    green: "綠色",
    pink: "粉色",
  },
}

type TrendSparklineProps = {
  data: DailyMetric[]
  color: string
  ariaLabel?: string
  emptyLabel: string
}

const TrendSparkline = ({ data, color, ariaLabel, emptyLabel }: TrendSparklineProps) => {
  if (data.length === 0) {
    return <div className="text-xs text-gray-400">{emptyLabel}</div>
  }

  const counts = data.map((item) => item.count)
  const max = Math.max(...counts)
  const min = Math.min(...counts)
  const span = Math.max(max - min, 1)
  const paddingTop = 10
  const paddingBottom = 10

  const points = data
    .map((item, index) => {
      const x = data.length === 1 ? 50 : (index / (data.length - 1)) * 100
      const normalized = (item.count - min) / span
      const y = 100 - paddingBottom - normalized * (100 - paddingTop - paddingBottom)
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(" ")

  const lastPointIndex = data.length - 1
  const lastX = data.length === 1 ? 50 : (lastPointIndex / (data.length - 1)) * 100
  const lastNormalized = (data[lastPointIndex].count - min) / span
  const lastY = 100 - paddingBottom - lastNormalized * (100 - paddingTop - paddingBottom)

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="h-20 w-full text-[0px]"
      role="img"
      aria-label={ariaLabel}
    >
      <polyline
        fill="none"
        stroke={color}
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
      <circle cx={lastX} cy={lastY} r={3.5} fill={color} />
    </svg>
  )
}


type MetricCardProps = {
  title: string
  primaryValue: string
  primaryCaption: string
  secondaryLabel?: string
  secondaryValue?: string
  trendLabel: string
  emptyLabel: string
  data: DailyMetric[]
  color: string
}

const MetricCard = ({
  title,
  primaryValue,
  primaryCaption,
  secondaryLabel,
  secondaryValue,
  trendLabel,
  emptyLabel,
  data,
  color,
}: MetricCardProps) => (
  <div className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white/95 p-5 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</p>
        <p className="mt-2 text-3xl font-semibold text-gray-900">{primaryValue}</p>
        <p className="mt-1 text-xs text-gray-500">{primaryCaption}</p>
      </div>
      {secondaryLabel && secondaryValue ? (
        <div className="text-right text-xs text-gray-500">
          <p className="font-semibold text-gray-600">{secondaryLabel}</p>
          <p className="mt-1 text-base font-semibold text-gray-900">{secondaryValue}</p>
        </div>
      ) : null}
    </div>
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{trendLabel}</p>
      <TrendSparkline data={data} color={color} ariaLabel={trendLabel} emptyLabel={emptyLabel} />
    </div>
  </div>
)

type CouponStatsCardProps = {
  stat: CouponDailyStat
  numberFormatter: Intl.NumberFormat
  acquiredLabel: string
  usedLabel: string
  acquiredTrendLabel: string
  usedTrendLabel: string
  emptyLabel: string
}

const CouponStatsCard = ({
  stat,
  numberFormatter,
  acquiredLabel,
  usedLabel,
  acquiredTrendLabel,
  usedTrendLabel,
  emptyLabel,
}: CouponStatsCardProps) => (
  <div className="rounded-xl border border-gray-200 bg-white/90 p-4 shadow-sm">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-semibold text-gray-900">{stat.title}</p>
        {stat.description ? <p className="mt-1 text-xs text-gray-500">{stat.description}</p> : null}
      </div>
      <div className="text-right text-xs text-gray-500">
        <p>
          {acquiredLabel}:{" "}
          <span className="font-semibold text-gray-900">{numberFormatter.format(stat.totalAcquired)}</span>
        </p>
        <p className="mt-1">
          {usedLabel}:{" "}
          <span className="font-semibold text-gray-900">{numberFormatter.format(stat.totalUsed)}</span>
        </p>
      </div>
    </div>
    <div className="mt-4 grid gap-3 md:grid-cols-2">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-orange-600">{acquiredTrendLabel}</p>
        <TrendSparkline
          data={stat.acquired}
          color="#f97316"
          ariaLabel={acquiredTrendLabel}
          emptyLabel={emptyLabel}
        />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">{usedTrendLabel}</p>
        <TrendSparkline
          data={stat.used}
          color="#0ea5e9"
          ariaLabel={usedTrendLabel}
          emptyLabel={emptyLabel}
        />
      </div>
    </div>
  </div>
)

export default function TenantAdminDashboard() {
  const { tenantId, session, seed, refreshSeed } = useTenantAdmin()
  const TEXT = useDashboardText()
  const [days, setDays] = useState<number>(14)
  const [reloadToken, setReloadToken] = useState(0)
  const [stats, setStats] = useState<TenantDashboardStats | null>(null)
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [languageStatus, setLanguageStatus] = useState<"idle" | "saving">("idle")
  const [languageFeedback, setLanguageFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null)
  const tenantLanguage = normalizeLanguage(seed.tenant.language)
  const locale = getLocaleForLanguage(tenantLanguage)
  const numberFormatter = useMemo(() => new Intl.NumberFormat(locale), [locale])
  const decimalFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
      }),
    [locale],
  )
  const shortDateFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: "numeric", day: "numeric" }),
    [locale],
  )
  const fullDateFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { year: "numeric", month: "numeric", day: "numeric" }),
    [locale],
  )

  const topStores = useMemo(() => seed.stores.slice(0, 5), [seed.stores])
  const themeColor = (seed.tenant.themeColor ?? "orange") as ThemeColor
  const themeLabel = THEME_LABELS[tenantLanguage][themeColor]
  const themeSwatch = THEME_SWATCH_HEX[themeColor]

  const isLoading = status === "loading"
  const isError = status === "error"
  const hasStats = status === "ready" && stats

  const dayOptions = useMemo(
    () => [
      { value: 7, label: TEXT.dayOption7 },
      { value: 14, label: TEXT.dayOption14 },
      { value: 30, label: TEXT.dayOption30 },
    ],
    [TEXT.dayOption14, TEXT.dayOption30, TEXT.dayOption7],
  )

  const formatIsoDate = (value?: string | null) => {
    if (!value) return TEXT.dateUnset
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) {
      return value
    }
    return fullDateFormatter.format(parsed)
  }

  const formatShortIsoDate = (value: string) => {
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) {
      return value
    }
    return shortDateFormatter.format(parsed)
  }

  const formatStoreMeta = (id: string, lat: number, lng: number) =>
    TEXT.storeMeta
      .replace("{id}", id)
      .replace("{lat}", lat.toFixed(5))
      .replace("{lng}", lng.toFixed(5))

  useEffect(() => {
    let cancelled = false
    setStatus("loading")
    setErrorMessage(null)

    fetchTenantDashboardStats(session.accessToken, tenantId, { days })
      .then((response) => {
        if (cancelled) return
        setStats(response)
        setStatus("ready")
      })
      .catch((error) => {
        if (cancelled) return
        console.error("Failed to load dashboard stats", error)
        setErrorMessage(TEXT.rangeError)
        setStatus("error")
      })

    return () => {
      cancelled = true
    }
  }, [tenantId, session.accessToken, days, reloadToken, TEXT.rangeError])

  const rangeSummary =
    hasStats && stats
      ? TEXT.rangeSummary
          .replace("{start}", formatIsoDate(stats.rangeStart))
          .replace("{end}", formatIsoDate(stats.rangeEnd))
          .replace("{days}", TEXT.rangeDays.replace("{count}", numberFormatter.format(stats.days)))
      : ""

  const userSeries = useMemo(() => (hasStats && stats ? stats.dailyUsers : []), [hasStats, stats])
  const stampSeries = useMemo(() => (hasStats && stats ? stats.dailyStamps : []), [hasStats, stats])
  const coupons = useMemo(() => (hasStats && stats ? stats.coupons : []), [hasStats, stats])
  const totalUsers = hasStats && stats ? stats.totalUsers : 0
  const totalStamps = hasStats && stats ? stats.totalStamps : 0

  const averageUsers =
    userSeries.length > 0
      ? Math.round((userSeries.reduce((total, item) => total + item.count, 0) / userSeries.length) * 10) / 10
      : 0
  const averageStamps =
    stampSeries.length > 0
      ? Math.round((stampSeries.reduce((total, item) => total + item.count, 0) / stampSeries.length) * 10) / 10
      : 0
  const latestUsers = userSeries.at(-1)?.count ?? 0
  const latestStamps = stampSeries.at(-1)?.count ?? 0

  const dailyTableRows = useMemo(() => {
    if (!hasStats || !stats) return []
    const stampMap = new Map(stats.dailyStamps.map((item) => [item.date, item.count]))
    return stats.dailyUsers
      .map((item) => ({
        date: item.date,
        users: item.count,
        stamps: stampMap.get(item.date) ?? 0,
      }))
      .reverse()
  }, [hasStats, stats])

  const handleLanguageChange = async (event: ChangeEvent<HTMLSelectElement>) => {
    const selected = normalizeLanguage(event.target.value)
    if (selected === tenantLanguage) {
      return
    }
    if (!session.accessToken) {
      setLanguageFeedback({
        type: "error",
        message: TEXT.languageSessionInvalid,
      })
      return
    }
    setLanguageStatus("saving")
    setLanguageFeedback(null)
    try {
      await updateTenantCampaign(session.accessToken, tenantId, { language: selected })
      await refreshSeed()
      setLanguageFeedback({ type: "success", message: TEXT.languageUpdated })
    } catch (err) {
      console.error("Failed to update tenant language", err)
      setLanguageFeedback({ type: "error", message: TEXT.languageFailed })
    } finally {
      setLanguageStatus("idle")
    }
  }

  const handleRetry = () => {
    setReloadToken((value) => value + 1)
  }

  return (
    <div className="space-y-6 p-4 pb-20">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-orange-600">
              {TEXT.tenantLabel}: {seed.tenant.tenantName}
            </p>
            <h1 className="text-2xl font-semibold text-gray-900">{TEXT.pageTitle}</h1>
          </div>
          <Link
            to={`/tenant/${tenantId}`}
            className="rounded-lg bg-orange-500 px-3 py-1.5 text-sm font-semibold text-white shadow hover:bg-orange-600"
          >
            {TEXT.demoButton}
          </Link>
        </div>
        <p className="text-sm text-gray-600">{TEXT.intro}</p>
      </header>

      <section className="rounded-xl border border-gray-200 bg-white/95 p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {TEXT.languageSectionTitle}
            </p>
            <p className="mt-1 text-sm text-gray-700">{getLanguageLabel(tenantLanguage)}</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              className="rounded border border-gray-300 bg-white px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:cursor-wait disabled:bg-gray-100"
              value={tenantLanguage}
              onChange={handleLanguageChange}
              disabled={languageStatus === "saving"}
            >
              {LANGUAGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {languageStatus === "saving" ? (
              <span className="text-xs text-gray-500">{TEXT.languageUpdating}</span>
            ) : null}
          </div>
        </div>
        <p className="mt-2 text-xs text-gray-500">{TEXT.languageSectionHint}</p>
        {languageFeedback ? (
          <p
            className={`mt-2 text-xs ${
              languageFeedback.type === "success" ? "text-emerald-600" : "text-rose-600"
            }`}
          >
            {languageFeedback.message}
          </p>
        ) : null}
      </section>

      <section className="rounded-xl border border-orange-100 bg-white/90 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{TEXT.monitoringTitle}</h2>
            <p className="text-xs text-gray-500">{hasStats ? rangeSummary : TEXT.monitoringHint}</p>
          </div>
          <label className="flex items-center gap-2 text-xs font-medium text-gray-700">
            {TEXT.rangeLabel}
            <select
              className="rounded border border-gray-300 bg-white px-2 py-1 text-xs focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              value={days}
              onChange={(event) => setDays(Number(event.target.value))}
            >
              {dayOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {isLoading ? <p className="mt-6 text-sm text-gray-500">{TEXT.rangeLoading}</p> : null}

        {isError ? (
          <div className="mt-6 space-y-3 rounded-lg bg-red-50 p-4 text-sm text-red-600">
            <p>{errorMessage ?? TEXT.rangeError}</p>
            <button
              type="button"
              onClick={handleRetry}
              className="rounded bg-red-500 px-3 py-1 text-xs font-semibold text-white shadow hover:bg-red-600"
            >
              {TEXT.retry}
            </button>
          </div>
        ) : null}

        {hasStats ? (
          <>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <MetricCard
                title={TEXT.usersCardTitle}
                primaryValue={numberFormatter.format(totalUsers)}
                primaryCaption={TEXT.usersCardPrimary.replace(
                  "{avg}",
                  decimalFormatter.format(averageUsers),
                )}
                secondaryLabel={TEXT.usersCardSecondary}
                secondaryValue={numberFormatter.format(latestUsers)}
                trendLabel={TEXT.usersTrendLabel}
                emptyLabel={TEXT.sparklineEmpty}
                data={userSeries}
                color="#f97316"
              />
              <MetricCard
                title={TEXT.stampsCardTitle}
                primaryValue={numberFormatter.format(totalStamps)}
                primaryCaption={TEXT.stampsCardPrimary.replace(
                  "{avg}",
                  decimalFormatter.format(averageStamps),
                )}
                secondaryLabel={TEXT.stampsCardSecondary}
                secondaryValue={numberFormatter.format(latestStamps)}
                trendLabel={TEXT.stampsTrendLabel}
                emptyLabel={TEXT.sparklineEmpty}
                data={stampSeries}
                color="#10b981"
              />
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-left text-sm text-gray-700">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-3 py-2 font-semibold text-gray-600">
                      {TEXT.tableDate}
                    </th>
                    <th scope="col" className="px-3 py-2 font-semibold text-gray-600">
                      {TEXT.tableUsers}
                    </th>
                    <th scope="col" className="px-3 py-2 font-semibold text-gray-600">
                      {TEXT.tableStamps}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {dailyTableRows.length > 0 ? (
                    dailyTableRows.map((row) => (
                      <tr key={row.date} className="bg-white/95">
                        <td className="px-3 py-2">{formatShortIsoDate(row.date)}</td>
                        <td className="px-3 py-2">
                          {numberFormatter.format(row.users)}
                          <span className="ml-1 text-xs text-gray-500">{TEXT.tableUsers}</span>
                        </td>
                        <td className="px-3 py-2">
                          {numberFormatter.format(row.stamps)}
                          <span className="ml-1 text-xs text-gray-500">{TEXT.tableStamps}</span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="px-3 py-4 text-center text-xs text-gray-500" colSpan={3}>
                        {TEXT.tableEmpty}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white/90 p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">{TEXT.couponSectionTitle}</h2>
        <p className="mt-1 text-xs text-gray-500">{TEXT.couponSectionHint}</p>

        {isLoading ? <p className="mt-6 text-sm text-gray-500">{TEXT.couponLoading}</p> : null}

        {hasStats ? (
          coupons.length > 0 ? (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {coupons.map((coupon) => (
                <CouponStatsCard
                  key={coupon.couponId}
                  stat={coupon}
                  numberFormatter={numberFormatter}
                  acquiredLabel={TEXT.couponAcquireLabel}
                  usedLabel={TEXT.couponUseLabel}
                  acquiredTrendLabel={TEXT.couponAcquireTrend}
                  usedTrendLabel={TEXT.couponUseTrend}
                  emptyLabel={TEXT.sparklineEmpty}
                />
              ))}
            </div>
          ) : (
            <p className="mt-6 text-sm text-gray-500">{TEXT.couponEmpty}</p>
          )
        ) : null}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white/90 p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">{TEXT.campaignSummaryTitle}</h2>
        <dl className="mt-4 grid grid-cols-1 gap-3 text-sm text-gray-700 md:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {TEXT.campaignStartLabel}
            </dt>
            <dd className="mt-1">{formatIsoDate(seed.tenant.campaignStart)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {TEXT.campaignEndLabel}
            </dt>
            <dd className="mt-1">{formatIsoDate(seed.tenant.campaignEnd)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {TEXT.campaignMemoLabel}
            </dt>
            <dd className="mt-1 whitespace-pre-line">
              {seed.tenant.campaignDescription?.trim() || TEXT.campaignUnset}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {TEXT.campaignBackgroundLabel}
            </dt>
            <dd className="mt-1 break-all">
              {seed.tenant.backgroundImageUrl?.trim() || TEXT.campaignUnset}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {TEXT.campaignThemeLabel}
            </dt>
            <dd className="mt-1 flex items-center gap-2">
              <span
                aria-hidden
                className="inline-flex h-3 w-3 rounded-full border border-gray-200"
                style={{ backgroundColor: themeSwatch }}
              />
              <span>{themeLabel}</span>
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white/90 p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-gray-900">{TEXT.recentStores}</h2>
          <Link
            to={`/tenant/${tenantId}/admin/stores`}
            className="text-sm font-semibold text-orange-600 hover:text-orange-700"
          >
            {TEXT.recentStoresLinkLabel}
          </Link>
        </div>
        {topStores.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">{TEXT.topStoresEmpty}</p>
        ) : (
          <ul className="mt-4 space-y-3 text-sm text-gray-700">
            {topStores.map((store) => (
              <li key={store.id} className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
                <div className="font-semibold text-gray-900">{store.name}</div>
                <div className="mt-1 text-xs text-gray-500">
                  {formatStoreMeta(store.id, store.lat, store.lng)}
                </div>
                {store.description ? (
                  <div className="mt-2 text-xs text-gray-600 line-clamp-3">{store.description}</div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-orange-100 bg-white/90 p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">{TEXT.shortcutsTitle}</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Link
            to={`/tenant/${tenantId}/admin/stores`}
            className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 shadow-sm transition hover:border-orange-400 hover:text-orange-600"
          >
            {TEXT.shortcutsStoresLabel}
            <span className="mt-1 block text-xs font-normal text-gray-500">
              {TEXT.shortcutsStoresDescription}
            </span>
          </Link>
          <Link
            to={`/tenant/${tenantId}/admin/campaign`}
            className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 shadow-sm transition hover:border-orange-400 hover:text-orange-600"
          >
            {TEXT.shortcutsCampaignLabel}
            <span className="mt-1 block text-xs font-normal text-gray-500">
              {TEXT.shortcutsCampaignDescription}
            </span>
          </Link>
        </div>
      </section>
    </div>
  )
}
