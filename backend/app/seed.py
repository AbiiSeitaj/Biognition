"""Seed demo patients and synthetic studies for hackathon demo."""

import io
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import Building, Modality, PacsNode, Patient, Report, Study, StudyDistribution, User, UserRole
from app.auth import hash_password
from app.services.ai_engine import analyze_study
from app.services.dicom_service import create_thumbnail, save_upload_as_dicom
from app.services.pacs_service import PACS_TOPOLOGY, archive_study, create_notifications, distribute_study
from app.services.team_service import auto_assign_study, seed_welcome_messages, split_name, submit_source_for_user


def _synthetic_chest(seed: int, pathology: str | None = None) -> bytes:
    rng = np.random.default_rng(seed)
    w, h = 512, 512
    img = np.full((h, w), 40, dtype=np.uint8)
    # rib-like gradients
    for i in range(8):
        y = int(h * (0.15 + i * 0.08))
        img[y : y + 3, :] = 55 + i * 2
    # lung fields
    img[:, :] = np.clip(img + rng.integers(-8, 8, img.shape), 0, 255).astype(np.uint8)

    pil = Image.fromarray(img, mode="L")
    draw = ImageDraw.Draw(pil)
    if pathology == "pneumonia":
        draw.ellipse([280, 320, 420, 460], fill=90)
    elif pathology == "cardiomegaly":
        draw.ellipse([180, 260, 340, 420], fill=75)
    elif pathology == "nodule":
        draw.ellipse([120, 100, 160, 140], fill=110)

    buf = io.BytesIO()
    pil.save(buf, format="PNG")
    return buf.getvalue()


def seed_demo_data() -> None:
    db: Session = SessionLocal()
    try:
        if db.query(Study).count() > 0:
            return

        demos = [
            ("P-1001", "Arben Hoxha", 58, "M", "XR", "pneumonia", "Chest X-Ray — cough, fever"),
            ("P-1002", "Elira Krasniqi", 45, "F", "XR", "cardiomegaly", "Chest X-Ray — dyspnea"),
            ("P-1003", "Marko Dervishi", 67, "M", "XR", "nodule", "Chest X-Ray — screening"),
            ("P-1004", "Sara Mema", 34, "F", "CT", None, "CT Chest — trauma protocol"),
            ("P-1005", "Gent Basha", 52, "M", "MR", None, "MR Spine — chronic pain"),
        ]

        for i, (pid, name, age, sex, mod, pathology, desc) in enumerate(demos):
            patient = Patient(patient_id=pid, name=name, age=age, sex=sex)
            db.add(patient)
            db.flush()

            if mod == "XR":
                png = _synthetic_chest(100 + i, pathology)
            else:
                png = _synthetic_chest(200 + i)

            dicom_path, study_uid, _ = save_upload_as_dicom(
                png, f"demo_{i}.png", pid, name, mod
            )
            thumb = create_thumbnail(dicom_path, study_uid)

            study = Study(
                study_uid=study_uid,
                patient_id=patient.id,
                modality=Modality(mod),
                body_part="CHEST" if mod == "XR" else ("SPINE" if mod == "MR" else "CHEST"),
                description=desc,
                dicom_path=str(dicom_path),
                thumbnail_path=str(thumb),
            )
            db.add(study)
            db.flush()

            if i < 3:
                result = analyze_study(dicom_path, study_uid, study.modality)
                report = Report(
                    study_id=study.id,
                    risk_score=result["risk_score"],
                    risk_level=result["risk_level"],
                    findings=result["findings"],
                    impression=result["impression"],
                    recommendations=result["recommendations"],
                    ai_findings=result["findings"],
                    ai_impression=result["impression"],
                    ai_recommendations=result["recommendations"],
                    ai_risk_level=result["risk_level"],
                    overlay_path=result["overlay_path"],
                    anomalies_json=result["anomalies_json"],
                )
                db.add(report)
                db.commit()
                archive_study(db, study, report)
                create_notifications(db, study, report)

        db.commit()
    finally:
        db.close()


def seed_pacs_infrastructure() -> None:
    db: Session = SessionLocal()
    try:
        if db.query(Building).count() == 0:
            buildings: dict[str, Building] = {}
            for dept, code, campus, _primary in PACS_TOPOLOGY:
                if code not in buildings:
                    buildings[code] = Building(code=code, name=campus.split(" — ")[0], campus=campus)
                    db.add(buildings[code])
            db.flush()

            for dept, code, _campus, is_primary in PACS_TOPOLOGY:
                building = buildings[code]
                db.add(
                    PacsNode(
                        building_id=building.id,
                        department=dept,
                        name=f"{dept.value.title()} PACS",
                        is_primary=is_primary,
                    )
                )
            db.commit()

        archived = db.query(Study).filter(Study.archived.is_(True)).all()
        for study in archived:
            if db.query(StudyDistribution).filter(StudyDistribution.study_id == study.id).first():
                continue
            distribute_study(db, study, study.report)
    finally:
        db.close()


