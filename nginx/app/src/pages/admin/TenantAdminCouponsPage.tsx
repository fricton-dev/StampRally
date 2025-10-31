import { type ChangeEvent, type FormEvent, useMemo, useState } from "react"
import { GiftIcon, TicketIcon, TrophyIcon } from "@heroicons/react/24/solid"
import { useNavigate } from "react-router-dom"

import { deleteTenantRewardRule, upsertTenantRewardRule, uploadTenantImage } from "../../lib/api"
import CouponIcon from "../../components/CouponIcon"
import { clearTenantSession } from "../../lib/tenantAdminSession"
import { useTenantAdmin } from "./TenantAdminContext"
import { normalizeLanguage, getLocaleForLanguage } from "../../lib/i18n"
import { useCouponsText } from "../../lib/adminTexts"
import { ACCEPTED_IMAGE_TYPES } from "../../lib/config"

type IconMode = "preset" | "image"

type FormState = {
  threshold: string
  label: string
  iconMode: IconMode
  iconPreset: string
  iconImageUrl: string
}

const ICON_PRESETS = [
  { value: "gift", Icon: GiftIcon },
  { value: "ticket", Icon: TicketIcon },
  { value: "trophy", Icon: TrophyIcon },
] as const

const DEFAULT_PRESET_ICON = ICON_PRESETS[0].value
const BUILTIN_ICON_SET = new Set(ICON_PRESETS.map((option) => option.value))

const defaultForm: FormState = {
  threshold: "",
  label: "",
  iconMode: "preset",
  iconPreset: DEFAULT_PRESET_ICON,
  iconImageUrl: "",
}

const isImageSource = (value?: string) =>
  Boolean(value && (/^(https?:\/\/|data:|\/)/i.test(value) || value.includes(".")))

