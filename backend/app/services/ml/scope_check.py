"""Check whether an image is appropriate for a modality-specific AI model."""

from __future__ import annotations

import io

import numpy as np
from PIL import Image


CHEST_BODY_PARTS = {"CHEST", "THORAX", "LUNG", "CHEST PA", "CHEST AP"}
NON_CHEST_XR_PARTS = {
    "NECK",
    "CSPINE",
    "C-SPINE",
    "CERVICAL",
    "CERVICAL SPINE",
    "LSPINE",
    "L-SPINE",
    "LUMBAR",
    "SPINE",
    "HAND",
    "WRIST",
    "KNEE",
    "ANKLE",
    "SKULL",
    "PELVIS",
    "ABDOMEN",
}


def normalize_body_part(body_part: str | None) -> str:
    if not body_part:
        return "CHEST"
    return body_part.strip().upper().replace("-", " ").replace("_", " ")


def body_part_supported_for_xray(body_part: str | None) -> tuple[bool, str]:
    """TorchXRayVision is trained on chest X-rays only."""
    norm = normalize_body_part(body_part)
    if norm in CHEST_BODY_PARTS or norm == "CHEST":
        return True, "chest"
    for blocked in NON_CHEST_XR_PARTS:
        if blocked in norm or norm in blocked:
            return False, norm
    # Unknown body part — require plausibility check
    return True, norm


def chest_projection_plausibility(png_bytes: bytes) -> tuple[bool, str, float]:
    """
    Heuristic gate: PA/AP chest X-rays are usually wider than tall.
    Lateral cervical / limb X-rays are usually taller than wide.
    Returns (is_plausible, reason, confidence).
    """
    img = Image.open(io.BytesIO(png_bytes)).convert("L")
    w, h = img.size
    if h == 0:
        return False, "Invalid image dimensions", 1.0

    aspect = w / h
    arr = np.array(img, dtype=np.float32)
    row_std = arr.std(axis=1).mean()
    col_std = arr.std(axis=0).mean()

    # Lateral neck / spine: portrait orientation
    if aspect < 0.72:
        return (
            False,
            f"Portrait orientation (aspect {aspect:.2f}) — likely lateral spine/neck, not PA/AP chest",
            0.88,
        )

    # Very tall narrow strip
    if h > w * 1.6:
        return False, "Very tall narrow image — not typical chest radiograph geometry", 0.85

    # Chest often has more horizontal variation (two lung fields)
    if col_std > row_std * 1.15 and aspect > 0.9:
        return True, "Landscape layout with bilateral field pattern — consistent with chest X-ray", 0.75

    if aspect >= 0.85:
        return True, "Landscape aspect ratio consistent with chest projection", 0.6

    return (
        False,
        f"Ambiguous projection (aspect {aspect:.2f}) — chest AI may produce unreliable results",
        0.7,
    )


def xray_model_applicable(body_part: str | None, png_bytes: bytes) -> tuple[bool, str]:
    supported, norm = body_part_supported_for_xray(body_part)
    if not supported:
        return False, (
            f"Body part '{norm}' is outside TorchXRayVision scope. "
            "This model is validated for chest/thorax X-rays only (NIH, RSNA, CheXpert)."
        )

    plausible, reason, _ = chest_projection_plausibility(png_bytes)
    if not plausible:
        return False, (
            f"{reason}. Running chest pathology AI on this image would produce misleading "
            "lung labels (e.g. false 'pneumonia' on a neck film)."
        )

    return True, "Chest X-ray scope check passed"
