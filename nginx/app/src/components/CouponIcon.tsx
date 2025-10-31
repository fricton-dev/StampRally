import { GiftIcon, TicketIcon, TrophyIcon } from "@heroicons/react/24/solid"

type CouponIconProps = {
  icon?: string
  className?: string
  fillImage?: boolean
}

const ICON_MAP: Record<string, typeof GiftIcon> = {
  gift: GiftIcon,
  ticket: TicketIcon,
  trophy: TrophyIcon,
}

const isImageSource = (value?: string) =>
  Boolean(value && (/^(https?:\/\/|data:|\/)/i.test(value) || value.includes(".")))

export default function CouponIcon({ icon, className, fillImage = false }: CouponIconProps) {
  if (isImageSource(icon)) {
    const imageBase = fillImage ? "h-full w-full object-cover" : "h-6 w-6 object-contain"
    const composed = className ? `${imageBase} ${className}` : imageBase
    return <img src={icon} alt="coupon icon" className={composed} />
  }

  const IconComponent = icon ? ICON_MAP[icon.toLowerCase()] : undefined
  const baseClass = className ?? "h-6 w-6 text-orange-500"

  if (IconComponent) {
    return <IconComponent className={baseClass} />
  }

  return <TicketIcon className={baseClass} />
}
