from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    status: str = "todo"          # "todo" / "in_progress" / "done"
    priority: str = "medium"      # "low" / "medium" / "high"
    due_date: Optional[datetime] = None
    position: int = 0


class TaskCreate(TaskBase):
    project_id: int


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[datetime] = None
    position: Optional[int] = None
    assigned_to: Optional[int] = None


class TaskOut(TaskBase):
    id: int
    project_id: int
    created_by: int
    assigned_to: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
