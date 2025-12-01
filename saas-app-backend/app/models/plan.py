from sqlalchemy import Column, Integer, String, Numeric, DateTime, func, Boolean
from app.db.base_class import Base



class Plan(Base):
    __tablename__ = "plans"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)  # "Free", "Pro"
    description = Column(String, nullable=True)
    price_per_month = Column(Numeric(10, 2), nullable=False, default=0)
    currency = Column(String, nullable=False, default="INR")
    is_active = Column(Boolean, default=True)

    max_projects = Column(Integer, nullable=True)  # NULL = unlimited
    max_tasks = Column(Integer, nullable=True)
    max_members = Column(Integer, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
