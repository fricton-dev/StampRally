import { type ChangeEvent, type FormEvent, useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"

import { addTenantStore, uploadTenantImage } from "../../lib/api"
import { clearTenantSession } from "../../lib/tenantAdminSession"
import { useTenantAdmin } from "./TenantAdminContext"

type FormState = {
  storeId: string
  name: string
  lat: string
  lng: string
  description: string
  imageUrl: string
  stampMark: string
}

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

  useEffect(() => {
    if (!isEdit) {
      setForm(emptyForm)
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
  }, [isEdit, existingStore])

  const handleChange =
    (key: keyof FormState) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((current) => toFormState(current, key, event.target.value))
    }

  const handleUnauthorized = () => {
    clearTenantSession()
    setError("管理者ログインの有効期限が切れました。再度ログインしてください。")
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
      setImageStatus("画像をアップロードしました。")
      event.target.value = ""
    } catch (err) {
      const status = err instanceof Error ? (err as { status?: number }).status : undefined
      if (status === 401) {
        handleUnauthorized()
      } else {
        const message = err instanceof Error ? err.message : "画像のアップロードに失敗しました。"
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!session.accessToken) {
      handleUnauthorized()
      return
    }
    if (!form.name.trim() || !form.lat.trim() || !form.lng.trim()) {
      setError("店舗名と座標は必須です。")
      return
    }

    setSubmitting(true)
    setMessage(null)
    setError(null)

    try {
      await addTenantStore(session.accessToken, tenantId, {
        storeId: form.storeId.trim() || undefined,
        name: form.name.trim(),
        lat: Number(form.lat),
        lng: Number(form.lng),
        description: form.description.trim() || undefined,
        imageUrl: form.imageUrl.trim() || undefined,
        stampMark: form.stampMark.trim() || undefined,
      })
      await refreshSeed()
      setMessage(isEdit ? "店舗を更新しました。" : "店舗を登録しました。")
      if (!isEdit) {
        setForm(emptyForm)
      }
    } catch (err) {
      const status = err instanceof Error ? (err as { status?: number }).status : undefined
      if (status === 401) {
        handleUnauthorized()
      } else {
        const message = err instanceof Error ? err.message : "店舗情報の保存に失敗しました。"
        setError(message)
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (isEdit && !existingStore) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-4 pb-20">
        <h1 className="text-2xl font-semibold text-gray-900">店舗が見つかりません</h1>
        <p className="text-sm text-gray-600">
          ID <span className="font-mono">{storeId}</span> の店舗は存在しないか、削除された可能性があります。
        </p>
        <Link
          to={`/tenant/${tenantId}/admin/stores`}
          className="inline-flex items-center justify-center rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-orange-600"
        >
          店舗一覧へ戻る
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 pb-20">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-gray-900">
          {isEdit ? "店舗を編集" : "店舗を新規追加"}
        </h1>
        <p className="text-sm text-gray-600">店舗の位置情報や説明、画像などを設定します。</p>
        <Link
          to={`/tenant/${tenantId}/admin/stores`}
          className="inline-flex items-center text-sm font-semibold text-orange-600 hover:text-orange-700"
        >
          ← 店舗管理に戻る
        </Link>
      </header>

      {message && <div className="rounded-md bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{message}</div>}
      {error && <div className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>}

      <form className="space-y-4 rounded-xl border border-gray-200 bg-white/90 p-5 shadow-sm" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">店舗ID（任意）</label>
            <input
              type="text"
              value={form.storeId}
              onChange={handleChange("storeId")}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
              placeholder="未入力の場合は自動発行します"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">店舗名</label>
            <input
              type="text"
              value={form.name}
              onChange={handleChange("name")}
              required
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">緯度</label>
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
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">経度</label>
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
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">店舗画像</label>
            <div className="mt-1 space-y-2 rounded-lg border border-dashed border-gray-300 p-3">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageFileChange}
                disabled={uploadingImage}
                className="block w-full text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-orange-500 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-orange-600"
              />
              {uploadingImage && <p className="text-xs text-gray-500">画像をアップロードしています…</p>}
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
                      画像を開く
                    </a>
                    <button
                      type="button"
                      className="rounded border border-gray-200 px-2 py-1 font-semibold text-gray-600 hover:border-red-300 hover:text-red-500"
                      onClick={handleImageClear}
                    >
                      画像をクリア
                    </button>
                  </div>
                </div>
              )}
              <p className="text-xs text-gray-500">
                最大5MBの PNG / JPEG / GIF / WEBP に対応しています。ファイルを選択すると自動でアップロードされ、下のURL欄に反映されます。
              </p>
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
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">説明</label>
            <textarea
              value={form.description}
              onChange={handleChange("description")}
              rows={4}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
              placeholder="例: 営業時間や補足メモなど"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">スタンプマーク</label>
            <input
              type="text"
              value={form.stampMark}
              onChange={handleChange("stampMark")}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
              placeholder="スタンプ表に表示する任意の短い文字"
            />
          </div>
        </div>
        <button
          type="submit"
          className="w-full rounded-lg bg-orange-500 py-2 text-sm font-semibold text-white shadow hover:bg-orange-600 disabled:opacity-60"
          disabled={submitting}
        >
          {submitting ? "保存中..." : isEdit ? "変更を保存" : "店舗を登録"}
        </button>
      </form>
    </div>
  )
}
