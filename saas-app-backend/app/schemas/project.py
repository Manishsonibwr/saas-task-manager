from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None


class ProjectCreate(ProjectBase):
    workspace_id: int


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    archived: Optional[bool] = None


class ProjectOut(ProjectBase):
    id: int
    workspace_id: int
    archived: bool
    created_by: int
    created_at: datetime

    class Config:
        from_attributes = True
