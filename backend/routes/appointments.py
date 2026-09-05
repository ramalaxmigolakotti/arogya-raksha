"""
routes/appointments.py — Appointment booking, management, and email notifications
Mirrors backend/routes/appointments.js
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, Any, Dict

from middleware.auth import get_current_user
from models.appointment import Appointment
from models.doctor import Doctor
from models.user import User
from models.hospital import Hospital
from services.email_service import send_appointment_confirmation_email

router = APIRouter(prefix="/api/appointments", tags=["Appointments"])


class AppointmentCreate(BaseModel):
    doctorId: Optional[str] = None
    hospitalId: Optional[str] = None
    date: Optional[str] = None
    timeSlot: Optional[Any] = None
    department: Optional[str] = None
    reason: Optional[str] = None


class StatusUpdate(BaseModel):
    status: str


class PaymentUpdate(BaseModel):
    paymentProof: str


async def _send_confirmation_email(user: Dict[str, Any], apt: Dict[str, Any], doctor_id: Optional[str], hospital_id: Optional[str]):
    try:
        doctor_name = "Assigned Doctor"
        hospital_name = ""
        if doctor_id:
            doc = Doctor.find_by_id(doctor_id)
            if doc and doc.get("user_id"):
                doc_user = User.find_by_id(doc["user_id"])
                if doc_user:
                    doctor_name = f"Dr. {doc_user.get('name')}"
        if hospital_id:
            hosp = Hospital.find_by_id(hospital_id)
            if hosp:
                hospital_name = hosp.get("name", "")

        send_appointment_confirmation_email(
            to=user.get("email"),
            name=user.get("name"),
            appointment=apt,
            doctor_name=doctor_name,
            hospital_name=hospital_name
        )
    except Exception as e:
        print(f"[Appointments] Email confirmation failed: {e}")


@router.post("")
@router.post("/")
async def create_appointment(payload: AppointmentCreate, background_tasks: BackgroundTasks, user: dict = Depends(get_current_user)):
    try:
        apt_data = {
            "patientId": user["id"],
            "patientName": user.get("name"),
            "patientEmail": user.get("email"),
            "patientPhone": user.get("phone"),
            "doctorId": payload.doctorId,
            "hospitalId": payload.hospitalId,
            "date": payload.date,
            "timeSlot": payload.timeSlot,
            "department": payload.department,
            "reason": payload.reason,
        }
        appointment = Appointment.create(apt_data)

        background_tasks.add_task(
            _send_confirmation_email,
            user=user,
            apt=appointment,
            doctor_id=payload.doctorId,
            hospital_id=payload.hospitalId
        )

        return {"success": True, "appointment": appointment}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/my")
async def get_my_appointments(user: dict = Depends(get_current_user)):
    try:
        appointments = Appointment.find_by_patient(user["id"])
        enriched = []
        for apt in appointments:
            doc_id = apt.get("doctor_id")
            hosp_id = apt.get("hospital_id")

            doctor = Doctor.find_by_id(doc_id) if doc_id else None
            hospital = Hospital.find_by_id(hosp_id) if hosp_id else None

            doctor_user = None
            if doctor and doctor.get("user_id"):
                doctor_user = User.find_by_id(doctor["user_id"])

            enriched.append({
                **apt,
                "patient": {
                    "id": apt.get("patient_id"),
                    "name": apt.get("patient_name"),
                    "email": apt.get("patient_email"),
                    "phone": apt.get("patient_phone"),
                },
                "doctor": {
                    **doctor,
                    "userId": {
                        "id": doctor_user["id"],
                        "name": doctor_user.get("name"),
                        "email": doctor_user.get("email"),
                    } if doctor_user else None
                } if doctor else None,
                "hospital": {
                    "id": hospital.get("id"),
                    "name": hospital.get("name"),
                    "address": hospital.get("address"),
                } if hospital else None,
            })
        return {"success": True, "appointments": enriched}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/all")
async def get_all_appointments(user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required.")
    try:
        appointments = Appointment.find_all()
        return {"success": True, "appointments": appointments}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{apt_id}/status")
async def update_appointment_status(apt_id: str, payload: StatusUpdate, user: dict = Depends(get_current_user)):
    try:
        appointment = Appointment.update_status(apt_id, payload.status)
        return {"success": True, "appointment": appointment}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{apt_id}/payment")
async def update_appointment_payment(apt_id: str, payload: PaymentUpdate, user: dict = Depends(get_current_user)):
    try:
        appointment = Appointment.update_payment(apt_id, payload.paymentProof)
        return {"success": True, "appointment": appointment}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