def seed_users() -> None:
    db: Session = SessionLocal()
    try:
        if db.query(User).count() > 0:
            return

        users = [
            ("radiologist", "rad123", "Dr. Ana Radiologist", "RAD-001", "Ana", "Radiologist", UserRole.RADIOLOGIST, "radiology"),
            ("doctor", "doc123", "Dr. Elira Krasniqi", "CARD-014", "Elira", "Krasniqi", UserRole.DOCTOR, "cardiology"),
            ("doctor_surg", "surg123", "Dr. Marko Dervishi", "SURG-022", "Marko", "Dervishi", UserRole.DOCTOR, "surgery"),
            ("doctor_er", "er123", "Dr. Sara Mema", "EMER-008", "Sara", "Mema", UserRole.DOCTOR, "emergency"),
            ("analytics", "ana123", "Ops Analytics Team", "OPS-001", "Ops", "Analytics", UserRole.ANALYTICS, "operations"),
            ("admin", "admin123", "System Administrator", "ADM-001", "System", "Administrator", UserRole.ADMINISTRATOR, "operations"),
        ]
        for username, password, full_name, dept_id, first_name, last_name, role, department in users:
            db.add(
                User(
                    username=username,
                    password_hash=hash_password(password),
                    full_name=full_name,
                    dept_id=dept_id,
                    first_name=first_name,
                    last_name=last_name,
                    role=role,
                    department=department,
                )
            )
        db.commit()
    finally:
        db.close()


def seed_team_data() -> None:
    """Backfill profiles, submission metadata, assignments, and starter chat for existing data."""
    db: Session = SessionLocal()
    try:
        profile_map = {
            "radiologist": ("RAD-001", "Ana", "Radiologist"),
            "doctor": ("CARD-014", "Elira", "Krasniqi"),
            "doctor_surg": ("SURG-022", "Marko", "Dervishi"),
            "doctor_er": ("EMER-008", "Sara", "Mema"),
            "analytics": ("OPS-001", "Ops", "Analytics"),
            "admin": ("ADM-001", "System", "Administrator"),
        }
        extra_users = [
            ("doctor_surg", "surg123", "Dr. Marko Dervishi", "SURG-022", "Marko", "Dervishi", UserRole.DOCTOR, "surgery"),
            ("doctor_er", "er123", "Dr. Sara Mema", "EMER-008", "Sara", "Mema", UserRole.DOCTOR, "emergency"),
            ("admin", "admin123", "System Administrator", "ADM-001", "System", "Administrator", UserRole.ADMINISTRATOR, "operations"),
        ]
        for username, password, full_name, dept_id, first_name, last_name, role, department in extra_users:
            if not db.query(User).filter(User.username == username).first():
                db.add(
                    User(
                        username=username,
                        password_hash=hash_password(password),
                        full_name=full_name,
                        dept_id=dept_id,
                        first_name=first_name,
                        last_name=last_name,
                        role=role,
                        department=department,
                    )
                )
        db.commit()

        for user in db.query(User).all():
            if user.username in profile_map:
                dept_id, first, last = profile_map[user.username]
                user.dept_id = user.dept_id or dept_id
                user.first_name = user.first_name or first
                user.last_name = user.last_name or last
            elif not user.first_name:
                first, last = split_name(user.full_name)
                user.first_name = first
                user.last_name = last or user.last_name
        db.commit()

        default_uploader = db.query(User).filter(User.username == "doctor").first()
        for study in db.query(Study).filter(Study.submit_source.is_(None)).all():
            if default_uploader:
                study.submitted_by_id = study.submitted_by_id or default_uploader.id
                study.submit_source = submit_source_for_user(default_uploader)
            else:
                study.submit_source = "Radiology — Main Hospital — Imaging Wing"
        db.commit()

        radiologist = db.query(User).filter(User.role == UserRole.RADIOLOGIST).first()
        for report in db.query(Report).filter(Report.approved.is_(True), Report.approved_by_id.is_(None)).all():
            if radiologist:
                report.approved_by_id = radiologist.id
        db.commit()

        archived = db.query(Study).filter(Study.archived.is_(True)).all()
        for study in archived:
            if not study.distributions:
                distribute_study(db, study, study.report)
            auto_assign_study(db, study)
            seed_welcome_messages(db, study)
        db.commit()
    finally:
        db.close()


def seed_followup_studies() -> None:
    """Add second analyzed scans for demo patients so Compare has pairs to review."""
    db: Session = SessionLocal()
    try:
        followups = [
            ("P-1001", "pneumonia", "Follow-up Chest X-Ray — 2 week review"),
            ("P-1002", "cardiomegaly", "Follow-up Chest X-Ray — cardiology review"),
        ]
        for idx, (pid, pathology, desc) in enumerate(followups):
            patient = db.query(Patient).filter(Patient.patient_id == pid).first()
            if not patient:
                continue
            existing = db.query(Study).filter(Study.patient_id == patient.id).count()
            if existing >= 2:
                continue

            png = _synthetic_chest(500 + idx, pathology)
            dicom_path, study_uid, _ = save_upload_as_dicom(
                png, f"followup_{pid}.png", pid, patient.name, "XR"
            )
            thumb = create_thumbnail(dicom_path, study_uid)
            study = Study(
                study_uid=study_uid,
                patient_id=patient.id,
                modality=Modality.XR,
                body_part="CHEST",
                description=desc,
                dicom_path=str(dicom_path),
                thumbnail_path=str(thumb),
            )
            db.add(study)
            db.flush()

            result = analyze_study(dicom_path, study_uid, study.modality)
            report = Report(
                study_id=study.id,
                risk_score=min(0.95, result["risk_score"] + 0.08),
                risk_level=result["risk_level"],
                findings=result["findings"] + " Interval comparison requested.",
                impression=result["impression"] + " Follow-up scan shows evolving findings.",
                recommendations=result["recommendations"],
                ai_findings=result["findings"],
                ai_impression=result["impression"],
                ai_recommendations=result["recommendations"],
                ai_risk_level=result["risk_level"],
                overlay_path=result["overlay_path"],
                anomalies_json=result["anomalies_json"],
            )
            db.add(report)
            db.commit()
            archive_study(db, study, report)
            create_notifications(db, study, report)
            distribute_study(db, study, report)
            auto_assign_study(db, study)
            seed_welcome_messages(db, study)
        db.commit()
    finally:
        db.close()