export default function TenantAdminCouponsPage() {
  const { tenantId, seed, session, refreshSeed } = useTenantAdmin()
  const TEXT = useCouponsText()
  const navigate = useNavigate()
  const tenantLanguage = normalizeLanguage(seed.tenant.language)
  const locale = getLocaleForLanguage(tenantLanguage)
  const numberFormatter = useMemo(() => new Intl.NumberFormat(locale), [locale])
  const iconOptions = useMemo(
    () =>
      ICON_PRESETS.map((preset) => {
        switch (preset.value) {
          case "ticket":
            return { ...preset, label: TEXT.iconOptionTicket }
          case "trophy":
            return { ...preset, label: TEXT.iconOptionTrophy }
          case "gift":
          default:
            return { ...preset, label: TEXT.iconOptionGift }
        }
      }),
    [TEXT.iconOptionGift, TEXT.iconOptionTicket, TEXT.iconOptionTrophy],
  )
  const [form, setForm] = useState<FormState>({ ...defaultForm })
  const [editingThreshold, setEditingThreshold] = useState<number | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [deletingThreshold, setDeletingThreshold] = useState<number | null>(null)
  const [uploadingIcon, setUploadingIcon] = useState(false)
  const [iconStatus, setIconStatus] = useState<string | null>(null)
  const [iconError, setIconError] = useState<string | null>(null)

  const iconPreviewValue =
    form.iconMode === "image" && form.iconImageUrl.trim().length > 0 ? form.iconImageUrl : form.iconPreset
  const rulesCountLabel = TEXT.existingRulesCount.replace(
    "{count}",
    numberFormatter.format(seed.tenant.rules.length),
  )

  const handleUnauthorized = () => {
    clearTenantSession()
    setError(TEXT.unauthorized)
    navigate(`/tenant/${tenantId}/auth/admin`, { replace: true })
  }

  const resetForm = () => {
    setForm({ ...defaultForm })
    setEditingThreshold(null)
    setIconStatus(null)
    setIconError(null)
  }

  const handleInputChange =
    (key: "threshold" | "label") =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setForm((current) => ({
        ...current,
        [key]: event.target.value,
      }))
    }

  const handleIconModeSelect = (mode: IconMode) => {
    setForm((current) => ({
      ...current,
      iconMode: mode,
      iconImageUrl: mode === "preset" ? "" : current.iconImageUrl,
      iconPreset: current.iconPreset || DEFAULT_PRESET_ICON,
    }))
    setIconStatus(null)
    setIconError(null)
  }

  const handlePresetSelect = (value: string) => {
    setForm((current) => ({
      ...current,
      iconMode: "preset",
      iconPreset: value.toLowerCase(),
      iconImageUrl: "",
    }))
  }

  const handleIconUrlChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    setForm((current) => {
      if (value.trim().length === 0) {
        return {
          ...current,
          iconMode: "preset",
          iconImageUrl: "",
        }
      }
      return {
        ...current,
        iconMode: "image",
        iconImageUrl: value,
      }
    })
  }

  const handleIconImageClear = () => {
    setForm((current) => ({
      ...current,
      iconMode: "preset",
      iconImageUrl: "",
    }))
    setIconStatus(null)
    setIconError(null)
  }

  const handleIconFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const { files } = event.target
    if (!files || files.length === 0) {
      return
    }
    const file = files[0]
    event.target.value = ""

    if (!session.accessToken) {
      handleUnauthorized()
      return
    }

    setUploadingIcon(true)
    setIconStatus(null)
    setIconError(null)

    try {
      await deleteTenantRewardRule(session.accessToken, tenantId, threshold)
      await refreshSeed()
      if (editingThreshold === threshold) {
        resetForm()
      }
      setMessage(TEXT.deleteSuccess)
    } catch (err) {
      const status = err instanceof Error ? (err as { status?: number }).status : undefined
      if (status === 401) {
        handleUnauthorized()
      } else if (status === 404) {
        if (editingThreshold === threshold) {
          resetForm()
        }
        await refreshSeed()
        setMessage(TEXT.deleteSuccess)
      } else {
        const msg = err instanceof Error ? err.message : TEXT.deleteFailure
        setError(msg)
      }
    } finally {
      setUploadingIcon(false)
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.threshold.trim() || !form.label.trim()) {
      setError(TEXT.validationRequiredFields)
      return
    }
    const thresholdValue = Number(form.threshold)
    if (!Number.isFinite(thresholdValue) || thresholdValue <= 0) {
      setError(TEXT.validationThresholdPositive)
      return
    }
    if (!session.accessToken) {
      handleUnauthorized()
      return
    }

    let iconValue: string
    if (form.iconMode === "preset") {
      iconValue = form.iconPreset.trim() || DEFAULT_PRESET_ICON
    } else {
      const value = form.iconImageUrl.trim()
      if (!value) {
        setError(TEXT.validationIconMissing)
        return
      }
      iconValue = value
    }

    setLoading(true)
    setMessage(null)
    setError(null)
    try {
      await upsertTenantRewardRule(session.accessToken, tenantId, {
        threshold: thresholdValue,
        label: form.label.trim(),
        icon: iconValue,
      })
      await refreshSeed()
      setMessage(editingThreshold ? TEXT.saveUpdateSuccess : TEXT.saveCreateSuccess)
      resetForm()
    } catch (err) {
      const status = err instanceof Error ? (err as { status?: number }).status : undefined
      if (status === 401) {
        handleUnauthorized()
      } else {
        const msg = err instanceof Error ? err.message : TEXT.saveFailure
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (threshold: number) => {
    const target = seed.tenant.rules.find((rule) => rule.threshold === threshold)
    if (!target) {
      setError(TEXT.entryLoadFailure)
      return
    }

    const rawIcon = target.icon?.trim() ?? ""
    const lowerIcon = rawIcon.toLowerCase()
    let iconMode: IconMode = "preset"
    let iconPreset = DEFAULT_PRESET_ICON
    let iconImageUrl = ""

    if (rawIcon) {
      if (BUILTIN_ICON_SET.has(lowerIcon)) {
        iconMode = "preset"
        iconPreset = lowerIcon
      } else {
        iconMode = "image"
        iconImageUrl = rawIcon
      }
    }

    setForm({
      threshold: String(target.threshold),
      label: target.label,
      iconMode,
      iconPreset,
      iconImageUrl,
    })
    setEditingThreshold(threshold)
    setMessage(null)
    setError(null)
    setIconStatus(null)
    setIconError(null)
  }

  const handleDelete = async (threshold: number) => {
    const confirmed = window.confirm(TEXT.deleteConfirm)
    if (!confirmed) {
      return
    }
    if (!session.accessToken) {
      handleUnauthorized()
      return
    }
    setDeletingThreshold(threshold)
    setError(null)
    setMessage(null)
    try {
      await deleteTenantRewardRule(session.accessToken, tenantId, threshold)
      await refreshSeed()
      if (editingThreshold === threshold) {
        resetForm()
      }
      setMessage(TEXT.deleteSuccess)
    } catch (err) {
      const status = err instanceof Error ? (err as { status?: number }).status : undefined
      if (status === 401) {
        handleUnauthorized()
      } else if (status === 404) {
        if (editingThreshold === threshold) {
          resetForm()
        }
        await refreshSeed()
        setMessage(TEXT.deleteSuccess)
      } else {
        const msg = err instanceof Error ? err.message : TEXT.deleteFailure
        setError(msg)
      }
    } finally {
      setDeletingThreshold(null)
    }
  }

  const renderModeButton = (mode: IconMode, label: string) => (
    <button
      type="button"
      onClick={() => handleIconModeSelect(mode)}
      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
        form.iconMode === mode
          ? "border-orange-400 bg-orange-50 text-orange-600"
          : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
      }`}
      aria-pressed={form.iconMode === mode}
    >
      {label}
    </button>
  )

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 pb-20">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-gray-900">{TEXT.pageTitle}</h1>
        <p className="text-sm text-gray-600">{TEXT.pageDescription}</p>
      </header>

      {message && <div className="rounded-md bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{message}</div>}
      {error && <div className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>}

      <form
        className="space-y-4 rounded-xl border border-gray-200 bg-white/90 p-5 shadow-sm"
        onSubmit={handleSubmit}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">{TEXT.thresholdLabel}</label>
            <input
              type="number"
              min={1}
              value={form.threshold}
              onChange={handleInputChange("threshold")}
              required
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">{TEXT.labelLabel}</label>
            <input
              type="text"
              value={form.label}
              onChange={handleInputChange("label")}
              required
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">{TEXT.iconSectionLabel}</label>
          <div className="mt-2 space-y-3 rounded-lg border border-gray-200 p-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
              <span>{TEXT.iconPreviewLabel}</span>
              {iconPreviewValue ? (
                <span className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border border-orange-100 bg-white">
                  <CouponIcon icon={iconPreviewValue} className="h-6 w-6 text-orange-500" fillImage />
                </span>
              ) : (
                <span className="text-gray-400">{TEXT.iconPreviewEmpty}</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {renderModeButton("preset", TEXT.iconModePreset)}
              {renderModeButton("image", TEXT.iconModeImage)}
            </div>

            {form.iconMode === "preset" && (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {iconOptions.map((option) => {
                  const selected = form.iconPreset === option.value
                  const Icon = option.Icon
                  return (
                    <button
                      type="button"
                      key={option.value}
                      onClick={() => handlePresetSelect(option.value)}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                        selected
                          ? "border-orange-400 bg-orange-50 text-orange-600"
                          : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                      }`}
                      aria-pressed={selected}
                    >
                      <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg border border-orange-100 bg-white">
                        <Icon className="h-5 w-5 text-orange-500" />
                      </span>
                      <span>{option.label}</span>
                    </button>
                  )
                })}
              </div>
            )}

            {form.iconMode === "image" && (
              <div className="space-y-3 text-sm text-gray-600">
                <input
                  type="file"
                  accept={ACCEPTED_IMAGE_TYPES}
                  onChange={handleIconFileChange}
                  disabled={uploadingIcon}
                  className="block w-full text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-orange-500 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-orange-600"
                />
                {uploadingIcon && <p className="text-xs text-gray-500">{TEXT.iconUploading}</p>}
                {iconStatus && <p className="text-xs text-emerald-600">{iconStatus}</p>}
                {iconError && <p className="text-xs text-red-600">{iconError}</p>}
                {form.iconImageUrl && (
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-white">
                      <img
                        src={form.iconImageUrl}
                        alt={TEXT.iconAlt}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <a
                        href={form.iconImageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded border border-gray-200 px-2 py-1 font-semibold text-orange-600 hover:border-orange-400 hover:text-orange-700"
                      >
                        {TEXT.iconOpen}
                      </a>
                      <button
                        type="button"
                        className="rounded border border-gray-200 px-2 py-1 font-semibold text-gray-600 hover:border-red-300 hover:text-red-500"
                        onClick={handleIconImageClear}
                      >
                        {TEXT.iconClear}
                      </button>
                    </div>
                  </div>
                )}
                <p className="text-xs text-gray-500">
                  {TEXT.iconUploadHint}
                </p>
                <input
                  type="url"
                  value={form.iconImageUrl}
                  onChange={handleIconUrlChange}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
                  placeholder="https://example.com/coupon-icon.png"
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-orange-600 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? TEXT.saveInProgress : editingThreshold ? TEXT.saveUpdateButton : TEXT.saveCreateButton}
          </button>
          {editingThreshold !== null && (
            <button
              type="button"
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-gray-400 hover:text-gray-900"
              onClick={resetForm}
              disabled={loading}
            >
              {TEXT.cancelEdit}
            </button>
          )}
        </div>
      </form>

      <section className="rounded-xl border border-gray-200 bg-white/90 p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900">{TEXT.existingRulesTitle}</h2>
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            {rulesCountLabel}
          </span>
        </div>
        {seed.tenant.rules.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">{TEXT.existingRulesEmpty}</p>
        ) : (
          <ul className="mt-4 space-y-3 text-sm text-gray-700">
            {seed.tenant.rules.map((rule) => {
              const rawIcon = rule.icon?.trim() ?? ""
              const lowerIcon = rawIcon.toLowerCase()
              const fallbackPreset = iconOptions.find((option) => option.value === DEFAULT_PRESET_ICON)
              const presetOption = BUILTIN_ICON_SET.has(lowerIcon)
                ? iconOptions.find((option) => option.value === lowerIcon)
                : rawIcon
                  ? undefined
                  : fallbackPreset
              const displayIcon = rawIcon || DEFAULT_PRESET_ICON
              return (
                <li key={rule.threshold} className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="text-base font-semibold text-gray-900">
                        {TEXT.ruleSummary.replace("{threshold}", numberFormatter.format(rule.threshold)).replace("{label}", rule.label)}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{TEXT.ruleIconLabel}</span>
                        <span className="inline-flex items-center gap-2">
                          <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg border border-orange-100 bg-white">
                            <CouponIcon icon={displayIcon} className="h-6 w-6 text-orange-500" fillImage />
                          </span>
                          {isImageSource(rawIcon) ? (
                            <a
                              href={rawIcon}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded border border-gray-200 px-2 py-1 font-semibold text-orange-600 hover:border-orange-400 hover:text-orange-700"
                            >
                              {TEXT.iconOpen}
                            </a>
                          ) : presetOption ? (
                            <span>{TEXT.ruleIconPreset.replace("{label}", presetOption.label)}</span>
                          ) : rawIcon ? (
                            <span className="text-gray-400">{rawIcon}</span>
                          ) : null}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="rounded border border-orange-300 px-3 py-1.5 text-sm font-semibold text-orange-600 hover:border-orange-400 hover:text-orange-700"
                        onClick={() => handleEdit(rule.threshold)}
                        disabled={loading}
                      >
                        {TEXT.editAction}
                      </button>
                      <button
                        type="button"
                        className="rounded border border-red-300 px-3 py-1.5 text-sm font-semibold text-red-600 hover:border-red-400 hover:text-red-700 disabled:opacity-60"
                        onClick={() => handleDelete(rule.threshold)}
                        disabled={deletingThreshold === rule.threshold}
                      >
                        {deletingThreshold === rule.threshold ? TEXT.deleteInProgress : TEXT.deleteAction}
                      </button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
