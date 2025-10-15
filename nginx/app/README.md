# Stamp Rally Demo

ローカルのスタンプラリー体験を再現する React + TypeScript + Vite アプリです。QR コードでスタンプを追加し、進捗アニメーションや特典クーポンを管理できます。

## ざっくり機能
- テナントごとにスタンプ数と報酬ルールを管理
- QR 読み取りで店舗スタンプを付与し、ボーナスクーポンも抽選
- ホーム画面でスタンプ数と進捗バーをアニメーション表示
- 新しく解放されたクーポンをモーダルで案内
- 地図で店舗位置や現在地からの距離を確認
- 取得済み／使用済みクーポンの一覧表示

## セットアップ
```bash
npm install
npm run dev     # ローカル開発サーバー (デフォルト: http://localhost:5173)
npm run build   # 型チェック + 本番ビルド
```

## ディレクトリ早見表
```
src/
├─ assets/        … 画像・テクスチャなどの静的アセット
├─ components/    … 画面間で使い回す UI コンポーネント
├─ data/          … デモ用の初期データや種別情報
├─ lib/           … ルーター・状態管理・ユーティリティ
├─ pages/         … ルーターから表示される各ページ
├─ types/         … アプリ全体で共有する TypeScript 型定義
├─ App.tsx        … ルートレイアウトのエントリーポイント
├─ main.tsx       … React のマウントと RouterProvider の起動
└─ index.css      … Tailwind/カスタム CSS のエントリーファイル
```

## ファイル詳解

### `src/lib/store.ts`
Zustand でアプリ状態を一元管理しています。

- `useAppStore` … 全てのページ／コンポーネントが利用するストア。
- `loadTenant(seed)` … `demo.ts` のテナント定義を丸ごと読み込み、状態を初期化。
- `recordStoreStamp(storeId)` … QR スキャンから店舗 ID を渡すと、スタンプ付与・重複チェック・新規クーポン抽出・状態更新までを行います。
- `addStamp()` … スキャンを経由せずスタンプだけを増やしたい場合のユーティリティ。
- `addCoupon(coupon)` / `useCoupon(id)` … ボーナス付与や使用処理を担当。
- `recentRewardCoupons` / `clearRecentRewardCoupons()` … 新しく解放された報酬クーポンをホーム画面のモーダルに渡すためのキュー。
- `ensureRuleCoupons(progress, rules, tenantId)` … スタンプ数に応じて達成済みルールを確認し、未追加のクーポンを生成する内部ユーティリティ。

### `src/lib/router.tsx`
React Router v6 の構成を定義。`/tenant/:tenantId` ルートで `TenantRoute` を介し、URL からテナント ID を取得 → ストアへロードします。未定義 ID ならデフォルト (`takizawa`) にリダイレクト。

### `src/lib/stamps.ts`
- `nextThreshold(stamps, config)` … 現在のスタンプ数に対して次に目指す特典情報を返すヘルパー関数。

### `src/lib/geo.ts`
Leaflet 用の地理ユーティリティ。
- `nearestUnstamped(position, stores)` … 現在地に最も近い未達成店舗を返します。
- `storesWithDistance(position, stores)` … 全店舗の距離情報を付与した配列。

### `src/data/demo.ts`
- デモ用テナント (`demoTenants`) の初期データ。報酬ルールや店舗リスト、初期スタンプ数を定義。
- `findDemoTenant(tenantId)` で ID からシードを取り出します。
- `defaultTenantId` は起動直後に表示するテナント。

### `src/types/index.ts`
テナント／店舗／報酬ルール／クーポン／ユーザー進捗などの型定義をまとめたファイル。アプリ全域でインポートして利用します。

### ページ (`src/pages/`)
- `Home.tsx` … スタンプ数と進捗バーをアニメーション表示し、`recentRewardCoupons` をモーダルで案内。次の特典情報やスタンプ一覧も表示。
- `Scan.tsx` … QR スキャナ画面。本体の `onText` で
  - QR 文字列のバリデーション (`STAMP:` プレフィックス / テナント一致 / 店舗 ID)
  - スタンプ登録 (`recordStoreStamp`)
  - 状態メッセージの更新とアラート表示
  - 成功後のホーム遷移
 などを行います。
- `MapPage.tsx` … Leaflet マップを描画し、店舗マーカー・現在地・距離別リストを表示。
- `Coupons.tsx` … 取得済みクーポンを「使用可能 / 使用済み」で分けて表示し、使用操作では確認ダイアログを出します。

### コンポーネント (`src/components/`)
- `RootLayout.tsx` … 共通ヘッダーや背景などページ全体の枠組み。
- `Header.tsx` … テナント名や背景テクスチャの表示。
- `BottomNav.tsx` … 各ページへの固定ナビゲーション。
- `StoreCard.tsx` / `CouponCard.tsx` … 店舗・クーポン情報をカード表示する UI。
- `QRScanner.tsx` … `html5-qrcode` を使ってブラウザのカメラから QR を読み取り、結果テキストをコールバックで返します。エラー時はリトライ UI を表示。

### エントリーポイント
- `main.tsx` … ReactDOM のマウントと `router` の提供。
- `App.tsx` … `RouterProvider` を含むアプリ全体のルート。
- `index.css` … tailwind ベースのスタイル起動やカスタムクラス定義。

## アプリの流れ
1. `/tenant/:id` にアクセスすると `demoTenants` から該当シードを読み込み、ストアを初期化。
2. ホームでは `useAppStore` の状態を監視し、スタンプ数や進捗率をアニメーション表示。新規クーポンがあればモーダルを開く。
3. QR 画面で `QRScanner` が読み取った文字列を `Scan.tsx` の `onText` が解析し、`recordStoreStamp` を呼び出す。
4. `recordStoreStamp` がスタンプ更新＆報酬チェック → `recentRewardCoupons` に登録。
5. 成功時はアラートを挟んでホームへ遷移。ホームのモーダルに新しいクーポンが表示され、閉じるとキューがクリアされる。

## 開発メモ
- QR の文字列形式は `STAMP:{tenantId}:{storeId}`（同一テナントの場合 `STAMP:{storeId}` でも可）。
- デモのスタンプ画像は `src/assets/stamp.png`。テナント固有の画像を使いたい場合は `demo.ts` の `stampImageUrl` を変更。
- モーダルで紹介されるクーポン文言は `ensureRuleCoupons` の生成ロジックで制御。

この README がチームメンバーのキャッチアップや改修時の入口になれば幸いです。必要に応じて機能追加やドキュメント追記を行ってください。
