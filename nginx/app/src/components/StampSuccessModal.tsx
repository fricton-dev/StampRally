import { useEffect, useState } from "react"
import { useLanguage } from "../lib/i18n"
import type { AppLanguage } from "../types"

type StampSuccessModalProps = {
  open: boolean
  storeName: string
  storeImageUrl?: string
  stampImageUrl?: string
  stampFallbackText?: string
  onClose: () => void
}

const TEXT_MAP: Record<
  AppLanguage,
  {
    closeLabel: string
    storePhotoSuffix: string
    noImage: string
    stampAlt: string
    headline: string
    message: string
    closeButton: string
  }
> = {
  ja: {
    closeLabel: "閉じる",
    storePhotoSuffix: " の写真",
    noImage: "店舗画像がありません",
    stampAlt: "スタンプ画像",
    headline: "スタンプGET!",
    message: "おめでとうございます！この店舗のスタンプを獲得しました。",
    closeButton: "閉じる",
  },
  en: {
    closeLabel: "Close",
    storePhotoSuffix: " photo",
    noImage: "No store image available",
    stampAlt: "Stamp image",
    headline: "Stamp unlocked!",
    message: "Congratulations! You collected this store's stamp.",
    closeButton: "Close",
  },
  zh: {
    closeLabel: "关闭",
    storePhotoSuffix: " 的照片",
    noImage: "没有店铺图片",
    stampAlt: "印章图片",
    headline: "获得印章！",
    message: "恭喜！你已取得这家店的印章。",
    closeButton: "关闭",
  },
}

export default function StampSuccessModal({
  open,
  storeName,
  storeImageUrl,
  stampImageUrl,
  stampFallbackText,
  onClose,
}: StampSuccessModalProps) {
  const language = useLanguage()
  const TEXT = TEXT_MAP[language]
  const [panelVisible, setPanelVisible] = useState(false)
  const [stampVisible, setStampVisible] = useState(false)

  useEffect(() => {
    if (!open) {
      setPanelVisible(false)
      setStampVisible(false)
      return
    }

    const frame = window.requestAnimationFrame(() => {
      setPanelVisible(true)
    })
    const timer = window.setTimeout(() => {
      setStampVisible(true)
    }, 160)

    return () => {
      window.cancelAnimationFrame(frame)
      window.clearTimeout(timer)
    }
  }, [open])

  if (!open) {
    return null
  }

  const close = () => {
    setPanelVisible(false)
    setStampVisible(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={close} />
      <div
        className={`relative z-10 w-full max-w-sm transform overflow-hidden rounded-3xl bg-white shadow-2xl transition-all duration-300 ease-out ${
          panelVisible ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
      >
        <div className="relative h-64 w-full bg-gray-200">
          {storeImageUrl ? (
            <img
              src={storeImageUrl}
              alt={`${storeName}${TEXT.storePhotoSuffix}`}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gray-200 text-sm text-gray-500">
              {TEXT.noImage}
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            {stampImageUrl ? (
              <img
                src={stampImageUrl}
                alt={TEXT.stampAlt}
                className={`h-[85%] w-[85%] object-contain drop-shadow-2xl transition-all duration-500 ease-out ${
                  stampVisible ? "scale-100 opacity-100 rotate-0" : "scale-125 opacity-0 -rotate-6"
                }`}
              />
            ) : stampFallbackText ? (
              <div
                className={`flex h-[70%] w-[70%] items-center justify-center rounded-full border-4 border-orange-500 bg-white/85 text-3xl font-bold text-orange-600 drop-shadow-2xl transition-all duration-500 ease-out ${
                  stampVisible ? "scale-100 opacity-100 rotate-0" : "scale-125 opacity-0 -rotate-6"
                }`}
              >
                {stampFallbackText}
              </div>
            ) : (
              <div
                className={`flex h-[60%] w-[60%] items-center justify-center rounded-full border-4 border-orange-400 bg-white/80 text-2xl font-semibold text-orange-500 drop-shadow-2xl transition-all duration-500 ease-out ${
                  stampVisible ? "scale-100 opacity-100 rotate-0" : "scale-125 opacity-0 -rotate-6"
                }`}
              >
                STAMP
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2 px-6 py-5 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-orange-500">{TEXT.headline}</p>
          <h3 className="text-lg font-bold text-gray-900">{storeName}</h3>
          <p className="text-sm text-gray-600">{TEXT.message}</p>
          <button
            type="button"
            className="mt-4 w-full rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-orange-600"
            onClick={close}
          >
            {TEXT.closeButton}
          </button>
        </div>
      </div>
    </div>
  )
}
