from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.workspace import Workspace
from app.models.plan import Plan
from app.models.subscription import Subscription
from app.schemas.billing import (
    PlanOut,
    SubscriptionOut,
    CreateOrderRequest,
    CreateOrderResponse,
    VerifyPaymentRequest,
)
from app.services.billing_service import (
    ensure_default_plans,
    get_or_create_subscription,
    create_razorpay_order_for_plan,
    verify_payment_and_activate_subscription,
)
from app.core.config import get_settings

settings = get_settings()

router = APIRouter(prefix="/billing", tags=["billing"])


def _get_workspace_or_403(
    db: Session,
    workspace_id: int,
    current_user: User,
) -> Workspace:
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found",
        )
    if workspace.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not allowed to access this workspace",
        )
    return workspace


@router.get("/plans", response_model=list[PlanOut])
def list_plans(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    plans = ensure_default_plans(db)
    # Only return active plans
    active_plans = db.query(Plan).filter(Plan.is_active == True).all()  # noqa: E712
    return active_plans


@router.get("/current/{workspace_id}", response_model=SubscriptionOut | None)
def get_current_subscription(
    workspace_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    workspace = _get_workspace_or_403(db, workspace_id, current_user)

    sub = (
        db.query(Subscription)
        .filter(Subscription.workspace_id == workspace.id)
        .order_by(Subscription.id.desc())
        .first()
    )
    if not sub:
        # No subscription yet, return None
        return None

    # Eagerly load plan for response
    _ = sub.plan  # just to ensure relationship is loaded
    return sub


@router.post("/create-order", response_model=CreateOrderResponse)
def create_order(
    payload: CreateOrderRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    workspace = _get_workspace_or_403(db, payload.workspace_id, current_user)
    plan = db.query(Plan).filter(Plan.id == payload.plan_id).first()
    if not plan or not plan.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plan not found or inactive",
        )

    # If price is 0, we can directly mark free plan, but for now only create Razorpay order when > 0
    if plan.price_per_month == 0:
        # Directly create a "fake" paid subscription for Free plan if needed
        sub = get_or_create_subscription(db, workspace, plan)
        sub.status = "active"
        db.add(sub)
        db.commit()
        db.refresh(sub)
        return CreateOrderResponse(
            razorpay_key_id=settings.RAZORPAY_KEY_ID,
            order_id="",
            amount=0,
            currency=plan.currency,
            workspace_id=workspace.id,
            plan_id=plan.id,
        )

    payment = create_razorpay_order_for_plan(db, workspace, plan)

    # Razorpay expects amount in paise
    amount_paise = int(payment.amount * 100)

    return CreateOrderResponse(
        razorpay_key_id=settings.RAZORPAY_KEY_ID or "",
        order_id=payment.razorpay_order_id,
        amount=amount_paise,
        currency=payment.currency,
        workspace_id=workspace.id,
        plan_id=plan.id,
    )


@router.post("/verify-payment", response_model=SubscriptionOut)
def verify_payment(
    payload: VerifyPaymentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    workspace = _get_workspace_or_403(db, payload.workspace_id, current_user)
    plan = db.query(Plan).filter(Plan.id == payload.plan_id).first()
    if not plan or not plan.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plan not found or inactive",
        )

    try:
        subscription = verify_payment_and_activate_subscription(
            db,
            workspace,
            plan,
            payload.razorpay_order_id,
            payload.razorpay_payment_id,
            payload.razorpay_signature,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    # Ensure plan is loaded
    _ = subscription.plan
    return subscription
