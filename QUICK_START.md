# クイックスタートガイド

最速でアプリケーションを起動するための簡易ガイドです。

## ⚡ 3 ステップで起動

### 1. 環境変数を設定

```bash
cp fastapi/.env.example fastapi/.env
```

**重要**: `fastapi/.env` の `SECRET_KEY` を変更してください：

```bash
# ランダムな秘密鍵を生成
openssl rand -hex 32
```

### 2. Docker で起動

```bash
docker-compose up -d --build
```

### 3. 動作確認

```bash
# APIドキュメントにアクセス
open http://localhost:8000/docs

# フロントエンドにアクセス
open http://localhost:8080
```

## 🎯 デフォルト設定

| サービス   | URL                        | ポート |
| ---------- | -------------------------- | ------ |
| FastAPI    | http://localhost:8000      | 8000   |
| API Docs   | http://localhost:8000/docs | -      |
| Nginx      | http://localhost:8080      | 8080   |
| PostgreSQL | localhost:5432             | 5432   |

## 🔑 デフォルト認証情報

**アプリ基本文字列置換**:

- アプリ名:`stamprally-app`

**データベース**:

- ユーザー: `fricton`
- パスワード: `fricton99`
- データベース名: `stamprally-db`

**サンプルユーザー**:

- ユーザー名: `admin`
- パスワード: `password123`

⚠️ **本番環境では必ず変更してください！**

## 📝 次にやること

1. ✅ API にアクセスできることを確認
2. ✅ ログインテスト (`POST /api/auth/login`)
3. ✅ データベースに接続できることを確認
4. 📖 [SETUP_GUIDE.md](SETUP_GUIDE.md) を読む
5. 🏗️ [ARCHITECTURE.md](ARCHITECTURE.md) でアーキテクチャを理解
6. 💻 開発を開始！

## 🛠️ よく使うコマンド

```bash
# ログを見る
docker-compose logs -f

# コンテナを停止
docker-compose down

# データベースに接続
docker exec -it postgres psql -U fricton -d stamprally-db

# FastAPIコンテナに入る
docker exec -it fastapi bash
```

## 🆘 トラブルシューティング

### ポートが使用中

```bash
# docker-compose.yamlのポート番号を変更
# 例: "8000:8000" → "8001:8000"
```

### データベース接続エラー

```bash
# PostgreSQLが起動するまで待つ
docker-compose logs postgres

# コンテナを再起動
docker-compose restart postgres
```

### 権限エラー

```bash
# postgres_dataディレクトリの権限を確認
sudo chown -R $(whoami) postgres_data
```

## 📚 詳細ガイド

より詳しい情報は以下を参照：

- [README.md](README.md) - プロジェクト概要
- [SETUP_GUIDE.md](SETUP_GUIDE.md) - 詳細セットアップ
- [ARCHITECTURE.md](ARCHITECTURE.md) - アーキテクチャ解説
