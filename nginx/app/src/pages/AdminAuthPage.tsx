import { type FormEvent, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"

import { tenantLogin, tenantResetPassword } from "../lib/api"
import { DEFAULT_TENANT_ID } from "../lib/config"
import {
  clearTenantSession,
  persistTenantSession,
  readTenantSession,
  type TenantAdminSession,
} from "../lib/tenantAdminSession"

type TenantLoginResult = {
  company_name: string
  access_token: string
  must_change_password: boolean
}

const sessionToLoginResult = (session: TenantAdminSession | null): TenantLoginResult | null =>
  session
    ? {
        company_name: session.companyName ?? "Stored tenant session",
        access_token: session.accessToken,
        must_change_password: session.mustChangePassword,
      }
    : null

export default function AdminAuthPage() {
  const { tenantId } = useParams()
  const resolvedTenantId = tenantId ?? DEFAULT_TENANT_ID
  const navigate = useNavigate()

  const [tenantLoginId, setTenantLoginId] = useState(resolvedTenantId)
  const [tenantPassword, setTenantPassword] = useState("")
  const [tenantResult, setTenantResult] = useState<TenantLoginResult | null>(() =>
    sessionToLoginResult(readTenantSession(resolvedTenantId)),
  )
  const [tenantMessage, setTenantMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const [resetCurrentPassword, setResetCurrentPassword] = useState("")
  const [resetNewPassword, setResetNewPassword] = useState("")
  const [resetConfirmPassword, setResetConfirmPassword] = useState("")
  const [resetMessage, setResetMessage] = useState<string | null>(null)
  const [resetError, setResetError] = useState<string | null>(null)
  const [resetLoading, setResetLoading] = useState(false)

  const mustChangePassword = Boolean(tenantResult?.must_change_password)

  const handleTenantLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setTenantMessage(null)
    setResetMessage(null)
    setResetError(null)

    if (!tenantLoginId || !tenantPassword) {
      setTenantMessage("テナントIDと管理者パスワードを入力してください。")
      return
    }

    setLoading(true)
    try {
      const response = await tenantLogin(tenantLoginId, tenantPassword)
      const nextResult: TenantLoginResult = {
        company_name: response.company_name,
        access_token: response.access_token,
        must_change_password: response.must_change_password,
      }
      setTenantResult(nextResult)
      persistTenantSession({
        tenantId: tenantLoginId,
        accessToken: response.access_token,
        mustChangePassword: response.must_change_password,
        companyName: response.company_name,
      })

      if (response.must_change_password) {
        setTenantMessage(
          `初回ログインです。パスワードを再設定してください（${response.company_name}）。`,
        )
        setResetCurrentPassword(tenantPassword)
        setTenantPassword("")
      } else {
        navigate(`/tenant/${tenantLoginId}/admin/dashboard`)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Tenant login failed"
      setTenantMessage(message)
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setResetMessage(null)
    setResetError(null)

    if (!tenantLoginId) {
      setResetError("テナントIDが指定されていません。")
      return
    }
    if (!resetCurrentPassword || !resetNewPassword) {
      setResetError("現在のパスワードと新しいパスワードを入力してください。")
      return
    }
    if (resetNewPassword !== resetConfirmPassword) {
      setResetError("新しいパスワードが一致しません。")
      return
    }

    setResetLoading(true)
    try {
      await tenantResetPassword({
        tenantId: tenantLoginId,
        currentPassword: resetCurrentPassword,
        newPassword: resetNewPassword,
      })
      const storedSession = readTenantSession(tenantLoginId)
      if (storedSession) {
        const nextSession: TenantAdminSession = {
          ...storedSession,
          mustChangePassword: false,
        }
        persistTenantSession(nextSession)
        setTenantResult(sessionToLoginResult(nextSession))
      }
      setResetCurrentPassword("")
      setResetNewPassword("")
      setResetConfirmPassword("")
      setResetMessage("パスワードを更新しました。")
      navigate(`/tenant/${tenantLoginId}/admin/dashboard`)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "パスワード更新に失敗しました。"
      setResetError(message)
    } finally {
      setResetLoading(false)
    }
  }

  const handleClearTenantSession = () => {
    clearTenantSession()
    setTenantResult(null)
    setTenantMessage("管理者セッションを削除しました。")
  }

  return (
    <div className="mx-auto max-w-md space-y-8 p-4 pb-16">
      <section className="space-y-4 rounded-xl border border-gray-200 bg-white/90 p-5 shadow-sm">
        <header>
          <h2 className="text-lg font-semibold text-gray-900">管理者ログイン</h2>
          <p className="text-xs text-gray-500">
            テナント: <span className="font-medium text-gray-700">{resolvedTenantId}</span>
          </p>
        </header>
        {tenantMessage && (
          <div className="rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-700">
            {tenantMessage}
          </div>
        )}
        <form className="space-y-3" onSubmit={handleTenantLogin}>
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-gray-700">テナントID</label>
            <input
              type="text"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
              value={tenantLoginId}
              onChange={(event) => setTenantLoginId(event.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-gray-700">管理者パスワード</label>
            <input
              type="password"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
              value={tenantPassword}
              onChange={(event) => setTenantPassword(event.target.value)}
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-gray-900 py-2 text-sm font-semibold text-white shadow hover:bg-black/80 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Signing in..." : "ログイン"}
          </button>
        </form>
        <div className="text-right text-[11px] text-gray-500">
          <button
            type="button"
            onClick={handleClearTenantSession}
            className="text-orange-600 hover:text-orange-700"
          >
            保存済みセッションをクリア
          </button>
        </div>
      </section>

      {(tenantResult || mustChangePassword) && (
        <section className="space-y-4 rounded-xl border border-orange-100 bg-white/90 p-5 shadow-sm">
          <header>
            <h3 className="text-base font-semibold text-gray-900">パスワード再設定</h3>
            <p className="text-xs text-gray-500">
              初回ログイン時は必ずパスワードを変更してください。セキュリティのため定期的な更新をおすすめします。
            </p>
          </header>
          {resetMessage && (
            <div className="rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
              {resetMessage}
            </div>
          )}
          {resetError && (
            <div className="rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-600">
              {resetError}
            </div>
          )}
          <form className="space-y-3" onSubmit={handlePasswordReset}>
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-700">現在のパスワード</label>
              <input
                type="password"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
                value={resetCurrentPassword}
                onChange={(event) => setResetCurrentPassword(event.target.value)}
                placeholder="ログインに使用したパスワード"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-700">新しいパスワード</label>
              <input
                type="password"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
                value={resetNewPassword}
                onChange={(event) => setResetNewPassword(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-700">新しいパスワード（確認）</label>
              <input
                type="password"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
                value={resetConfirmPassword}
                onChange={(event) => setResetConfirmPassword(event.target.value)}
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-lg bg-orange-500 py-2 text-sm font-semibold text-white shadow hover:bg-orange-600 disabled:opacity-60"
              disabled={resetLoading}
            >
              {resetLoading ? "Updating..." : "パスワードを変更"}
            </button>
          </form>
        </section>
      )}

      <div className="text-center text-xs text-gray-500">
        <Link to={`/tenant/${resolvedTenantId}/auth/user`} className="text-orange-600 hover:text-orange-700">
          ユーザーログインへ戻る
        </Link>
      </div>
    </div>
  )
}
