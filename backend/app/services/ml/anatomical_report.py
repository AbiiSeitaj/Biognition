"""Structured radiology report text — anatomical region by region."""

from __future__ import annotations

from dataclasses import dataclass

from app.models import RiskLevel
from app.services.ml.base import ModelFinding, format_label


@dataclass(frozen=True)
class RegionTemplate:
    name: str
    regions: frozenset[str]
    label_keywords: frozenset[str]
    normal: str


CHEST_XR: tuple[RegionTemplate, ...] = (
    RegionTemplate(
        "LUNGS",
        frozenset({"middle_lobe", "upper_lobe", "lower_lobe", "bilateral", "perihilar", "peripheral", "center", "vascular"}),
        frozenset({"lung", "opacity", "consolidation", "atelectasis", "pneumonia", "infiltration", "nodule", "emphysema", "fibrosis", "edema", "covid"}),
        "Both lung fields are adequately inflated. No focal consolidation, mass, or significant interstitial abnormality identified.",
    ),
    RegionTemplate(
        "PLEURA",
        frozenset({"costophrenic_angle"}),
        frozenset({"effusion", "pleural", "pneumothorax", "hemothorax"}),
        "No pleural effusion or pneumothorax. Costophrenic angles appear sharp.",
    ),
    RegionTemplate(
        "HEART",
        frozenset({"cardiac_silhouette"}),
        frozenset({"cardio", "heart", "cardiomegaly", "enlarged cardiomediastinum"}),
        "Cardiac silhouette is within normal limits for projection. No cardiomegaly identified.",
    ),
    RegionTemplate(
        "MEDIASTINUM",
        frozenset({"mediastinum", "perihilar"}),
        frozenset({"mediastin", "hilar", "perihilar"}),
        "Mediastinal contours are unremarkable. No mediastinal widening identified.",
    ),
    RegionTemplate(
        "DIAPHRAGM",
        frozenset({"diaphragm"}),
        frozenset({"diaphragm", "hernia"}),
        "Hemidiaphragms appear normal in contour and position.",
    ),
    RegionTemplate(
        "BONY THORAX",
        frozenset({"peripheral", "fracture"}),
        frozenset({"fracture", "rib", "bone", "osseous", "spine", "clavicle"}),
        "No acute osseous abnormality or displaced fracture identified.",
    ),
    RegionTemplate(
        "SOFT TISSUES",
        frozenset({"breast", "thyroid"}),
        frozenset({"soft tissue", "breast", "thyroid", "subcutaneous"}),
        "Chest wall and visualized soft tissues are unremarkable.",
    ),
)

ABDOMEN_US: tuple[RegionTemplate, ...] = (
    RegionTemplate("LIVER", frozenset({"liver"}), frozenset({"liver", "hepatic"}), "Liver is normal in size with homogeneous echotexture. No focal hepatic lesion identified. Intrahepatic biliary channels and portal/hepatic veins are not dilated."),
    RegionTemplate("GALL BLADDER", frozenset({"gallbladder"}), frozenset({"gall", "cholecyst"}), "Gall bladder is well distended with normal wall thickness. No calculus or sludge identified."),
    RegionTemplate("PANCREAS", frozenset({"pancreas"}), frozenset({"pancrea"}), "Pancreas is normal in size and echotexture. Main pancreatic duct is not dilated."),
    RegionTemplate("SPLEEN", frozenset({"spleen"}), frozenset({"spleen", "splenic"}), "Spleen is normal in size with homogeneous echotexture."),
    RegionTemplate("BOTH KIDNEYS", frozenset({"kidney", "renal"}), frozenset({"kidney", "renal", "nephro"}), "Both kidneys are normal in size, shape, and position with preserved corticomedullary differentiation. No hydronephrosis or calculus identified."),
    RegionTemplate("URINARY BLADDER", frozenset({"bladder"}), frozenset({"bladder", "urinary"}), "Urinary bladder is adequately distended with normal wall thickness. Ureteric orifices appear normal."),
    RegionTemplate("PROSTATE", frozenset({"prostate", "pelvis"}), frozenset({"prostate", "pelvis"}), "Prostate appears within normal limits for age (when visualized)."),
)

