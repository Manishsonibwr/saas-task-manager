from datetime import datetime, timedelta
from decimal import Decimal
from uuid import uuid4

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.plan import Plan
from app.models.subscription import Subscription
from app.models.payment import Payment
from app.models.workspace import Workspace
from app.models.project import Project          # add this
from app.models.task import Task   

settings = get_settings()


# ---------- Plans helpers ----------

def create_or_get_free_plan(db: Session) -> Plan:
    plan = db.query(Plan).filter(Plan.name == "Free").first()
    if not plan:
        plan = Plan(
            name="Free",
            description="Basic plan with limited usage",
            price_per_month=Decimal("0.00"),
            currency="INR",
            max_projects=3,
            max_tasks=100,
            max_members=3,
        )
        db.add(plan)
        db.commit()
        db.refresh(plan)
    return plan


def create_or_get_pro_plan(db: Session) -> Plan:
    plan = db.query(Plan).filter(Plan.name == "Pro").first()
    if not plan:
        plan = Plan(
            name="Pro",
            description="Pro plan with higher limits",
            price_per_month=Decimal("499.00"),
            currency="INR",
            max_projects=50,
            max_tasks=5000,
            max_members=20,
        )
        db.add(plan)
        db.commit()
        db.refresh(plan)
    return plan


def ensure_default_plans(db: Session) -> list[Plan]:
    free = create_or_get_free_plan(db)
    pro = create_or_get_pro_plan(db)
    return [free, pro]


# ---------- Subscriptions / Payments (mock) ----------

def get_or_create_subscription(
    db: Session, workspace: Workspace, plan: Plan
) -> Subscription:
    sub = (
        db.query(Subscription)
        .filter(Subscription.workspace_id == workspace.id)
        .order_by(Subscription.id.desc())
        .first()
    )
    if not sub:
        sub = Subscription(
            workspace_id=workspace.id,
            plan_id=plan.id,
            status="inactive",
        )
        db.add(sub)
        db.commit()
        db.refresh(sub)
    return sub


def create_razorpay_order_for_plan(
    db: Session, workspace: Workspace, plan: Plan
) -> Payment:
    """
    MOCK VERSION:
    Instead of calling Razorpay API, we just generate a fake order_id
    and store a payment row. No real network calls.
    """
    order_id = f"order_mock_{uuid4().hex[:8]}"

    payment = Payment(
        workspace_id=workspace.id,
        plan_id=plan.id,
        amount=plan.price_per_month,
        currency=plan.currency,
        razorpay_order_id=order_id,
        status="created",
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment


def verify_payment_and_activate_subscription(
    db: Session,
    workspace: Workspace,
    plan: Plan,
    razorpay_order_id: str,
    razorpay_payment_id: str,
    razorpay_signature: str,
):
    """
    MOCK VERSION:
    We don't actually verify anything. We just trust the input and mark
    the payment as paid & subscription as active.
    """
    payment = (
        db.query(Payment)
        .filter(Payment.razorpay_order_id == razorpay_order_id)
        .first()
    )
    if not payment:
        raise ValueError("Payment record not found")

    payment.razorpay_payment_id = razorpay_payment_id or f"pay_mock_{uuid4().hex[:8]}"
    payment.razorpay_signature = razorpay_signature or "mock-signature"
    payment.status = "paid"
    db.add(payment)

    subscription = get_or_create_subscription(db, workspace, plan)
    subscription.plan_id = plan.id
    subscription.status = "active"
    subscription.razorpay_order_id = razorpay_order_id
    subscription.razorpay_payment_id = payment.razorpay_payment_id
    subscription.current_period_start = datetime.utcnow()
    subscription.current_period_end = datetime.utcnow() + timedelta(days=30)
    db.add(subscription)

    db.commit()
    db.refresh(subscription)
    return subscription

def get_effective_plan_for_workspace(db: Session, workspace: Workspace) -> Plan:
    """
    Returns the currently active plan for a workspace.
    If no active subscription or expired, fallback to Free plan.
    """
    # latest active subscription with valid period
    sub = (
        db.query(Subscription)
        .filter(
            Subscription.workspace_id == workspace.id,
            Subscription.status == "active",
        )
        .order_by(Subscription.current_period_end.desc())
        .first()
    )

    now = datetime.utcnow()

    if sub and (sub.current_period_end is None or sub.current_period_end >= now):
        # Ensure plan relationship is loaded
        _ = sub.plan
        return sub.plan

    # Fallback to Free plan
    return create_or_get_free_plan(db)


def check_project_limit_for_workspace(db: Session, workspace: Workspace) -> None:
    """
    Raises ValueError if workspace has reached the max_projects for its plan.
    """
    plan = get_effective_plan_for_workspace(db, workspace)

    if plan.max_projects is None:
        return  # unlimited

    current_count = (
        db.query(Project)
        .filter(Project.workspace_id == workspace.id)
        .count()
    )

    if current_count >= plan.max_projects:
        raise ValueError(
            f"Project limit reached for plan '{plan.name}' "
            f"(max {plan.max_projects} projects)."
        )


def check_task_limit_for_workspace(db: Session, workspace: Workspace) -> None:
    """
    Raises ValueError if workspace has reached the max_tasks for its plan.
    Counts tasks across all projects in this workspace.
    """
    plan = get_effective_plan_for_workspace(db, workspace)

    if plan.max_tasks is None:
        return  # unlimited

    current_count = (
        db.query(Task)
        .join(Project, Task.project_id == Project.id)
        .filter(Project.workspace_id == workspace.id)
        .count()
    )

    if current_count >= plan.max_tasks:
        raise ValueError(
            f"Task limit reached for plan '{plan.name}' "
            f"(max {plan.max_tasks} tasks)."
        )
