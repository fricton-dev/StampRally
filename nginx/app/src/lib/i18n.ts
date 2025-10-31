import type { AppLanguage } from "../types"
import { useAppStore } from "./store"

export const SUPPORTED_LANGUAGES = ["ja", "en", "zh"] as const
type SupportedLanguageTuple = typeof SUPPORTED_LANGUAGES
export const DEFAULT_LANGUAGE: AppLanguage = "ja"

const LANGUAGE_LABELS: Record<AppLanguage, string> = {
  ja: "日本語",
  en: "English",
  zh: "中文",
}

const LOCALE_MAP: Record<AppLanguage, string> = {
  ja: "ja-JP",
  en: "en-US",
  zh: "zh-CN",
}

export const normalizeLanguage = (value?: string | null): AppLanguage => {
  if (!value) {
    return DEFAULT_LANGUAGE
  }
  const normalized = value.trim().toLowerCase()
  if ((SUPPORTED_LANGUAGES as unknown as readonly string[]).includes(normalized)) {
    return normalized as AppLanguage
  }
  return DEFAULT_LANGUAGE
}

export const useLanguage = (): AppLanguage =>
  useAppStore((state) => normalizeLanguage(state.tenant.language))

export const LANGUAGE_OPTIONS = (SUPPORTED_LANGUAGES as SupportedLanguageTuple).map((value) => ({
  value,
  label: LANGUAGE_LABELS[value],
}))

export const getLanguageLabel = (language: AppLanguage): string =>
  LANGUAGE_LABELS[language] ?? LANGUAGE_LABELS[DEFAULT_LANGUAGE]

export const getLocaleForLanguage = (language: AppLanguage): string =>
  LOCALE_MAP[language] ?? LOCALE_MAP[DEFAULT_LANGUAGE]
