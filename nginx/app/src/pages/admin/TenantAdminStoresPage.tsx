import { useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/solid"

import { deleteTenantStore } from "../../lib/api"
import { clearTenantSession } from "../../lib/tenantAdminSession"
import { useTenantAdmin } from "./TenantAdminContext"
import StampQrCard from "../../components/StampQrCard"
import { buildStampPayload } from "../../lib/stamps"
import type { Store } from "../../types"
import { normalizeLanguage, getLocaleForLanguage } from "../../lib/i18n"
import { useStoresText } from "../../lib/adminTexts"

export default function TenantAdminStoresPage() {
  const { tenantId, seed, session, refreshSeed } = useTenantAdmin()
  const TEXT = useStoresText()
  const tenantLanguage = normalizeLanguage(seed.tenant.language)
  const locale = getLocaleForLanguage(tenantLanguage)
  const numberFormatter = useMemo(() => new Intl.NumberFormat(locale), [locale])
  const navigate = useNavigate()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [qrStore, setQrStore] = useState<Store | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)

  const filteredStores = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    if (!query) return seed.stores
    return seed.stores.filter((store) => store.name.toLowerCase().includes(query))
  }, [searchTerm, seed.stores])

  const storeCountLabel = TEXT.countLabel.replace("{count}", numberFormatter.format(seed.stores.length))

  const handleUnauthorized = () => {
    clearTenantSession()
    setError(TEXT.unauthorized)
    navigate(`/tenant/${tenantId}/auth/admin`, { replace: true })
  }

  const handleDelete = async (storeId: string) => {
    setActiveMenuId(null)
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
      } else if (status === 404) {
        setMessage(TEXT.deleteSuccess)
        await refreshSeed()
      } else {
        const msg = err instanceof Error ? err.message : TEXT.deleteFailed
        setError(msg)
      }
    } finally {
      setDeletingId(null)
    }
  }

  const hasStores = seed.stores.length > 0

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4 pb-20">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{TEXT.pageTitle}</h1>
          <p className="text-sm text-gray-600">{TEXT.pageDescription}</p>
          <p className="mt-1 text-xs text-gray-500">{storeCountLabel}</p>
        </div>
        <div className="flex w-full flex-col items-start gap-2 sm:w-auto sm:items-center">
          <Link
            to={`/tenant/${tenantId}/admin/stores/new`}
            className="inline-flex items-center justify-center rounded-lg bg-orange-500 px-4 py-1.5 text-sm font-semibold text-white shadow transition hover:bg-orange-600"
          >
            {TEXT.addStore}
          </Link>
        </div>
      </header>

      <div className="flex justify-center">
        <input
          type="text"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder={TEXT.searchPlaceholder}
          className="w-full max-w-lg rounded-lg border border-gray-200 bg-white px-4 py-1.5 text-sm text-gray-700 shadow-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
        />
      </div>

      {message && <div className="rounded-md bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{message}</div>}
      {error && <div className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>}

      {!hasStores ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white/80 p-8 text-center text-sm text-gray-500">
          {TEXT.storesEmpty}
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
              {filteredStores.map((store) => (
                <tr key={store.id} className="hover:bg-orange-50/40">
                  <td className="px-4 py-3">
                    {store.imageUrl ? (
                      <div className="h-16 w-16 overflow-hidden rounded-md border border-gray-200">
                        <img
                          src={store.imageUrl}
                          alt={TEXT.imageAlt.replace("{name}", store.name)}
                          className="h-full w-full object-cover"
                        />
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
                      <div className="relative">
                        <button
                          type="button"
                          aria-haspopup="true"
                          aria-expanded={activeMenuId === store.id}
                          onClick={() =>
                            setActiveMenuId((current) => (current === store.id ? null : store.id))
                          }
                          className="inline-flex items-center justify-center rounded border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-600 hover:border-gray-400 hover:text-gray-900"
                        >
                          <Bars3Icon className="h-4 w-4" aria-hidden="true" />
                        </button>
                        {activeMenuId === store.id && (
                          <div className="absolute right-0 z-10 mt-1 w-32 rounded-lg border border-gray-200 bg-white py-1 text-xs shadow-lg">
                            <Link
                              to={`/tenant/${tenantId}/admin/stores/${store.id}/edit`}
                              onClick={() => setActiveMenuId(null)}
                              className="block px-3 py-2 text-gray-700 transition hover:bg-orange-50 hover:text-orange-600"
                            >
                              {TEXT.editAction}
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleDelete(store.id)}
                              className="block w-full px-3 py-2 text-left text-red-600 transition hover:bg-red-50"
                              disabled={deletingId === store.id}
                            >
                              {deletingId === store.id ? TEXT.deleteInProgress : TEXT.deleteAction}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredStores.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-10 text-center text-sm text-gray-500">
                    {TEXT.noMatch}
                  </td>
                </tr>
              )}
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
            <p className="mt-1 text-sm text-gray-600">
              {TEXT.qrModalDescription.replace("{name}", qrStore.name)}
            </p>
            <div className="mt-4">
              <StampQrCard
                payload={buildStampPayload(tenantId, qrStore.id)}
                title={TEXT.qrModalDownloadLabel}
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
