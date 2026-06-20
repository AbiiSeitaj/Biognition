from __future__ import annotations

import io
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

from app.config import settings
from app.models import RiskLevel
from app.services.dicom_service import dicom_to_png_bytes
from app.services.ml.base import ModelAnalysisResult, ModelFinding


def findings_to_dicts(findings: list[ModelFinding]) -> list[dict]:
    return [
        {
            "label": f.label,
            "confidence": f.confidence,
            "region": f.region,
            "severity": f.severity,
        }
        for f in findings
    ]


def compute_risk_score(findings: list[ModelFinding]) -> tuple[float, RiskLevel]:
    if not findings:
        return 0.08, RiskLevel.LOW

    severity_weight = {"low": 0.25, "moderate": 0.55, "high": 0.78, "critical": 0.95}
    scores = [f.confidence * severity_weight.get(f.severity, 0.5) for f in findings]
    score = max(scores)
    avg = sum(f.confidence for f in findings) / len(findings)
    score = min(0.99, score * 0.65 + avg * 0.35 + (len(findings) - 1) * 0.04)

    if score >= 0.85:
        level = RiskLevel.CRITICAL
    elif score >= 0.65:
        level = RiskLevel.HIGH
    elif score >= 0.4:
        level = RiskLevel.MODERATE
    else:
        level = RiskLevel.LOW
    return round(score, 3), level


def generate_report_text(
    findings: list[ModelFinding],
    modality: str,
    risk_score: float,
    risk_level: RiskLevel,
    model_name: str,
    scope_warning: str | None = None,
    routing_meta: dict | None = None,
) -> tuple[str, str, str]:
    routing_prefix = ""
    if routing_meta:
        detected = routing_meta.get("detected_body_part", "")
        conf = routing_meta.get("detection_confidence", 0)
        routed = routing_meta.get("routed_body_part", detected)
        expl = routing_meta.get("detection_explanation", "")
        routing_prefix = (
            f"Stage 1 — Auto-detected anatomy: {str(detected).replace('_', ' ').title()} "
            f"({conf:.0%} confidence). Routed to: {str(routed).replace('_', ' ').title()}. {expl}\n\n"
        )

    if scope_warning:
        findings_text = scope_warning
        impression = routing_prefix + (
            f"Automated {modality} analysis was NOT performed on an incompatible anatomy/model pairing. "
            f"{scope_warning} Assign to a radiologist."
        )
        recommendations = (
            "Do not act on AI output. Confirm body part and re-run with a validated model pathway."
        )
        return findings_text, impression, recommendations

    if not findings:
        findings_text = "No significant focal abnormality detected by the AI model."
        impression = (
            f"Automated {modality} analysis ({model_name}) suggests no high-confidence pathology. "
            "Clinical correlation recommended."
        )
        recommendations = "Routine follow-up per institutional protocol."
        return findings_text, impression, recommendations

    lines = []
    for i, f in enumerate(findings, 1):
        lines.append(
            f"{i}. {f.label} — AI confidence {int(f.confidence * 100)}%, "
            f"region: {f.region.replace('_', ' ')}, severity: {f.severity}."
        )
    findings_text = "\n".join(lines)

    primary = findings[0].label
    impression = routing_prefix + (
        f"AI-assisted {modality} analysis ({model_name}) identifies {primary}"
        f"{' with additional findings' if len(findings) > 1 else ''}. "
        f"Composite risk score: {risk_score:.0%} ({risk_level.value.upper()})."
    )

    if risk_level in {RiskLevel.HIGH, RiskLevel.CRITICAL}:
        recommendations = (
            "URGENT: Escalate to attending radiologist. Consider same-day specialist consult. "
            "Cross-department notification dispatched automatically."
        )
    elif risk_level == RiskLevel.MODERATE:
        recommendations = "Recommend radiologist review within 24 hours. Correlate with clinical presentation."
    else:
        recommendations = "Low-risk automated read. Standard workflow; no immediate escalation required."

    return findings_text, impression, recommendations


