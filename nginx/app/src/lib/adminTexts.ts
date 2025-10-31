import { useLanguage } from "./i18n"
import type { AppLanguage } from "../types"

type AdminTextMap<T extends string> = Record<AppLanguage, Record<T, string>>

const DASHBOARD_TEXT: AdminTextMap<
  | "pageTitle"
  | "tenantLabel"
  | "demoButton"
  | "intro"
  | "monitoringTitle"
  | "monitoringHint"
  | "rangeLabel"
  | "rangeLoading"
  | "rangeError"
  | "rangeSummary"
  | "rangeDays"
  | "retry"
  | "usersCardTitle"
  | "usersCardPrimary"
  | "usersCardSecondary"
  | "usersTrendLabel"
  | "stampsCardTitle"
  | "stampsCardPrimary"
  | "stampsCardSecondary"
  | "stampsTrendLabel"
  | "recentStores"
  | "themeTitle"
  | "themeColorLabel"
  | "topStoresEmpty"
  | "tableDate"
  | "tableUsers"
  | "tableStamps"
  | "tableEmpty"
  | "dayOption7"
  | "dayOption14"
  | "dayOption30"
  | "dateUnset"
  | "sparklineEmpty"
  | "couponAcquireLabel"
  | "couponUseLabel"
  | "couponAcquireTrend"
  | "couponUseTrend"
  | "languageSectionTitle"
  | "languageSectionHint"
  | "languageUpdating"
  | "languageUpdated"
  | "languageFailed"
  | "languageSessionInvalid"
  | "couponSectionTitle"
  | "couponSectionHint"
  | "couponLoading"
  | "couponEmpty"
  | "campaignSummaryTitle"
  | "campaignStartLabel"
  | "campaignEndLabel"
  | "campaignMemoLabel"
  | "campaignBackgroundLabel"
  | "campaignThemeLabel"
  | "campaignUnset"
  | "recentStoresLinkLabel"
  | "storeMeta"
  | "shortcutsTitle"
  | "shortcutsStoresLabel"
  | "shortcutsStoresDescription"
  | "shortcutsCampaignLabel"
  | "shortcutsCampaignDescription"
