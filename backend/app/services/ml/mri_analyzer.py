from __future__ import annotations

import io
import logging
import threading

import numpy as np
import torch
from PIL import Image
from transformers import AutoImageProcessor, AutoModelForImageClassification

from app.config import settings
from app.services.ml.base import ModelAnalysisResult, ModelFinding, format_label, infer_region, infer_severity

logger = logging.getLogger(__name__)

_lock = threading.Lock()
_model = None
_processor = None
_device = None

MODEL_ID = "NeuronZero/MRI-Reader"
MODEL_NAME = "MRI-Reader (Swin Transformer)"
MODEL_VERSION = "NeuronZero/MRI-Reader · Brain MRI tumor classification"

MR_SEVERITY = {
    "glioma_tumor": "critical",
    "meningioma_tumor": "high",
    "pituitary_tumor": "high",
    "no_tumor": "low",
}


def _get_device() -> torch.device:
    if settings.ai_device == "cuda" and torch.cuda.is_available():
        return torch.device("cuda")
    return torch.device("cpu")


def _load_model():
    global _model, _processor, _device
    with _lock:
        if _model is not None:
            return _model, _processor, _device
        _device = _get_device()
        logger.info("Loading %s on %s …", MODEL_ID, _device)
        _processor = AutoImageProcessor.from_pretrained(MODEL_ID)
        _model = AutoModelForImageClassification.from_pretrained(MODEL_ID)
        _model = _model.to(_device)
        _model.eval()
        logger.info("MRI-Reader model ready.")
        return _model, _processor, _device


def _attention_heatmap(model, inputs, image_size: tuple[int, int]) -> np.ndarray | None:
    """Use last hidden state mean as spatial attention proxy for overlay."""
    try:
        with torch.no_grad():
            outputs = model(**inputs, output_hidden_states=True)
        hidden = outputs.hidden_states[-1]  # B, tokens, dim
        # Drop CLS token, reshape patch tokens
        patches = hidden[:, 1:, :].squeeze(0)
        attn = patches.abs().mean(dim=-1).cpu().numpy()
        side = int(np.sqrt(attn.shape[0]))
        if side * side != attn.shape[0]:
            return None
        attn = attn.reshape(side, side)
        attn = attn - attn.min()
        if attn.max() > 0:
            attn = attn / attn.max()
        from PIL import Image as PILImage

        img = PILImage.fromarray((attn * 255).astype(np.uint8))
        img = img.resize(image_size, PILImage.Resampling.BILINEAR)
        return np.array(img, dtype=np.float32) / 255.0
    except Exception as exc:
        logger.warning("MRI attention map failed: %s", exc)
        return None


def analyze(png_bytes: bytes, threshold: float | None = None) -> ModelAnalysisResult:
    threshold = threshold or settings.ai_confidence_threshold
    model, processor, device = _load_model()

    img = Image.open(io.BytesIO(png_bytes)).convert("RGB")
    inputs = processor(images=img, return_tensors="pt")
    inputs = {k: v.to(device) for k, v in inputs.items()}

    with torch.no_grad():
        outputs = model(**inputs)
        probs = torch.softmax(outputs.logits, dim=-1).squeeze(0).cpu().numpy()

    id2label = model.config.id2label
    raw_scores = {id2label[str(i)]: round(float(probs[i]), 4) for i in range(len(probs))}

    ranked = sorted(enumerate(probs), key=lambda x: x[1], reverse=True)
    findings: list[ModelFinding] = []

    for idx, conf in ranked:
        key = str(idx)
        name = id2label.get(key, id2label.get(idx, f"class_{idx}"))
        if name == "no_tumor" and conf >= threshold:
            findings.append(
                ModelFinding(
                    label="No Tumor Detected",
                    confidence=round(float(conf), 3),
                    region="brain",
                    severity="low",
                    class_index=idx,
                )
            )
            break
        if conf >= threshold and name != "no_tumor":
            findings.append(
                ModelFinding(
                    label=format_label(name),
                    confidence=round(float(conf), 3),
                    region=infer_region(name),
                    severity=MR_SEVERITY.get(name, infer_severity(name, conf)),
                    class_index=idx,
                )
            )
        if len(findings) >= 3:
            break

    if not findings:
        best_idx, best_conf = ranked[0]
        name = id2label.get(str(best_idx), "unknown")
        findings.append(
            ModelFinding(
                label=format_label(name),
                confidence=round(float(best_conf), 3),
                region=infer_region(name),
                severity=MR_SEVERITY.get(name, infer_severity(name, best_conf)),
                class_index=best_idx,
            )
        )

    heatmap = _attention_heatmap(model, inputs, img.size)

    return ModelAnalysisResult(
        findings=findings,
        heatmap=heatmap,
        model_name=MODEL_NAME,
        model_version=MODEL_VERSION,
        raw_scores=raw_scores,
    )
