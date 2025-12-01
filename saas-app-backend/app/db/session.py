from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.base import Base  # 👈 import Base that holds all models
from app.core.config import get_settings


settings = get_settings()

engine = create_engine(settings.DATABASE_URL, future=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db():
    """
    Create all tables if they don't exist.
    This runs on startup and avoids needing Alembic for now.
    """
    Base.metadata.create_all(bind=engine)
