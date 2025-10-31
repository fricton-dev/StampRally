import { type FormEvent, useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"

import { DEFAULT_TENANT_ID, TENANT_TOKEN_INFO_KEY, TENANT_TOKEN_STORAGE_KEY } from "../lib/config"
import { useAuthStore } from "../lib/authStore"
import { readTenantSession, subscribeTenantSessionChange } from "../lib/tenantAdminSession"
import { useLanguage } from "../lib/i18n"
import type { AppLanguage } from "../types"

const TEXT_MAP: Record<
  AppLanguage,
  {
    demoTitle: string
    demoDescription: string
    demoInfo: string
    demoViewButton: string
    demoBackButton: string
    loginTitle: string
    loginTenantPrefix: string
    loginIdentifierLabel: string
    loginPasswordLabel: string
    loginButton: string
    loginLoading: string
    registerTitle: string
    registerSubtitlePrefix: string
    registerSubtitleSuffix: string
    registerUsernameLabel: string
    registerEmailLabel: string
    registerGenderLabel: string
    registerGenderPlaceholder: string
    registerGenderMale: string
    registerGenderFemale: string
    registerGenderOther: string
    registerAgeLabel: string
    registerAgePlaceholder: string
    registerPasswordLabel: string
    registerButton: string
    registerLoading: string
    footerBackHome: string
    errorLoginRequired: string
    errorRegisterRequired: string
    errorAge: string
    successRegister: string
    errorLoginFallback: string
    errorRegisterFallback: string
  }
> = {
  ja: {
    demoTitle: "デモ確認モード",
    demoDescription: "管理者としてログイン中のため、ユーザー向けのログイン・登録は利用できません。",
    demoInfo: "利用者向けサイトを確認する場合は下記からデモページをご覧ください。作業を再開する際は管理画面に戻ることができます。",
    demoViewButton: "デモサイトを見る",
    demoBackButton: "管理画面へ戻る",
    loginTitle: "ユーザーログイン",
    loginTenantPrefix: "テナント: ",
    loginIdentifierLabel: "ユーザー名 または メールアドレス",
    loginPasswordLabel: "パスワード",
    loginButton: "ログイン",
    loginLoading: "ログイン中...",
    registerTitle: "新規アカウント作成",
    registerSubtitlePrefix: "",
    registerSubtitleSuffix: " テナントで登録します。",
    registerUsernameLabel: "ユーザー名",
    registerEmailLabel: "メールアドレス",
    registerGenderLabel: "性別",
    registerGenderPlaceholder: "選択してください",
    registerGenderMale: "男性",
    registerGenderFemale: "女性",
    registerGenderOther: "その他",
    registerAgeLabel: "年齢",
    registerAgePlaceholder: "例: 29",
    registerPasswordLabel: "パスワード",
    registerButton: "登録する",
    registerLoading: "登録処理中...",
    footerBackHome: "テナントホームへ戻る",
    errorLoginRequired: "ユーザー名（またはメールアドレス）とパスワードを入力してください。",
    errorRegisterRequired: "必須項目（ユーザー名・メールアドレス・性別・年齢・パスワード）をすべて入力してください。",
    errorAge: "年齢は0〜120の数値で入力してください。",
    successRegister: "アカウントを作成しました。ログインしてください。",
    errorLoginFallback: "ログインに失敗しました。",
    errorRegisterFallback: "登録に失敗しました。",
  },
  en: {
    demoTitle: "Demo preview mode",
    demoDescription: "You are logged in as an administrator, so user login and registration are disabled.",
    demoInfo: "Use the demo site below to preview the user experience. You can return to the admin dashboard when you are ready to continue.",
    demoViewButton: "View demo site",
    demoBackButton: "Back to admin",
    loginTitle: "User sign-in",
    loginTenantPrefix: "Tenant: ",
    loginIdentifierLabel: "Username or email",
    loginPasswordLabel: "Password",
    loginButton: "Log in",
    loginLoading: "Signing in...",
    registerTitle: "Create an account",
    registerSubtitlePrefix: "Register under ",
    registerSubtitleSuffix: " tenant.",
    registerUsernameLabel: "Username",
    registerEmailLabel: "Email address",
    registerGenderLabel: "Gender",
    registerGenderPlaceholder: "Select",
    registerGenderMale: "Male",
    registerGenderFemale: "Female",
    registerGenderOther: "Other",
    registerAgeLabel: "Age",
    registerAgePlaceholder: "e.g. 29",
    registerPasswordLabel: "Password",
    registerButton: "Register",
    registerLoading: "Registering...",
    footerBackHome: "Back to tenant home",
    errorLoginRequired: "Enter your username or email and password.",
    errorRegisterRequired: "Please fill in all required fields (username, email, gender, age, password).",
    errorAge: "Age must be a number between 0 and 120.",
    successRegister: "Account created. Please sign in.",
    errorLoginFallback: "Failed to sign in.",
    errorRegisterFallback: "Failed to register.",
  },
  zh: {
    demoTitle: "示范模式",
    demoDescription: "目前以管理员身份登录，无法进行用户登录或注册。",
    demoInfo: "如需查看使用者画面，请从下方进入示范网站。完成后可以返回管理后台继续作业。",
    demoViewButton: "查看示范网站",
    demoBackButton: "返回管理后台",
    loginTitle: "使用者登录",
    loginTenantPrefix: "租户：",
    loginIdentifierLabel: "用户名或邮箱",
    loginPasswordLabel: "密码",
    loginButton: "登录",
    loginLoading: "正在登录...",
    registerTitle: "建立新账户",
    registerSubtitlePrefix: "将在 ",
    registerSubtitleSuffix: " 租户中注册。",
    registerUsernameLabel: "用户名",
    registerEmailLabel: "邮箱",
    registerGenderLabel: "性别",
    registerGenderPlaceholder: "请选择",
    registerGenderMale: "男性",
    registerGenderFemale: "女性",
    registerGenderOther: "其他",
    registerAgeLabel: "年龄",
    registerAgePlaceholder: "例如：29",
    registerPasswordLabel: "密码",
    registerButton: "注册",
    registerLoading: "正在注册...",
    footerBackHome: "返回租户首页",
    errorLoginRequired: "请输入用户名（或邮箱）与密码。",
    errorRegisterRequired: "请完整填写必填项目（用户名、邮箱、性别、年龄、密码）。",
    errorAge: "年龄必须是 0～120 之间的数字。",
    successRegister: "账户已建立，请登录。",
    errorLoginFallback: "登录失败。",
    errorRegisterFallback: "注册失败。",
  },
}

export default function UserAuthPage() {
  const navigate = useNavigate()
  const { tenantId } = useParams()
  const resolvedTenantId = tenantId ?? DEFAULT_TENANT_ID
  const language = useLanguage()
  const TEXT = TEXT_MAP[language]

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
      setLocalError(TEXT.errorLoginRequired)
      return
    }
    try {
      await login({ identifier, password, tenantId: resolvedTenantId })
      setIdentifier("")
      setPassword("")
      navigate(`/tenant/${resolvedTenantId}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : TEXT.errorLoginFallback
      setLocalError(message)
    }
  }

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLocalError(null)
    setSuccessMessage(null)
    clearError()
    if (!regUsername || !regEmail || !regGender || !regAge || !regPassword) {
      setLocalError(TEXT.errorRegisterRequired)
      return
    }
    const parsedAge = Number.parseInt(regAge, 10)
    if (!Number.isFinite(parsedAge) || parsedAge < 0 || parsedAge > 120) {
      setLocalError(TEXT.errorAge)
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
      setSuccessMessage(TEXT.successRegister)
    } catch (err) {
      const message = err instanceof Error ? err.message : TEXT.errorRegisterFallback
      setLocalError(message)
    }
  }

  if (adminLocked) {
    return (
      <div className="mx-auto max-w-md space-y-8 p-4 pb-16">
        <section className="space-y-4 rounded-xl border border-orange-100 bg-white/90 p-5 shadow-sm">
          <header>
            <h2 className="text-lg font-semibold text-gray-900">{TEXT.demoTitle}</h2>
            <p className="text-xs text-gray-500">{TEXT.demoDescription}</p>
          </header>
          <p className="text-xs leading-relaxed text-gray-600">{TEXT.demoInfo}</p>
          <div className="flex flex-wrap gap-3">
            <Link
              to={`/tenant/${resolvedTenantId}`}
              className="flex-1 rounded-lg bg-orange-500 px-4 py-2 text-center text-sm font-semibold text-white shadow hover:bg-orange-600"
            >
              {TEXT.demoViewButton}
            </Link>
            <Link
              to={`/tenant/${resolvedTenantId}/admin/dashboard`}
              className="flex-1 rounded-lg border border-orange-300 px-4 py-2 text-center text-sm font-semibold text-orange-600 shadow-sm hover:bg-orange-50"
            >
              {TEXT.demoBackButton}
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
          <h2 className="text-lg font-semibold text-gray-900">{TEXT.loginTitle}</h2>
          <p className="text-xs text-gray-500">
            {TEXT.loginTenantPrefix}
            <span className="font-medium text-gray-700">{resolvedTenantId}</span>
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
            <label className="block text-xs font-semibold text-gray-700">{TEXT.loginIdentifierLabel}</label>
            <input
              type="text"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              autoComplete="username"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-gray-700">{TEXT.loginPasswordLabel}</label>
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
            {loading ? TEXT.loginLoading : TEXT.loginButton}
          </button>
        </form>
      </section>

      <section className="space-y-4 rounded-xl border border-orange-100 bg-white/90 p-5 shadow-sm">
        <header>
          <h2 className="text-lg font-semibold text-gray-900">{TEXT.registerTitle}</h2>
          <p className="text-xs text-gray-500">
            {TEXT.registerSubtitlePrefix}
            <span className="font-medium text-gray-700">{resolvedTenantId}</span>
            {TEXT.registerSubtitleSuffix}
          </p>
        </header>
        <form className="space-y-3" onSubmit={handleRegister}>
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-gray-700">{TEXT.registerUsernameLabel}</label>
            <input
              type="text"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
              value={regUsername}
              onChange={(event) => setRegUsername(event.target.value)}
              autoComplete="new-username"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-gray-700">{TEXT.registerEmailLabel}</label>
            <input
              type="email"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
              value={regEmail}
              onChange={(event) => setRegEmail(event.target.value)}
              autoComplete="email"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-gray-700">{TEXT.registerGenderLabel}</label>
            <select
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400 bg-white"
              value={regGender}
              onChange={(event) => setRegGender(event.target.value)}
            >
              <option value="" disabled>
                {TEXT.registerGenderPlaceholder}
              </option>
              <option value="male">{TEXT.registerGenderMale}</option>
              <option value="female">{TEXT.registerGenderFemale}</option>
              <option value="other">{TEXT.registerGenderOther}</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-gray-700">{TEXT.registerAgeLabel}</label>
            <input
              type="number"
              min={0}
              max={120}
              inputMode="numeric"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
              value={regAge}
              onChange={(event) => setRegAge(event.target.value)}
              placeholder={TEXT.registerAgePlaceholder}
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-gray-700">{TEXT.registerPasswordLabel}</label>
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
            {loading ? TEXT.registerLoading : TEXT.registerButton}
          </button>
        </form>
      </section>

      <div className="text-center text-xs text-gray-500">
        <Link to={`/tenant/${resolvedTenantId}`} className="text-orange-600 hover:text-orange-700">
          {TEXT.footerBackHome}
        </Link>
      </div>
    </div>
  )
}
