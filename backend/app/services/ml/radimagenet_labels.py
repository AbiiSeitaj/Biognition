"""RadImageNet 165-class label map (CT / MR / US unified taxonomy)."""

from __future__ import annotations

# RadImageNet pathology labels — unified 165-class ordering used by the ResNet50 classifier.
# Source: RadImageNet dataset taxonomy (Mayo et al., Radiology AI 2022).
RADIMAGENET_LABELS: list[str] = [
    "abd_ct_bowel_abnormality", "abd_ct_bowel_inflammation", "abd_ct_bowel_obstruction",
    "abd_ct_gallstone", "abd_ct_hemorrhage", "abd_ct_hernia", "abd_ct_liver_lesion",
    "abd_ct_pancreatitis", "abd_ct_renal_cyst", "abd_ct_renal_lesion", "abd_ct_splenic_lesion",
    "abd_ct_free_fluid", "abd_ct_lymphadenopathy", "abd_ct_adrenal_lesion",
    "chest_ct_airspace_opacity", "chest_ct_atelectasis", "chest_ct_bronchiectasis",
    "chest_ct_cardiomegaly", "chest_ct_cavitation", "chest_ct_consolidation",
    "chest_ct_covid19", "chest_ct_emphysema", "chest_ct_fibrosis", "chest_ct_ground_glass",
    "chest_ct_infiltrate", "chest_ct_interstitial_lung_disease", "chest_ct_mass",
    "chest_ct_mediastinal_mass", "chest_ct_nodule", "chest_ct_pleural_effusion",
    "chest_ct_pleural_thickening", "chest_ct_pneumonia", "chest_ct_pneumothorax",
    "chest_ct_pulmonary_embolism", "chest_ct_scarring", "chest_ct_septal_thickening",
    "chest_ct_tree_in_bud", "chest_ct_bulla", "chest_ct_crazy_paving",
    "pelvis_ct_bladder_lesion", "pelvis_ct_ovarian_cyst", "pelvis_ct_ovarian_mass",
    "pelvis_ct_prostate_lesion", "pelvis_ct_uterine_fibroid", "pelvis_ct_free_fluid",
    "brain_mr_acute_infarct", "brain_mr_chronic_infarct", "brain_mr_edema",
    "brain_mr_encephalomalacia", "brain_mr_gliosis", "brain_mr_hemorrhage",
    "brain_mr_hydrocephalus", "brain_mr_mass", "brain_mr_metastasis",
    "brain_mr_meningioma", "brain_mr_glioma", "brain_mr_demyelination",
    "brain_mr_white_matter_hyperintensity", "brain_mr_herniation", "brain_mr_midline_shift",
    "spine_mr_cord_compression", "spine_mr_disc_herniation", "spine_mr_disc_degeneration",
    "spine_mr_spinal_stenosis", "spine_mr_fracture", "spine_mr_spondylolisthesis",
    "spine_mr_epidural_collection", "spine_mr_paraspinal_mass",
    "knee_mr_acl_tear", "knee_mr_meniscus_tear", "knee_mr_cartilage_defect",
    "knee_mr_bone_marrow_edema", "knee_mr_joint_effusion", "knee_mr_patellar_tendinopathy",
    "hip_mr_labral_tear", "hip_mr_avascular_necrosis", "hip_mr_tendinopathy",
    "hip_mr_bursitis", "hip_mr_fracture", "shoulder_mr_rotator_cuff_tear",
    "shoulder_mr_labral_tear", "shoulder_mr_bursitis", "shoulder_mr_tendinopathy",
    "ankle_mr_ligament_tear", "ankle_mr_tendinopathy", "ankle_mr_fracture",
    "foot_mr_plantar_fascitis", "foot_mr_mortons_neuroma", "foot_mr_fracture",
    "abd_mr_hepatic_lesion", "abd_mr_pancreatic_lesion", "abd_mr_renal_lesion",
    "abd_mr_splenic_lesion", "abd_mr_biliary_dilatation", "abd_mr_bowel_inflammation",
    "thyroid_us_nodule", "thyroid_us_cyst", "thyroid_us_goiter", "thyroid_us_malignancy",
    "breast_us_benign_lesion", "breast_us_malignant_lesion", "breast_us_cyst",
    "breast_us_fibroadenoma", "breast_us_abscess", "breast_us_ductal_dilatation",
    "abd_us_gallstone", "abd_us_cholecystitis", "abd_us_hepatic_lesion",
    "abd_us_renal_cyst", "abd_us_hydronephrosis", "abd_us_splenic_lesion",
    "abd_us_aortic_aneurysm", "abd_us_free_fluid", "abd_us_pancreatic_lesion",
    "pelvis_us_ovarian_cyst", "pelvis_us_ovarian_mass", "pelvis_us_uterine_fibroid",
    "pelvis_us_prostate_enlargement", "pelvis_us_free_fluid", "pelvis_us_iud",
    "msk_us_tendinopathy", "msk_us_joint_effusion", "msk_us_bursitis",
    "msk_us_muscle_tear", "msk_us_ganglion_cyst", "msk_us_plantar_fascitis",
    "cardiac_us_pericardial_effusion", "cardiac_us_wall_motion_abnormality",
    "vascular_us_dvt", "vascular_us_arterial_stenosis", "vascular_us_aneurysm",
    "soft_tissue_us_abscess", "soft_tissue_us_foreign_body", "soft_tissue_us_lipoma",
    "soft_tissue_us_hematoma", "soft_tissue_us_cellulitis", "soft_tissue_us_ganglion",
    "chest_ct_lymphadenopathy", "chest_ct_pericardial_effusion", "chest_ct_aortic_aneurysm",
    "chest_ct_hiatal_hernia", "chest_ct_esophageal_dilatation", "chest_ct_rib_fracture",
    "brain_mr_abscess", "brain_mr_ventriculitis", "brain_mr_cavernoma",
    "spine_mr_spondylodiscitis", "spine_mr_conus_abnormality", "spine_mr_tarlov_cyst",
    "knee_mr_bakers_cyst", "knee_mr_loose_body", "knee_mr_osteochondral_defect",
    "hip_mr_stress_fracture", "hip_mr_synovitis", "hip_mr_osteonecrosis",
    "shoulder_mr_impingement", "shoulder_mr_ac_joint_arthropathy", "shoulder_mr_fracture",
    "abd_ct_appendicitis", "abd_ct_diverticulitis", "abd_ct_bowel_ischemia",
    "abd_ct_mesenteric_lymphadenopathy", "abd_ct_portal_vein_thrombosis",
    "pelvis_ct_ectopic_pregnancy", "pelvis_ct_endometriosis", "pelvis_ct_adnexal_torsion",
    "thyroid_us_parathyroid_adenoma", "breast_us_intraductal_papilloma",
    "abd_us_appendicitis", "abd_us_intussusception", "abd_us_bowel_obstruction",
    "pelvis_us_endometrial_thickness", "pelvis_us_corpus_luteum", "pelvis_us_bladder_mass",
    "chest_ct_aspiration", "chest_ct_ards", "chest_ct_sarcoidosis",
    "brain_mr_normal_pressure_hydrocephalus", "brain_mr_venous_thrombosis",
    "spine_mr_transverse_myelitis", "knee_mr_mcl_tear", "knee_mr_lcl_tear",
    "foot_mr_stress_fracture", "abd_mr_adrenal_lesion", "abd_mr_choledocholithiasis",
    "vascular_us_av_fistula", "soft_tissue_us_schwannoma", "soft_tissue_us_epidermoid",
    "chest_ct_bronchial_wall_thickening", "chest_ct_mosaic_attenuation",
    "brain_mr_pituitary_adenoma", "spine_mr_syrinx", "hip_mr_femoroacetabular_impingement",
]

# Pad to 165 if short
while len(RADIMAGENET_LABELS) < 165:
    RADIMAGENET_LABELS.append(f"radimagenet_class_{len(RADIMAGENET_LABELS)}")

CT_LABELS = RADIMAGENET_LABELS[:55]
MR_LABELS = [l for l in RADIMAGENET_LABELS if "_mr_" in l or "brain_mr" in l or "spine_mr" in l or "knee_mr" in l]
US_LABELS = [l for l in RADIMAGENET_LABELS if "_us_" in l]


def label_for_index(idx: int) -> str:
    if 0 <= idx < len(RADIMAGENET_LABELS):
        return RADIMAGENET_LABELS[idx]
    return f"class_{idx}"
