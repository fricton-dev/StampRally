import { type FormEvent, useState } from "react"
import { useNavigate } from "react-router-dom"

import { createTenant } from "../lib/api"

type CreateFormState = {
  tenantId: string
  companyName: string
  adminEmail: string
  adminName: string
  businessType: string
  adminPhone: string
  initialPassword: string
  backgroundImageUrl: string
}

const defaultForm: CreateFormState = {
  tenantId: "",
  companyName: "",
  adminEmail: "",
  adminName: "",
  businessType: "",
  adminPhone: "",
  initialPassword: "",
  backgroundImageUrl: "",
}

export default function TenantOnboardingPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState<CreateFormState>(defaultForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{
    tenant_id: string
    admin_email: string
    initial_password: string
  } | null>(null)

  const handleChange = (field: keyof CreateFormState) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({
      ...prev,
      [field]: event.target.value,
    }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setResult(null)

    if (!form.companyName || !form.adminEmail) {
      setError("会社名と管理者メールアドレスは必須です。")
      return
    }

    setLoading(true)
    try {
      const response = await createTenant({
        tenantId: form.tenantId || undefined,
        companyName: form.companyName,
        businessType: form.businessType || undefined,
        adminName: form.adminName || undefined,
        adminEmail: form.adminEmail,
        adminPhone: form.adminPhone || undefined,
        initialPassword: form.initialPassword || undefined,
        backgroundImageUrl: form.backgroundImageUrl || undefined,
      })
      setResult({
        tenant_id: response.tenant_id,
        admin_email: response.admin_email,
        initial_password: response.initial_password,
      })
      setForm(defaultForm)
    } catch (err) {
      const message = err instanceof Error ? err.message : "テナント作成に失敗しました。"
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const goToAdminLogin = () => {
    if (result) {
      navigate(`/tenant/${result.tenant_id}/auth/admin`)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6 pb-16">
      <header>
        <h1 className="text-2xl font-semibold text-gray-900">テナントアカウント作成</h1>
        <p className="mt-1 text-sm text-gray-600">
          このページは内部利用者向けです。必要事項を入力すると、管理者の初期パスワードを含むテナントアカウントを作成します。
        </p>
      </header>

      <section className="rounded-xl border border-orange-100 bg-white/90 p-5 shadow-sm">
        {error && (
          <div className="mb-4 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-600">
            {error}
          </div>
        )}
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-gray-700">テナントID（省略可）</label>
              <input
                type="text"
                value={form.tenantId}
                onChange={handleChange("tenantId")}
                placeholder="例: fricton（指定しない場合は自動生成）"
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700">ビジネスカテゴリ（任意）</label>
              <input
                type="text"
                value={form.businessType}
                onChange={handleChange("businessType")}
                placeholder="例: technology / retail"
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700">会社名</label>
              <input
                type="text"
                value={form.companyName}
                onChange={handleChange("companyName")}
                required
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700">管理者氏名（任意）</label>
              <input
                type="text"
                value={form.adminName}
                onChange={handleChange("adminName")}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700">管理者メールアドレス</label>
              <input
                type="email"
                value={form.adminEmail}
                onChange={handleChange("adminEmail")}
                required
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700">管理者電話番号（任意）</label>
              <input
                type="text"
                value={form.adminPhone}
                onChange={handleChange("adminPhone")}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700">初期パスワード（任意）</label>
              <input
                type="text"
                value={form.initialPassword}
                onChange={handleChange("initialPassword")}
                placeholder="空欄の場合は自動生成"
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700">背景画像URL（任意）</label>
              <input
                type="text"
                value={form.backgroundImageUrl}
                onChange={handleChange("backgroundImageUrl")}
                placeholder="https://..."
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-orange-500 py-2 text-sm font-semibold text-white shadow hover:bg-orange-600 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Creating..." : "テナントを作成する"}
          </button>
        </form>
      </section>

      {result && (
        <section className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50/80 p-5 shadow-sm">
          <header>
            <h3 className="text-base font-semibold text-emerald-800">テナントを作成しました</h3>
          </header>
          <dl className="grid grid-cols-1 gap-2 text-xs text-emerald-900 md:grid-cols-2">
            <div>
              <dt className="font-semibold">テナントID</dt>
              <dd className="mt-1 break-all">{result.tenant_id}</dd>
            </div>
            <div>
              <dt className="font-semibold">管理者メール</dt>
              <dd className="mt-1 break-all">{result.admin_email}</dd>
            </div>
            <div className="md:col-span-2">
              <dt className="font-semibold">初期パスワード</dt>
              <dd className="mt-1 break-all text-base font-bold">{result.initial_password}</dd>
            </div>
          </dl>
          <p className="text-[11px] text-emerald-900">
            初回ログイン時にパスワード変更が必須です。管理者にテナントURLと上記情報を共有してください。
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={goToAdminLogin}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-emerald-700"
            >
              管理者ログインページを開く
            </button>
            <button
              type="button"
              onClick={() => setResult(null)}
              className="rounded-lg border border-emerald-500 px-4 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
            >
              情報を隠す
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