BRAIN_MR: tuple[RegionTemplate, ...] = (
    RegionTemplate("BRAIN PARENCHYMA", frozenset({"parietal", "brain", "center"}), frozenset({"brain", "glioma", "meningioma", "tumor", "mass", "lesion", "hemorrhage", "edema"}), "Brain parenchyma demonstrates normal signal intensity without mass effect or midline shift."),
    RegionTemplate("VENTRICLES", frozenset({"ventricle"}), frozenset({"ventric", "hydroceph"}), "Ventricular system is normal in size and configuration."),
    RegionTemplate("POSTERIOR FOSSA", frozenset({"cerebellum"}), frozenset({"cerebell", "posterior fossa", "brainstem"}), "Posterior fossa structures are unremarkable."),
    RegionTemplate("EXTRA-AXIAL SPACES", frozenset({"extra_axial"}), frozenset({"meninge", "subdural", "epidural", "extra-axial"}), "No extra-axial collection identified."),
    RegionTemplate("SKULL BASE / CALVARIUM", frozenset({"skull"}), frozenset({"skull", "calvar", "bone"}), "Calvarium and skull base appear intact."),
)

GENERIC: tuple[RegionTemplate, ...] = (
    RegionTemplate(
        "PRIMARY REGION OF INTEREST",
        frozenset({"center", "middle_lobe", "liver", "parietal", "breast", "knee", "lumbar"}),
        frozenset(),
        "No significant abnormality identified in the primary region examined.",
    ),
    RegionTemplate(
        "ADJACENT STRUCTURES",
        frozenset({"peripheral", "perihilar", "upper_lobe", "lower_lobe"}),
        frozenset(),
        "Remaining visualized structures appear within normal limits.",
    ),
    RegionTemplate(
        "GENERAL",
        frozenset(),
        frozenset(),
        "No additional focal abnormality identified on this examination.",
    ),
)


def _normalize_part(body_part: str | None, modality: str, routing_meta: dict | None) -> str:
    if routing_meta:
        routed = str(routing_meta.get("routed_body_part") or routing_meta.get("detected_body_part") or "")
        if routed:
            body_part = routed
    part = (body_part or "GENERAL").upper().replace("-", " ").strip()
    if modality == "US" and ("ABDOM" in part or part in {"AUTO", "GENERAL", "UNKNOWN"}):
        return "ABDOMEN"
    if modality == "MR" and any(k in part for k in ("BRAIN", "HEAD", "CRAN", "NEURO")):
        return "BRAIN"
    if modality == "XR" and any(k in part for k in ("CHEST", "THORAX", "LUNG", "CXR")):
        return "CHEST"
    return part


def _template_for(part: str, modality: str) -> tuple[RegionTemplate, ...]:
    if modality == "XR" and "CHEST" in part:
        return CHEST_XR
    if modality == "US" and "ABDOM" in part:
        return ABDOMEN_US
    if modality == "MR" and "BRAIN" in part:
        return BRAIN_MR
    if modality == "CT" and "CHEST" in part:
        return CHEST_XR
    if modality == "CT" and "ABDOM" in part:
        return ABDOMEN_US
    return GENERIC


def _finding_matches(finding: ModelFinding, template: RegionTemplate) -> bool:
    label = finding.label.lower().replace("_", " ")
    region = finding.region.lower().replace("_", " ")
    if finding.region in template.regions or region in template.regions:
        return True
    return any(kw in label for kw in template.label_keywords)


