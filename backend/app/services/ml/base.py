from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np


@dataclass
class ModelFinding:
    label: str
    confidence: float
    region: str
    severity: str
    class_index: int | None = None


@dataclass
class ModelAnalysisResult:
    findings: list[ModelFinding]
    heatmap: np.ndarray | None  # float32 HxW in [0, 1]
    model_name: str
    model_version: str
    raw_scores: dict[str, float] = field(default_factory=dict)


# Map pathology keywords → overlay region + severity for PACS viewer
REGION_KEYWORDS: list[tuple[str, str, str]] = [
    ("lower_lobe", "lower lobe", "lower_lobe"),
    ("upper_lobe", "upper lobe", "upper_lobe"),
    ("costophrenic", "effusion", "costophrenic_angle"),
    ("pleural", "effusion", "costophrenic_angle"),
    ("cardio", "cardiac", "cardiac_silhouette"),
    ("heart", "cardiac", "cardiac_silhouette"),
    ("perihilar", "perihilar", "perihilar"),
    ("thyroid", "thyroid", "thyroid"),
    ("breast", "breast", "breast"),
    ("gallbladder", "gallbladder", "gallbladder"),
    ("liver", "hepatic", "liver"),
    ("hepatic", "liver", "liver"),
    ("brain", "brain", "parietal"),
    ("glioma", "brain", "parietal"),
    ("meningioma", "brain", "parietal"),
    ("pituitary", "brain", "thyroid"),
    ("spine", "spine", "lumbar"),
    ("lumbar", "spine", "lumbar"),
    ("knee", "knee", "knee"),
    ("meniscus", "knee", "knee"),
    ("acl", "knee", "knee"),
    ("pelvis", "pelvis", "pelvis"),
    ("abdomen", "abdomen", "liver"),
    ("lung", "pulmonary", "middle_lobe"),
    ("pulmonary", "lung", "middle_lobe"),
    ("nodule", "nodule", "upper_lobe"),
    ("mass", "mass", "center"),
    ("hemorrhage", "hemorrhage", "parietal"),
    ("embolism", "vascular", "vascular"),
    ("covid", "infection", "bilateral"),
    ("pneumonia", "infection", "lower_lobe"),
    ("consolidation", "consolidation", "lower_lobe"),
    ("opacity", "opacity", "peripheral"),
    ("effusion", "effusion", "costophrenic_angle"),
    ("edema", "edema", "perihilar"),
    ("fracture", "fracture", "peripheral"),
    ("normal", "normal", "center"),
    ("benign", "benign", "breast"),
    ("malignant", "malignant", "breast"),
]

SEVERITY_KEYWORDS: list[tuple[str, str]] = [
    ("critical", "critical"),
    ("hemorrhage", "critical"),
    ("embolism", "critical"),
    ("malignant", "critical"),
    ("covid", "high"),
    ("pneumonia", "high"),
    ("glioma", "high"),
    ("meningioma", "high"),
    ("pituitary", "high"),
    ("mass", "high"),
    ("nodule", "high"),
    ("consolidation", "high"),
    ("cardio", "high"),
    ("cardiomegaly", "high"),
    ("effusion", "moderate"),
    ("opacity", "moderate"),
    ("infiltration", "moderate"),
    ("atelectasis", "moderate"),
    ("benign", "moderate"),
    ("normal", "low"),
    ("no_tumor", "low"),
]


def infer_region(label: str) -> str:
    lower = label.lower().replace("_", " ")
    for keyword, _, region in REGION_KEYWORDS:
        if keyword in lower:
            return region
    return "center"


def infer_severity(label: str, confidence: float) -> str:
    lower = label.lower().replace("_", " ")
    for keyword, severity in SEVERITY_KEYWORDS:
        if keyword in lower:
            return severity
    if confidence >= 0.8:
        return "high"
    if confidence >= 0.55:
        return "moderate"
    return "low"


def format_label(label: str) -> str:
    return label.replace("_", " ").replace("-", " ").strip().title()
