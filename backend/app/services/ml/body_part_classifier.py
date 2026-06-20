"""Stage 1: Detect X-ray body part / projection before routing to a specialist model."""

from __future__ import annotations

import io
from dataclasses import dataclass

import numpy as np
from PIL import Image


@dataclass
class BodyPartDetection:
    body_part: str
    confidence: float
    method: str
    explanation: str


def _image_features(png_bytes: bytes) -> dict:
    img = Image.open(io.BytesIO(png_bytes)).convert("L")
    w, h = img.size
    arr = np.array(img, dtype=np.float32) / 255.0
    aspect = w / h if h else 1.0

    row_std = arr.std(axis=1)
    col_std = arr.std(axis=0)
    row_mean_std = float(row_std.mean())
    col_mean_std = float(col_std.mean())

    # Vertical midline bone column (spine lateral)
    mid = arr[:, int(w * 0.35) : int(w * 0.65)]
    mid_upper = arr[: int(h * 0.55), int(w * 0.35) : int(w * 0.65)]
    mid_density = float(mid.mean())
    upper_density = float(mid_upper.mean()) if mid_upper.size else mid_density

    # Lateral lung fields (chest)
    left_field = arr[int(h * 0.15) : int(h * 0.85), : int(w * 0.42)]
    right_field = arr[int(h * 0.15) : int(h * 0.85), int(w * 0.58) :]
    lung_contrast = abs(float(left_field.std()) - float(right_field.std())) + float(left_field.std())

    return {
        "w": w,
        "h": h,
        "aspect": aspect,
        "row_mean_std": row_mean_std,
        "col_mean_std": col_mean_std,
        "mid_density": mid_density,
        "upper_density": upper_density,
        "lung_contrast": lung_contrast,
    }


def classify_body_part(png_bytes: bytes) -> BodyPartDetection:
    f = _image_features(png_bytes)
    scores: dict[str, float] = {
        "CHEST": 0.0,
        "CERVICAL_SPINE": 0.0,
        "LUMBAR_SPINE": 0.0,
        "EXTREMITY": 0.0,
        "SKULL": 0.0,
    }

    # Chest: landscape + bilateral lung-field variation
    if f["aspect"] >= 0.85:
        scores["CHEST"] += 0.45
    if f["col_mean_std"] > f["row_mean_std"] * 1.1 and f["aspect"] > 0.9:
        scores["CHEST"] += 0.35
    if f["lung_contrast"] > 0.08 and f["aspect"] > 0.8:
        scores["CHEST"] += 0.25

    # Spine lateral: portrait + midline density
    if f["aspect"] < 0.78:
        scores["CERVICAL_SPINE"] += 0.35
        scores["LUMBAR_SPINE"] += 0.25
    if f["aspect"] < 0.65:
        scores["CERVICAL_SPINE"] += 0.25
        scores["LUMBAR_SPINE"] += 0.2
    if f["mid_density"] > 0.35 and f["aspect"] < 0.85:
        scores["CERVICAL_SPINE"] += 0.2
        scores["LUMBAR_SPINE"] += 0.2

    # Cervical vs lumbar split on upper vs full column
    if f["upper_density"] > f["mid_density"] * 1.05 and f["aspect"] < 0.8:
        scores["CERVICAL_SPINE"] += 0.35
    if f["h"] > f["w"] * 1.3 and f["aspect"] < 0.75:
        scores["LUMBAR_SPINE"] += 0.25

    # Extremity: roughly square or moderate aspect, low lung pattern
    if 0.65 <= f["aspect"] <= 1.2 and f["lung_contrast"] < 0.06:
        scores["EXTREMITY"] += 0.3

    # Skull: square-ish, high central density
    if 0.75 <= f["aspect"] <= 1.15 and f["mid_density"] > 0.45:
        scores["SKULL"] += 0.25

    best = max(scores, key=scores.get)
    best_score = scores[best]
    total = sum(scores.values()) or 1.0
    confidence = min(0.95, best_score / total + 0.25)

    explanations = {
        "CHEST": f"Landscape projection (aspect {f['aspect']:.2f}) with bilateral lung-field pattern",
        "CERVICAL_SPINE": f"Portrait/lateral projection (aspect {f['aspect']:.2f}) with cervical column pattern",
        "LUMBAR_SPINE": f"Portrait spine projection (aspect {f['aspect']:.2f}), full spinal column",
        "EXTREMITY": f"Localized extremity geometry (aspect {f['aspect']:.2f})",
        "SKULL": f"Central cranial density pattern (aspect {f['aspect']:.2f})",
    }

    return BodyPartDetection(
        body_part=best,
        confidence=round(confidence, 3),
        method="vision_geometry_classifier",
        explanation=explanations.get(best, "Automated anatomy routing"),
    )


def merge_with_user_body_part(
    detection: BodyPartDetection,
    user_body_part: str | None,
) -> tuple[str, str]:
    """Prefer user label when explicit and not 'AUTO'; else use detection."""
    if not user_body_part:
        return detection.body_part, "auto_detected"

    norm = user_body_part.strip().upper().replace("-", " ").replace("_", " ")
    if norm in {"", "AUTO", "AUTO DETECT", "AUTODETECT"}:
        return detection.body_part, "auto_detected"

    mapping = {
        "CHEST": "CHEST",
        "THORAX": "CHEST",
        "CERVICAL SPINE": "CERVICAL_SPINE",
        "NECK": "CERVICAL_SPINE",
        "CSPINE": "CERVICAL_SPINE",
        "LUMBAR SPINE": "LUMBAR_SPINE",
        "LSPINE": "LUMBAR_SPINE",
        "SPINE": "LUMBAR_SPINE",
        "EXTREMITY": "EXTREMITY",
        "HAND": "EXTREMITY",
        "WRIST": "EXTREMITY",
        "KNEE": "EXTREMITY",
        "ANKLE": "EXTREMITY",
        "OTHER": "UNKNOWN",
    }
    routed = mapping.get(norm, detection.body_part if detection.confidence > 0.55 else "UNKNOWN")
    if routed != detection.body_part and detection.confidence >= 0.7:
        return detection.body_part, "auto_override_user_mismatch"
    return routed, "user_selected"