> = {
  ja: {
    pageTitle: "管理ダッシュボード",
    tenantLabel: "テナント",
    demoButton: "デモ確認",
    intro: "スタンプラリー利用者・スタンプ数・クーポンの動きを日次で確認できます。",
    monitoringTitle: "日次モニタリング",
    monitoringHint: "期間を選択するとデータを表示します",
    rangeLabel: "表示期間",
    rangeLoading: "ダッシュボードデータを読み込み中です…",
    rangeError: "データの取得に失敗しました",
    rangeSummary: "{start} ～ {end}（{days}）",
    rangeDays: "{count}日間",
    retry: "再読み込み",
    usersCardTitle: "スタンプラリー利用者数",
    usersCardPrimary: "期間内のユニーク利用者数（日平均 {avg}人）",
    usersCardSecondary: "直近日",
    usersTrendLabel: "スタンプラリー利用者数の日次推移",
    stampsCardTitle: "合計スタンプ数",
    stampsCardPrimary: "期間内のスタンプ総数（日平均 {avg}件）",
    stampsCardSecondary: "直近日",
    stampsTrendLabel: "スタンプ総数の日次推移",
    recentStores: "最近の人気スポット",
    recentStoresLinkLabel: "店舗管理へ",
    themeTitle: "設定概要",
    themeColorLabel: "テーマカラー",
    campaignSummaryTitle: "キャンペーン情報",
    campaignStartLabel: "開始日",
    campaignEndLabel: "終了日",
    campaignMemoLabel: "キャンペーンメモ",
    campaignBackgroundLabel: "背景画像URL",
    campaignThemeLabel: "テーマカラー",
    campaignUnset: "未設定",
    topStoresEmpty: "まだ店舗情報がありません。",
    storeMeta: "ID: {id} ・ 緯度: {lat} ／ 経度: {lng}",
    tableDate: "日付",
    tableUsers: "利用者数",
    tableStamps: "スタンプ数",
    tableEmpty: "表示できるデータがありません。",
    dayOption7: "直近7日間",
    dayOption14: "直近14日間",
    dayOption30: "直近30日間",
    dateUnset: "未設定",
    sparklineEmpty: "データなし",
    couponAcquireLabel: "獲得数",
    couponUseLabel: "利用数",
    couponAcquireTrend: "獲得の推移",
    couponUseTrend: "利用の推移",
    couponSectionTitle: "クーポン獲得・利用状況",
    couponSectionHint: "クーポンごとの獲得数・利用数を日次で確認できます。集計期間は上記と連動します。",
    couponLoading: "クーポンデータを読み込み中です…",
    couponEmpty: "選択期間内に獲得・利用されたクーポンはありません。",
    languageSectionTitle: "Language",
    languageSectionHint: "ユーザー向け画面の表示言語を切り替えます。",
    languageUpdating: "更新中...",
    languageUpdated: "言語設定を更新しました。",
    languageFailed: "言語設定の更新に失敗しました。",
    languageSessionInvalid: "管理者セッションが無効です。再ログインしてください。",
    shortcutsTitle: "管理ショートカット",
    shortcutsStoresLabel: "店舗管理へ",
    shortcutsStoresDescription: "店舗一覧の確認・編集・追加を行います。",
    shortcutsCampaignLabel: "キャンペーン設定へ",
    shortcutsCampaignDescription: "背景画像やテーマカラー、開催期間などをまとめて管理できます。",
  },
  en: {
    pageTitle: "Admin Dashboard",
    tenantLabel: "Tenant",
    demoButton: "View Demo",
    intro: "Review daily trends for participants, stamp count, and coupon activity.",
    monitoringTitle: "Daily monitoring",
    monitoringHint: "Select a range to load data",
    rangeLabel: "Date range",
    rangeLoading: "Loading dashboard data…",
    rangeError: "Failed to load data",
    rangeSummary: "{start} - {end} ({days})",
    rangeDays: "{count} days",
    retry: "Reload",
    usersCardTitle: "Active participants",
    usersCardPrimary: "Unique users in range (daily avg. {avg})",
    usersCardSecondary: "Most recent day",
    usersTrendLabel: "Daily participant trend",
    stampsCardTitle: "Total stamps",
    stampsCardPrimary: "Total stamps in range (daily avg. {avg})",
    stampsCardSecondary: "Most recent day",
    stampsTrendLabel: "Daily stamp trend",
    recentStores: "Popular stores",
    recentStoresLinkLabel: "Manage stores",
    themeTitle: "Configuration summary",
    themeColorLabel: "Theme color",
    campaignSummaryTitle: "Campaign summary",
    campaignStartLabel: "Start date",
    campaignEndLabel: "End date",
    campaignMemoLabel: "Campaign memo",
    campaignBackgroundLabel: "Background image URL",
    campaignThemeLabel: "Theme color",
    campaignUnset: "Not set",
    topStoresEmpty: "No store information yet.",
    storeMeta: "ID: {id} · Latitude: {lat} / Longitude: {lng}",
    tableDate: "Date",
    tableUsers: "Users",
    tableStamps: "Stamps",
    tableEmpty: "No data available.",
    dayOption7: "Last 7 days",
    dayOption14: "Last 14 days",
    dayOption30: "Last 30 days",
    dateUnset: "Not set",
    sparklineEmpty: "No data",
    couponAcquireLabel: "Acquired",
    couponUseLabel: "Redeemed",
    couponAcquireTrend: "Acquisition trend",
    couponUseTrend: "Redemption trend",
    couponSectionTitle: "Coupon performance",
    couponSectionHint: "Daily acquisition and redemption counts per coupon. Uses the same range as above.",
    couponLoading: "Loading coupon data…",
    couponEmpty: "No coupons were acquired or redeemed in this range.",
    languageSectionTitle: "Language",
    languageSectionHint: "Switch the language used on user-facing pages.",
    languageUpdating: "Updating…",
    languageUpdated: "Language updated.",
    languageFailed: "Failed to update language.",
    languageSessionInvalid: "Admin session expired. Please log in again.",
    shortcutsTitle: "Quick actions",
    shortcutsStoresLabel: "Manage stores",
    shortcutsStoresDescription: "Review, edit, or add stamp locations.",
    shortcutsCampaignLabel: "Campaign settings",
    shortcutsCampaignDescription: "Update theme, artwork, and campaign schedule.",
  },
  zh: {
    pageTitle: "管理儀表板",
    tenantLabel: "租戶",
    demoButton: "檢視示範",
    intro: "查看每日的參與者、印章數量與優惠券使用情況。",
    monitoringTitle: "日常監控",
    monitoringHint: "選擇期間以載入資料",
    rangeLabel: "顯示期間",
    rangeLoading: "正在載入儀表板資料…",
    rangeError: "資料載入失敗",
    rangeSummary: "{start} ～ {end}（{days}）",
    rangeDays: "{count} 天",
    retry: "重新整理",
    usersCardTitle: "參與者數量",
    usersCardPrimary: "期間內的獨立使用者（每日平均 {avg} 人）",
    usersCardSecondary: "最近一天",
    usersTrendLabel: "每日參與者趨勢",
    stampsCardTitle: "印章總數",
    stampsCardPrimary: "期間內的印章總數（每日平均 {avg} 枚）",
    stampsCardSecondary: "最近一天",
    stampsTrendLabel: "每日印章趨勢",
    recentStores: "熱門店鋪",
    recentStoresLinkLabel: "前往店鋪管理",
    themeTitle: "設定摘要",
    themeColorLabel: "主題色",
    campaignSummaryTitle: "活動資訊",
    campaignStartLabel: "開始日期",
    campaignEndLabel: "結束日期",
    campaignMemoLabel: "活動備註",
    campaignBackgroundLabel: "背景圖片 URL",
    campaignThemeLabel: "主題顏色",
    campaignUnset: "未設定",
    topStoresEmpty: "尚未新增店鋪資訊。",
    storeMeta: "ID: {id} · 緯度: {lat} ／ 經度: {lng}",
    tableDate: "日期",
    tableUsers: "使用者",
    tableStamps: "印章數",
    tableEmpty: "尚無可顯示的資料。",
    dayOption7: "最近 7 天",
    dayOption14: "最近 14 天",
    dayOption30: "最近 30 天",
    dateUnset: "未設定",
    sparklineEmpty: "沒有資料",
    couponAcquireLabel: "獲得數",
    couponUseLabel: "使用數",
    couponAcquireTrend: "獲得趨勢",
    couponUseTrend: "使用趨勢",
    couponSectionTitle: "優惠券成效",
    couponSectionHint: "依照優惠券檢視每日的領取與使用紀錄，期間與上方設定同步。",
    couponLoading: "正在載入優惠券資料…",
    couponEmpty: "在此期間內沒有任何優惠券被領取或使用。",
    languageSectionTitle: "Language",
    languageSectionHint: "切換使用者畫面的顯示語言。",
    languageUpdating: "更新中...",
    languageUpdated: "語言設定已更新。",
    languageFailed: "語言設定更新失敗。",
    languageSessionInvalid: "管理者登入已失效。請重新登入。",
    shortcutsTitle: "管理捷徑",
    shortcutsStoresLabel: "店鋪管理",
    shortcutsStoresDescription: "瀏覽、編輯或新增可集章的店鋪。",
    shortcutsCampaignLabel: "活動設定",
    shortcutsCampaignDescription: "調整活動的主題色、背景與期間。",
  },
}

