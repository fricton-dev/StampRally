import { type ChangeEvent, type FormEvent, useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"

import { updateTenantCampaign, uploadTenantImage } from "../../lib/api"
import { ACCEPTED_IMAGE_TYPES } from "../../lib/config"
import { clearTenantSession } from "../../lib/tenantAdminSession"
import { useTenantAdmin } from "./TenantAdminContext"
import type { ThemeColor, CouponUsageMode } from "../../types"
import { useCampaignText } from "../../lib/adminTexts"

const THEME_PALETTE: Array<{ value: ThemeColor; color: string }> = [
  { value: "orange", color: "#f97316" },
  { value: "teal", color: "#14b8a6" },
  { value: "green", color: "#22c55e" },
  { value: "pink", color: "#ec4899" },
]

type FormState = {
  campaignStart: string
  campaignEnd: string
  campaignTimezone: string
  couponUsageMode: CouponUsageMode
  couponUsageStart: string
  couponUsageEnd: string
  campaignDescription: string
  backgroundImageUrl: string
  stampImageUrl: string
  themeColor: ThemeColor
  maxStampCount: string
}

export default function TenantAdminCampaignPage() {
  const { tenantId, seed, session, refreshSeed } = useTenantAdmin()
  const TEXT = useCampaignText()
  const navigate = useNavigate()

  const [form, setForm] = useState<FormState>(() => ({
    campaignStart: seed.tenant.campaignStart ?? "",
    campaignEnd: seed.tenant.campaignEnd ?? "",
    campaignTimezone: seed.tenant.campaignTimezone ?? "UTC+09:00",
    couponUsageMode: (seed.tenant.couponUsageMode ?? "campaign") as CouponUsageMode,
    couponUsageStart: seed.tenant.couponUsageStart ?? "",
    couponUsageEnd: seed.tenant.couponUsageEnd ?? "",
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

  const themeOptions = useMemo(
    () =>
      THEME_PALETTE.map((option) => {
        switch (option.value) {
          case "teal":
            return {
              ...option,
              label: TEXT.themeOptionTealLabel,
              description: TEXT.themeOptionTealDescription,
            }
          case "green":
            return {
              ...option,
              label: TEXT.themeOptionGreenLabel,
              description: TEXT.themeOptionGreenDescription,
            }
          case "pink":
            return {
              ...option,
              label: TEXT.themeOptionPinkLabel,
              description: TEXT.themeOptionPinkDescription,
            }
          case "orange":
          default:
            return {
              ...option,
              label: TEXT.themeOptionOrangeLabel,
              description: TEXT.themeOptionOrangeDescription,
            }
        }
      }),
    [
      TEXT.themeOptionGreenDescription,
      TEXT.themeOptionGreenLabel,
      TEXT.themeOptionOrangeDescription,
      TEXT.themeOptionOrangeLabel,
      TEXT.themeOptionPinkDescription,
      TEXT.themeOptionPinkLabel,
      TEXT.themeOptionTealDescription,
      TEXT.themeOptionTealLabel,
    ],
  )

  const timezoneOptions = useMemo(
    () => [
      { value: "UTC+09:00", label: TEXT.timezoneOption0900 },
      { value: "UTC+08:00", label: TEXT.timezoneOption0800 },
    ],
    [TEXT.timezoneOption0800, TEXT.timezoneOption0900],
  )

  useEffect(() => {
    setForm({
      campaignStart: seed.tenant.campaignStart ?? "",
      campaignEnd: seed.tenant.campaignEnd ?? "",
      campaignTimezone: seed.tenant.campaignTimezone ?? "UTC+09:00",
      couponUsageMode: (seed.tenant.couponUsageMode ?? "campaign") as CouponUsageMode,
      couponUsageStart: seed.tenant.couponUsageStart ?? "",
      couponUsageEnd: seed.tenant.couponUsageEnd ?? "",
      campaignDescription: seed.tenant.campaignDescription ?? "",
      backgroundImageUrl: seed.tenant.backgroundImageUrl ?? "",
      stampImageUrl: seed.tenant.stampImageUrl ?? "",
      themeColor: seed.tenant.themeColor ?? "orange",
      maxStampCount: seed.tenant.maxStampCount ? String(seed.tenant.maxStampCount) : "",
    })
  }, [
    seed.tenant.campaignStart,
    seed.tenant.campaignEnd,
    seed.tenant.campaignTimezone,
    seed.tenant.couponUsageMode,
    seed.tenant.couponUsageStart,
    seed.tenant.couponUsageEnd,
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
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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

  const handleCouponUsageModeChange = (mode: CouponUsageMode) => {
    setForm((prev) => ({
      ...prev,
      couponUsageMode: mode,
      ...(mode === "campaign"
        ? { couponUsageStart: "", couponUsageEnd: "" }
        : {}),
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
        campaignTimezone: form.campaignTimezone || undefined,
        couponUsageMode: form.couponUsageMode,
        couponUsageStart:
          form.couponUsageMode === "custom" ? form.couponUsageStart || undefined : undefined,
        couponUsageEnd:
          form.couponUsageMode === "custom" ? form.couponUsageEnd || undefined : undefined,
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
        const msg = err instanceof Error ? err.message : TEXT.saveFailure
        setError(msg)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 pb-20">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-gray-900">{TEXT.pageTitle}</h1>
        <p className="text-sm text-gray-600">{TEXT.pageDescription}</p>
      </header>

      {message && <div className="rounded-md bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{message}</div>}
      {error && <div className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>}

      <form className="space-y-6 rounded-xl border border-gray-200 bg-white/90 p-5 shadow-sm" onSubmit={handleSubmit}>
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">{TEXT.scheduleSectionTitle}</h2>
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
              {TEXT.campaignTimezoneLabel}
            </label>
            <p className="mt-1 text-xs text-gray-500">{TEXT.campaignTimezoneDescription}</p>
            <select
              value={form.campaignTimezone}
              onChange={handleChange("campaignTimezone")}
              className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
            >
              {timezoneOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
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
          <div className="space-y-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {TEXT.couponUsageSectionTitle}
            </span>
            <div className="flex flex-col gap-2 sm:flex-row">
              <label
                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                  form.couponUsageMode === "campaign"
                    ? "border-orange-400 bg-orange-50 text-orange-600"
                    : "border-gray-200 bg-white text-gray-600 hover:border-orange-200"
                }`}
              >
                <input
                  type="radio"
                  name="coupon-usage-mode"
                  value="campaign"
                  checked={form.couponUsageMode === "campaign"}
                  onChange={() => handleCouponUsageModeChange("campaign")}
                  className="sr-only"
                />
                <span>{TEXT.couponUsageModeCampaign}</span>
              </label>
              <label
                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                  form.couponUsageMode === "custom"
                    ? "border-orange-400 bg-orange-50 text-orange-600"
                    : "border-gray-200 bg-white text-gray-600 hover:border-orange-200"
                }`}
              >
                <input
                  type="radio"
                  name="coupon-usage-mode"
                  value="custom"
                  checked={form.couponUsageMode === "custom"}
                  onChange={() => handleCouponUsageModeChange("custom")}
                  className="sr-only"
                />
                <span>{TEXT.couponUsageModeCustom}</span>
              </label>
            </div>
            {form.couponUsageMode === "custom" && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {TEXT.couponUsageStartLabel}
                  </label>
                  <input
                    type="date"
                    value={form.couponUsageStart}
                    onChange={handleChange("couponUsageStart")}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {TEXT.couponUsageEndLabel}
                  </label>
                  <input
                    type="date"
                    value={form.couponUsageEnd}
                    onChange={handleChange("couponUsageEnd")}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
                  />
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">{TEXT.imageSectionTitle}</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {TEXT.backgroundLabel}
              </label>
              <div className="space-y-2 rounded-lg border border-dashed border-gray-300 p-3">
                <input
                  type="file"
                  accept={ACCEPTED_IMAGE_TYPES}
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
                      alt={TEXT.backgroundPreviewAlt}
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
                  accept={ACCEPTED_IMAGE_TYPES}
                  onChange={handleFileChange("stampImageUrl", "stamp")}
                  disabled={uploadingField === "stamp"}
                  className="block w-full text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-orange-500 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-orange-600"
                />
                {uploadingField === "stamp" && <p className="text-xs text-gray-500">{TEXT.stampUploading}</p>}
                {form.stampImageUrl ? (
                  <div className="space-y-2">
                    <img
                      src={form.stampImageUrl}
                      alt={TEXT.stampPreviewAlt}
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
            {themeOptions.map((option) => {
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
