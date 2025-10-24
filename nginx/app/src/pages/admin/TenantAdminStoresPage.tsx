import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { XMarkIcon } from "@heroicons/react/24/solid"

import { deleteTenantStore } from "../../lib/api"
import { clearTenantSession } from "../../lib/tenantAdminSession"
import { useTenantAdmin } from "./TenantAdminContext"
import StampQrCard from "../../components/StampQrCard"
import { buildStampPayload } from "../../lib/stamps"
import type { Store } from "../../types"

const TEXT = {
  title: "店舗管理",
  description: "登録済み店舗の確認・編集・削除を行えます。",
  countLabel: (count: number) => `現在 ${count} 店舗`,
  addStore: "店舗を追加",
  unauthorized: "管理者ログインの有効期限が切れました。再度ログインしてください。",
  deleteConfirm: "この店舗を削除しますか？この操作は取り消せません。",
  deleteSuccess: "店舗を削除しました。",
  deleteFailure: "店舗の削除に失敗しました。",
  emptyState:
    "まだ店舗が登録されていません。「店舗を追加」ボタンから新しい店舗を登録してください。",
  imageHeader: "画像",
  nameHeader: "店舗名",
  actionHeader: "操作",
  edit: "編集",
  deleting: "削除中...",
  delete: "削除",
  qrButton: "QR",
  noImage: "No Image",
  qrModalTitle: "スタンプQRコード",
  qrModalDescription: (name: string) => `${name} のスタンプ取得用QRコードです。`,
  close: "閉じる",
} as const

export default function TenantAdminStoresPage() {
  const { tenantId, seed, session, refreshSeed } = useTenantAdmin()
  const navigate = useNavigate()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [qrStore, setQrStore] = useState<Store | null>(null)

  const handleUnauthorized = () => {
    clearTenantSession()
    setError(TEXT.unauthorized)
    navigate(`/tenant/${tenantId}/auth/admin`, { replace: true })
  }

  const handleDelete = async (storeId: string) => {
    if (!session.accessToken) {
      handleUnauthorized()
      return
    }
    if (!window.confirm(TEXT.deleteConfirm)) {
      return
    }
    setDeletingId(storeId)
    setMessage(null)
    setError(null)
    try {
      await deleteTenantStore(session.accessToken, tenantId, storeId)
      setMessage(TEXT.deleteSuccess)
      await refreshSeed()
    } catch (err) {
      const status = err instanceof Error ? (err as { status?: number }).status : undefined
      if (status === 401) {
        handleUnauthorized()
      } else {
        const msg = err instanceof Error ? err.message : TEXT.deleteFailure
        setError(msg)
      }
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 pb-20">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{TEXT.title}</h1>
          <p className="text-sm text-gray-600">{TEXT.description}</p>
          <p className="mt-1 text-xs text-gray-500">{TEXT.countLabel(seed.stores.length)}</p>
        </div>
        <Link
          to={`/tenant/${tenantId}/admin/stores/new`}
          className="rounded-lg bg-orange-500 px-3 py-1.5 text-sm font-semibold text-white shadow transition hover:bg-orange-600"
        >
          {TEXT.addStore}
        </Link>
      </header>

      {message && <div className="rounded-md bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{message}</div>}
      {error && <div className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>}

      {seed.stores.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white/80 p-8 text-center text-sm text-gray-500">
          {TEXT.emptyState}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white/90 shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th scope="col" className="px-4 py-3 text-left">
                  {TEXT.imageHeader}
                </th>
                <th scope="col" className="px-4 py-3 text-left">
                  {TEXT.nameHeader}
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  {TEXT.actionHeader}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {seed.stores.map((store) => (
                <tr key={store.id} className="hover:bg-orange-50/40">
                  <td className="px-4 py-3">
                    {store.imageUrl ? (
                      <div className="h-16 w-16 overflow-hidden rounded-md border border-gray-200">
                        <img src={store.imageUrl} alt={`${store.name}の画像`} className="h-full w-full object-cover" />
                      </div>
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-md border border-dashed border-gray-300 text-[10px] text-gray-400">
                        {TEXT.noImage}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{store.name}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        className="rounded border border-orange-300 px-3 py-1 text-xs font-semibold text-orange-600 hover:border-orange-400 hover:text-orange-700"
                        onClick={() => setQrStore(store)}
                      >
                        {TEXT.qrButton}
                      </button>
                      <Link
                        to={`/tenant/${tenantId}/admin/stores/${store.id}/edit`}
                        className="rounded border border-orange-300 px-3 py-1 text-xs font-semibold text-orange-600 hover:border-orange-400 hover:text-orange-700"
                      >
                        {TEXT.edit}
                      </Link>
                      <button
                        type="button"
                        className="rounded border border-red-300 px-3 py-1 text-xs font-semibold text-red-600 hover:border-red-400 hover:text-red-700 disabled:opacity-60"
                        onClick={() => handleDelete(store.id)}
                        disabled={deletingId === store.id}
                      >
                        {deletingId === store.id ? TEXT.deleting : TEXT.delete}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {qrStore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setQrStore(null)} />
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <button
              type="button"
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
              onClick={() => setQrStore(null)}
              aria-label={TEXT.close}
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
            <h3 className="text-lg font-bold text-gray-900">{TEXT.qrModalTitle}</h3>
            <p className="mt-1 text-sm text-gray-600">{TEXT.qrModalDescription(qrStore.name)}</p>
            <div className="mt-4">
              <StampQrCard
                payload={buildStampPayload(tenantId, qrStore.id)}
                title="QRコード"
                description={`STAMP:${tenantId}:${qrStore.id}`}
                downloadFilename={`stamp-${tenantId}-${qrStore.id}.png`}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
