import psycopg2
from psycopg2 import pool
from typing import List, Dict, Any, Optional
import logging
from config import settings

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

class DatabaseService:
    _connection_pool: Optional[pool.SimpleConnectionPool] = None

    @classmethod
    def get_connection_pool(cls):
        """コネクションプールのシングルトンを取得"""
        if cls._connection_pool is None:
            try:
                cls._connection_pool = psycopg2.pool.SimpleConnectionPool(
                    1,  # 最小接続数
                    20,  # 最大接続数
                    host=settings.DB_HOST,
                    port=settings.DB_PORT,
                    database=settings.DB_NAME,
                    user=settings.DB_USER,
                    password=settings.DB_PASSWORD
                )
                logger.info("Database connection pool created successfully")
            except Exception as e:
                logger.error(f"Failed to create connection pool: {e}")
                raise
        return cls._connection_pool

    def __init__(self):
        self.pool = DatabaseService.get_connection_pool()
        self.connection = None
        self.cursor = None

    def __enter__(self):
        """コンテキストマネージャーのエントリ"""
        self.connection = self.pool.getconn()
        self.cursor = self.connection.cursor()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """コンテキストマネージャーの終了"""
        if self.cursor:
            self.cursor.close()
        if self.connection:
            if exc_type is None:
                self.connection.commit()
            else:
                self.connection.rollback()
            self.pool.putconn(self.connection)

    def execute_query(self, query: str, params: tuple = None, tenant_id: str = None) -> List[Dict[str, Any]]:
        """クエリを実行して結果を返す"""
        try:
            if params:
                self.cursor.execute(query, params)
            else:
                self.cursor.execute(query)

            if query.strip().upper().startswith("SELECT"):
                columns = [desc[0] for desc in self.cursor.description]
                rows = self.cursor.fetchall()
                return [dict(zip(columns, row)) for row in rows]
            else:
                self.connection.commit()
                if query.strip().upper().startswith("INSERT") or query.strip().upper().startswith("UPDATE"):
                    try:
                        columns = [desc[0] for desc in self.cursor.description]
                        rows = self.cursor.fetchall()
                        return [dict(zip(columns, row)) for row in rows]
                    except:
                        return []
                return []
        except Exception as e:
            self.connection.rollback()
            logger.error(f"Database error: {e}")
            raise Exception(f"Database error: {str(e)}")

def get_db_service():
    """依存性注入用のデータベースサービス取得関数"""
    with DatabaseService() as db:
        yield db