const CAMPAIGN_TEXT: AdminTextMap<
  | "pageTitle"
  | "pageDescription"
  | "unauthorized"
  | "backgroundHint"
  | "stampHint"
  | "backgroundUploading"
  | "stampUploading"
  | "imageOpen"
  | "imageClear"
  | "imageUploadFailed"
  | "campaignStartLabel"
  | "campaignEndLabel"
  | "campaignTimezoneLabel"
  | "campaignTimezoneDescription"
  | "campaignMemoLabel"
  | "campaignMemoPlaceholder"
  | "couponUsageSectionTitle"
  | "couponUsageModeCampaign"
  | "couponUsageModeCustom"
  | "couponUsageStartLabel"
  | "couponUsageEndLabel"
  | "maxStampLabel"
  | "maxStampPlaceholder"
  | "maxStampHelp"
  | "maxStampValidation"
  | "backgroundLabel"
  | "stampLabel"
  | "themeSectionTitle"
  | "themeSectionDescription"
  | "themeOptionOrangeLabel"
  | "themeOptionOrangeDescription"
  | "themeOptionTealLabel"
  | "themeOptionTealDescription"
  | "themeOptionGreenLabel"
  | "themeOptionGreenDescription"
  | "themeOptionPinkLabel"
  | "themeOptionPinkDescription"
  | "timezoneOption0900"
  | "timezoneOption0800"
  | "scheduleSectionTitle"
  | "imageSectionTitle"
  | "backgroundPreviewAlt"
  | "stampPreviewAlt"
  | "languageLabel"
  | "saveButton"
  | "savingButton"
  | "saveFailure"
  | "successMessage"
