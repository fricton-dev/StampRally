import { type ChangeEvent, type FormEvent, useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"

import { updateTenantCampaign, uploadTenantImage } from "../../lib/api"
import { clearTenantSession } from "../../lib/tenantAdminSession"
import { useTenantAdmin } from "./TenantAdminContext"
import type { ThemeColor } from "../../types"

const THEME_OPTIONS: Array<{ value: ThemeColor; label: string; color: string; description: string }> = [
  { value: "orange", label: "オレンジ", color: "#f97316", description: "明るく親しみやすい定番カラー" },
  { value: "teal", label: "ティール", color: "#14b8a6", description: "爽やかで落ち着いた雰囲気に" },
  { value: "green", label: "グリーン", color: "#22c55e", description: "自然で安心感のある色合い" },
  { value: "pink", label: "ピンク", color: "#ec4899", description: "柔らかく華やかな印象に" },
]

const TEXT = {
  headerTitle: "キャンペーン設定",
  headerDescription: "開催期間や背景画像、テーマカラーなどの情報を更新できます。",
  unauthorized: "管理者ログインの有効期限が切れました。再度ログインしてください。",
  backgroundHint: "トップ背景に表示される画像を設定できます。",
  stampHint: "スタンプを押した際に表示されるイメージなどを設定できます。",
  backgroundUploading: "背景画像をアップロードしています…",
  stampUploading: "スタンプ画像をアップロードしています…",
  imageOpen: "画像を開く",
  imageClear: "画像をクリア",
  imageUploadFailed: "画像のアップロードに失敗しました。",
  campaignStartLabel: "開始日",
  campaignEndLabel: "終了日",
  campaignMemoLabel: "キャンペーンメモ",
  campaignMemoPlaceholder: "スタンプラリーの説明や注意事項を入力してください",
  maxStampLabel: "最大スタンプ数",
  maxStampPlaceholder: "例: 30",
  maxStampHelp: "進捗バーとスタンプ帳に表示される上限値です。（1〜200の整数）",
  maxStampValidation: "最大スタンプ数は1〜200の整数で入力してください。",
  backgroundLabel: "背景画像",
  stampLabel: "スタンプ画像",
  themeSectionTitle: "テーマカラー",
  themeSectionDescription: "サイト全体のアクセントカラーを選択してください。",
  saveButton: "設定を保存",
  savingButton: "保存中...",
  successMessage: "キャンペーン情報を更新しました。",
} as const

type FormState = {
  campaignStart: string
  campaignEnd: string
  campaignDescription: string
  backgroundImageUrl: string
  stampImageUrl: string
  themeColor: ThemeColor
  maxStampCount: string
}

export default function TenantAdminCampaignPage() {
  const { tenantId, seed, session, refreshSeed } = useTenantAdmin()
  const navigate = useNavigate()

  const [form, setForm] = useState<FormState>(() => ({
    campaignStart: seed.tenant.campaignStart ?? "",
    campaignEnd: seed.tenant.campaignEnd ?? "",
    campaignDescription: seed.tenant.campaignDescription ?? "",
    backgroundImageUrl: seed.tenant.backgroundImageUrl ?? "",
    stampImageUrl: seed.tenant.stampImageUrl ?? "",
    themeColor: seed.tenant.themeColor ?? "orange",
    maxStampCount: seed.tenant.maxStampCount ? String(seed.tenant.maxStampCount) : "",
  }))
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploadingField, setUploadingField] = useState<"background" | "stamp" | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setForm({
      campaignStart: seed.tenant.campaignStart ?? "",
      campaignEnd: seed.tenant.campaignEnd ?? "",
      campaignDescription: seed.tenant.campaignDescription ?? "",
      backgroundImageUrl: seed.tenant.backgroundImageUrl ?? "",
      stampImageUrl: seed.tenant.stampImageUrl ?? "",
      themeColor: seed.tenant.themeColor ?? "orange",
      maxStampCount: seed.tenant.maxStampCount ? String(seed.tenant.maxStampCount) : "",
    })
  }, [
    seed.tenant.campaignStart,
    seed.tenant.campaignEnd,
    seed.tenant.campaignDescription,
    seed.tenant.backgroundImageUrl,
    seed.tenant.stampImageUrl,
    seed.tenant.themeColor,
    seed.tenant.maxStampCount,
  ])

  const handleUnauthorized = () => {
    clearTenantSession()
    setError(TEXT.unauthorized)
    navigate(`/tenant/${tenantId}/auth/admin`, { replace: true })
  }

  const handleChange =
    (key: keyof FormState) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.value
      setForm((prev) => ({
        ...prev,
        [key]: value,
      }))
    }

  const handleThemeChange = (value: ThemeColor) => {
    setForm((prev) => ({
      ...prev,
      themeColor: value,
    }))
  }

  const handleFileChange =
    (field: "backgroundImageUrl" | "stampImageUrl", scope: "background" | "stamp") =>
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return
      if (!session.accessToken) {
        handleUnauthorized()
        return
      }

      setUploadingField(scope)
      setMessage(null)
      setError(null)

      try {
        const result = await uploadTenantImage(session.accessToken, file)
        setForm((prev) => ({
          ...prev,
          [field]: result.url,
        }))
      } catch (err) {
        const status = err instanceof Error ? (err as { status?: number }).status : undefined
        if (status === 401) {
          handleUnauthorized()
        } else {
          const msg = err instanceof Error ? err.message : TEXT.imageUploadFailed
          setError(msg)
        }
      } finally {
        setUploadingField(null)
        event.target.value = ""
      }
    }

  const handleImageClear = (field: "backgroundImageUrl" | "stampImageUrl") => () => {
    setForm((prev) => ({
      ...prev,
      [field]: "",
    }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!session.accessToken) {
      handleUnauthorized()
      return
    }

    const trimmedMax = form.maxStampCount.trim()
    let parsedMax: number | undefined
    if (trimmedMax !== "") {
      const numeric = Number.parseInt(trimmedMax, 10)
      if (!Number.isFinite(numeric) || numeric < 1 || numeric > 200) {
        setError(TEXT.maxStampValidation)
        return
      }
      parsedMax = numeric
    }

    setSubmitting(true)
    setMessage(null)
    setError(null)

    try {
      await updateTenantCampaign(session.accessToken, tenantId, {
        campaignStart: form.campaignStart || undefined,
        campaignEnd: form.campaignEnd || undefined,
        campaignDescription: form.campaignDescription.trim() || undefined,
        backgroundImageUrl: form.backgroundImageUrl || undefined,
        stampImageUrl: form.stampImageUrl || undefined,
        themeColor: form.themeColor,
        maxStamps: parsedMax,
      })
      await refreshSeed()
      setMessage(TEXT.successMessage)
    } catch (err) {
      const status = err instanceof Error ? (err as { status?: number }).status : undefined
      if (status === 401) {
        handleUnauthorized()
      } else {
        const msg = err instanceof Error ? err.message : "設定の更新に失敗しました。"
        setError(msg)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 pb-20">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-gray-900">{TEXT.headerTitle}</h1>
        <p className="text-sm text-gray-600">{TEXT.headerDescription}</p>
      </header>

      {message && <div className="rounded-md bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{message}</div>}
      {error && <div className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>}

      <form className="space-y-6 rounded-xl border border-gray-200 bg-white/90 p-5 shadow-sm" onSubmit={handleSubmit}>
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">開催期間</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {TEXT.campaignStartLabel}
              </label>
              <input
                type="date"
                value={form.campaignStart}
                onChange={handleChange("campaignStart")}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {TEXT.campaignEndLabel}
              </label>
              <input
                type="date"
                value={form.campaignEnd}
                onChange={handleChange("campaignEnd")}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {TEXT.campaignMemoLabel}
            </label>
            <textarea
              value={form.campaignDescription}
              onChange={handleChange("campaignDescription")}
              rows={4}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
              placeholder={TEXT.campaignMemoPlaceholder}
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {TEXT.maxStampLabel}
            </label>
            <input
              type="number"
              min={1}
              max={200}
              inputMode="numeric"
              value={form.maxStampCount}
              onChange={handleChange("maxStampCount")}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
              placeholder={TEXT.maxStampPlaceholder}
            />
            <p className="mt-1 text-xs text-gray-500">{TEXT.maxStampHelp}</p>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">画像設定</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {TEXT.backgroundLabel}
              </label>
              <div className="space-y-2 rounded-lg border border-dashed border-gray-300 p-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange("backgroundImageUrl", "background")}
                  disabled={uploadingField === "background"}
                  className="block w-full text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-orange-500 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-orange-600"
                />
                {uploadingField === "background" && (
                  <p className="text-xs text-gray-500">{TEXT.backgroundUploading}</p>
                )}
                {form.backgroundImageUrl ? (
                  <div className="space-y-2">
                    <img
                      src={form.backgroundImageUrl}
                      alt="背景画像プレビュー"
                      className="h-32 w-full rounded-md border border-gray-200 object-cover"
                    />
                    <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                      <a
                        href={form.backgroundImageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded border border-gray-200 px-2 py-1 font-semibold text-orange-600 hover:border-orange-400 hover:text-orange-700"
                      >
                        {TEXT.imageOpen}
                      </a>
                      <button
                        type="button"
                        onClick={handleImageClear("backgroundImageUrl")}
                        className="rounded border border-gray-200 px-2 py-1 font-semibold text-gray-600 hover:border-red-300 hover:text-red-500"
                      >
                        {TEXT.imageClear}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">{TEXT.backgroundHint}</p>
                )}
                <input
                  type="url"
                  value={form.backgroundImageUrl}
                  onChange={handleChange("backgroundImageUrl")}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
                  placeholder="https://example.com/background.jpg"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {TEXT.stampLabel}
              </label>
              <div className="space-y-2 rounded-lg border border-dashed border-gray-300 p-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange("stampImageUrl", "stamp")}
                  disabled={uploadingField === "stamp"}
                  className="block w-full text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-orange-500 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-orange-600"
                />
                {uploadingField === "stamp" && <p className="text-xs text-gray-500">{TEXT.stampUploading}</p>}
                {form.stampImageUrl ? (
                  <div className="space-y-2">
                    <img
                      src={form.stampImageUrl}
                      alt="スタンプ画像プレビュー"
                      className="h-32 w-full rounded-md border border-gray-200 object-cover"
                    />
                    <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                      <a
                        href={form.stampImageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded border border-gray-200 px-2 py-1 font-semibold text-orange-600 hover:border-orange-400 hover:text-orange-700"
                      >
                        {TEXT.imageOpen}
                      </a>
                      <button
                        type="button"
                        onClick={handleImageClear("stampImageUrl")}
                        className="rounded border border-gray-200 px-2 py-1 font-semibold text-gray-600 hover:border-red-300 hover:text-red-500"
                      >
                        {TEXT.imageClear}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">{TEXT.stampHint}</p>
                )}
                <input
                  type="url"
                  value={form.stampImageUrl}
                  onChange={handleChange("stampImageUrl")}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
                  placeholder="https://example.com/stamp.png"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">{TEXT.themeSectionTitle}</h2>
          <p className="text-xs text-gray-500">{TEXT.themeSectionDescription}</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {THEME_OPTIONS.map((option) => {
              const checked = form.themeColor === option.value
              return (
                <label
                  key={option.value}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-3 text-sm shadow-sm transition ${
                    checked ? "border-orange-400 ring-2 ring-orange-200" : "border-gray-200 hover:border-orange-200"
                  }`}
                >
                  <input
                    type="radio"
                    name="theme-color"
                    value={option.value}
                    checked={checked}
                    onChange={() => handleThemeChange(option.value)}
                    className="sr-only"
                  />
                  <span className="h-8 w-8 rounded-full" style={{ backgroundColor: option.color }} />
                  <span>
                    <span className="font-semibold text-gray-900">{option.label}</span>
                    <span className="block text-xs text-gray-500">{option.description}</span>
                  </span>
                </label>
              )
            })}
          </div>
        </section>

        <button
          type="submit"
          className="w-full rounded-lg bg-orange-500 py-2 text-sm font-semibold text-white shadow hover:bg-orange-600 disabled:opacity-60"
          disabled={submitting}
        >
          {submitting ? TEXT.savingButton : TEXT.saveButton}
        </button>
      </form>
    </div>
  )
}
