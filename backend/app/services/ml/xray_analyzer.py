from __future__ import annotations

import io
import logging
import threading

import numpy as np
import torch
import torch.nn.functional as F
import torchxrayvision as xrv
from PIL import Image

from app.config import settings
from app.services.ml.base import ModelAnalysisResult, ModelFinding, format_label, infer_region, infer_severity
from app.services.ml.gradcam import compute_gradcam, merge_heatmaps

logger = logging.getLogger(__name__)

_lock = threading.Lock()
_model = None
_device = None

MODEL_NAME = "TorchXRayVision DenseNet121"
MODEL_VERSION = "densenet121-res224-all (NIH·RSNA·CheXpert·MIMIC·PadChest)"

# TorchXRayVision pathology → clinical severity boost
XRV_SEVERITY = {
    "Pneumonia": "high",
    "Effusion": "moderate",
    "Cardiomegaly": "high",
    "Atelectasis": "moderate",
    "Nodule": "high",
    "Mass": "critical",
    "Infiltration": "moderate",
    "Edema": "high",
    "Consolidation": "high",
    "Pneumothorax": "critical",
    "Emphysema": "moderate",
    "Fibrosis": "moderate",
    "Pleural_Thickening": "moderate",
    "Hernia": "moderate",
    "Lung Lesion": "high",
    "Fracture": "high",
    "Lung Opacity": "moderate",
    "Enlarged Cardiomediastinum": "high",
}


def _get_device() -> torch.device:
    if settings.ai_device == "cuda" and torch.cuda.is_available():
        return torch.device("cuda")
    return torch.device("cpu")


def _load_model():
    global _model, _device
    with _lock:
        if _model is not None:
            return _model, _device
        _device = _get_device()
        logger.info("Loading %s on %s …", MODEL_NAME, _device)

        weight_options = [
            "densenet121-res224-all",
            "densenet121-res224-nih",
            "densenet121-res224-rsna",
        ]
        last_error = None
        for weights in weight_options:
            try:
                model = xrv.models.DenseNet(weights=weights)
                if model.op_threshs is not None:
                    model.op_threshs = model.op_threshs.to(_device)
                model = model.to(_device)
                model.eval()
                _model = model
                logger.info("TorchXRayVision loaded weights=%s", weights)
                return _model, _device
            except Exception as exc:
                last_error = exc
                logger.warning("Failed to load XRV weights %s: %s", weights, exc)
                _remove_corrupt_xrv_weights(weights)

        raise RuntimeError(f"Could not load TorchXRayVision model: {last_error}") from last_error


def _remove_corrupt_xrv_weights(weights: str) -> None:
    """Remove partially downloaded weight files so the next attempt re-downloads."""
    import torchxrayvision as xrv_mod

    try:
        path = xrv_mod.models.get_weights(weights, None)
        from pathlib import Path

        p = Path(path)
        if p.exists():
            p.unlink()
            logger.info("Removed corrupt weight file: %s", p)
    except Exception:
        pass


def _prepare_tensor(png_bytes: bytes, device: torch.device) -> tuple[torch.Tensor, np.ndarray]:
    img = Image.open(io.BytesIO(png_bytes)).convert("L")
    arr = np.array(img, dtype=np.float32)
    # XRV expects normalized 224×224 grayscale
    tensor = xrv.datasets.normalize(arr, maxval=255.0 if arr.max() > 1 else 1.0)
    tensor = torch.from_numpy(tensor).unsqueeze(0).unsqueeze(0)
    tensor = F.interpolate(tensor, size=(224, 224), mode="bilinear", align_corners=False)
    return tensor.to(device), arr


def analyze(png_bytes: bytes, body_part: str | None = None, threshold: float | None = None) -> ModelAnalysisResult:
    threshold = threshold or settings.ai_confidence_threshold
    model, device = _load_model()
    tensor, _ = _prepare_tensor(png_bytes, device)

    with torch.no_grad():
        logits = model(tensor)
        probs = torch.sigmoid(logits).squeeze(0).cpu().numpy()

    pathologies = list(model.pathologies)
    op_threshs = model.op_threshs.cpu().numpy() if model.op_threshs is not None else np.full(len(pathologies), 0.5)

    scored = []
    raw_scores = {}
    for i, name in enumerate(pathologies):
        conf = float(probs[i])
        raw_scores[name] = round(conf, 4)
        thresh = float(op_threshs[i]) if i < len(op_threshs) else threshold
        if conf >= max(threshold, thresh * 0.85):
            scored.append((name, conf, i))

    scored.sort(key=lambda x: x[1], reverse=True)
    top = scored[:5]

    findings: list[ModelFinding] = []
    heatmaps: list[np.ndarray] = []

    target_layer = model.features[-1]

    for name, conf, idx in top:
        severity = XRV_SEVERITY.get(name, infer_severity(name, conf))
        findings.append(
            ModelFinding(
                label=format_label(name),
                confidence=round(conf, 3),
                region=infer_region(name),
                severity=severity,
                class_index=idx,
            )
        )
        try:
            cam = compute_gradcam(model, tensor, target_layer, idx)
            heatmaps.append(cam)
        except Exception as exc:
            logger.warning("Grad-CAM failed for %s: %s", name, exc)

    if not findings:
        # Normal study — still run cam on highest probability
        best_idx = int(np.argmax(probs))
        best_name = pathologies[best_idx]
        best_conf = float(probs[best_idx])
        if best_conf > 0.15:
            findings.append(
                ModelFinding(
                    label=f"Low suspicion: {format_label(best_name)}",
                    confidence=round(best_conf, 3),
                    region=infer_region(best_name),
                    severity="low",
                    class_index=best_idx,
                )
            )

    heatmap = merge_heatmaps(heatmaps) if heatmaps else None

    return ModelAnalysisResult(
        findings=findings,
        heatmap=heatmap,
        model_name=MODEL_NAME,
        model_version=MODEL_VERSION,
        raw_scores=raw_scores,
    )
