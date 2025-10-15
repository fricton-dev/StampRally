import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"

import { fetchTenantDashboardStats } from "../lib/api"
import type { CouponDailyStat, DailyMetric, TenantDashboardStats, ThemeColor } from "../types"
import { useTenantAdmin } from "./admin/TenantAdminContext"

const THEME_LABELS: Record<ThemeColor, string> = {
  orange: "オレンジ",
  teal: "ティール",
  green: "グリーン",
  pink: "ピンク",
}

const THEME_SWATCH_HEX: Record<ThemeColor, string> = {
  orange: "#f97316",
  teal: "#14b8a6",
  green: "#22c55e",
  pink: "#ec4899",
}

const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric" })
const FULL_DATE_FORMATTER = new Intl.DateTimeFormat("ja-JP", {
  year: "numeric",
  month: "numeric",
  day: "numeric",
})
const NUMBER_FORMATTER = new Intl.NumberFormat("ja-JP")
const DECIMAL_FORMATTER = new Intl.NumberFormat("ja-JP", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
})

const DAY_OPTIONS = [
  { value: 7, label: "直近7日間" },
  { value: 14, label: "直近14日間" },
  { value: 30, label: "直近30日間" },
]


const formatIsoDate = (value?: string | null) => {
  if (!value) return "未設定"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }
  return FULL_DATE_FORMATTER.format(parsed)
}

const formatShortIsoDate = (value: string) => {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }
  return SHORT_DATE_FORMATTER.format(parsed)
}

type TrendSparklineProps = {
  data: DailyMetric[]
  color: string
  ariaLabel?: string
}