def generate_overlay_from_heatmap(
    dicom_path: Path,
    study_uid: str,
    heatmap: np.ndarray | None,
    findings: list[ModelFinding],
) -> Path:
    png_bytes = dicom_to_png_bytes(dicom_path)
    base = Image.open(io.BytesIO(png_bytes)).convert("RGBA")

    if heatmap is not None:
        heatmap_resized = np.array(
            Image.fromarray((heatmap * 255).astype(np.uint8)).resize(base.size, Image.Resampling.BILINEAR),
            dtype=np.float32,
        ) / 255.0
        heatmap_layer = _heatmap_to_rgba(heatmap_resized)
        combined = Image.alpha_composite(base, heatmap_layer)
    else:
        heatmap_layer = _fallback_region_layer(base, findings)
        combined = Image.alpha_composite(base.convert("RGBA"), heatmap_layer)

    out_path = settings.storage_dir / "overlays" / f"{study_uid}.png"
    heatmap_path = settings.storage_dir / "overlays" / f"{study_uid}_heatmap.png"
    combined.save(out_path)
    heatmap_layer.save(heatmap_path)
    return out_path


def _heatmap_to_rgba(heatmap: np.ndarray) -> Image.Image:
    h, w = heatmap.shape
    rgba = np.zeros((h, w, 4), dtype=np.uint8)
    rgba[..., 0] = np.clip(heatmap * 255, 0, 255).astype(np.uint8)
    rgba[..., 1] = np.clip(heatmap * 80, 0, 120).astype(np.uint8)
    rgba[..., 3] = np.clip(heatmap * 180 + 40, 0, 200).astype(np.uint8)
    img = Image.fromarray(rgba, mode="RGBA")
    return img.filter(ImageFilter.GaussianBlur(radius=6))


def _fallback_region_layer(base: Image.Image, findings: list[ModelFinding]) -> Image.Image:
    from PIL import ImageDraw

    overlay = Image.new("RGBA", base.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    region_map = {
        "lower_lobe": (0.45, 0.55, 0.55, 0.95),
        "upper_lobe": (0.05, 0.45, 0.05, 0.45),
        "costophrenic_angle": (0.6, 0.9, 0.65, 0.95),
        "cardiac_silhouette": (0.25, 0.65, 0.35, 0.75),
        "middle_lobe": (0.3, 0.7, 0.35, 0.65),
        "brain": (0.2, 0.8, 0.15, 0.45),
        "parietal": (0.2, 0.8, 0.15, 0.45),
        "breast": (0.2, 0.8, 0.25, 0.75),
        "thyroid": (0.35, 0.65, 0.08, 0.25),
        "liver": (0.55, 0.85, 0.45, 0.75),
        "center": (0.3, 0.7, 0.3, 0.7),
    }
    w, h = base.size
    for f in findings[:3]:
        box = region_map.get(f.region, region_map["center"])
        x1, y1 = int(box[0] * w), int(box[2] * h)
        x2, y2 = int(box[1] * w), int(box[3] * h)
        alpha = int(min(180, 80 + f.confidence * 120))
        color = (239, 68, 68, alpha) if f.severity in {"high", "critical"} else (249, 115, 22, alpha)
        draw.ellipse([x1, y1, x2, y2], fill=color)
    return overlay.filter(ImageFilter.GaussianBlur(radius=8))


def build_analysis_payload(
    result: ModelAnalysisResult,
    dicom_path: Path,
    study_uid: str,
    modality: str,
) -> dict:
    risk_score, risk_level = compute_risk_score(result.findings)
    scope_warning = result.raw_scores.get("scope_warning")
    routing_meta = {
        k: result.raw_scores[k]
        for k in (
            "detected_body_part",
            "detection_confidence",
            "detection_explanation",
            "routed_body_part",
            "route_source",
        )
        if k in result.raw_scores
    }
    if scope_warning:
        risk_score, risk_level = 0.05, RiskLevel.LOW
    findings_text, impression, recommendations = generate_report_text(
        result.findings,
        modality,
        risk_score,
        risk_level,
        result.model_name,
        scope_warning=scope_warning,
        routing_meta=routing_meta or None,
    )
    overlay_path = generate_overlay_from_heatmap(dicom_path, study_uid, result.heatmap, result.findings)
    findings = findings_to_dicts(result.findings)

    return {
        "risk_score": risk_score,
        "risk_level": risk_level,
        "findings": findings_text,
        "impression": impression,
        "recommendations": recommendations,
        "overlay_path": str(overlay_path),
        "anomalies_json": json.dumps(findings),
        "model_name": result.model_name,
        "model_version": result.model_version,
        "detected_body_part": routing_meta.get("routed_body_part") if routing_meta else None,
    }
