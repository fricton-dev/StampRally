import { GiftIcon, TicketIcon, TrophyIcon } from "@heroicons/react/24/solid"

type CouponIconProps = {
  icon?: string
  className?: string
}

const ICON_MAP: Record<string, typeof GiftIcon> = {
  gift: GiftIcon,
  ticket: TicketIcon,
  trophy: TrophyIcon,
}

const isImageSource = (value?: string) =>
  Boolean(value && (/^(https?:\/\/|data:|\/)/i.test(value) || value.includes(".")))

export default function CouponIcon({ icon, className }: CouponIconProps) {
  if (isImageSource(icon)) {
    return (
      <img
        src={icon}
        alt="coupon icon"
        className={className ? `${className} object-contain` : "h-6 w-6 object-contain"}
      />
    )
  }

  const IconComponent = icon ? ICON_MAP[icon.toLowerCase()] : undefined
  const baseClass = className ?? "h-6 w-6 text-orange-500"

  if (IconComponent) {
    return <IconComponent className={baseClass} />
  }

  return <TicketIcon className={baseClass} />
}