> = {
  ja: {
    pageTitle: "キャンペーン設定",
    pageDescription: "開催期間や背景画像、テーマカラーなどの設定を更新できます。",
    unauthorized: "管理者ログインの有効期限が切れました。再度ログインしてください。",
    backgroundHint:
      "トップ背景に表示される画像を設定できます。PNG / JPEG / GIF / WEBP / HEIC（最大20MB、5MB超は自動圧縮）に対応しています。",
    stampHint:
      "スタンプを押した際に表示されるイメージなどを設定できます。PNG / JPEG / GIF / WEBP / HEIC（最大20MB、5MB超は自動圧縮）に対応しています。",
    backgroundUploading: "背景画像をアップロードしています…",
    stampUploading: "スタンプ画像をアップロードしています…",
    imageOpen: "画像を開く",
    imageClear: "画像をクリア",
    imageUploadFailed: "画像のアップロードに失敗しました。",
    campaignStartLabel: "開始日",
    campaignEndLabel: "終了日",
    campaignTimezoneLabel: "タイムゾーン",
    campaignTimezoneDescription: "日付の判定に使用するタイムゾーンを選択してください。（UTC±HH:MM 形式）",
    campaignMemoLabel: "キャンペーンメモ",
    campaignMemoPlaceholder: "スタンプラリーの説明や注意事項を入力してください",
    couponUsageSectionTitle: "クーポン使用可能期間",
    couponUsageModeCampaign: "キャンペーン期間と同じ",
    couponUsageModeCustom: "期間を指定する",
    couponUsageStartLabel: "使用開始日",
    couponUsageEndLabel: "使用終了日",
    maxStampLabel: "最大スタンプ数",
    maxStampPlaceholder: "例: 30",
    maxStampHelp: "進捗バーとスタンプ帳に表示される上限値です。（1～200 の整数）",
    maxStampValidation: "最大スタンプ数は1～200の整数で入力してください。",
    backgroundLabel: "背景画像",
    stampLabel: "スタンプ画像",
    themeSectionTitle: "テーマカラー",
    themeSectionDescription: "サイト全体のアクセントカラーを選択してください。",
    themeOptionOrangeLabel: "オレンジ",
    themeOptionOrangeDescription: "明るく親しみのある印象に",
    themeOptionTealLabel: "ティール",
    themeOptionTealDescription: "爽やかで落ち着いた雰囲気に",
    themeOptionGreenLabel: "グリーン",
    themeOptionGreenDescription: "自然で安心感のある色合い",
    themeOptionPinkLabel: "ピンク",
    themeOptionPinkDescription: "柔らかく華やかな印象に",
    timezoneOption0900: "UTC+09:00 (日本標準時)",
    timezoneOption0800: "UTC+08:00 (台湾)",
    scheduleSectionTitle: "開催期間",
    imageSectionTitle: "画像設定",
    backgroundPreviewAlt: "背景画像のプレビュー",
    stampPreviewAlt: "スタンプ画像のプレビュー",
    languageLabel: "表示言語",
    saveButton: "設定を保存",
    savingButton: "保存中...",
    successMessage: "キャンペーン情報を更新しました。",
    saveFailure: "設定の更新に失敗しました。",
  },
  en: {
    pageTitle: "Campaign settings",
    pageDescription: "Update campaign period, background, theme color, and more.",
    unauthorized: "Admin login expired. Please sign in again.",
    backgroundHint:
      "Set the hero background image shown on the top page. Supports PNG / JPEG / GIF / WEBP / HEIC up to 20MB, with automatic compression over 5MB.",
    stampHint:
      "Set the image displayed when a stamp is collected. Supports PNG / JPEG / GIF / WEBP / HEIC up to 20MB, with automatic compression over 5MB.",
    backgroundUploading: "Uploading background image…",
    stampUploading: "Uploading stamp image…",
    imageOpen: "Open image",
    imageClear: "Clear image",
    imageUploadFailed: "Failed to upload image.",
    campaignStartLabel: "Start date",
    campaignEndLabel: "End date",
    campaignTimezoneLabel: "Timezone",
    campaignTimezoneDescription: "Choose the timezone used for date calculations (format UTC±HH:MM).",
    campaignMemoLabel: "Campaign notes",
    campaignMemoPlaceholder: "Describe the stamp rally or add notices.",
    couponUsageSectionTitle: "Coupon availability window",
    couponUsageModeCampaign: "Same as campaign period",
    couponUsageModeCustom: "Specify a custom period",
    couponUsageStartLabel: "Usage start",
    couponUsageEndLabel: "Usage end",
    maxStampLabel: "Maximum stamp count",
    maxStampPlaceholder: "Example: 30",
    maxStampHelp: "Upper limit shown on the progress bar and stamp book (integer between 1 and 200).",
    maxStampValidation: "Enter a whole number between 1 and 200.",
    backgroundLabel: "Background image",
    stampLabel: "Stamp image",
    themeSectionTitle: "Theme color",
    themeSectionDescription: "Pick the accent color used across the site.",
    themeOptionOrangeLabel: "Orange",
    themeOptionOrangeDescription: "Bright, friendly accent color",
    themeOptionTealLabel: "Teal",
    themeOptionTealDescription: "Calming, refreshing tone",
    themeOptionGreenLabel: "Green",
    themeOptionGreenDescription: "Natural, balanced look",
    themeOptionPinkLabel: "Pink",
    themeOptionPinkDescription: "Soft, vibrant highlight",
    timezoneOption0900: "UTC+09:00 (Japan)",
    timezoneOption0800: "UTC+08:00 (Taiwan)",
    scheduleSectionTitle: "Schedule",
    imageSectionTitle: "Image settings",
    backgroundPreviewAlt: "Background preview image",
    stampPreviewAlt: "Stamp preview image",
    languageLabel: "Display language",
    saveButton: "Save settings",
    savingButton: "Saving…",
    successMessage: "Campaign settings updated.",
    saveFailure: "Failed to update settings.",
  },
  zh: {
    pageTitle: "活動設定",
    pageDescription: "更新活動期間、背景圖片、主題色等資訊。",
    unauthorized: "管理者登入已失效。請重新登入。",
    backgroundHint:
      "設定首頁顯示的背景圖片，支援 PNG / JPEG / GIF / WEBP / HEIC，最大 20MB，超過 5MB 會自動壓縮。",
    stampHint:
      "設定蓋章時顯示的提示圖片，支援 PNG / JPEG / GIF / WEBP / HEIC，最大 20MB，超過 5MB 會自動壓縮。",
    backgroundUploading: "正在上傳背景圖片…",
    stampUploading: "正在上傳集章圖片…",
    imageOpen: "開啟圖片",
    imageClear: "清除圖片",
    imageUploadFailed: "圖片上傳失敗。",
    campaignStartLabel: "開始日期",
    campaignEndLabel: "結束日期",
    campaignTimezoneLabel: "時區",
    campaignTimezoneDescription: "請選擇用於日期判定的時區（UTC±HH:MM）。",
    campaignMemoLabel: "活動備註",
    campaignMemoPlaceholder: "請輸入活動說明或注意事項",
    couponUsageSectionTitle: "優惠券可用期間",
    couponUsageModeCampaign: "與活動期間相同",
    couponUsageModeCustom: "自訂期間",
    couponUsageStartLabel: "開始使用日",
    couponUsageEndLabel: "結束使用日",
    maxStampLabel: "最大集章數",
    maxStampPlaceholder: "例：30",
    maxStampHelp: "顯示於進度條與集章冊的上限值（1～200 的整數）。",
    maxStampValidation: "請輸入 1～200 之間的整數。",
    backgroundLabel: "背景圖片",
    stampLabel: "集章圖片",
    themeSectionTitle: "主題色",
    themeSectionDescription: "選擇整體介面的重點色彩。",
    themeOptionOrangeLabel: "橙色",
    themeOptionOrangeDescription: "明亮且有親和力的色調",
    themeOptionTealLabel: "青綠色",
    themeOptionTealDescription: "清爽沉穩的氛圍",
    themeOptionGreenLabel: "綠色",
    themeOptionGreenDescription: "自然且安心的色彩",
    themeOptionPinkLabel: "粉紅色",
    themeOptionPinkDescription: "柔和又華麗的印象",
    timezoneOption0900: "UTC+09:00（日本）",
    timezoneOption0800: "UTC+08:00（台灣）",
    scheduleSectionTitle: "活動期間",
    imageSectionTitle: "圖片設定",
    backgroundPreviewAlt: "背景圖片預覽",
    stampPreviewAlt: "集章圖片預覽",
    languageLabel: "顯示語言",
    saveButton: "儲存設定",
    savingButton: "儲存中...",
    successMessage: "已更新活動資訊。",
    saveFailure: "更新設定失敗。",
  },
}


const STORES_TEXT: AdminTextMap<
  | "pageTitle"
  | "pageDescription"
  | "countLabel"
  | "addStore"
  | "searchPlaceholder"
  | "storesEmpty"
  | "noMatch"
  | "unauthorized"
  | "addressLabel"
  | "latitudeLabel"
  | "longitudeLabel"
  | "descriptionLabel"
  | "imageLabel"
  | "imageHeader"
  | "nameHeader"
  | "actionHeader"
  | "imageAlt"
  | "noImage"
  | "editAction"
  | "deleteAction"
  | "deleteInProgress"
  | "deleteConfirm"
  | "deleteSuccess"
  | "deleteFailed"
  | "qrButton"
  | "qrModalTitle"
  | "qrModalDescription"
  | "qrModalDownloadLabel"
  | "close"
