"""Seed demo patients and synthetic studies for hackathon demo."""

import io
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import Modality, Patient, Report, Study
from app.services.ai_engine import analyze_study
from app.services.dicom_service import create_thumbnail, save_upload_as_dicom
from app.services.pacs_service import archive_study, create_notifications


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
                    overlay_path=result["overlay_path"],
                    anomalies_json=result["anomalies_json"],
                )
                db.add(report)
                db.commit()
                archive_study(db, study)
                create_notifications(db, study, report)

        db.commit()
    finally:
        db.close()
