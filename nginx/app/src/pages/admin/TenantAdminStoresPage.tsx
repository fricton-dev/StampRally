import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"

import { deleteTenantStore } from "../../lib/api"
import { clearTenantSession } from "../../lib/tenantAdminSession"
import { useTenantAdmin } from "./TenantAdminContext"

export default function TenantAdminStoresPage() {
  const { tenantId, seed, session, refreshSeed } = useTenantAdmin()
  const navigate = useNavigate()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleUnauthorized = () => {
    clearTenantSession()
    setError("管理者ログインの有効期限が切れました。再度ログインしてください。")
    navigate(`/tenant/${tenantId}/auth/admin`, { replace: true })
  }

  const handleDelete = async (storeId: string) => {
    if (!session.accessToken) {
      handleUnauthorized()
      return
    }
    const confirmed = window.confirm("この店舗を削除しますか？この操作は元に戻せません。")
    if (!confirmed) {
      return
    }
    setDeletingId(storeId)
    setMessage(null)
    setError(null)
    try {
      await deleteTenantStore(session.accessToken, tenantId, storeId)
      setMessage("店舗を削除しました。")
      await refreshSeed()
    } catch (err) {
      const status = err instanceof Error ? (err as { status?: number }).status : undefined
      if (status === 401) {
        handleUnauthorized()
      } else {
        const msg = err instanceof Error ? err.message : "店舗の削除に失敗しました。"
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
          <h1 className="text-2xl font-semibold text-gray-900">店舗管理</h1>
          <p className="text-sm text-gray-600">登録済み店舗の確認・編集・削除を行います。</p>
          <p className="mt-1 text-xs text-gray-500">現在 {seed.stores.length} 店舗</p>
        </div>
        <Link
          to={`/tenant/${tenantId}/admin/stores/new`}
          className="rounded-lg bg-orange-500 px-3 py-1.5 text-sm font-semibold text-white shadow hover:bg-orange-600"
        >
          店舗を追加
        </Link>
      </header>

      {message && <div className="rounded-md bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{message}</div>}
      {error && <div className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>}

      {seed.stores.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white/80 p-8 text-center text-sm text-gray-500">
          まだ店舗が登録されていません。右上の「店舗を追加」ボタンから登録してください。
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white/90 shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th scope="col" className="px-4 py-3 text-left">
                  画像
                </th>
                <th scope="col" className="px-4 py-3 text-left">
                  店舗名
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {seed.stores.map((store) => (
                <tr key={store.id} className="hover:bg-orange-50/40">
                  <td className="px-4 py-3">
                    {store.imageUrl ? (
                      <div className="h-16 w-16 overflow-hidden rounded-md border border-gray-200">
                        <img src={store.imageUrl} alt={`${store.name} の画像`} className="h-full w-full object-cover" />
                      </div>
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-md border border-dashed border-gray-300 text-[10px] text-gray-400">
                        No Image
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{store.name}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Link
                        to={`/tenant/${tenantId}/admin/stores/${store.id}/edit`}
                        className="rounded border border-orange-300 px-3 py-1 text-xs font-semibold text-orange-600 hover:border-orange-400 hover:text-orange-700"
                      >
                        編集
                      </Link>
                      <button
                        type="button"
                        className="rounded border border-red-300 px-3 py-1 text-xs font-semibold text-red-600 hover:border-red-400 hover:text-red-700 disabled:opacity-60"
                        onClick={() => handleDelete(store.id)}
                        disabled={deletingId === store.id}
                      >
                        {deletingId === store.id ? "削除中..." : "削除"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
