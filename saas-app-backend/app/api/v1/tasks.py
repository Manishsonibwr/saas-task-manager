from typing import List
from app.services.billing_service import check_task_limit_for_workspace

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.workspace import Workspace
from app.models.project import Project
from app.models.task import Task
from app.schemas.task import TaskCreate, TaskUpdate, TaskOut

router = APIRouter(prefix="/tasks", tags=["tasks"])


def _check_project_ownership(
    db: Session,
    project_id: int,
    current_user: User,
) -> Project:
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    workspace = db.query(Workspace).filter(Workspace.id == project.workspace_id).first()
    if not workspace or workspace.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not allowed to access this project",
        )

    return project


def _get_task_or_404(
    db: Session,
    task_id: int,
    current_user: User,
) -> Task:
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )

    # Verify ownership via project -> workspace -> owner
    project = db.query(Project).filter(Project.id == task.project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found for this task",
        )

    workspace = db.query(Workspace).filter(Workspace.id == project.workspace_id).first()
    if not workspace or workspace.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not allowed to access this task",
        )

    return task


@router.post("/", response_model=TaskOut)
def create_task(
    task_in: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = _check_project_ownership(db, task_in.project_id, current_user)

    # 🔒 Enforce plan task limit for the workspace of this project
    workspace = (
        db.query(Workspace)
        .filter(Workspace.id == project.workspace_id)
        .first()
    )
    try:
        check_task_limit_for_workspace(db, workspace)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        )

    # You could compute position based on current max in that project:
    max_position = (
        db.query(Task)
        .filter(Task.project_id == project.id)
        .order_by(Task.position.desc())
        .first()
    )
    next_position = (max_position.position + 1) if max_position else 1

    task = Task(
        title=task_in.title,
        description=task_in.description,
        status=task_in.status,
        priority=task_in.priority,
        due_date=task_in.due_date,
        position=next_position,
        project_id=project.id,
        created_by=current_user.id,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task



@router.get("/by-project/{project_id}", response_model=List[TaskOut])
def list_tasks_for_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = _check_project_ownership(db, project_id, current_user)

    tasks = (
        db.query(Task)
        .filter(Task.project_id == project.id)
        .order_by(Task.position.asc())
        .all()
    )
    return tasks


@router.get("/{task_id}", response_model=TaskOut)
def get_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = _get_task_or_404(db, task_id, current_user)
    return task


@router.patch("/{task_id}", response_model=TaskOut)
def update_task(
    task_id: int,
    task_in: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = _get_task_or_404(db, task_id, current_user)

    if task_in.title is not None:
        task.title = task_in.title
    if task_in.description is not None:
        task.description = task_in.description
    if task_in.status is not None:
        task.status = task_in.status
    if task_in.priority is not None:
        task.priority = task_in.priority
    if task_in.due_date is not None:
        task.due_date = task_in.due_date
    if task_in.position is not None:
        task.position = task_in.position
    if task_in.assigned_to is not None:
        task.assigned_to = task_in.assigned_to

    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = _get_task_or_404(db, task_id, current_user)
    db.delete(task)
    db.commit()
    return None
