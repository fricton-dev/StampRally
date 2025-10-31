import { useEffect, useRef, useState } from "react" // [React]
import { Html5Qrcode } from "html5-qrcode" // QR ライブラリ
import { useLanguage } from "../lib/i18n"
import type { AppLanguage } from "../types"

type Props = {
  onText: (text: string) => void
}

const LABELS: Record<AppLanguage, { errorPrefix: string; retry: string }> = {
  ja: { errorPrefix: "カメラを開始できません: ", retry: "再試行" },
  en: { errorPrefix: "Cannot start camera: ", retry: "Retry" },
  zh: { errorPrefix: "无法启动相机：", retry: "重试" },
}

export default function QRScanner({ onText }: Props) {
  const language = useLanguage()
  const labels = LABELS[language]
  const divId = useRef(`qr-${Math.random().toString(36).slice(2)}`) // [JS] ランダムID
  const qr = useRef<Html5Qrcode | null>(null)                      // [TS] useRef<型>
  const startedRef = useRef(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const id = divId.current
    qr.current = new Html5Qrcode(id)
    const startOnce = async () => {
      setError(null)
      try {
        await qr.current?.start(
          { facingMode: "environment" } as any,
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decoded) => onText(decoded),
          () => {}
        )
        startedRef.current = true
      } catch (e: any) {
        console.error(e)
        setError(e?.message || String(e))
      }
    }
    startOnce()

  return () => { // アンマウント時に停止（安全に）
      try {
  const stopResult = qr.current?.stop()
        // stop() が Promise を返す場合は then/catch で後続処理
        if (stopResult && typeof (stopResult as Promise<any>).then === "function") {
          (stopResult as Promise<any>)
            .then(() => qr.current?.clear())
            .catch(() => {})
        } else {
          // もし stop() が同期的に例外を投げる場合、try/catch で防ぐ
          if (!startedRef.current) {
            // start に失敗している可能性があるので clear のみを試す
            try { qr.current?.clear() } catch {}
          }
        }
      } catch (e) {
        // Cannot stop 等の同期例外を無視して安全にアンマウントさせる
      }
    }
  }, [onText])

  // 再試行ハンドラ（ユーザーが許可を与え忘れたとき用）
  const handleRetry = async () => {
    setError(null)
    try {
      if (!qr.current) qr.current = new Html5Qrcode(divId.current)
      await qr.current.start(
        { facingMode: "environment" } as any,
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decoded) => onText(decoded),
        () => {}
      )
      startedRef.current = true
    } catch (e: any) {
      console.error(e)
      setError(e?.message || String(e))
    }
  }

  return (
    <div className="w-full flex justify-center">
      <div className="relative">
  <div id={divId.current} className="w-[280px] h-[280px] rounded overflow-hidden z-0" />
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 p-3 text-center">
            <div className="text-sm text-red-600 mb-2">{labels.errorPrefix}{error}</div>
            <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={handleRetry}>{labels.retry}</button>
          </div>
        )}
      </div>
    </div>
  )
}