def _clinical_abnormality(finding: ModelFinding) -> str:
    label = format_label(finding.label)
    region = finding.region.replace("_", " ")
    templates = {
        "effusion": f"Blunting of the costophrenic angle suggesting pleural effusion ({region}).",
        "cardiomegaly": "Cardiomegaly with enlarged cardiac silhouette.",
        "consolidation": f"Airspace consolidation in the {region}.",
        "atelectasis": f"Volume loss and increased opacity consistent with atelectasis in the {region}.",
        "opacity": f"Focal lung opacity in the {region}.",
        "pneumonia": f"Patchy airspace disease in the {region}, suspicious for pneumonia.",
        "nodule": f"Pulmonary nodule identified in the {region}.",
        "mass": f"Mass-like opacity in the {region}.",
        "pneumothorax": "Pneumothorax with visceral pleural line identified.",
        "fracture": "Suspected osseous abnormality; correlate clinically.",
        "edema": "Interstitial prominence suggesting pulmonary edema.",
    }
    lower = finding.label.lower()
    for key, text in templates.items():
        if key in lower:
            return text
    return f"{label} identified in the {region}."


def build_anatomical_findings(
    findings: list[ModelFinding],
    modality: str,
    body_part: str | None = None,
    routing_meta: dict | None = None,
) -> str:
    part = _normalize_part(body_part, modality, routing_meta)
    templates = _template_for(part, modality)
    used: set[int] = set()
    sections: list[str] = []

    for template in templates:
        matched = [f for i, f in enumerate(findings) if i not in used and _finding_matches(f, template)]
        for i, f in enumerate(findings):
            if i not in used and f in matched:
                used.add(i)

        sections.append(f"{template.name}:")
        if matched:
            sentences = [_clinical_abnormality(f) for f in matched]
            sections.append(" ".join(sentences))
        else:
            sections.append(template.normal)
        sections.append("")

    leftover = [f for i, f in enumerate(findings) if i not in used]
    if leftover:
        sections.append("ADDITIONAL FINDINGS:")
        sections.append(" ".join(_clinical_abnormality(f) for f in leftover))
        sections.append("")

    return "\n".join(sections).strip()


def build_impression(
    findings: list[ModelFinding],
    modality: str,
    risk_level: RiskLevel,
    body_part: str | None = None,
    routing_meta: dict | None = None,
) -> str:
    part = _normalize_part(body_part, modality, routing_meta).replace("_", " ")
    exam = f"{modality} {part.title()}".strip()

    if not findings:
        return f"*IMPRESSION: NO SIGNIFICANT ABNORMALITY IDENTIFIED ON {exam.upper()}."

    labels = [format_label(f.label) for f in findings[:4]]
    if len(findings) == 1:
        summary = f"Abnormal {exam} with {labels[0].lower()}."
    else:
        summary = f"Abnormal {exam} with {', '.join(l.lower() for l in labels[:-1])} and {labels[-1].lower()}."

    if risk_level in {RiskLevel.HIGH, RiskLevel.CRITICAL}:
        summary += " Findings warrant prompt clinical correlation and radiologist review."
    elif risk_level == RiskLevel.MODERATE:
        summary += " Clinical correlation recommended."
    else:
        summary += " Correlate with clinical presentation."

    return f"*IMPRESSION: {summary.upper()}"


def build_recommendations(findings: list[ModelFinding], risk_level: RiskLevel) -> str:
    if not findings:
        return "Routine follow-up per institutional protocol. No immediate intervention suggested based on imaging alone."

    if risk_level in {RiskLevel.HIGH, RiskLevel.CRITICAL}:
        return (
            "Recommend urgent clinical correlation and attending radiologist review. "
            "Consider same-day specialist consultation if clinically indicated. "
            "Cross-department notification has been dispatched per protocol."
        )
    if risk_level == RiskLevel.MODERATE:
        return "Recommend radiologist review within 24 hours. Correlate with clinical presentation and prior imaging if available."
    return "Low-risk examination. Standard workflow; follow-up imaging per institutional protocol if clinically warranted."
