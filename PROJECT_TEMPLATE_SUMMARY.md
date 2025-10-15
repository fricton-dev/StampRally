# プロジェクトテンプレート完全ガイド

このテンプレートで作成されたファイルの一覧と説明です。

## 📦 作成されたファイル一覧

### ルートディレクトリ

| ファイル | 説明 |
|---------|------|
| `README.md` | プロジェクト概要・使い方 |
| `QUICK_START.md` | 最速起動ガイド（3ステップ） |
| `SETUP_GUIDE.md` | 詳細セットアップ手順 |
| `ARCHITECTURE.md` | システムアーキテクチャ解説 |
| `docker-compose.yaml` | Docker Compose設定 |
| `.env.example` | Docker環境変数テンプレート |
| `.gitignore` | Git除外設定 |
| `Makefile` | 開発タスク自動化 |

### fastapi/ (バックエンド)

| ファイル | 説明 |
|---------|------|
| `Dockerfile` | FastAPIコンテナ定義 |
| `requirements.txt` | Python依存パッケージ |
| `.env.example` | 環境変数テンプレート |
| `main.py` | アプリケーションエントリーポイント |
| `config.py` | 設定管理（Pydantic Settings） |

#### database/

| ファイル | 説明 |
|---------|------|
| `database.py` | データベース接続・クエリ実行 |
| `DataModel.py` | Pydanticモデル定義 |
| `QueryComposer.py` | SQLクエリビルダー |

#### routers/

| ファイル | 説明 |
|---------|------|
| `auth.py` | 認証API（JWT） |

### nginx/ (フロントエンド)

#### conf.d/

| ファイル | 説明 |
|---------|------|
| `default.conf` | Nginx設定（リバースプロキシ） |

### postgres/ (データベース)

| ファイル | 説明 |
|---------|------|
| `init.sql` | 初期スキーマ・サンプルデータ |

## 🎯 主要機能

### ✅ 実装済み機能

- [x] Docker Compose環境
- [x] FastAPI バックエンド
- [x] PostgreSQL データベース
- [x] Nginx リバースプロキシ
- [x] JWT認証システム
- [x] データベース接続プール
- [x] QueryComposer（SQLビルダー）
- [x] マルチテナント対応基盤
- [x] CORS設定
- [x] 環境変数管理
- [x] ログ設定
- [x] API自動ドキュメント（Swagger）

### 📝 カスタマイズポイント

1. **環境変数** (`.env`)
   - データベース認証情報
   - JWT秘密鍵
   - CORS許可オリジン
   - アプリケーション名

2. **データベーススキーマ** (`postgres/init.sql`)
   - テーブル定義
   - インデックス
   - 初期データ

3. **APIルーター** (`fastapi/routers/`)
   - 新しいエンドポイント追加
   - ビジネスロジック実装

4. **フロントエンド** (`nginx/app/`)
   - React/Viteアプリ追加
   - UIコンポーネント

## 🚀 使用開始フロー

```
1. テンプレートをコピー
   ↓
2. 環境変数を設定 (.env)
   ↓
3. docker-compose up -d
   ↓
4. ブラウザで確認
   ↓
5. カスタマイズ開始
```

## 🛠️ 開発ワークフロー

### バックエンド開発

```bash
# 1. 新しいルーターを作成
fastapi/routers/your_feature.py

# 2. main.pyに追加
from routers import your_feature
app.include_router(your_feature.router)

# 3. コンテナを再起動
docker-compose restart fastapi
```

### データベース開発

```bash
# 1. マイグレーションファイル作成
postgres/migration_xxx.sql

# 2. 実行
make migrate FILE=migration_xxx.sql

# 3. モデル更新
fastapi/database/DataModel.py
```

### フロントエンド開発

```bash
# 1. Viteプロジェクト作成
cd nginx
npm create vite@latest app -- --template react-ts

# 2. 開発
cd app
npm install
npm run dev

# 3. ビルド
npm run build
```

## 📊 技術スタック

### バックエンド
- **FastAPI** 0.104.1 - Web フレームワーク
- **Pydantic** 2.5.0 - データバリデーション
- **psycopg2** 2.9.9 - PostgreSQLドライバー
- **python-jose** 3.3.0 - JWT
- **passlib** 1.7.4 - パスワードハッシュ

### データベース
- **PostgreSQL** 17 - RDBMS

### フロントエンド
- **Nginx** latest - Webサーバー
- **React** (オプション) - UIライブラリ
- **Vite** (オプション) - ビルドツール

### インフラ
- **Docker** - コンテナ化
- **Docker Compose** - オーケストレーション

## 🔒 セキュリティ機能

- ✅ bcryptパスワードハッシュ化
- ✅ JWT トークン認証
- ✅ CORS設定
- ✅ 環境変数による機密情報管理
- ✅ SQLインジェクション対策（パラメータ化クエリ）
- ✅ マルチテナント対応（データ分離）

## 📈 スケーラビリティ

### 水平スケーリング
- FastAPI: 複数インスタンス起動
- Nginx: ロードバランサー
- PostgreSQL: レプリケーション

### 推奨拡張
- Redis: キャッシング・セッション管理
- Celery: 非同期タスク
- RabbitMQ/Kafka: メッセージキュー

## 🧪 テスト

```bash
# ユニットテスト
docker exec fastapi pytest

# カバレッジ
docker exec fastapi pytest --cov

# E2Eテスト（要セットアップ）
npm run test:e2e
```

## 📚 ドキュメント構成

1. **QUICK_START.md** - まず読む（5分）
2. **README.md** - 概要理解（10分）
3. **SETUP_GUIDE.md** - 詳細セットアップ（30分）
4. **ARCHITECTURE.md** - アーキテクチャ理解（1時間）
5. **このファイル** - 全体像把握（15分）

## 💡 ベストプラクティス

### 開発時
- ✅ `.env`は`.gitignore`に含める
- ✅ `DEBUG=True`で詳細ログ
- ✅ ホットリロードを活用
- ✅ API Docsで動作確認

### 本番環境
- ✅ `DEBUG=False`
- ✅ 強力な`SECRET_KEY`
- ✅ HTTPS使用
- ✅ レート制限実装
- ✅ ログ監視

## 🆘 よくある質問

### Q: ポート番号を変更したい
A: `docker-compose.yaml`の`ports`セクションを編集

### Q: データベースをリセットしたい
A: `docker-compose down -v` でボリューム削除

### Q: 本番環境にデプロイするには？
A: AWS ECS, Google Cloud Run, Herokuなどを推奨

### Q: フロントエンドはどう追加する？
A: `nginx/app`にVite/Reactプロジェクトを作成

## 🎓 学習リソース

- [FastAPI Tutorial](https://fastapi.tiangolo.com/tutorial/)
- [PostgreSQL Tutorial](https://www.postgresqltutorial.com/)
- [Docker Documentation](https://docs.docker.com/)
- [JWT Introduction](https://jwt.io/introduction)

## 🤝 貢献

このテンプレートを改善したい場合：

1. フォーク
2. 機能ブランチ作成
3. 変更をコミット
4. プルリクエスト

## 📄 ライセンス

MIT License - 自由に使用・改変可能

---

**Happy Coding! 🚀**
