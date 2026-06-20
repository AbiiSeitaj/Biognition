"""AI analysis engine — routes each modality to a real pretrained model."""

from __future__ import annotations

from pathlib import Path

from app.models import Modality
from app.services.dicom_service import dicom_to_png_bytes
from app.services.ml.registry import analyze_modality
from app.services.ml.report_utils import build_analysis_payload


def analyze_study(dicom_path: Path, study_uid: str, modality: Modality, body_part: str | None = None) -> dict:
    png_bytes = dicom_to_png_bytes(dicom_path)
    result = analyze_modality(modality, png_bytes, body_part=body_part)
    return build_analysis_payload(result, dicom_path, study_uid, modality.value)
