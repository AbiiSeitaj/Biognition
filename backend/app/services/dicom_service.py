import io
import json
import uuid
from datetime import datetime
from pathlib import Path

import numpy as np
import pydicom
from PIL import Image, ImageDraw, ImageFilter
from pydicom.dataset import FileDataset, FileMetaDataset
from pydicom.uid import ExplicitVRLittleEndian, generate_uid

from app.config import settings


def _apply_window(pixel_array: np.ndarray, window_center: float, window_width: float) -> np.ndarray:
    lower = window_center - window_width / 2
    upper = window_center + window_width / 2
    clipped = np.clip(pixel_array.astype(np.float32), lower, upper)
    normalized = (clipped - lower) / max(upper - lower, 1e-6)
    return (normalized * 255).astype(np.uint8)


def dicom_to_png_bytes(dicom_path: Path, window_center: float | None = None, window_width: float | None = None) -> bytes:
    ds = pydicom.dcmread(str(dicom_path))
    arr = ds.pixel_array.astype(np.float32)

    if window_center is None:
        window_center = float(getattr(ds, "WindowCenter", arr.mean()))
        if isinstance(window_center, pydicom.multival.MultiValue):
            window_center = float(window_center[0])
    if window_width is None:
        window_width = float(getattr(ds, "WindowWidth", arr.max() - arr.min() or 1))
        if isinstance(window_width, pydicom.multival.MultiValue):
            window_width = float(window_width[0])

    img_arr = _apply_window(arr, window_center, window_width)
    if len(img_arr.shape) == 2:
        mode = "L"
    else:
        mode = "RGB"
        if img_arr.shape[2] > 3:
            img_arr = img_arr[:, :, :3]

    img = Image.fromarray(img_arr, mode=mode)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def save_upload_as_dicom(
    file_bytes: bytes,
    filename: str,
    patient_id: str,
    patient_name: str,
    modality: str = "XR",
) -> tuple[Path, str, dict]:
    """Convert uploaded PNG/JPEG or preserve DICOM. Returns path, study_uid, metadata."""
    study_uid = generate_uid()
    series_uid = generate_uid()
    sop_uid = generate_uid()
    dest = settings.storage_dir / "dicom" / f"{study_uid}.dcm"

    suffix = Path(filename).suffix.lower()
    if suffix in {".dcm", ".dicom"}:
        ds = pydicom.dcmread(io.BytesIO(file_bytes), force=True)
        ds.StudyInstanceUID = study_uid
        ds.SeriesInstanceUID = series_uid
        ds.SOPInstanceUID = sop_uid
        ds.PatientID = patient_id
        ds.PatientName = patient_name
        ds.Modality = modality
        ds.save_as(str(dest))
    else:
        img = Image.open(io.BytesIO(file_bytes)).convert("L")
        arr = np.array(img)

        file_meta = FileMetaDataset()
        file_meta.MediaStorageSOPClassUID = pydicom.uid.SecondaryCaptureImageStorage
        file_meta.MediaStorageSOPInstanceUID = sop_uid
        file_meta.TransferSyntaxUID = ExplicitVRLittleEndian

        ds = FileDataset(str(dest), {}, file_meta=file_meta, preamble=b"\0" * 128)
        ds.is_little_endian = True
        ds.is_implicit_VR = False
        ds.SOPClassUID = pydicom.uid.SecondaryCaptureImageStorage
        ds.SOPInstanceUID = sop_uid
        ds.StudyInstanceUID = study_uid
        ds.SeriesInstanceUID = series_uid
        ds.PatientID = patient_id
        ds.PatientName = patient_name
        ds.Modality = modality
        ds.SeriesDescription = "Dr Scan Upload"
        ds.StudyDescription = f"{modality} Study"
        ds.BodyPartExamined = "CHEST" if modality == "XR" else "UNKNOWN"
        ds.PhotometricInterpretation = "MONOCHROME2"
        ds.SamplesPerPixel = 1
        ds.Rows, ds.Columns = arr.shape
        ds.BitsAllocated = 8
        ds.BitsStored = 8
        ds.HighBit = 7
        ds.PixelRepresentation = 0
        ds.RescaleSlope = 1
        ds.RescaleIntercept = 0
        ds.WindowCenter = int(arr.mean())
        ds.WindowWidth = int(max(arr.max() - arr.min(), 1))
        ds.PixelData = arr.tobytes()
        ds.save_as(str(dest))

    meta = {
        "study_uid": study_uid,
        "modality": modality,
        "rows": int(getattr(ds, "Rows", 0)),
        "columns": int(getattr(ds, "Columns", 0)),
        "patient_id": patient_id,
        "patient_name": patient_name,
    }
    return dest, study_uid, meta


def create_thumbnail(dicom_path: Path, study_uid: str) -> Path:
    png_bytes = dicom_to_png_bytes(dicom_path)
    thumb_path = settings.storage_dir / "thumbnails" / f"{study_uid}.png"
    img = Image.open(io.BytesIO(png_bytes))
    img.thumbnail((320, 320), Image.Resampling.LANCZOS)
    img.save(thumb_path)
    return thumb_path


def get_dicom_metadata(dicom_path: Path) -> dict:
    ds = pydicom.dcmread(str(dicom_path), stop_before_pixels=True)
    return {
        "patient_id": str(getattr(ds, "PatientID", "")),
        "patient_name": str(getattr(ds, "PatientName", "")),
        "modality": str(getattr(ds, "Modality", "XR")),
        "body_part": str(getattr(ds, "BodyPartExamined", "CHEST")),
        "study_description": str(getattr(ds, "StudyDescription", "")),
        "window_center": float(getattr(ds, "WindowCenter", 40) or 40),
        "window_width": float(getattr(ds, "WindowWidth", 400) or 400),
    }
