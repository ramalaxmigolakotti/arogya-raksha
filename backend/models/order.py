"""Order model wrapping Supabase table 'orders'"""
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from core.supabase_client import supabase

TABLE = "orders"


class Order:
    @classmethod
    def create(cls, data: Dict[str, Any]):
        payload = {
            "user_id": data.get("userId") or data.get("user_id"),
            "user_name": data.get("userName") or data.get("user_name"),
            "user_email": data.get("userEmail") or data.get("user_email"),
            "user_phone": data.get("userPhone") or data.get("user_phone"),
            "order_type": data.get("orderType") or data.get("order_type") or "medicine",
            "items": data.get("items") or [],
            "total_amount": data.get("totalAmount") or data.get("total_amount"),
            "currency": data.get("currency") or "INR",
            "shipping_address": data.get("shippingAddress") or data.get("shipping_address") or {},
            "notes": data.get("notes"),
        }
        res = supabase.from_(TABLE).insert(payload).select().single().execute()
        return res.data

    @classmethod
    def find_by_id(cls, order_id: str):
        res = supabase.from_(TABLE).select("*").eq("id", order_id).execute()
        return res.data[0] if res.data else None

    @classmethod
    def find_by_user(cls, user_id: str) -> List[Dict[str, Any]]:
        res = supabase.from_(TABLE).select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
        return res.data or []

    @classmethod
    def find_all(cls, filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        filters = filters or {}
        query = supabase.from_(TABLE).select("*")
        if filters.get("status"):
            query = query.eq("status", filters["status"])
        if filters.get("orderType"):
            query = query.eq("order_type", filters["orderType"])
        if filters.get("paymentStatus"):
            query = query.eq("payment_status", filters["paymentStatus"])
        res = query.order("created_at", desc=True).execute()
        return res.data or []

    @classmethod
    def update_payment(cls, order_id: str, payment_info: Dict[str, Any]):
        payload = {
            "payment_id": payment_info.get("paymentId"),
            "payment_order_id": payment_info.get("paymentOrderId"),
            "payment_signature": payment_info.get("paymentSignature"),
            "payment_method": payment_info.get("paymentMethod"),
            "payment_status": "paid",
            "status": "confirmed",
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        res = supabase.from_(TABLE).update(payload).eq("id", order_id).select().single().execute()
        return res.data

    @classmethod
    def update_status(cls, order_id: str, status: str):
        payload = {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}
        res = supabase.from_(TABLE).update(payload).eq("id", order_id).select().single().execute()
        return res.data