> = {
  ja: {
    pageTitle: "店舗管理",
    pageDescription: "スタンプ設置店舗の登録・編集を行います。",
    countLabel: "現在 {count} 店舗",
    addStore: "店舗を追加",
    searchPlaceholder: "店舗名で検索",
    storesEmpty: "まだ店舗が登録されていません。「店舗を追加」ボタンから新しい店舗を登録してください。",
    noMatch: "該当する店舗が見つかりません。検索条件を変更してください。",
    unauthorized: "管理者セッションの有効期限が切れました。再度ログインしてください。",
    addressLabel: "住所",
    latitudeLabel: "緯度",
    longitudeLabel: "経度",
    descriptionLabel: "説明",
    imageLabel: "画像",
    imageHeader: "画像",
    nameHeader: "店舗名",
    actionHeader: "操作",
    imageAlt: "{name}の画像",
    noImage: "画像なし",
    editAction: "編集",
    deleteAction: "削除",
    deleteInProgress: "削除中...",
    deleteConfirm: "この店舗を削除しますか？この操作は取り消せません。",
    deleteSuccess: "店舗を削除しました。",
    deleteFailed: "店舗の削除に失敗しました。",
    qrButton: "QR",
    qrModalTitle: "スタンプQRコード",
    qrModalDescription: "{name}のスタンプ取得用QRコードです。",
    qrModalDownloadLabel: "QRコード",
    close: "閉じる",
  },
  en: {
    pageTitle: "Store management",
    pageDescription: "Manage the stamp locations available in your campaign.",
    countLabel: "Currently {count} stores",
    addStore: "Add store",
    searchPlaceholder: "Search by store name",
    storesEmpty: "No stores registered yet. Use “Add store” to create one.",
    noMatch: "No stores match your search. Try different keywords.",
    unauthorized: "Admin session expired. Please sign in again.",
    addressLabel: "Address",
    latitudeLabel: "Latitude",
    longitudeLabel: "Longitude",
    descriptionLabel: "Description",
    imageLabel: "Image",
    imageHeader: "Image",
    nameHeader: "Store name",
    actionHeader: "Actions",
    imageAlt: "Image for {name}",
    noImage: "No image",
    editAction: "Edit",
    deleteAction: "Delete",
    deleteInProgress: "Deleting...",
    deleteConfirm: "Delete this store? This action cannot be undone.",
    deleteSuccess: "Store deleted.",
    deleteFailed: "Failed to delete store.",
    qrButton: "QR",
    qrModalTitle: "Stamp QR code",
    qrModalDescription: "Scan to issue the stamp for {name}.",
    qrModalDownloadLabel: "QR code",
    close: "Close",
  },
  zh: {
    pageTitle: "店鋪管理",
    pageDescription: "管理活動中可集章的店鋪。",
    countLabel: "目前 {count} 間店鋪",
    addStore: "新增店鋪",
    searchPlaceholder: "以店名搜尋",
    storesEmpty: "尚未新增店鋪。請使用「新增店鋪」按鈕建立資訊。",
    noMatch: "找不到符合條件的店鋪，請調整搜尋條件。",
    unauthorized: "管理者登入已失效。請重新登入。",
    addressLabel: "地址",
    latitudeLabel: "緯度",
    longitudeLabel: "經度",
    descriptionLabel: "描述",
    imageLabel: "圖片",
    imageHeader: "圖片",
    nameHeader: "店鋪名稱",
    actionHeader: "操作",
    imageAlt: "{name} 的圖片",
    noImage: "無圖片",
    editAction: "編輯",
    deleteAction: "刪除",
    deleteInProgress: "刪除中...",
    deleteConfirm: "要刪除這間店鋪嗎？此操作無法復原。",
    deleteSuccess: "店鋪已刪除。",
    deleteFailed: "刪除店鋪失敗。",
    qrButton: "QR",
    qrModalTitle: "集章 QR Code",
    qrModalDescription: "掃描此 QR Code 以在 {name} 發行集章。",
    qrModalDownloadLabel: "QR Code",
    close: "關閉",
  },
}

const STORE_EDITOR_TEXT: AdminTextMap<
  | "unauthorizedError"
  | "imageUploadSuccess"
  | "imageUploadFailure"
  | "addressRequired"
  | "addressNotFound"
  | "addressLookupFailed"
  | "addressAppliedSingle"
  | "addressAppliedMultiple"
  | "coordinatesApplied"
  | "requiredFields"
  | "storeCreated"
  | "storeUpdated"
  | "storeSaveFailed"
  | "storeNotFoundTitle"
  | "storeNotFoundMessage"
  | "backToList"
  | "pageTitleCreate"
  | "pageTitleEdit"
  | "pageDescription"
  | "storeIdLabel"
  | "storeIdPlaceholder"
  | "storeNameLabel"
  | "addressSearchLabel"
  | "addressPlaceholder"
  | "searchButton"
  | "searchingButton"
  | "candidateTitle"
  | "useThisCoordinate"
  | "imageLabel"
  | "imageUploading"
  | "openImage"
  | "clearImage"
  | "imageHint"
  | "imagePreviewAlt"
  | "descriptionLabel"
  | "descriptionPlaceholder"
  | "stampMarkLabel"
  | "stampMarkPlaceholder"
  | "saveInProgress"
  | "saveNew"
  | "saveEdit"
  | "qrSectionTitle"
  | "qrSectionDescription"
  | "qrSectionEmpty"
