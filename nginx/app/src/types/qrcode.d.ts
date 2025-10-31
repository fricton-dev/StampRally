declare module "qrcode" {
  type QRCodeErrorCorrectionLevel = "L" | "M" | "Q" | "H"

  interface QRCodeToDataURLOptions {
    width?: number
    margin?: number
    scale?: number
    color?: {
      dark?: string
      light?: string
    }
    errorCorrectionLevel?: QRCodeErrorCorrectionLevel
  }

  interface QRCodeModule {
    toDataURL(text: string, options?: QRCodeToDataURLOptions): Promise<string>
  }

  const QRCode: QRCodeModule
  export default QRCode
}
