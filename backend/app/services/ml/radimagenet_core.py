"""Shared RadImageNet ResNet50 loader and inference."""

from __future__ import annotations

import io
import logging
import threading
from collections.abc import Callable

import numpy as np
import torch
import torch.nn as nn
import torchvision.models as models
import torchvision.transforms as T
from huggingface_hub import hf_hub_download
from PIL import Image

from app.config import settings
from app.services.ml.base import ModelAnalysisResult, ModelFinding, format_label, infer_region, infer_severity
from app.services.ml.gradcam import compute_gradcam
from app.services.ml.radimagenet_labels import RADIMAGENET_LABELS, label_for_index

logger = logging.getLogger(__name__)

_lock = threading.Lock()
_model = None
_device = None

MODEL_NAME = "RadImageNet ResNet50"
MODEL_VERSION = "Lab-Rasool/RadImageNet · 1.35M annotated radiology images"


def _get_device() -> torch.device:
    if settings.ai_device == "cuda" and torch.cuda.is_available():
        return torch.device("cuda")
    return torch.device("cpu")


def _build_resnet165() -> nn.Module:
    model = models.resnet50(weights=None)
    model.fc = nn.Linear(model.fc.in_features, 165)
    return model


def get_radimagenet_model() -> tuple[nn.Module, torch.device]:
    global _model, _device
    with _lock:
        if _model is not None:
            return _model, _device
        _device = _get_device()
        logger.info("Loading RadImageNet on %s …", _device)
        path = hf_hub_download(repo_id="Lab-Rasool/RadImageNet", filename="ResNet50.pt")
        checkpoint = torch.load(path, map_location=_device, weights_only=False)
        if isinstance(checkpoint, nn.Module):
            model = checkpoint
        else:
            model = _build_resnet165()
            state = checkpoint.get("state_dict", checkpoint) if isinstance(checkpoint, dict) else checkpoint
            model.load_state_dict(state, strict=False)
        model = model.to(_device)
        model.eval()
        _model = model
        return _model, _device


_transform = T.Compose(
    [
        T.Resize((224, 224)),
        T.ToTensor(),
        T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ]
)


def _prepare_tensor(png_bytes: bytes, device: torch.device) -> torch.Tensor:
    img = Image.open(io.BytesIO(png_bytes)).convert("RGB")
    return _transform(img).unsqueeze(0).to(device)


def analyze_with_label_filter(
    png_bytes: bytes,
    *,
    label_filter: Callable[[str], bool],
    pathway: str,
    threshold: float | None = None,
    max_findings: int = 4,
) -> ModelAnalysisResult:
    threshold = threshold or settings.ai_confidence_threshold
    model, device = get_radimagenet_model()
    tensor = _prepare_tensor(png_bytes, device)

    with torch.no_grad():
        logits = model(tensor)
        if logits.dim() == 1:
            logits = logits.unsqueeze(0)
        probs = torch.softmax(logits, dim=-1).squeeze(0).cpu().numpy()

    candidates = []
    raw_scores = {}
    for idx in range(len(probs)):
        name = label_for_index(idx)
        raw_scores[name] = round(float(probs[idx]), 4)
        if label_filter(name) and probs[idx] >= threshold * 0.45:
            candidates.append((idx, name, float(probs[idx])))

    candidates.sort(key=lambda x: x[2], reverse=True)
    if not candidates:
        top_idx = int(np.argmax(probs))
        candidates = [(top_idx, label_for_index(top_idx), float(probs[top_idx]))]

    findings: list[ModelFinding] = []
    heatmap = None
    target_layer = model.layer4[-1] if hasattr(model, "layer4") else list(model.children())[-2]

    for idx, name, conf in candidates[:max_findings]:
        if conf < threshold and findings:
            continue
        findings.append(
            ModelFinding(
                label=format_label(name),
                confidence=round(conf, 3),
                region=infer_region(name),
                severity=infer_severity(name, conf),
                class_index=idx,
            )
        )

    if findings:
        try:
            heatmap = compute_gradcam(model, tensor, target_layer, findings[0].class_index or 0)
        except Exception as exc:
            logger.warning("RadImageNet Grad-CAM failed: %s", exc)

    return ModelAnalysisResult(
        findings=findings[:max_findings],
        heatmap=heatmap,
        model_name=MODEL_NAME,
        model_version=f"{MODEL_VERSION} · {pathway}",
        raw_scores=raw_scores,
    )