> = {
  ja: {
    unauthorizedError: "管理者セッションの有効期限が切れました。再度ログインしてください。",
    imageUploadSuccess: "画像をアップロードしました。",
    imageUploadFailure: "画像のアップロードに失敗しました。",
    addressRequired: "住所を入力してください。",
    addressNotFound: "該当する住所が見つかりませんでした。",
    addressLookupFailed: "住所の検索に失敗しました。",
    addressAppliedSingle: "{name} の位置情報を反映しました。",
    addressAppliedMultiple: "{count}件の候補を取得しました。最初の候補で位置情報を反映済みです。必要に応じて候補を選択してください。",
    coordinatesApplied: "{name} の位置情報を反映しました。",
    requiredFields: "店舗名と位置情報を入力してください。",
    storeCreated: "店舗を登録しました。",
    storeUpdated: "店舗を更新しました。",
    storeSaveFailed: "店舗情報の保存に失敗しました。",
    storeNotFoundTitle: "店舗が見つかりません",
    storeNotFoundMessage: "ID {id} の店舗は存在しません。削除された可能性があります。",
    backToList: "店舗一覧へ戻る",
    pageTitleCreate: "店舗を追加",
    pageTitleEdit: "店舗を編集",
    pageDescription: "住所検索で位置情報を自動取得し、店舗の詳細を設定します。",
    storeIdLabel: "店舗ID（任意）",
    storeIdPlaceholder: "未入力の場合は自動発行されます",
    storeNameLabel: "店舗名",
    addressSearchLabel: "住所から検索",
    addressPlaceholder: "例 東京都千代田区丸の内1-1-1",
    searchButton: "位置情報を検索",
    searchingButton: "検索中...",
    candidateTitle: "候補を選択",
    useThisCoordinate: "この位置を使う",
    imageLabel: "店舗画像",
    imageUploading: "画像をアップロードしています…",
    openImage: "画像を開く",
    clearImage: "画像をクリア",
    imageHint:
      "最大20MBの PNG / JPEG / GIF / WEBP / HEIC に対応しています。5MBを超える場合は自動で圧縮されます。ファイルを選択するか、下の入力欄に画像URLを直接入力できます。",
    imagePreviewAlt: "店舗画像のプレビュー",
    descriptionLabel: "説明",
    descriptionPlaceholder: "例 営業時間や補足メモなど",
    stampMarkLabel: "スタンプマーク",
    stampMarkPlaceholder: "スタンプ帳に表示する任意の短い文字列",
    saveInProgress: "保存中...",
    saveNew: "店舗を登録",
    saveEdit: "変更を保存",
    qrSectionTitle: "スタンプQRコード",
    qrSectionDescription:
      "来店時に読み取るQRコードです。ダウンロードして印刷するか、他端末に共有してください。",
    qrSectionEmpty: "店舗IDが未確定のため、保存後にQRコードが表示されます。",
  },
  en: {
    unauthorizedError: "Admin session expired. Please sign in again.",
    imageUploadSuccess: "Image uploaded.",
    imageUploadFailure: "Failed to upload image.",
    addressRequired: "Enter an address.",
    addressNotFound: "No results found for that address.",
    addressLookupFailed: "Failed to search the address.",
    addressAppliedSingle: "Applied location for {name}.",
    addressAppliedMultiple: "Fetched {count} candidates. The first one has been applied automatically. Select another if needed.",
    coordinatesApplied: "Applied location for {name}.",
    requiredFields: "Enter the store name and location.",
    storeCreated: "Store registered.",
    storeUpdated: "Store updated.",
    storeSaveFailed: "Failed to save store information.",
    storeNotFoundTitle: "Store not found",
    storeNotFoundMessage: "Store ID {id} does not exist. It may have been removed.",
    backToList: "Back to store list",
    pageTitleCreate: "Add store",
    pageTitleEdit: "Edit store",
    pageDescription: "Search by address to auto-fill the location, then configure the store details.",
    storeIdLabel: "Store ID (optional)",
    storeIdPlaceholder: "Leave blank to auto-generate",
    storeNameLabel: "Store name",
    addressSearchLabel: "Search by address",
    addressPlaceholder: "e.g. 1-1-1 Marunouchi, Chiyoda-ku, Tokyo",
    searchButton: "Search location",
    searchingButton: "Searching...",
    candidateTitle: "Select a candidate",
    useThisCoordinate: "Use this location",
    imageLabel: "Store image",
    imageUploading: "Uploading image…",
    openImage: "Open image",
    clearImage: "Clear image",
    imageHint:
      "Supports PNG / JPEG / GIF / WEBP / HEIC up to 20MB. Files over 5MB are compressed automatically. Select a file or paste an image URL below.",
    imagePreviewAlt: "Store image preview",
    descriptionLabel: "Description",
    descriptionPlaceholder: "e.g. Business hours or additional notes",
    stampMarkLabel: "Stamp label",
    stampMarkPlaceholder: "Optional short text displayed on the stamp book",
    saveInProgress: "Saving...",
    saveNew: "Register store",
    saveEdit: "Save changes",
    qrSectionTitle: "Stamp QR code",
    qrSectionDescription:
      "Present this QR code at the store. Download to print or share with another device.",
    qrSectionEmpty: "The QR code appears after saving because the store ID is not finalized yet.",
  },
  zh: {
    unauthorizedError: "管理者登入已失效。請重新登入。",
    imageUploadSuccess: "圖片已上傳。",
    imageUploadFailure: "圖片上傳失敗。",
    addressRequired: "請輸入地址。",
    addressNotFound: "查無符合的地址。",
    addressLookupFailed: "地址搜尋失敗。",
    addressAppliedSingle: "已套用 {name} 的位置資料。",
    addressAppliedMultiple: "取得 {count} 筆候選結果，已自動套用第一筆位置。如需調整，請選擇其他候選。",
    coordinatesApplied: "已套用 {name} 的位置資料。",
    requiredFields: "請輸入店鋪名稱與位置。",
    storeCreated: "已新增店鋪。",
    storeUpdated: "已更新店鋪。",
    storeSaveFailed: "儲存店鋪資訊失敗。",
    storeNotFoundTitle: "找不到店鋪",
    storeNotFoundMessage: "ID {id} 的店鋪不存在，可能已被刪除。",
    backToList: "返回店鋪列表",
    pageTitleCreate: "新增店鋪",
    pageTitleEdit: "編輯店鋪",
    pageDescription: "透過地址搜尋自動取得位置，並設定店鋪詳細資訊。",
    storeIdLabel: "店鋪 ID（選填）",
    storeIdPlaceholder: "留白則自動產生",
    storeNameLabel: "店鋪名稱",
    addressSearchLabel: "以地址搜尋",
    addressPlaceholder: "例如 台北市信義區市府路45號",
    searchButton: "搜尋位置",
    searchingButton: "搜尋中...",
    candidateTitle: "選擇候選位置",
    useThisCoordinate: "使用此位置",
    imageLabel: "店鋪圖片",
    imageUploading: "正在上傳圖片…",
    openImage: "開啟圖片",
    clearImage: "清除圖片",
    imageHint:
      "支援 PNG / JPEG / GIF / WEBP / HEIC，大小上限 20MB，超過 5MB 會自動壓縮。可選擇檔案或在下方輸入圖片 URL。",
    imagePreviewAlt: "店鋪圖片預覽",
    descriptionLabel: "描述",
    descriptionPlaceholder: "例如 營業時間或備註",
    stampMarkLabel: "集章標記",
    stampMarkPlaceholder: "顯示在集章頁面的短文字（選填）",
    saveInProgress: "儲存中...",
    saveNew: "新增店鋪",
    saveEdit: "儲存變更",
    qrSectionTitle: "集章 QR Code",
    qrSectionDescription:
      "提供來店顧客掃描的 QR Code，可下載列印或分享至其他裝置。",
    qrSectionEmpty: "店鋪 ID 尚未確定，儲存後會顯示 QR Code。",
  },
}



