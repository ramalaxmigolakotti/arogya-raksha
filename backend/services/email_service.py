"""
email_service.py — Resend email service (mirrors services/emailService.js).
"""
from typing import Optional
import resend
from core.config import settings

resend.api_key = settings.RESEND_API_KEY
FROM = settings.FROM_EMAIL


def _send(to: str, subject: str, html: str) -> bool:
    if not settings.RESEND_API_KEY:
        print(f"[Email] Resend not configured — skipping email to {to}")
        return False
    try:
        resend.Emails.send({"from": FROM, "to": [to], "subject": subject, "html": html})
        return True
    except Exception as e:
        print(f"[Email] Send failed: {e}")
        return False


def send_welcome_email(to: str, name: str, role: str = "patient") -> bool:
    subject = "Welcome to Arogya Raksha! 🏥"
    html = f"""
    <h2>Welcome, {name}!</h2>
    <p>Your Arogya Raksha account has been created as a <strong>{role}</strong>.</p>
    <p>Access AI-powered healthcare services, find hospitals, book appointments, and more.</p>
    <p>Stay healthy! 🩺</p>
    <p><em>— The Arogya Raksha Team</em></p>
    """
    return _send(to, subject, html)


def send_appointment_confirmation_email(
    to: str,
    name: str,
    appointment: dict,
    doctor_name: str = "Assigned Doctor",
    hospital_name: str = "",
) -> bool:
    subject = "Appointment Confirmed — Arogya Raksha"
    hospital_line = f"<p>🏥 Hospital: {hospital_name}</p>" if hospital_name else ""
    html = f"""
    <h2>Appointment Confirmed!</h2>
    <p>Dear {name},</p>
    <p>Your appointment has been successfully booked.</p>
    <p>👨‍⚕️ Doctor: {doctor_name}</p>
    {hospital_line}
    <p>📅 Date: {appointment.get('date', 'TBD')}</p>
    <p>⏰ Time: {appointment.get('time_slot', 'TBD')}</p>
    <p>Please arrive 15 minutes early and bring your medical records.</p>
    <p><em>— Arogya Raksha Team</em></p>
    """
    return _send(to, subject, html)


def send_order_confirmation_email(
    to: str,
    name: str,
    order: dict,
) -> bool:
    subject = f"Order Confirmed #{order.get('id', '')} — Arogya Raksha"
    total = order.get("total_amount", 0)
    html = f"""
    <h2>Order Confirmed!</h2>
    <p>Dear {name},</p>
    <p>Your order has been placed successfully.</p>
    <p>Order ID: <strong>{order.get('id', 'N/A')}</strong></p>
    <p>Total: ₹{total}</p>
    <p>We will notify you when it ships.</p>
    <p><em>— Arogya Raksha Team</em></p>
    """
    return _send(to, subject, html)
