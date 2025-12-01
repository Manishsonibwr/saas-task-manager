from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel


class PlanBase(BaseModel):
    name: str
    description: Optional[str] = None
    price_per_month: Decimal
    currency: str = "INR"
    max_projects: Optional[int] = None
    max_tasks: Optional[int] = None
    max_members: Optional[int] = None


class PlanOut(PlanBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class SubscriptionOut(BaseModel):
    id: int
    workspace_id: int
    plan_id: int
    status: str
    current_period_start: Optional[datetime]
    current_period_end: Optional[datetime]
    plan: PlanOut

    class Config:
        from_attributes = True


class CreateOrderRequest(BaseModel):
    workspace_id: int
    plan_id: int


class CreateOrderResponse(BaseModel):
    razorpay_key_id: str
    order_id: str
    amount: int
    currency: str
    workspace_id: int
    plan_id: int


class VerifyPaymentRequest(BaseModel):
    workspace_id: int
    plan_id: int
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
