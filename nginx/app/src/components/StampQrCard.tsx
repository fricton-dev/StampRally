import { useEffect, useState } from "react"
import QRCode from "qrcode"

type StampQrCardProps = {
  payload: string
  title?: string
  description?: string
  downloadFilename?: string
  size?: number
}

export default function StampQrCard({
  payload,
  title = "QRコード",
  description,
  downloadFilename = "stamp-qr.png",
  size = 240,
}: StampQrCardProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setError(null)
    setDataUrl(null)

    QRCode.toDataURL(payload, { width: size, errorCorrectionLevel: "M", margin: 1 })
      .then((url) => {
        if (!cancelled) {
          setDataUrl(url)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "QRコードの生成に失敗しました。")
        }
      })

    return () => {
      cancelled = true
    }
  }, [payload, size])

  return (
    <div className="rounded-xl border border-orange-100 bg-orange-50/60 p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      {description && <p className="mt-1 text-xs text-gray-600">{description}</p>}
      <div className="mt-3 flex flex-col items-center gap-3">
        <div className="flex h-[260px] w-[260px] items-center justify-center rounded-lg border border-dashed border-orange-200 bg-white p-3">
          {dataUrl ? (
            <img
              src={dataUrl}
              alt="スタンプ用QRコード"
              className="h-full w-full object-contain"
            />
          ) : error ? (
            <p className="text-xs text-red-600">{error}</p>
          ) : (
            <p className="text-xs text-gray-500">QRコードを生成しています…</p>
          )}
        </div>
        {dataUrl && (
          <a
            href={dataUrl}
            download={downloadFilename}
            className="inline-flex items-center rounded-lg border border-orange-500 bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white shadow transition hover:bg-orange-600"
          >
            QR画像をダウンロード
          </a>
        )}
        <textarea
          value={payload}
          readOnly
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600"
          rows={2}
        />
      </div>
    </div>
  )
}