const TrendSparkline = ({ data, color, ariaLabel }: TrendSparklineProps) => {
  if (data.length === 0) {
    return <div className="text-xs text-gray-400">データなし</div>
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
      <TrendSparkline data={data} color={color} ariaLabel={trendLabel} />
    </div>
  </div>
)

type CouponStatsCardProps = {
  stat: CouponDailyStat
}

const CouponStatsCard = ({ stat }: CouponStatsCardProps) => (
  <div className="rounded-xl border border-gray-200 bg-white/90 p-4 shadow-sm">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-semibold text-gray-900">{stat.title}</p>
        {stat.description ? <p className="mt-1 text-xs text-gray-500">{stat.description}</p> : null}
      </div>
      <div className="text-right text-xs text-gray-500">
        <p>獲得数: <span className="font-semibold text-gray-900">{NUMBER_FORMATTER.format(stat.totalAcquired)}</span></p>
        <p className="mt-1">利用数: <span className="font-semibold text-gray-900">{NUMBER_FORMATTER.format(stat.totalUsed)}</span></p>
      </div>
    </div>
    <div className="mt-4 grid gap-3 md:grid-cols-2">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-orange-600">獲得の推移</p>
        <TrendSparkline data={stat.acquired} color="#f97316" ariaLabel={`${stat.title} の日次獲得数`} />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">利用の推移</p>
        <TrendSparkline data={stat.used} color="#0ea5e9" ariaLabel={`${stat.title} の日次利用数`} />
      </div>
    </div>
  </div>
)

export default function TenantAdminDashboard() {
  const { tenantId, session, seed } = useTenantAdmin()
  const [days, setDays] = useState<number>(14)
  const [reloadToken, setReloadToken] = useState(0)
  const [stats, setStats] = useState<TenantDashboardStats | null>(null)
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const topStores = useMemo(() => seed.stores.slice(0, 5), [seed.stores])
  const themeColor = (seed.tenant.themeColor ?? "orange") as ThemeColor
  const themeLabel = THEME_LABELS[themeColor]
  const themeSwatch = THEME_SWATCH_HEX[themeColor]

  const isLoading = status === "loading"
  const isError = status === "error"
  const hasStats = status === "ready" && stats

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
        const message = error instanceof Error ? error.message : "ダッシュボードデータの取得に失敗しました"
        setErrorMessage(message)
        setStatus("error")
      })

    return () => {
      cancelled = true
    }
  }, [tenantId, session.accessToken, days, reloadToken])

  const rangeLabel = hasStats && stats ? `${formatIsoDate(stats.rangeStart)} ～ ${formatIsoDate(stats.rangeEnd)}` : ""

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

  const handleRetry = () => {
    setReloadToken((value) => value + 1)
  }

  return (
    <div className="space-y-6 p-4 pb-20">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-orange-600">テナント {seed.tenant.tenantName}</p>
            <h1 className="text-2xl font-semibold text-gray-900">管理ダッシュボード</h1>
          </div>
          <Link
            to={`/tenant/${tenantId}`}
            className="rounded-lg bg-orange-500 px-3 py-1.5 text-sm font-semibold text-white shadow hover:bg-orange-600"
          >
            デモ確認
          </Link>
        </div>
        <p className="text-sm text-gray-600">スタンプラリー利用者・スタンプ数・クーポンの動きを日次で確認できます。</p>
      </header>

      <section className="rounded-xl border border-orange-100 bg-white/90 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">日次モニタリング</h2>
            <p className="text-xs text-gray-500">
              {hasStats ? `${rangeLabel}（${stats.days}日間）` : "期間を選択するとデータを表示します"}
            </p>
          </div>
          <label className="flex items-center gap-2 text-xs font-medium text-gray-700">
            表示期間
            <select
              className="rounded border border-gray-300 bg-white px-2 py-1 text-xs focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              value={days}
              onChange={(event) => setDays(Number(event.target.value))}
            >
              {DAY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {isLoading ? <p className="mt-6 text-sm text-gray-500">ダッシュボードデータを読み込み中です…</p> : null}

        {isError ? (
          <div className="mt-6 space-y-3 rounded-lg bg-red-50 p-4 text-sm text-red-600">
            <p>{errorMessage ?? "データの取得に失敗しました"}</p>
            <button
              type="button"
              onClick={handleRetry}
              className="rounded bg-red-500 px-3 py-1 text-xs font-semibold text-white shadow hover:bg-red-600"
            >
              再読み込み
            </button>
          </div>
        ) : null}

        {hasStats ? (
          <>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <MetricCard
                title="スタンプラリー利用者数"
                primaryValue={`${NUMBER_FORMATTER.format(totalUsers)}人`}
                primaryCaption={`期間内のユニーク利用者数（日平均 ${DECIMAL_FORMATTER.format(averageUsers)}人）`}
                secondaryLabel="直近日"
                secondaryValue={`${NUMBER_FORMATTER.format(latestUsers)}人`}
                trendLabel="スタンプラリー利用者数の日次推移"
                data={userSeries}
                color="#f97316"
              />
              <MetricCard
                title="合計スタンプ数"
                primaryValue={`${NUMBER_FORMATTER.format(totalStamps)}件`}
                primaryCaption={`期間内のスタンプ総数（日平均 ${DECIMAL_FORMATTER.format(averageStamps)}件）`}
                secondaryLabel="直近日"
                secondaryValue={`${NUMBER_FORMATTER.format(latestStamps)}件`}
                trendLabel="スタンプ総数の日次推移"
                data={stampSeries}
                color="#10b981"
              />
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-left text-sm text-gray-700">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-3 py-2 font-semibold text-gray-600">
                      日付
                    </th>
                    <th scope="col" className="px-3 py-2 font-semibold text-gray-600">
                      利用者数
                    </th>
                    <th scope="col" className="px-3 py-2 font-semibold text-gray-600">
                      スタンプ数
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {dailyTableRows.map((row) => (
                    <tr key={row.date} className="bg-white/95">
                      <td className="px-3 py-2">{formatShortIsoDate(row.date)}</td>
                      <td className="px-3 py-2">
                        {NUMBER_FORMATTER.format(row.users)}
                        <span className="ml-1 text-xs text-gray-500">人</span>
                      </td>
                      <td className="px-3 py-2">
                        {NUMBER_FORMATTER.format(row.stamps)}
                        <span className="ml-1 text-xs text-gray-500">件</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white/90 p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">クーポン獲得・利用状況</h2>
        <p className="mt-1 text-xs text-gray-500">クーポンごとの獲得数・利用数を日次で確認できます。集計期間は上記と連動します。</p>

        {isLoading ? <p className="mt-6 text-sm text-gray-500">クーポンデータを読み込み中です…</p> : null}

        {hasStats ? (
          coupons.length > 0 ? (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {coupons.map((coupon) => (
                <CouponStatsCard key={coupon.couponId} stat={coupon} />
              ))}
            </div>
          ) : (
            <p className="mt-6 text-sm text-gray-500">選択期間内に獲得・利用されたクーポンはありません。</p>
          )
        ) : null}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white/90 p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">キャンペーン情報</h2>
        <dl className="mt-4 grid grid-cols-1 gap-3 text-sm text-gray-700 md:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">開始日</dt>
            <dd className="mt-1">{formatIsoDate(seed.tenant.campaignStart)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">終了日</dt>
            <dd className="mt-1">{formatIsoDate(seed.tenant.campaignEnd)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">キャンペーンメモ</dt>
            <dd className="mt-1 whitespace-pre-line">{seed.tenant.campaignDescription?.trim() || "未設定"}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">背景画像URL</dt>
            <dd className="mt-1 break-all">{seed.tenant.backgroundImageUrl?.trim() || "未設定"}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">テーマカラー</dt>
            <dd className="mt-1 flex items-center gap-2">
              <span aria-hidden className="inline-flex h-3 w-3 rounded-full border border-gray-200" style={{ backgroundColor: themeSwatch }} />
              <span>{themeLabel}</span>
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white/90 p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-gray-900">最近追加した店舗</h2>
          <Link
            to={`/tenant/${tenantId}/admin/stores`}
            className="text-sm font-semibold text-orange-600 hover:text-orange-700"
          >
            店舗管理へ
          </Link>
        </div>
        {topStores.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">登録された店舗はまだありません。</p>
        ) : (
          <ul className="mt-4 space-y-3 text-sm text-gray-700">
            {topStores.map((store) => (
              <li key={store.id} className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
                <div className="font-semibold text-gray-900">{store.name}</div>
                <div className="mt-1 text-xs text-gray-500">ID: {store.id} ・ 緯度: {store.lat.toFixed(5)} ／ 経度: {store.lng.toFixed(5)}</div>
                {store.description ? (
                  <div className="mt-2 text-xs text-gray-600 line-clamp-3">{store.description}</div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-orange-100 bg-white/90 p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">管理ショートカット</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Link
            to={`/tenant/${tenantId}/admin/stores`}
            className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 shadow-sm transition hover:border-orange-400 hover:text-orange-600"
          >
            店舗管理へ
            <span className="mt-1 block text-xs font-normal text-gray-500">店舗一覧の確認・編集・追加を行います。</span>
          </Link>
          <Link
            to={`/tenant/${tenantId}/admin/campaign`}
            className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 shadow-sm transition hover:border-orange-400 hover:text-orange-600"
          >
            キャンペーン設定へ
            <span className="mt-1 block text-xs font-normal text-gray-500">背景画像やテーマカラー、開催期間などをまとめて管理できます。</span>
          </Link>
        </div>
      </section>
    </div>
  )
}
