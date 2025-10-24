import { type FormEvent, useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"

import { DEFAULT_TENANT_ID, TENANT_TOKEN_INFO_KEY, TENANT_TOKEN_STORAGE_KEY } from "../lib/config"
import { useAuthStore } from "../lib/authStore"
import { readTenantSession, subscribeTenantSessionChange } from "../lib/tenantAdminSession"

export default function UserAuthPage() {
  const navigate = useNavigate()
  const { tenantId } = useParams()
  const resolvedTenantId = tenantId ?? DEFAULT_TENANT_ID

  const { login, register, loading, error, clearError } = useAuthStore()

  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")

  const [regUsername, setRegUsername] = useState("")
  const [regEmail, setRegEmail] = useState("")
  const [regPassword, setRegPassword] = useState("")
  const [regGender, setRegGender] = useState("")
  const [regAge, setRegAge] = useState("")

  const [localError, setLocalError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [adminLocked, setAdminLocked] = useState(() => Boolean(readTenantSession(resolvedTenantId)))

  useEffect(() => {
    const updateLock = () => {
      setAdminLocked(Boolean(readTenantSession(resolvedTenantId)))
    }
    updateLock()

    const handleStorage = (event: StorageEvent) => {
      if (
        event.key === null ||
        event.key === TENANT_TOKEN_INFO_KEY ||
        event.key === TENANT_TOKEN_STORAGE_KEY
      ) {
        updateLock()
      }
    }

    const unsubscribe = subscribeTenantSessionChange(updateLock)
    if (typeof window !== "undefined") {
      window.addEventListener("storage", handleStorage)
      window.addEventListener("focus", updateLock)
    }

    return () => {
      unsubscribe()
      if (typeof window !== "undefined") {
        window.removeEventListener("storage", handleStorage)
        window.removeEventListener("focus", updateLock)
      }
    }
  }, [resolvedTenantId])

  const handleUserLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLocalError(null)
    setSuccessMessage(null)
    clearError()
    if (!identifier || !password) {
      setLocalError("ユーザー名（またはメールアドレス）とパスワードを入力してください。")
      return
    }
    try {
      await login({ identifier, password, tenantId: resolvedTenantId })
      setIdentifier("")
      setPassword("")
      navigate(`/tenant/${resolvedTenantId}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : "ログインに失敗しました。"
      setLocalError(message)
    }
  }

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLocalError(null)
    setSuccessMessage(null)
    clearError()
    if (!regUsername || !regEmail || !regGender || !regAge || !regPassword) {
      setLocalError("必須項目（ユーザー名・メールアドレス・性別・年齢・パスワード）をすべて入力してください。")
      return
    }
    const parsedAge = Number.parseInt(regAge, 10)
    if (!Number.isFinite(parsedAge) || parsedAge < 0 || parsedAge > 120) {
      setLocalError("年齢は0〜120の数値で入力してください。")
      return
    }
    try {
      await register({
        tenantId: resolvedTenantId,
        username: regUsername,
        email: regEmail,
        password: regPassword,
        gender: regGender,
        age: parsedAge,
      })
      setRegUsername("")
      setRegEmail("")
      setRegPassword("")
      setRegGender("")
      setRegAge("")
      setSuccessMessage("アカウントを作成しました。ログインしてください。")
    } catch (err) {
      const message = err instanceof Error ? err.message : "登録に失敗しました。"
      setLocalError(message)
    }
  }

  if (adminLocked) {
    return (
      <div className="mx-auto max-w-md space-y-8 p-4 pb-16">
        <section className="space-y-4 rounded-xl border border-orange-100 bg-white/90 p-5 shadow-sm">
          <header>
            <h2 className="text-lg font-semibold text-gray-900">デモ確認モード</h2>
            <p className="text-xs text-gray-500">
              管理者としてログイン中のため、ユーザー向けのログイン・登録は利用できません。
            </p>
          </header>
          <p className="text-xs leading-relaxed text-gray-600">
            利用者向けサイトを確認する場合は下記からデモページをご覧ください。作業を再開する際は管理画面に戻ることができます。
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              to={`/tenant/${resolvedTenantId}`}
              className="flex-1 rounded-lg bg-orange-500 px-4 py-2 text-center text-sm font-semibold text-white shadow hover:bg-orange-600"
            >
              デモサイトを見る
            </Link>
            <Link
              to={`/tenant/${resolvedTenantId}/admin/dashboard`}
              className="flex-1 rounded-lg border border-orange-300 px-4 py-2 text-center text-sm font-semibold text-orange-600 shadow-sm hover:bg-orange-50"
            >
              管理画面へ戻る
            </Link>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md space-y-8 p-4 pb-16">
      <section className="space-y-4 rounded-xl border border-orange-100 bg-white/90 p-5 shadow-sm">
        <header>
          <h2 className="text-lg font-semibold text-gray-900">ユーザーログイン</h2>
          <p className="text-xs text-gray-500">
            テナント: <span className="font-medium text-gray-700">{resolvedTenantId}</span>
          </p>
        </header>
        {(localError || error) && (
          <div className="rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-600">{localError ?? error}</div>
        )}
        {successMessage && (
          <div className="rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{successMessage}</div>
        )}
        <form className="space-y-3" onSubmit={handleUserLogin}>
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-gray-700">ユーザー名 または メールアドレス</label>
            <input
              type="text"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              autoComplete="username"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-gray-700">パスワード</label>
            <input
              type="password"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-orange-500 py-2 text-sm font-semibold text-white shadow hover:bg-orange-600 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Signing in..." : "ログイン"}
          </button>
        </form>
      </section>

      <section className="space-y-4 rounded-xl border border-orange-100 bg-white/90 p-5 shadow-sm">
        <header>
          <h2 className="text-lg font-semibold text-gray-900">新規アカウント作成</h2>
          <p className="text-xs text-gray-500">
            <span className="font-medium text-gray-700">{resolvedTenantId}</span> テナントで登録します。
          </p>
        </header>
        <form className="space-y-3" onSubmit={handleRegister}>
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-gray-700">ユーザー名</label>
            <input
              type="text"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
              value={regUsername}
              onChange={(event) => setRegUsername(event.target.value)}
              autoComplete="new-username"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-gray-700">メールアドレス</label>
            <input
              type="email"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
              value={regEmail}
              onChange={(event) => setRegEmail(event.target.value)}
              autoComplete="email"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-gray-700">性別</label>
            <select
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400 bg-white"
              value={regGender}
              onChange={(event) => setRegGender(event.target.value)}
            >
              <option value="" disabled>
                選択してください
              </option>
              <option value="male">男性</option>
              <option value="female">女性</option>
              <option value="other">その他</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-gray-700">年齢</label>
            <input
              type="number"
              min={0}
              max={120}
              inputMode="numeric"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
              value={regAge}
              onChange={(event) => setRegAge(event.target.value)}
              placeholder="例: 29"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-gray-700">パスワード</label>
            <input
              type="password"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
              value={regPassword}
              onChange={(event) => setRegPassword(event.target.value)}
              autoComplete="new-password"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-emerald-500 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-600 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Registering..." : "登録する"}
          </button>
        </form>
      </section>

      <div className="text-center text-xs text-gray-500">
        <Link to={`/tenant/${resolvedTenantId}`} className="text-orange-600 hover:text-orange-700">
          テナントホームへ戻る
        </Link>
      </div>
    </div>
  )
}
