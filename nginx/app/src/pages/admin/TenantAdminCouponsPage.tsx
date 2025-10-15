import { type ChangeEvent, type FormEvent, useState } from "react"
import { useNavigate } from "react-router-dom"

import { deleteTenantRewardRule, upsertTenantRewardRule } from "../../lib/api"
import { clearTenantSession } from "../../lib/tenantAdminSession"
import { useTenantAdmin } from "./TenantAdminContext"

type FormState = {
  threshold: string
  label: string
  icon: string
}

const defaultForm: FormState = {
  threshold: "",
  label: "",
  icon: "",
}

export default function TenantAdminCouponsPage() {
  const { tenantId, seed, session, refreshSeed } = useTenantAdmin()
  const navigate = useNavigate()
  const [form, setForm] = useState<FormState>(defaultForm)
  const [editingThreshold, setEditingThreshold] = useState<number | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [deletingThreshold, setDeletingThreshold] = useState<number | null>(null)

  const handleUnauthorized = () => {
    clearTenantSession()
    setError("管理者ログインの有効期限が切れました。再度ログインしてください。")
    navigate(`/tenant/${tenantId}/auth/admin`, { replace: true })
  }

  const resetForm = () => {
    setForm(defaultForm)
    setEditingThreshold(null)
  }

  const handleChange =
    (key: keyof FormState) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setForm((current) => ({
        ...current,
        [key]: event.target.value,
      }))
    }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.threshold.trim() || !form.label.trim()) {
      setError("必要スタンプ数と特典名は必須です。")
      return
    }
    const thresholdValue = Number(form.threshold)
    if (!Number.isFinite(thresholdValue) || thresholdValue <= 0) {
      setError("必要スタンプ数は1以上の数値で入力してください。")
      return
    }
    if (!session.accessToken) {
      handleUnauthorized()
      return
    }

    setLoading(true)
    setMessage(null)
    setError(null)
    try {
      await upsertTenantRewardRule(session.accessToken, tenantId, {
        threshold: thresholdValue,
        label: form.label.trim(),
        icon: form.icon.trim() || undefined,
      })
      await refreshSeed()
      setMessage(editingThreshold ? "特典ルールを更新しました。" : "特典ルールを作成しました。")
      resetForm()
    } catch (err) {
      const status = err instanceof Error ? (err as { status?: number }).status : undefined
      if (status === 401) {
        handleUnauthorized()
      } else {
        const msg = err instanceof Error ? err.message : "特典ルールの保存に失敗しました。"
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (threshold: number) => {
    const target = seed.tenant.rules.find((rule) => rule.threshold === threshold)
    if (!target) {
      setError("選択したルールを読み込めませんでした。")
      return
    }
    setForm({
      threshold: String(target.threshold),
      label: target.label,
      icon: target.icon ?? "",
    })
    setEditingThreshold(threshold)
    setMessage(null)
    setError(null)
  }

  const handleDelete = async (threshold: number) => {
    const confirmed = window.confirm("この特典ルールを削除しますか？")
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
      setMessage("特典ルールを削除しました。")
    } catch (err) {
      const status = err instanceof Error ? (err as { status?: number }).status : undefined
      if (status === 401) {
        handleUnauthorized()
      } else {
        const msg = err instanceof Error ? err.message : "特典ルールの削除に失敗しました。"
        setError(msg)
      }
    } finally {
      setDeletingThreshold(null)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 pb-20">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-gray-900">クーポン・特典の管理</h1>
        <p className="text-sm text-gray-600">特典を獲得するために必要なスタンプ数や表示名、アイコンを設定します。</p>
      </header>

      {message && <div className="rounded-md bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{message}</div>}
      {error && <div className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>}

      <form
        className="space-y-4 rounded-xl border border-gray-200 bg-white/90 p-5 shadow-sm"
        onSubmit={handleSubmit}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">必要スタンプ数</label>
            <input
              type="number"
              min={1}
              value={form.threshold}
              onChange={handleChange("threshold")}
              required
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">特典名</label>
            <input
              type="text"
              value={form.label}
              onChange={handleChange("label")}
              required
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
            />
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">アイコン（任意）</label>
          <input
            type="text"
            value={form.icon}
            onChange={handleChange("icon")}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
            placeholder="例: gift / ticket / trophy"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-orange-600 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "保存中..." : editingThreshold ? "特典を更新" : "特典を追加"}
          </button>
          {editingThreshold !== null && (
            <button
              type="button"
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-gray-400 hover:text-gray-900"
              onClick={resetForm}
              disabled={loading}
            >
              編集をキャンセル
            </button>
          )}
        </div>
      </form>

      <section className="rounded-xl border border-gray-200 bg-white/90 p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900">登録済みの特典ルール</h2>
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            全 {seed.tenant.rules.length} 件
          </span>
        </div>
        {seed.tenant.rules.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">まだ特典ルールがありません。上のフォームから追加してください。</p>
        ) : (
          <ul className="mt-4 space-y-3 text-sm text-gray-700">
            {seed.tenant.rules.map((rule) => (
              <li key={rule.threshold} className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-base font-semibold text-gray-900">
                      {rule.threshold} スタンプで {rule.label}
                    </div>
                    {rule.icon && <div className="mt-1 text-xs text-gray-500">アイコン: {rule.icon}</div>}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="rounded border border-orange-300 px-3 py-1.5 text-sm font-semibold text-orange-600 hover:border-orange-400 hover:text-orange-700"
                      onClick={() => handleEdit(rule.threshold)}
                      disabled={loading}
                    >
                      編集
                    </button>
                    <button
                      type="button"
                      className="rounded border border-red-300 px-3 py-1.5 text-sm font-semibold text-red-600 hover:border-red-400 hover:text-red-700 disabled:opacity-60"
                      onClick={() => handleDelete(rule.threshold)}
                      disabled={deletingThreshold === rule.threshold}
                    >
                      {deletingThreshold === rule.threshold ? "削除中..." : "削除"}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
