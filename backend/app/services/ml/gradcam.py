"""Grad-CAM utilities for overlay generation."""

from __future__ import annotations

import numpy as np
import torch
import torch.nn as nn
from PIL import Image


def compute_gradcam(
    model: nn.Module,
    input_tensor: torch.Tensor,
    target_layer: nn.Module,
    target_class: int,
) -> np.ndarray:
    """Return a normalized heatmap (H, W) in [0, 1]."""
    activations: list[torch.Tensor] = []
    gradients: list[torch.Tensor] = []

    def forward_hook(_module, _inp, output):
        activations.append(output.detach())

    def backward_hook(_module, _gin, gout):
        gradients.append(gout[0].detach())

    h1 = target_layer.register_forward_hook(forward_hook)
    h2 = target_layer.register_full_backward_hook(backward_hook)

    model.zero_grad(set_to_none=True)
    model.eval()
    output = model(input_tensor)
    if isinstance(output, (tuple, list)):
        output = output[0]
    if output.dim() > 1 and output.shape[-1] > 1:
        score = output[0, target_class]
    else:
        score = output.flatten()[0]

    score.backward(retain_graph=False)

    h1.remove()
    h2.remove()

    if not activations or not gradients:
        h, w = input_tensor.shape[-2], input_tensor.shape[-1]
        return np.zeros((h, w), dtype=np.float32)

    acts = activations[0]
    grads = gradients[0]
    weights = grads.mean(dim=(2, 3), keepdim=True)
    cam = (weights * acts).sum(dim=1, keepdim=False)
    cam = torch.relu(cam).squeeze(0).cpu().numpy()

    cam = _resize_cam(cam, input_tensor.shape[-2], input_tensor.shape[-1])
    cam = cam - cam.min()
    if cam.max() > 0:
        cam = cam / cam.max()
    return cam.astype(np.float32)


def _resize_cam(cam: np.ndarray, height: int, width: int) -> np.ndarray:
    if cam.ndim != 2:
        cam = cam.squeeze()
    img = Image.fromarray((cam * 255).astype(np.uint8))
    img = img.resize((width, height), Image.Resampling.BILINEAR)
    return np.array(img, dtype=np.float32) / 255.0


def merge_heatmaps(maps: list[np.ndarray]) -> np.ndarray:
    if not maps:
        return np.zeros((1, 1), dtype=np.float32)
    stacked = np.stack(maps, axis=0)
    merged = stacked.max(axis=0)
    if merged.max() > 0:
        merged = merged / merged.max()
    return merged.astype(np.float32)
