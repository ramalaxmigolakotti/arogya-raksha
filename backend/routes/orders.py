"""
routes/orders.py — Orders management, payment tracking, and confirmation emails
Mirrors backend/routes/orders.js
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, List, Any, Dict

from middleware.auth import get_current_user
from models.order import Order
from services.email_service import send_order_confirmation_email

router = APIRouter(prefix="/api/orders", tags=["Orders"])


class CreateOrderRequest(BaseModel):
    orderType: Optional[str] = "medicine"
    items: Optional[List[Any]] = []
    totalAmount: float
    currency: Optional[str] = "INR"
    shippingAddress: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None


class PaymentInfoRequest(BaseModel):
    paymentId: Optional[str] = None
    paymentOrderId: Optional[str] = None
    paymentSignature: Optional[str] = None
    paymentMethod: Optional[str] = None


class StatusRequest(BaseModel):
    status: str


def _send_order_email(email: str, name: str, order: Dict[str, Any]):
    try:
        send_order_confirmation_email(to=email, name=name, order=order)
    except Exception as e:
        print(f"[Orders] Order confirmation email failed: {e}")


@router.post("")
@router.post("/")
async def create_order(payload: CreateOrderRequest, background_tasks: BackgroundTasks, user: dict = Depends(get_current_user)):
    try:
        order_data = {
            "userId": user["id"],
            "userName": user.get("name"),
            "userEmail": user.get("email"),
            "userPhone": user.get("phone"),
            "orderType": payload.orderType,
            "items": payload.items,
            "totalAmount": payload.totalAmount,
            "currency": payload.currency,
            "shippingAddress": payload.shippingAddress,
            "notes": payload.notes,
        }
        order = Order.create(order_data)

        if user.get("email"):
            background_tasks.add_task(_send_order_email, user["email"], user.get("name", "Customer"), order)

        return {"success": True, "order": order}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/my")
async def get_my_orders(user: dict = Depends(get_current_user)):
    try:
        orders = Order.find_by_user(user["id"])
        return {"success": True, "orders": orders}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/all")
async def get_all_orders(status: Optional[str] = None, orderType: Optional[str] = None, paymentStatus: Optional[str] = None, user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required.")
    try:
        filters = {}
        if status:
            filters["status"] = status
        if orderType:
            filters["orderType"] = orderType
        if paymentStatus:
            filters["paymentStatus"] = paymentStatus

        orders = Order.find_all(filters)
        return {"success": True, "orders": orders}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{order_id}")
async def get_order_by_id(order_id: str, user: dict = Depends(get_current_user)):
    try:
        order = Order.find_by_id(order_id)
        if not order:
            raise HTTPException(status_code=404, detail="Order not found.")
        return {"success": True, "order": order}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{order_id}/payment")
async def update_order_payment(order_id: str, payload: PaymentInfoRequest, user: dict = Depends(get_current_user)):
    try:
        order = Order.update_payment(order_id, payload.model_dump())
        return {"success": True, "order": order}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{order_id}/status")
async def update_order_status(order_id: str, payload: StatusRequest, user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required.")
    try:
        order = Order.update_status(order_id, payload.status)
        return {"success": True, "order": order}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
