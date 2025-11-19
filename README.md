# Stamp Rally Platform

FastAPI・PostgreSQL・React (Vite)・Nginx を組み合わせたマルチテナント型スタンプラリー基盤です。テナント用の管理機能とユーザー体験（QR スキャン、マップ、特典クーポン）、さらに画像アップロードや HEIC 変換などのメディア処理をワンパッケージで動かせます。

## 目次
1. [特徴](#特徴)
2. [アーキテクチャと構成](#アーキテクチャと構成)
3. [セットアップと起動手順](#セットアップと起動手順)
4. [アプリケーション仕様](#アプリケーション仕様)
5. [API ハイライト](#api-ハイライト)
6. [画像アップロード仕様](#画像アップロード仕様)
7. [環境変数](#環境変数)
8. [デフォルトデータと認証情報](#デフォルトデータと認証情報)
9. [開発用コマンド](#開発用コマンド)

---

## 特徴
- **マルチテナント運用**  
  テナントごとに報酬ルール、店舗情報、キャンペーン設定、言語、テーマカラーを JSON で保持し、API で CRUD できます。
- **現地体験を再現した Web アプリ**  
  React + Vite + Tailwind 構成。QR コード読み取り、マップ表示、スタンプ進捗アニメーション、クーポン管理などを SPA で実装。
- **堅牢なバックエンド**  
  FastAPI で JWT 認証、ユーザー/テナント API、ダッシュボード統計、スタンプ記録、クーポン付与ロジックを提供。PostgreSQL 17 と接続プールでスケール。
- **画像アップロードの実務仕様**  
  PNG / JPEG / GIF / WEBP / HEIC を受け付け、必要に応じ JPEG へ変換＋5MB 以内に圧縮。20MB のアップロード制限や HEIC を Pillow-Heif 経由で読み込み。
- **Docker Compose だけで起動**  
  postgres・fastapi・nginx の 3 サービス構成。`fastapi/static/uploads` を Nginx 経由で配信し、フロントの `dist/` をそのままホスト。
- **シードデータ同梱**  
  `postgres/init.sql` がテナントや店舗、ユーザー、報酬ルールを投入するので、起動直後から実デモが確認できます。

---

## アーキテクチャと構成

```
ブラウザ (React SPA)
    │ HTTPS
Nginx (静的配信 + /api プロキシ + /docs 転送)
    │
FastAPI (認証/業務ロジック/画像保存)
    │
PostgreSQL 17 (テナント・ユーザー・進捗データ)
```

主要ディレクトリ:

```
├─ docker-compose.yaml        # 3 サービスを起動
├─ fastapi/                   # Python 3.11 アプリ
│   ├─ routers/               # auth / tenants / users / uploads
│   ├─ database/              # 接続プール・Pydantic モデル
│   └─ static/uploads/        # 画像保存先
├─ nginx/
│   ├─ conf.d/default.conf    # リバースプロキシ設定
│   └─ app/                   # React + TypeScript + Vite プロジェクト
└─ postgres/init.sql          # スキーマ＆シードデータ
```

---

## セットアップと起動手順

### 前提
- Docker / Docker Compose
- Node.js 18+（フロント開発時）
- OpenSSL（SECRET_KEY 生成用）

### 1. 環境変数を作成
```bash
cp fastapi/.env.example fastapi/.env
openssl rand -hex 32   # fastapi/.env の SECRET_KEY を必ず上書き
```

### 2. フロントエンド依存関係（初回のみ）
```bash
cd nginx/app
npm install
npm run build          # dist/ を作って Nginx 配信内容を更新
```

### 3. Docker Compose で起動
```bash
docker-compose up -d --build
docker-compose logs -f            # 各サービスの起動確認
```

アクセス確認:
- フロント: http://localhost:8080
- API: http://localhost:8000
- Swagger UI: http://localhost:8000/docs
- DB: `localhost:5432` (`fricton` / `fricton99`)

### 4. 開発サーバーを個別に動かす場合
- バックエンド: `cd fastapi && uvicorn main:app --reload --host 0.0.0.0 --port 8000`
- フロントエンド: `cd nginx/app && npm run dev` (デフォルト http://localhost:5173 )
- Nginx を通さず API へアクセスする場合は `CORS_ORIGINS` に該当ポートを追加してください。

---

## アプリケーション仕様

### バックエンド (fastapi/)
- `routers/auth.py`  
  - OAuth2 Password Flow と JSON ログインの両方で JWT を発行。  
  - `GET /api/auth/me` でプロフィール確認。
- `routers/users.py`  
  - ユーザー登録 / プロフィール / 進捗 / スタンプ記録 / クーポン利用を提供。  
  - スタンプ付与時にキャンペーン期間や重複をチェックし、しきい値達成で自動的にクーポンを追加。
- `routers/tenants.py`  
  - テナント管理者ログイン、キャンペーン設定、店舗 CRUD、報酬ルール、ダッシュボード集計、テナント作成を実装。  
  - タイムゾーンや言語コード、テーマカラー、クーポン利用期間などをバリデーション。
- `routers/uploads.py`  
  - テナント管理者のみが画像をアップロード。HEIC/HEIF の変換と 5MB 以内の圧縮を行い `/static/uploads` に保存。  
  - `/static/...` は FastAPI から直接配信され、Nginx 越しでもそのまま参照可能。

### フロントエンド (nginx/app/)
- React Router v6 (`src/lib/router.tsx`) の `/tenant/:tenantId` ルートでテナントごとのシードをロード。未定義は `takizawa` にフォールバック。
- Zustand (`src/lib/store.ts`) がスタンプ・クーポン・店舗情報・最近解放された報酬を一元管理。
- 主なページ
  - `Home` : スタンプ進捗アニメーション / 最近解放されたクーポンモーダル
  - `Scan` : `html5-qrcode` を使った QR スキャナ。`STAMP:{tenantId}:{storeId}` 形式を解析し API に連携可能。
  - `MapPage` : Leaflet による店舗マップと現在地からの距離リスト。
  - `Coupons` : 取得/使用済みクーポン一覧と使用処理。
- Tailwind v4 + Heroicons で UI を構成。`npm run dev / build / preview / lint` の標準スクリプトを提供。

### データベース
`postgres/init.sql` で以下が作成されます。

| テーブル | 主なカラム | 用途 |
| --- | --- | --- |
| `tenants` | `tenant_id`, `config`, `admin_*` | テナントの基本情報と JSON 設定 |
| `users` | `tenant_id`, `username`, `gender`, `age`, `role` | テナント内ユーザーアカウント |
| `stores` | `store_id`, `lat`, `lng`, `image_url`, `stamp_mark` | スタンプ対象拠点 |
| `reward_rules` | `threshold`, `label`, `icon` | スタンプ到達報酬のメタデータ |
| `user_progress` | `stamps` | ユーザー別のスタンプ合計 |
| `user_coupons` | `coupon_id`, `used` | 付与済みクーポン |
| `user_store_stamps` | `store_id`, `stamped_at` | 店舗ごとの打刻履歴 |

マイグレーション相当の ALTER 文も同梱し、何度実行しても破壊的にならないようにしています。

---

## API ハイライト

| 区分 | メソッド / パス | 説明 |
| --- | --- | --- |
| 認証 | `POST /api/auth/login` | OAuth2 Form ログイン（任意で `tenant_id`） |
|  | `POST /api/auth/login/json` | JSON ボディ版ログイン |
|  | `GET /api/auth/me` | ログイン中ユーザー情報 |
| ユーザー | `POST /api/users/register` | テナント配下にユーザー作成 |
|  | `GET /api/users/me` | プロフィール |
|  | `GET /api/users/me/progress` | スタンプ / クーポン進捗 |
|  | `POST /api/users/me/stamps` | `{"store_id": "..."}`
 でスタンプ付与し、新規クーポンも返却 |
|  | `PATCH /api/users/me/coupons/{id}/use` | クーポン使用済みに更新 |
| テナント | `POST /api/tenants/login` | 管理者ログイン（JWT 発行） |
|  | `POST /api/tenants/reset-password` | 管理者パスワード更新 |
|  | `GET /api/tenants/{id}` | SPA 初期表示用のシード情報（店舗 / ルール / 初期進捗） |
|  | `GET /api/tenants/{id}/dashboard-stats?days=14` | 日別ユーザー / スタンプ / クーポン集計 |
|  | `POST /api/tenants/{id}/stores` / `DELETE /stores/{store_id}` | 店舗 CRUD |
|  | `POST /api/tenants/{id}/reward-rules` / `DELETE .../{threshold}` | 報酬ルール CRUD |
|  | `PUT /api/tenants/{id}/campaign` | キャンペーン設定更新（期間、背景、テーマカラー等） |
|  | `POST /api/tenants` | 新規テナント作成（初期パスワードを自動生成） |
| 画像 | `POST /api/uploads/images` | 管理者が画像をアップロード。URL とメタ情報を返却 |

Swagger UI ( `/docs` ) にすべてのスキーマ・例が表示されます。

---

## 画像アップロード仕様

`routers/uploads.py` の実装に基づく制約:

- **許可 MIME**: `image/png`, `image/jpeg`, `image/gif`, `image/webp`, `image/heic`, `image/heif` など (`ALLOWED_CONTENT_TYPES` 参照)  
- **アップロード上限**: 20MB (`MAX_UPLOAD_SIZE`)。0 バイトや空ファイルはエラー。  
- **保存サイズ上限**: 5MB (`MAX_IMAGE_SIZE`)。超える場合は JPEG に再圧縮。HEIC/HEIF は常に JPEG に変換。  
- **変換ロジック**:
  - Pillow で読み込み、EXIF の向きを補正。
  - RGBA → RGB へ変換し背景を白で塗りつぶし。
  - 品質 88 → 46 の範囲でループし 5MB 未満になるまで再圧縮。  
- **ファイル名**: `<tenant_id>-<ランダム12byte>.{ext}`。`fastapi/static/uploads/` に保存し、`/static/uploads/...` で参照可能。
- **レスポンス**:
  ```json
  {
    "url": "http://localhost:8000/static/uploads/tenant-xxxx.jpg",
    "filename": "tenant-xxxx.jpg",
    "content_type": "image/jpeg",
    "size": 5242880
  }
  ```
- **テナント認証必須**: `Authorization: Bearer <tenant-admin-token>` を付けないと 401。`routers.tenants.get_current_tenant_admin` が `role == tenant_admin` を強制。
- **テスト**: `fastapi/tests/test_uploads.py` で HEIC → JPEG 変換とサイズ制限の単体テストを提供。`pytest tests/test_uploads.py` で実行できます。

---

## 環境変数

`fastapi/config.py` で読み込まれる主な値:

| 変数 | 説明 | 例 |
| --- | --- | --- |
| `DATABASE_URL` | SQLAlchemy/psycopg2 接続文字列 | `postgresql://fricton:fricton99@postgres:5432/stamprally-db` |
| `DB_HOST/PORT/NAME/USER/PASSWORD` | 接続プールが参照 | `postgres` / `5432` / ... |
| `SECRET_KEY` | JWT 署名鍵（必ず変更） | `openssl rand -hex 32` |
| `ALGORITHM` | JWT アルゴリズム | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | アクセストークン有効期限 | `30` |
| `APP_NAME` | FastAPI のタイトル | `stamprally-app` |
| `DEBUG` | ログレベル制御 | `True` |
| `CORS_ORIGINS` | カンマ区切りリスト | `http://localhost:8080,http://localhost:5173` |
| `DEFAULT_TIMEZONE` | キャンペーンの基準タイムゾーン (例: `UTC+09:00`) | `UTC+09:00` |
| `DEFAULT_TENANT_ID` | 未指定時に使うテナント ID | `takizawa` |

`.env` 変更後は FastAPI コンテナを再起動してください。

---

## デフォルトデータと認証情報

`postgres/init.sql` が起動時に投入します。

| 項目 | 値 |
| --- | --- |
| テナント (adminロール) | `takizawa`, `morioka`, `fricton` |
| 管理者パスワード | 既定の bcrypt `"password123"`（`fricton` のみ強制変更フラグ ON） |
| ユーザー | `demo-user`（各テナント）, `admin@takizawa.local` |
| ストア | 各テナントに 3 店舗ずつ、緯度経度とダミー画像付き |
| 報酬ルール | `threshold` 毎に 2–3 件ずつ |

⚠️ 実運用では `postgres/init.sql` をコピーして固有データに置き換え、管理者パスワードや `SECRET_KEY` を必ず変更してください。

---

## 開発用コマンド

```bash
# Docker
docker-compose up -d --build    # 再ビルド起動
docker-compose down             # 停止
docker-compose logs -f fastapi  # 特定サービスのログ

# バックエンド
cd fastapi
pip install -r requirements.txt
pytest tests/test_uploads.py

# フロントエンド
cd nginx/app
npm run dev
npm run lint
npm run build

# PostgreSQL に直接入る
docker exec -it postgres-stamprally-app psql -U fricton -d stamprally-db
```

---

必要な仕様・画像対応・セットアップをすべてこの README に集約しました。追加の質問や不明点があれば Issue / PR / チャット等で共有してください。Happy hacking! 🎉
