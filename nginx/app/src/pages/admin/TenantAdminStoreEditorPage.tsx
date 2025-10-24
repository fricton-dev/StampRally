import { type ChangeEvent, type FormEvent, useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"

import { addTenantStore, uploadTenantImage } from "../../lib/api"
import { geocodeAddress, type GeocodeCandidate } from "../../lib/geo"
import { clearTenantSession } from "../../lib/tenantAdminSession"
import { useTenantAdmin } from "./TenantAdminContext"
import StampQrCard from "../../components/StampQrCard"
import { buildStampPayload } from "../../lib/stamps"

type FormState = {
  storeId: string
  name: string
  lat: string
  lng: string
  description: string
  imageUrl: string
  stampMark: string
}

const TEXT = {
  unauthorizedError: "管理者セッションの有効期限が切れました。再度ログインしてください。",
  imageUploadSuccess: "画像をアップロードしました。",
  imageUploadFailure: "画像のアップロードに失敗しました。",
  addressRequired: "住所を入力してください。",
  addressNotFound: "該当する住所が見つかりませんでした。",
  addressLookupFailed: "住所の検索に失敗しました。",
  addressAppliedSingle: (name: string) => `${name} の座標を反映しました。`,
  addressAppliedMultiple: (count: number) =>
    `${count}件の候補を取得しました。先頭の候補で緯度・経度を入力しています。`,
  coordinatesApplied: (name: string) => `${name} の座標を反映しました。`,
  requiredFields: "店舗名と緯度・経度は必須です。",
  storeCreated: "店舗を登録しました。",
  storeUpdated: "店舗を更新しました。",
  storeSaveFailed: "店舗情報の保存に失敗しました。",
  storeNotFoundTitle: "店舗が見つかりません",
  storeNotFoundMessage: (id: string | undefined) =>
    `ID ${id ?? "-"} の店舗は存在しないか、削除された可能性があります。`,
  backToList: "店舗一覧へ戻る",
  pageTitleCreate: "店舗を追加",
  pageTitleEdit: "店舗を編集",
  pageDescription:
    "緯度と経度は店舗の場所を決めるために必須です。ボタンから住所検索で自動入力もできます。",
  storeIdLabel: "店舗ID（任意）",
  storeIdPlaceholder: "未入力の場合は自動発行されます",
  storeNameLabel: "店舗名",
  addressSearchLabel: "住所から検索",
  addressPlaceholder: "例: 東京都千代田区丸の内1-1-1",
  searchButton: "緯度・経度を検索",
  searchingButton: "検索中...",
  candidateTitle: "候補を選択",
  useThisCoordinate: "この座標を使う",
  latLabel: "緯度",
  lngLabel: "経度",
  imageLabel: "店舗画像",
  imageUploading: "画像をアップロードしています…",
  openImage: "画像を開く",
  clearImage: "画像をクリア",
  imageHint:
    "最大5MBの PNG / JPEG / GIF / WEBP に対応しています。ファイルを選択すると自動でアップロードされ、下のURL欄に反映されます。",
  descriptionLabel: "説明",
  descriptionPlaceholder: "例: 営業時間や補足メモなど",
  stampMarkLabel: "スタンプマーク",
  stampMarkPlaceholder: "スタンプ表に表示する任意の短い文字",
  saveInProgress: "保存中...",
  saveNew: "店舗を登録",
  saveEdit: "変更を保存",
  geocodeLatLng: (lat: number, lng: number) => `緯度: ${lat.toFixed(6)} / 経度: ${lng.toFixed(6)}`,
} as const

const emptyForm: FormState = {
  storeId: "",
  name: "",
  lat: "",
  lng: "",
  description: "",
  imageUrl: "",
  stampMark: "",
}

const toFormState = (state: FormState, key: keyof FormState, value: string): FormState => ({
  ...state,
  [key]: value,
})

export default function TenantAdminStoreEditorPage() {
  const { storeId } = useParams<{ storeId?: string }>()
  const navigate = useNavigate()
  const { tenantId, seed, session, refreshSeed } = useTenantAdmin()
  const isEdit = Boolean(storeId)

  const existingStore = useMemo(
    () => seed.stores.find((store) => store.id === storeId),
    [seed.stores, storeId],
  )

  const [form, setForm] = useState<FormState>(() => {
    if (existingStore) {
      return {
        storeId: existingStore.id,
        name: existingStore.name,
        lat: String(existingStore.lat),
        lng: String(existingStore.lng),
        description: existingStore.description ?? "",
        imageUrl: existingStore.imageUrl ?? "",
        stampMark: existingStore.stampMark ?? "",
      }
    }
    return emptyForm
  })
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [uploadingImage, setUploadingImage] = useState(false)
  const [imageStatus, setImageStatus] = useState<string | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)

  const [addressQuery, setAddressQuery] = useState("")
  const [geocoding, setGeocoding] = useState(false)
  const [geocodeCandidates, setGeocodeCandidates] = useState<GeocodeCandidate[]>([])
  const [geocodeStatus, setGeocodeStatus] = useState<string | null>(null)
  const [geocodeError, setGeocodeError] = useState<string | null>(null)

  useEffect(() => {
    if (!isEdit) {
      setForm(emptyForm)
      setAddressQuery("")
      setGeocodeCandidates([])
      setGeocodeStatus(null)
      setGeocodeError(null)
      return
    }
    if (!existingStore) {
      return
    }
    setForm({
      storeId: existingStore.id,
      name: existingStore.name,
      lat: String(existingStore.lat),
      lng: String(existingStore.lng),
      description: existingStore.description ?? "",
      imageUrl: existingStore.imageUrl ?? "",
      stampMark: existingStore.stampMark ?? "",
    })
    setAddressQuery("")
    setGeocodeCandidates([])
    setGeocodeStatus(null)
    setGeocodeError(null)
  }, [isEdit, existingStore])

  const handleChange =
    (key: keyof FormState) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((current) => toFormState(current, key, event.target.value))
    }

  const handleUnauthorized = () => {
    clearTenantSession()
    setError(TEXT.unauthorizedError)
    navigate(`/tenant/${tenantId}/auth/admin`, { replace: true })
  }

  const handleImageFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }
    if (!session.accessToken) {
      handleUnauthorized()
      return
    }

    setUploadingImage(true)
    setImageStatus(null)
    setImageError(null)

    try {
      const result = await uploadTenantImage(session.accessToken, file)
      setForm((current) => ({
        ...current,
        imageUrl: result.url,
      }))
      setImageStatus(TEXT.imageUploadSuccess)
      event.target.value = ""
    } catch (err) {
      const status = err instanceof Error ? (err as { status?: number }).status : undefined
      if (status === 401) {
        handleUnauthorized()
      } else {
        const message = err instanceof Error ? err.message : TEXT.imageUploadFailure
        setImageError(message)
      }
    } finally {
      setUploadingImage(false)
    }
  }

  const handleImageClear = () => {
    setForm((current) => ({
      ...current,
      imageUrl: "",
    }))
    setImageStatus(null)
    setImageError(null)
  }

  const applyCandidateToForm = (candidate: GeocodeCandidate) => {
    setForm((current) => ({
      ...current,
      lat: candidate.lat.toFixed(6),
      lng: candidate.lng.toFixed(6),
    }))
  }

  const handleGeocodeLookup = async () => {
    const query = addressQuery.trim()
    if (!query) {
      setGeocodeError(TEXT.addressRequired)
      setGeocodeStatus(null)
      setGeocodeCandidates([])
      return
    }

    setGeocoding(true)
    setGeocodeError(null)
    setGeocodeStatus(null)

    try {
      const candidates = await geocodeAddress(query, { limit: 5 })
      if (candidates.length === 0) {
        setGeocodeCandidates([])
        setGeocodeError(TEXT.addressNotFound)
        return
      }

      setGeocodeCandidates(candidates)
      applyCandidateToForm(candidates[0])
      setGeocodeStatus(
        candidates.length === 1
          ? TEXT.addressAppliedSingle(candidates[0].displayName)
          : TEXT.addressAppliedMultiple(candidates.length),
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : TEXT.addressLookupFailed
      setGeocodeError(message)
      setGeocodeCandidates([])
    } finally {
      setGeocoding(false)
    }
  }

  const handleSelectCandidate = (candidate: GeocodeCandidate) => {
    applyCandidateToForm(candidate)
    setGeocodeStatus(TEXT.coordinatesApplied(candidate.displayName))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!session.accessToken) {
      handleUnauthorized()
      return
    }
    if (!form.name.trim() || !form.lat.trim() || !form.lng.trim()) {
      setError(TEXT.requiredFields)
      return
    }

    setSubmitting(true)
    setMessage(null)
    setError(null)

    try {
      const saved = await addTenantStore(session.accessToken, tenantId, {
        storeId: form.storeId.trim() || undefined,
        name: form.name.trim(),
        lat: Number(form.lat),
        lng: Number(form.lng),
        description: form.description.trim() || undefined,
        imageUrl: form.imageUrl.trim() || undefined,
        stampMark: form.stampMark.trim() || undefined,
      })
      await refreshSeed()
      setMessage(isEdit ? TEXT.storeUpdated : TEXT.storeCreated)
      setForm({
        storeId: saved.id,
        name: saved.name,
        lat: String(saved.lat),
        lng: String(saved.lng),
        description: saved.description ?? "",
        imageUrl: saved.imageUrl ?? "",
        stampMark: saved.stampMark ?? "",
      })
      setAddressQuery("")
      setGeocodeCandidates([])
      setGeocodeStatus(null)
      setGeocodeError(null)
    } catch (err) {
      const status = err instanceof Error ? (err as { status?: number }).status : undefined
      if (status === 401) {
        handleUnauthorized()
      } else {
        const message = err instanceof Error ? err.message : TEXT.storeSaveFailed
        setError(message)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const effectiveStoreId = form.storeId.trim() || (existingStore?.id ?? "")
  const qrPayload = effectiveStoreId ? buildStampPayload(tenantId, effectiveStoreId) : null

  if (isEdit && !existingStore) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-4 pb-20">
        <h1 className="text-2xl font-semibold text-gray-900">{TEXT.storeNotFoundTitle}</h1>
        <p className="text-sm text-gray-600">{TEXT.storeNotFoundMessage(storeId)}</p>
        <Link
          to={`/tenant/${tenantId}/admin/stores`}
          className="inline-flex items-center justify-center rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-orange-600"
        >
          {TEXT.backToList}
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 pb-20">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {isEdit ? TEXT.pageTitleEdit : TEXT.pageTitleCreate}
          </h1>
          <p className="mt-1 text-sm text-gray-600">{TEXT.pageDescription}</p>
        </div>
        <Link
          to={`/tenant/${tenantId}/admin/stores`}
          className="inline-flex items-center gap-2 rounded-lg border border-orange-200 px-3 py-1.5 text-sm font-semibold text-orange-600 shadow-sm transition hover:border-orange-400 hover:text-orange-700"
        >
          ← {TEXT.backToList}
        </Link>
      </header>

      {message && <div className="rounded-md bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{message}</div>}
      {error && <div className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>}

      <form className="space-y-4 rounded-xl border border-gray-200 bg-white/90 p-5 shadow-sm" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">{TEXT.storeIdLabel}</label>
            <input
              type="text"
              value={form.storeId}
              onChange={handleChange("storeId")}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
              placeholder={TEXT.storeIdPlaceholder}
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">{TEXT.storeNameLabel}</label>
            <input
              type="text"
              value={form.name}
              onChange={handleChange("name")}
              required
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">{TEXT.addressSearchLabel}</label>
            <div className="mt-1 flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                value={addressQuery}
                onChange={(event) => setAddressQuery(event.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
                placeholder={TEXT.addressPlaceholder}
              />
              <button
                type="button"
                onClick={handleGeocodeLookup}
                disabled={geocoding}
                className="w-full rounded-lg border border-orange-500 bg-orange-500 px-3 py-2 text-sm font-semibold text-white shadow transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-gray-200 disabled:text-gray-500 sm:w-auto"
              >
                {geocoding ? TEXT.searchingButton : TEXT.searchButton}
              </button>
            </div>
            {geocodeStatus && <p className="mt-1 text-xs text-emerald-600">{geocodeStatus}</p>}
            {geocodeError && <p className="mt-1 text-xs text-red-600">{geocodeError}</p>}
            {geocodeCandidates.length > 0 && (
              <div className="mt-3 space-y-2 rounded-lg border border-orange-100 bg-orange-50/60 p-3">
                <p className="text-xs font-semibold text-gray-600">{TEXT.candidateTitle}</p>
                <ul className="space-y-2">
                  {geocodeCandidates.map((candidate, index) => (
                    <li key={`${candidate.lat}-${candidate.lng}-${index}`} className="rounded-lg border border-orange-100 bg-white p-3 text-left">
                      <p className="text-sm font-semibold text-gray-800">{candidate.displayName}</p>
                      <p className="mt-1 text-xs text-gray-500">{TEXT.geocodeLatLng(candidate.lat, candidate.lng)}</p>
                      <button
                        type="button"
                        onClick={() => handleSelectCandidate(candidate)}
                        className="mt-2 inline-flex items-center rounded-md border border-orange-400 px-3 py-1 text-xs font-semibold text-orange-600 transition hover:bg-orange-50"
                      >
                        {TEXT.useThisCoordinate}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">{TEXT.latLabel}</label>
            <input
              type="number"
              step="0.000001"
              value={form.lat}
              onChange={handleChange("lat")}
              required
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">{TEXT.lngLabel}</label>
            <input
              type="number"
              step="0.000001"
              value={form.lng}
              onChange={handleChange("lng")}
              required
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">{TEXT.imageLabel}</label>
            <div className="mt-1 space-y-2 rounded-lg border border-dashed border-gray-300 p-3">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageFileChange}
                disabled={uploadingImage}
                className="block w-full text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-orange-500 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-orange-600"
              />
              {uploadingImage && <p className="text-xs text-gray-500">{TEXT.imageUploading}</p>}
              {imageStatus && <p className="text-xs text-emerald-600">{imageStatus}</p>}
              {imageError && <p className="text-xs text-red-600">{imageError}</p>}
              {form.imageUrl && (
                <div className="flex flex-col gap-2 md:flex-row md:items-center">
                  <img
                    src={form.imageUrl}
                    alt="店舗画像プレビュー"
                    className="h-20 w-20 rounded-md border border-gray-200 object-cover"
                  />
                  <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                    <a
                      href={form.imageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded border border-gray-200 px-2 py-1 font-semibold text-orange-600 hover:border-orange-400 hover:text-orange-700"
                    >
                      {TEXT.openImage}
                    </a>
                    <button
                      type="button"
                      className="rounded border border-gray-200 px-2 py-1 font-semibold text-gray-600 hover:border-red-300 hover:text-red-500"
                      onClick={handleImageClear}
                    >
                      {TEXT.clearImage}
                    </button>
                  </div>
                </div>
              )}
              <p className="text-xs text-gray-500">{TEXT.imageHint}</p>
              <input
                type="url"
                value={form.imageUrl}
                onChange={handleChange("imageUrl")}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
                placeholder="https://example.com/store-image.jpg"
              />
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">{TEXT.descriptionLabel}</label>
            <textarea
              value={form.description}
              onChange={handleChange("description")}
              rows={4}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
              placeholder={TEXT.descriptionPlaceholder}
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">{TEXT.stampMarkLabel}</label>
            <input
              type="text"
              value={form.stampMark}
              onChange={handleChange("stampMark")}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
              placeholder={TEXT.stampMarkPlaceholder}
            />
          </div>
        </div>
        <section className="space-y-3 rounded-xl border border-orange-100 bg-orange-50/70 p-4">
          <h2 className="text-sm font-semibold text-gray-900">スタンプQRコード</h2>
          <p className="text-xs text-gray-600">
            来店時に読み取るQRコードです。ダウンロードして印刷するか、他端末に共有してください。
          </p>
          {qrPayload ? (
            <StampQrCard
              payload={qrPayload}
              title="QRコード"
              description={`STAMP:${tenantId}:${effectiveStoreId}`}
              downloadFilename={`stamp-${tenantId}-${effectiveStoreId}.png`}
            />
          ) : (
            <p className="text-xs text-gray-500">店舗IDが未確定のため、QRコードは保存後に表示されます。</p>
          )}
        </section>
        <button
          type="submit"
          className="w-full rounded-lg bg-orange-500 py-2 text-sm font-semibold text-white shadow hover:bg-orange-600 disabled:opacity-60"
          disabled={submitting}
        >
          {submitting ? TEXT.saveInProgress : isEdit ? TEXT.saveEdit : TEXT.saveNew}
        </button>
      </form>
    </div>
  )
}
