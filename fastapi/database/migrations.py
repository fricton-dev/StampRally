import logging

from database.database import DatabaseService


logger = logging.getLogger(__name__)


def run_schema_migrations() -> None:
    """Ensure the database schema has the columns required by the application."""
    try:
        with DatabaseService() as db:
            db.cursor.execute(
                """
                ALTER TABLE IF EXISTS users
                ADD COLUMN IF NOT EXISTS age INTEGER CHECK (age >= 0 AND age <= 120)
                """
            )
            db.cursor.execute(
                """
                ALTER TABLE IF EXISTS users
                ADD COLUMN IF NOT EXISTS gender VARCHAR(20)
                """
            )
            db.connection.commit()
    except Exception as exc:
        logger.error("Failed to run schema migrations: %s", exc)
        raise
