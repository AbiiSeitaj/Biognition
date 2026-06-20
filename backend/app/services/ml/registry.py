from __future__ import annotations

import logging
from typing import Callable

from app.models import Modality
from app.services.ml.base import ModelAnalysisResult

logger = logging.getLogger(__name__)

AnalyzerFn = Callable[..., ModelAnalysisResult]
_ANALYZERS: dict[str, tuple[str, AnalyzerFn]] = {}


def _register():
    if _ANALYZERS:
        return
    from app.services.ml import ct_analyzer, mri_analyzer, us_analyzer, xray_analyzer

    from app.services.ml import xray_router

    _ANALYZERS[Modality.XR.value] = ("xray_router", xray_router.analyze)
    _ANALYZERS[Modality.CT.value] = ("ct", ct_analyzer.analyze)
    _ANALYZERS[Modality.MR.value] = ("mri", mri_analyzer.analyze)
    _ANALYZERS[Modality.US.value] = ("us", us_analyzer.analyze)


def analyze_modality(
    modality: Modality,
    png_bytes: bytes,
    body_part: str | None = None,
) -> ModelAnalysisResult:
    _register()
    key = modality.value
    if key not in _ANALYZERS:
        raise ValueError(f"No AI model registered for modality {key}")
    name, fn = _ANALYZERS[key]
    logger.info("Running %s analyzer for modality %s body_part=%s", name, key, body_part)
    if key == Modality.XR.value:
        return fn(png_bytes, body_part=body_part)
    return fn(png_bytes)


def model_catalog() -> list[dict]:
    _register()
    from app.services.ml import ct_analyzer, mri_analyzer, us_analyzer, xray_analyzer

    return [
        {
            "modality": "XR",
            "name": xray_analyzer.MODEL_NAME,
            "version": xray_analyzer.MODEL_VERSION,
            "framework": "TorchXRayVision + PyTorch",
            "datasets": "NIH ChestX-ray14, RSNA Pneumonia, CheXpert, MIMIC-CXR, PadChest",
            "scope": "Auto-detect body part → route to chest (TorchXRayVision) or spine/MSK (RadImageNet)",
        },
        {
            "modality": "CT",
            "name": ct_analyzer.MODEL_NAME,
            "version": ct_analyzer.MODEL_VERSION,
            "framework": "RadImageNet ResNet50 + PyTorch",
            "datasets": "RadImageNet (1.35M CT/MR/US annotated radiology images)",
        },
        {
            "modality": "MR",
            "name": mri_analyzer.MODEL_NAME,
            "version": mri_analyzer.MODEL_VERSION,
            "framework": "Hugging Face Transformers (Swin)",
            "datasets": "Brain MRI tumor classification",
        },
        {
            "modality": "US",
            "name": us_analyzer.MODEL_NAME,
            "version": us_analyzer.MODEL_VERSION,
            "framework": "Hugging Face Transformers (ViT)",
            "datasets": "Breast Ultrasound (BUSI)",
        },
    ]


def preload_models() -> dict[str, str]:
    """Warm-up all models (downloads weights on first run). Returns status per modality."""
    _register()
    status = {}
    for modality in Modality:
        try:
            analyze_modality(modality, _dummy_png())
            status[modality.value] = "ready"
        except Exception as exc:
            logger.exception("Failed to preload %s model", modality.value)
            status[modality.value] = f"error: {exc}"
    return status


def _dummy_png() -> bytes:
    import io

    import numpy as np
    from PIL import Image

    arr = np.full((224, 224), 128, dtype=np.uint8)
    buf = io.BytesIO()
    Image.fromarray(arr, mode="L").save(buf, format="PNG")
    return buf.getvalue()
