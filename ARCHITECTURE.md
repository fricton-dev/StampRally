# アーキテクチャドキュメント

## 📐 システムアーキテクチャ

このプロジェクトは、以下の3層アーキテクチャで構成されています：

```
┌─────────────────────────────────────────────┐
│         クライアント (ブラウザ)              │
└─────────────────┬───────────────────────────┘
                  │ HTTP/HTTPS
┌─────────────────▼───────────────────────────┐
│         Nginx (リバースプロキシ)             │
│  - 静的ファイル配信                          │
│  - APIプロキシ                               │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│         FastAPI (バックエンド)               │
│  - RESTful API                              │
│  - ビジネスロジック                          │
│  - 認証・認可                                │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│         PostgreSQL (データベース)            │
│  - データ永続化                              │
│  - トランザクション管理                       │
└─────────────────────────────────────────────┘
```

## 🏗️ ディレクトリ構造

```
project-template/
├── docker-compose.yaml          # Docker Compose設定
├── .env.example                 # 環境変数テンプレート
├── Makefile                     # 開発タスク
│
├── fastapi/                     # バックエンドアプリケーション
│   ├── Dockerfile               # FastAPIコンテナ定義
│   ├── requirements.txt         # Python依存関係
│   ├── .env.example             # 環境変数テンプレート
│   ├── main.py                  # アプリケーションエントリーポイント
│   ├── config.py                # 設定管理
│   │
│   ├── database/                # データベース層
│   │   ├── database.py          # 接続プール・クエリ実行
│   │   ├── DataModel.py         # Pydanticモデル定義
│   │   └── QueryComposer.py     # SQLクエリビルダー
│   │
│   └── routers/                 # APIルーター
│       └── auth.py              # 認証エンドポイント
│
├── nginx/                       # フロントエンドサーバー
│   ├── conf.d/                  # Nginx設定
│   │   └── default.conf         # サーバー設定
│   └── app/                     # フロントエンドアプリ（Vite/React）
│
└── postgres/                    # データベース初期化
    └── init.sql                 # 初期スキーマ・データ
```

## 🔄 データフロー

### リクエストフロー

1. **クライアント** → HTTP リクエスト
2. **Nginx** → ルーティング判定
   - `/api/*` → FastAPIにプロキシ
   - その他 → 静的ファイル配信
3. **FastAPI** → リクエスト処理
   - 認証チェック
   - バリデーション
   - ビジネスロジック実行
4. **PostgreSQL** → データ操作
   - クエリ実行
   - トランザクション管理
5. **レスポンス** → クライアントへ返却

## 🗄️ データベース設計

### テナント管理（マルチテナント対応）

- 各エンティティは`tenant_id`を持つ
- QueryComposerが自動的にテナントフィルタリング
- データの完全な分離を実現

### 主要テーブル

```sql
tenants (テナント情報)
├── id
├── tenant_id (ユニーク識別子)
└── company_name

users (ユーザー)
├── id
├── tenant_id (FK)
├── username
├── email
└── password_hash

sessions (セッション管理)
├── id
├── user_id (FK)
├── token
└── expires_at
```

## 🔐 認証・認可フロー

### JWT トークンベース認証

```
1. ログイン
   POST /api/auth/login
   ↓
   ユーザー名・パスワード検証
   ↓
   JWT トークン発行
   ↓
   クライアントに返却

2. 認証が必要なAPI
   リクエストヘッダー: Authorization: Bearer <token>
   ↓
   トークン検証
   ↓
   ユーザー情報取得
   ↓
   API処理実行
```

## 🛠️ 主要コンポーネント

### DatabaseService

データベース接続とクエリ実行を管理

- **コネクションプール**: 効率的な接続管理
- **コンテキストマネージャー**: 自動的なトランザクション管理
- **依存性注入**: FastAPIのDependsで簡単に利用

```python
def get_db_service():
    with DatabaseService() as db:
        yield db
```

### QueryComposer

SQLクエリを動的に生成

- **型安全**: Pydanticモデルベース
- **テナント自動フィルタ**: マルチテナント対応
- **CRUD操作**: SELECT, INSERT, UPDATE, DELETE対応

```python
query_composer = QueryComposer(tenant_id="tenant01")
query = query_composer.generate_query(
    datamodel=Users(),
    sqltype="select",
    conditions={"username": "admin"}
)
```

### OAuth2 + JWT

セキュアな認証システム

- **パスワードハッシュ化**: bcrypt
- **トークン有効期限**: 設定可能
- **ロールベース認可**: 将来的に拡張可能

## 🔧 設定管理

### 環境変数階層

1. `.env` (最優先)
2. システム環境変数
3. デフォルト値 (config.py)

### Pydantic Settings

型安全な設定管理

```python
from config import settings

# 自動的に.envから読み込み
database_url = settings.DATABASE_URL
```

## 🚀 スケーラビリティ

### 水平スケーリング

- **FastAPI**: 複数インスタンス起動可能
- **Nginx**: ロードバランサー設定
- **PostgreSQL**: レプリケーション・シャーディング

### キャッシング戦略

- Redis導入（推奨）
- クエリ結果キャッシュ
- セッション管理

## 📊 監視・ログ

### ログレベル

- **DEBUG**: 開発環境
- **INFO**: 本番環境
- **ERROR**: エラー追跡

### 推奨ツール

- Prometheus + Grafana (メトリクス)
- ELK Stack (ログ集約)
- Sentry (エラートラッキング)

## 🔒 セキュリティ考慮事項

1. **SQL インジェクション対策**: パラメータ化クエリ
2. **XSS対策**: 入力値サニタイゼーション
3. **CSRF対策**: トークン検証
4. **CORS設定**: 許可オリジンの制限
5. **パスワード**: bcryptハッシュ化
6. **機密情報**: 環境変数で管理

## 📈 パフォーマンス最適化

### データベース

- インデックス適切な設定
- コネクションプール
- クエリ最適化

### API

- 非同期処理 (async/await)
- ページネーション
- キャッシング

### フロントエンド

- コード分割
- 遅延ローディング
- CDN活用

## 🧪 テスト戦略

### ユニットテスト

```python
# FastAPI
pytest fastapi/tests/

# フロントエンド
npm test
```

### 統合テスト

Docker Composeで環境構築してテスト

### E2Eテスト

Playwright / Cypress推奨

## 🚢 デプロイメント

### 推奨プラットフォーム

- AWS (ECS, RDS, CloudFront)
- Google Cloud (Cloud Run, Cloud SQL)
- Azure (Container Instances)
- Heroku
- DigitalOcean

### CI/CD

- GitHub Actions
- GitLab CI
- Jenkins

## 📚 参考資料

- [FastAPI公式ドキュメント](https://fastapi.tiangolo.com/)
- [PostgreSQL公式ドキュメント](https://www.postgresql.org/docs/)
- [Docker公式ドキュメント](https://docs.docker.com/)
