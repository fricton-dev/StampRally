import type { Store } from "../types"
import defaultStampImage from "../assets/stamp.png"

type StoreCardProps = {
  store: Store
  onStamp?: () => void
  showBadge?: boolean
  showAction?: boolean
  stampImageUrl?: string
}

export default function StoreCard({ store, onStamp, showBadge = true, showAction = true, stampImageUrl }: StoreCardProps) {
  const badgeImage = stampImageUrl ?? defaultStampImage
  return (
    <div className="rounded-xl overflow-hidden bg-orange-50/90 border border-orange-100 shadow-lg p-0 flex">
      {store.imageUrl && (
        <div className="w-28 h-28 relative flex-shrink-0">
          <img src={store.imageUrl} alt="" className="w-full h-full object-cover" />
          {showBadge && (
          <div className="absolute -top-4 -left-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center shadow-md overflow-hidden">
                <img src={badgeImage} alt="stamp" className="w-10 h-10 object-cover" />
              </div>
          </div>
          )}
        </div>
      )}
      <div className="flex-1 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold text-gray-900">{store.name}</div>
            <div className="text-sm text-gray-500">{store.description}</div>
          </div>
          <div className="flex items-center gap-3">
            {store.hasStamped ? (
              <div className="inline-flex items-center gap-2 text-xs px-3 py-1 bg-emerald-500 text-white rounded-full shadow">達成</div>
            ) : (
              <div className="inline-flex items-center gap-2 text-xs px-3 py-1 bg-gray-200 text-gray-700 rounded-full">未達成</div>
            )}
            {!store.hasStamped && showAction && onStamp && (
              <button className="text-sm px-3 py-1 bg-orange-600 text-white rounded-xl shadow" onClick={onStamp}>付与</button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
