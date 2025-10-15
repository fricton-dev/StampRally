.PHONY: help build up down restart logs clean db-shell api-shell migrate

help: ## このヘルプメッセージを表示
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

build: ## Dockerコンテナをビルド
	docker-compose build

up: ## コンテナを起動
	docker-compose up -d

down: ## コンテナを停止・削除
	docker-compose down

restart: down up ## コンテナを再起動

logs: ## ログを表示（全サービス）
	docker-compose logs -f

logs-api: ## FastAPIのログを表示
	docker-compose logs -f fastapi

logs-db: ## PostgreSQLのログを表示
	docker-compose logs -f postgres

logs-web: ## Nginxのログを表示
	docker-compose logs -f web

clean: ## コンテナ、ボリューム、イメージを削除
	docker-compose down -v --rmi all

db-shell: ## PostgreSQLシェルに接続
	docker exec -it postgres psql -U $(DB_USER) -d $(DB_NAME)

api-shell: ## FastAPIコンテナのシェルに接続
	docker exec -it fastapi bash

migrate: ## マイグレーションファイルを実行
	@echo "マイグレーションファイル名を指定してください: make migrate FILE=migration_xxx.sql"
	docker exec -i postgres psql -U $(DB_USER) -d $(DB_NAME) < postgres/$(FILE)

test: ## テストを実行
	docker exec fastapi pytest

init: ## 初期セットアップ
	cp fastapi/.env.example fastapi/.env
	@echo "fastapi/.env を編集してください"

install-frontend: ## フロントエンドの依存関係をインストール
	cd nginx/app && npm install

dev-frontend: ## フロントエンド開発サーバーを起動
	cd nginx/app && npm run dev

build-frontend: ## フロントエンドをビルド
	cd nginx/app && npm run build

# デフォルト値
DB_USER ?= fricton
DB_NAME ?= stamprally-db
