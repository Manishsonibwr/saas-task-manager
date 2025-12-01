from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.db.session import init_db  # 👈 import this
from app.api.v1.auth import router as auth_router
from app.api.v1.workspaces import router as workspace_router
from app.api.v1.projects import router as project_router
from app.api.v1.tasks import router as task_router
from app.api.v1.billing import router as billing_router
from app.api.deps import get_current_user
from app.models.user import User
# later you'll add your Vercel URL here
origins = [
    "http://localhost:5173",
    "https://saas-task-manager-4.onrender.com",
]

app = FastAPI(title="SaaS Task Manager API")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],        # allow all origins (OK for dev)
    allow_credentials=False,    # we use Authorization header, not cookies
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    # Auto-create tables in the current DATABASE_URL
    init_db()

@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.get("/me")
def read_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "is_active": current_user.is_active,
    }


app.include_router(auth_router)
app.include_router(workspace_router)
app.include_router(project_router)
app.include_router(task_router)
app.include_router(billing_router)
