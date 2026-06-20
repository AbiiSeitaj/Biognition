"""
X-ray orchestrator:
  1) Auto-detect body part
  2) Route to specialist model
  3) Return unified report payload metadata
"""

from __future__ import annotations

import logging

from app.services.ml.base import ModelAnalysisResult, ModelFinding
from app.services.ml.body_part_classifier import BodyPartDetection, classify_body_part, merge_with_user_body_part
from app.services.ml import xray_analyzer
from app.services.ml.radimagenet_core import analyze_with_label_filter

logger = logging.getLogger(__name__)

ROUTER_VERSION = "Dr Scan X-ray Router v1"


def _spine_filter(name: str) -> bool:
    n = name.lower()
    return "spine" in n or "disc" in n or "spondyl" in n or "cord" in n or "vertebr" in n


def _extremity_filter(name: str) -> bool:
    n = name.lower()
    return any(k in n for k in ("knee", "ankle", "foot", "shoulder", "hip", "wrist", "msk", "meniscus", "acl", "labral"))


def _unsupported(detection: BodyPartDetection, routed: str, reason: str) -> ModelAnalysisResult:
    return ModelAnalysisResult(
        findings=[
            ModelFinding(
                label=f"No validated X-ray model for {routed.replace('_', ' ').title()}",
                confidence=0.0,
                region="n/a",
                severity="low",
            )
        ],
        heatmap=None,
        model_name="Dr Scan X-ray Router",
        model_version=ROUTER_VERSION,
        raw_scores={
            "scope_warning": reason,
            "detected_body_part": detection.body_part,
            "detection_confidence": detection.confidence,
            "detection_explanation": detection.explanation,
            "routed_body_part": routed,
        },
    )


def analyze(png_bytes: bytes, body_part: str | None = None) -> ModelAnalysisResult:
    detection = classify_body_part(png_bytes)
    routed, route_source = merge_with_user_body_part(detection, body_part)

    logger.info(
        "X-ray routing: detected=%s (%.0f%%) routed=%s source=%s",
        detection.body_part,
        detection.confidence * 100,
        routed,
        route_source,
    )

    meta = {
        "detected_body_part": detection.body_part,
        "detection_confidence": detection.confidence,
        "detection_explanation": detection.explanation,
        "detection_method": detection.method,
        "routed_body_part": routed,
        "route_source": route_source,
    }

    if routed == "CHEST":
        # Safety: portrait image labeled chest → do not run lung model
        if detection.body_part != "CHEST" and detection.confidence >= 0.55:
            result = _unsupported(
                detection,
                routed,
                f"Auto-detected {detection.body_part.replace('_', ' ')} but study marked as chest. "
                "Chest pathology AI blocked to prevent false lung findings.",
            )
        else:
            result = xray_analyzer.analyze(png_bytes, body_part="CHEST")
    elif routed in {"CERVICAL_SPINE", "LUMBAR_SPINE"}:
        result = analyze_with_label_filter(
            png_bytes,
            label_filter=_spine_filter,
            pathway=f"Spine pathway ({routed.replace('_', ' ').title()})",
        )
    elif routed == "EXTREMITY":
        result = analyze_with_label_filter(
            png_bytes,
            label_filter=_extremity_filter,
            pathway="Musculoskeletal extremity pathway",
        )
    else:
        result = _unsupported(
            detection,
            routed,
            f"Automated detection: {detection.body_part.replace('_', ' ')} ({detection.confidence:.0%}). "
            "No dedicated validated X-ray model loaded for this anatomy yet.",
        )

    result.raw_scores = {**result.raw_scores, **meta}
    result.model_version = f"{result.model_version} · via {ROUTER_VERSION}"
    return result