const COUPONS_TEXT: AdminTextMap<
  | "pageTitle"
  | "pageDescription"
  | "unauthorized"
  | "thresholdLabel"
  | "labelLabel"
  | "iconSectionLabel"
  | "iconPreviewLabel"
  | "iconPreviewEmpty"
  | "iconModePreset"
  | "iconModeImage"
  | "iconOptionGift"
  | "iconOptionTicket"
  | "iconOptionTrophy"
  | "iconUploading"
  | "iconUploadSuccess"
  | "iconUploadFailure"
  | "iconOpen"
  | "iconClear"
  | "iconUploadHint"
  | "iconAlt"
  | "validationRequiredFields"
  | "validationThresholdPositive"
  | "validationIconMissing"
  | "saveCreateButton"
  | "saveUpdateButton"
  | "saveInProgress"
  | "cancelEdit"
  | "saveCreateSuccess"
  | "saveUpdateSuccess"
  | "saveFailure"
  | "entryLoadFailure"
  | "deleteConfirm"
  | "deleteInProgress"
  | "deleteSuccess"
  | "deleteFailure"
  | "existingRulesTitle"
  | "existingRulesCount"
  | "existingRulesEmpty"
  | "ruleSummary"
  | "ruleIconLabel"
  | "ruleIconPreset"
  | "editAction"
  | "deleteAction"
