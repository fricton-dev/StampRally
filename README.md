# FastAPI + PostgreSQL + Nginx プロジェクトテンプレート

このテンプレートは、FastAPI、PostgreSQL、Nginxを使用したフルスタックアプリケーションの開発を迅速に開始するためのものです。

## 📁 プロジェクト構成

```
project-template/
├── docker-compose.yaml    # Docker構成ファイル
├── .gitignore            # Git除外設定
├── README.md             # このファイル
├── fastapi/              # FastAPIバックエンド
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── .env.example
│   ├── main.py
│   ├── config.py
│   ├── database/
│   │   ├── database.py
│   │   ├── DataModel.py
│   │   └── QueryComposer.py
│   └── routers/
│       └── auth.py
├── nginx/                # Nginxフロントエンド
│   ├── app/             # React/Vite アプリケーション
│   └── conf.d/
│       └── default.conf
└── postgres/             # PostgreSQL初期化スクリプト
    └── init.sql
```

## 🚀 クイックスタート

### 1. プロジェクトのセットアップ

```bash
# プロジェクトディレクトリをコピー
cp -r project-template my-new-project
cd my-new-project

# 環境変数ファイルを作成
cp fastapi/.env.example fastapi/.env
```

### 2. 環境変数の設定

`fastapi/.env` を編集して、必要な環境変数を設定します：

```env
# データベース設定
DATABASE_URL=postgresql://your_user:your_password@postgres:5432/your_db
DB_HOST=postgres
DB_PORT=5432
DB_NAME=your_db
DB_USER=your_user
DB_PASSWORD=your_password

# セキュリティ
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# アプリケーション設定
APP_NAME=YourAppName
```

### 3. Docker Composeで起動

```bash
# コンテナをビルド・起動
docker-compose up -d

# ログを確認
docker-compose logs -f

# コンテナを停止
docker-compose down
```

## 🔧 アクセス先

- **フロントエンド (Nginx)**: http://localhost:8080
- **バックエンドAPI (FastAPI)**: http://localhost:8000
- **API ドキュメント (Swagger)**: http://localhost:8000/docs
- **PostgreSQL**: localhost:5432

## 📝 開発ガイド

### FastAPI (バックエンド)

#### 新しいルーターの追加

```python
# fastapi/routers/example.py
from fastapi import APIRouter, Depends
from database.database import DatabaseService, get_db_service

router = APIRouter(prefix="/api/example", tags=["example"])

@router.get("/")
async def get_examples(db: DatabaseService = Depends(get_db_service)):
    # ビジネスロジック
    return {"message": "Hello from example router"}
```

`main.py` にルーターを追加：

```python
from routers import example
app.include_router(example.router)
```

#### データベースモデルの追加

```python
# fastapi/database/DataModel.py
from pydantic import BaseModel
from typing import Optional

class YourModel(BaseModel):
    id: Optional[int] = None
    name: Optional[str] = None
    # ... その他のフィールド
```

### PostgreSQL (データベース)

#### マイグレーションスクリプトの追加

```sql
-- postgres/migration_add_your_table.sql
CREATE TABLE IF NOT EXISTS your_table (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

実行：

```bash
PGPASSWORD=your_password psql -h localhost -U your_user -d your_db -f postgres/migration_add_your_table.sql
```

### Nginx (フロントエンド)

#### React/Viteアプリケーションのセットアップ

```bash
cd nginx/app
npm install
npm run dev  # 開発モード
npm run build  # 本番ビルド
```

## 🛠️ よく使うコマンド

### Docker

```bash
# コンテナの再ビルド
docker-compose up -d --build

# 特定のサービスのログを表示
docker-compose logs -f fastapi

# コンテナに入る
docker exec -it fastapi bash
docker exec -it postgres bash

# データベースに接続
docker exec -it postgres psql -U your_user -d your_db
```

### データベース

```bash
# データベースのバックアップ
docker exec postgres pg_dump -U your_user your_db > backup.sql

# データベースのリストア
cat backup.sql | docker exec -i postgres psql -U your_user -d your_db

# テーブル一覧を表示
docker exec -it postgres psql -U your_user -d your_db -c "\dt"
```

## 📦 含まれる機能

- ✅ FastAPI (Python 3.11+)
- ✅ PostgreSQL 17
- ✅ Nginx
- ✅ Docker Compose
- ✅ JWT認証システム
- ✅ データベース接続プール
- ✅ QueryComposer (SQLクエリビルダー)
- ✅ CORS設定
- ✅ 環境変数管理
- ✅ マルチテナント対応基盤

## 🔐 セキュリティ

- パスワードはbcryptでハッシュ化
- JWT トークンによる認証
- 環境変数による機密情報の管理
- CORS設定によるオリジン制限

## 📚 参考リンク

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Docker Documentation](https://docs.docker.com/)
- [Nginx Documentation](https://nginx.org/en/docs/)

## 🤝 貢献

プロジェクトへの貢献を歓迎します。

## 📄 ライセンス

MIT License
