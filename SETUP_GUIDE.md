# セットアップガイド

このガイドでは、プロジェクトテンプレートを使用して新しいアプリケーションを作成する手順を説明します。

## 📋 前提条件

以下がインストールされていることを確認してください：

- Docker Desktop
- Git
- Node.js (フロントエンド開発用)
- PostgreSQL クライアント（オプション）

## 🚀 プロジェクトの作成

### 1. テンプレートをコピー

```bash
# 新しいプロジェクトディレクトリを作成
cp -r project-template my-awesome-app
cd my-awesome-app
```

### 2. 環境変数の設定

```bash
# .envファイルを作成
cp fastapi/.env.example fastapi/.env
```

`fastapi/.env`を編集して、必要な設定を変更します：

```env
# データベース設定
DATABASE_URL=postgresql://myapp_user:strong_password@postgres:5432/myapp_db
DB_HOST=postgres
DB_PORT=5432
DB_NAME=myapp_db
DB_USER=myapp_user
DB_PASSWORD=strong_password

# セキュリティ（必ず変更してください！）
SECRET_KEY=$(openssl rand -hex 32)
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# アプリケーション設定
APP_NAME=MyAwesomeApp
DEBUG=True
CORS_ORIGINS=http://localhost:8080,http://localhost:3000

# テナント設定
DEFAULT_TENANT_ID=tenant01
```

### 3. docker-compose.yamlの調整（オプション）

必要に応じて`docker-compose.yaml`の環境変数を変更します。

### 4. データベース初期化スクリプトの確認

`postgres/init.sql`を確認し、必要に応じてテーブル定義を追加します。

### 5. Dockerコンテナの起動

```bash
# コンテナをビルド・起動
docker-compose up -d --build

# ログを確認
docker-compose logs -f
```

### 6. 動作確認

- **API**: http://localhost:8000
- **API ドキュメント**: http://localhost:8000/docs
- **フロントエンド**: http://localhost:8080

## 🔧 フロントエンド開発

### React + Viteアプリケーションの作成

```bash
cd nginx
npm create vite@latest app -- --template react-ts
cd app
npm install
```

### 開発サーバーの起動

```bash
cd nginx/app
npm run dev
```

### 本番ビルド

```bash
cd nginx/app
npm run build
# ビルドされたファイルは dist/ ディレクトリに出力されます
```

## 📝 カスタマイズガイド

### 新しいルーターの追加

1. `fastapi/routers/`に新しいファイルを作成（例：`products.py`）
2. ルーターを実装
3. `main.py`にルーターを追加

```python
# main.py
from routers import products
app.include_router(products.router)
```

### データベーステーブルの追加

1. `postgres/`に新しいマイグレーションファイルを作成
2. マイグレーションを実行

```bash
docker exec -i postgres psql -U myapp_user -d myapp_db < postgres/migration_xxx.sql
```

3. `database/DataModel.py`にモデルを追加

### 環境変数の追加

1. `config.py`に新しい設定を追加
2. `.env.example`を更新
3. `.env`ファイルに実際の値を設定

## 🐛 トラブルシューティング

### ポートが既に使用されている

```bash
# ポートを変更
# docker-compose.yamlの ports セクションを編集
# 例: "8000:8000" → "8001:8000"
```

### データベース接続エラー

```bash
# PostgreSQLコンテナのログを確認
docker-compose logs postgres

# データベースに直接接続して確認
docker exec -it postgres psql -U myapp_user -d myapp_db
```

### コンテナの再起動

```bash
# すべてのコンテナを停止・削除
docker-compose down

# ボリュームも含めて削除（データベースデータも削除されます）
docker-compose down -v

# 再度起動
docker-compose up -d --build
```

## 📚 次のステップ

1. README.mdをプロジェクトに合わせて更新
2. Git リポジトリを初期化
3. .gitignoreを確認
4. 追加の依存関係をインストール
5. テストを追加
6. CI/CDパイプラインを設定

## 💡 ベストプラクティス

- `.env`ファイルは絶対にGitにコミットしない
- SECRET_KEYは必ず強力なランダム文字列を使用
- 本番環境ではDEBUG=Falseに設定
- 定期的にデータベースのバックアップを取得
- ログレベルを適切に設定

## 🔒 セキュリティチェックリスト

- [ ] .envファイルが.gitignoreに含まれている
- [ ] SECRET_KEYが強力なランダム値
- [ ] データベースのパスワードが強力
- [ ] CORS設定が適切
- [ ] 本番環境でDEBUG=False
- [ ] HTTPSを使用（本番環境）
- [ ] レート制限を実装
- [ ] 入力値の検証を実装