> = {
  ja: {
    pageTitle: "クーポン特典の管理",
    pageDescription: "特典を獲得するために必要なスタンプ数やアイコンを設定します。",
    unauthorized: "管理者セッションの有効期限が切れました。再度ログインしてください。",
    thresholdLabel: "必要なスタンプ数",
    labelLabel: "特典名",
    iconSectionLabel: "アイコン設定（任意）",
    iconPreviewLabel: "プレビュー:",
    iconPreviewEmpty: "未設定",
    iconModePreset: "デフォルトアイコン",
    iconModeImage: "画像をアップロード",
    iconOptionGift: "ギフト",
    iconOptionTicket: "チケット",
    iconOptionTrophy: "トロフィー",
    iconUploading: "画像をアップロードしています…",
    iconUploadSuccess: "画像をアップロードしました。",
    iconUploadFailure: "画像のアップロードに失敗しました。",
    iconOpen: "画像を開く",
    iconClear: "クリア",
    iconUploadHint: "最大20MBの PNG / JPEG / GIF / WEBP / HEIC に対応しています。5MBを超える場合は自動で圧縮されます。ファイルを選択するか、下の入力欄に画像URLを直接入力できます。",
    iconAlt: "アイコン画像のプレビュー",
    validationRequiredFields: "必要なスタンプ数と特典名を入力してください。",
    validationThresholdPositive: "必要なスタンプ数は1以上の整数で入力してください。",
    validationIconMissing: "画像アイコンはURLを入力するか、ファイルをアップロードしてください。",
    saveCreateButton: "特典を追加",
    saveUpdateButton: "特典を更新",
    saveInProgress: "保存中...",
    cancelEdit: "編集をキャンセル",
    saveCreateSuccess: "特典ルールを作成しました。",
    saveUpdateSuccess: "特典ルールを更新しました。",
    saveFailure: "特典ルールの保存に失敗しました。",
    entryLoadFailure: "特典データを読み込めませんでした。",
    deleteConfirm: "この特典ルールを削除しますか？",
    deleteInProgress: "削除中...",
    deleteSuccess: "特典ルールを削除しました。",
    deleteFailure: "特典ルールの削除に失敗しました。",
    existingRulesTitle: "登録済みの特典ルール",
    existingRulesCount: "全 {count} 件",
    existingRulesEmpty: "まだ特典ルールがありません。上のフォームから追加してください。",
    ruleSummary: "{threshold} スタンプで {label}",
    ruleIconLabel: "アイコン:",
    ruleIconPreset: "プリセット: {label}",
    editAction: "編集",
    deleteAction: "削除",
  },
  en: {
    pageTitle: "Coupon rewards",
    pageDescription: "Configure the stamp thresholds and icons for each reward.",
    unauthorized: "Admin session expired. Please sign in again.",
    thresholdLabel: "Required stamps",
    labelLabel: "Reward name",
    iconSectionLabel: "Icon settings (optional)",
    iconPreviewLabel: "Preview:",
    iconPreviewEmpty: "Not set",
    iconModePreset: "Preset icon",
    iconModeImage: "Upload image",
    iconOptionGift: "Gift",
    iconOptionTicket: "Ticket",
    iconOptionTrophy: "Trophy",
    iconUploading: "Uploading image…",
    iconUploadSuccess: "Image uploaded successfully.",
    iconUploadFailure: "Failed to upload image.",
    iconOpen: "Open image",
    iconClear: "Clear",
    iconUploadHint: "Supports PNG / JPEG / GIF / WEBP / HEIC up to 20MB. Files larger than 5MB are automatically compressed. Select a file or paste an image URL below.",
    iconAlt: "Icon preview",
    validationRequiredFields: "Enter the required stamp count and reward name.",
    validationThresholdPositive: "Stamp count must be a positive whole number.",
    validationIconMissing: "Provide an image URL or upload an icon file.",
    saveCreateButton: "Add reward",
    saveUpdateButton: "Update reward",
    saveInProgress: "Saving...",
    cancelEdit: "Cancel edit",
    saveCreateSuccess: "Reward rule created.",
    saveUpdateSuccess: "Reward rule updated.",
    saveFailure: "Failed to save reward rule.",
    entryLoadFailure: "Unable to load the selected rule.",
    deleteConfirm: "Delete this reward rule?",
    deleteInProgress: "Deleting...",
    deleteSuccess: "Reward rule deleted.",
    deleteFailure: "Failed to delete reward rule.",
    existingRulesTitle: "Registered reward rules",
    existingRulesCount: "Total {count}",
    existingRulesEmpty: "No reward rules yet. Add one using the form above.",
    ruleSummary: "{threshold} stamps — {label}",
    ruleIconLabel: "Icon:",
    ruleIconPreset: "Preset: {label}",
    editAction: "Edit",
    deleteAction: "Delete",
  },
  zh: {
    pageTitle: "優惠券獎勵管理",
    pageDescription: "設定獲得優惠券所需的集章數與圖示。",
    unauthorized: "管理者登入已失效。請重新登入。",
    thresholdLabel: "所需集章數",
    labelLabel: "獎勵名稱",
    iconSectionLabel: "圖示設定（選填）",
    iconPreviewLabel: "預覽:",
    iconPreviewEmpty: "未設定",
    iconModePreset: "內建圖示",
    iconModeImage: "上傳圖片",
    iconOptionGift: "禮物",
    iconOptionTicket: "票券",
    iconOptionTrophy: "獎盃",
    iconUploading: "正在上傳圖片…",
    iconUploadSuccess: "圖片已上傳。",
    iconUploadFailure: "圖片上傳失敗。",
    iconOpen: "開啟圖片",
    iconClear: "清除",
    iconUploadHint: "支援 PNG / JPEG / GIF / WEBP / HEIC，最大 20MB。超過 5MB 會自動壓縮。可選擇檔案或在下方輸入圖片 URL。",
    iconAlt: "圖示預覽",
    validationRequiredFields: "請輸入所需集章數與獎勵名稱。",
    validationThresholdPositive: "所需集章數必須是 1 以上的整數。",
    validationIconMissing: "請輸入圖片 URL 或上傳圖示。",
    saveCreateButton: "新增獎勵",
    saveUpdateButton: "更新獎勵",
    saveInProgress: "儲存中...",
    cancelEdit: "取消編輯",
    saveCreateSuccess: "已新增獎勵規則。",
    saveUpdateSuccess: "已更新獎勵規則。",
    saveFailure: "儲存獎勵規則失敗。",
    entryLoadFailure: "無法載入選取的規則。",
    deleteConfirm: "要刪除此獎勵規則嗎？",
    deleteInProgress: "刪除中...",
    deleteSuccess: "獎勵規則已刪除。",
    deleteFailure: "刪除獎勵規則失敗。",
    existingRulesTitle: "已設定的獎勵規則",
    existingRulesCount: "共 {count} 筆",
    existingRulesEmpty: "尚未建立獎勵規則，請透過上方表單新增。",
    ruleSummary: "集滿 {threshold} 枚章即可獲得 {label}",
    ruleIconLabel: "圖示:",
    ruleIconPreset: "內建: {label}",
    editAction: "編輯",
    deleteAction: "刪除",
  },
}

export const useDashboardText = () => {
  const language = useLanguage()
  return DASHBOARD_TEXT[language]
}


export const useCouponsText = () => {
  const language = useLanguage()
  return COUPONS_TEXT[language]
}

export const useCampaignText = () => {
  const language = useLanguage()
  return CAMPAIGN_TEXT[language]
}

export const useStoresText = () => {
  const language = useLanguage()
  return STORES_TEXT[language]
}

export const useStoreEditorText = () => {
  const language = useLanguage()
  return STORE_EDITOR_TEXT[language]
}
