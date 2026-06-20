# Dr Scan — AI Medical Imaging & PACS Platform

**JunctionX Tirana 2024 · Digital Health Challenge · Startup Albania**

Transform medical imaging services through automated AI analysis, PACS archiving, and cross-departmental access — with a **professional DICOM viewer** and AI heatmap overlays.

## Features

| Requirement | Implementation |
|-------------|----------------|
| Image uploader + viewer | Upload DICOM/PNG/JPEG → professional viewer with W/L, zoom, pan, invert |
| AI + Risk Score | Automated pathology detection with composite risk score |
| Structured report | Findings, impression, recommendations, anomaly list |
| PACS archiving | Auto-archive after AI analysis |
| Cross-dept access | Department panel (Radiology, Cardiology, Surgery, ER, Ops) |
| High-risk alerts | Automatic notifications to relevant departments |

## Quick Start (Local)

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:3000** — demo data is seeded on first API start.

## Docker

```bash
docker compose up --build
```

- Frontend: http://localhost:3000
- API: http://localhost:8000/api/health

## Demo Flow (for judges)

1. **Dashboard** — see pre-seeded Albanian patient studies with risk badges
2. **Viewer** — open any study → professional DICOM viewer + AI heatmap overlay
3. **Upload** — upload a chest X-ray → auto AI analysis → PACS archive
4. **Alerts** — high-risk cases trigger cross-department notifications
5. **Departments** — switch between clinical teams sharing the same PACS

## AI Models (Real Pretrained — No Heuristics)

| Modality | Model | Training Data |
|----------|-------|---------------|
| **X-Ray (XR)** | TorchXRayVision DenseNet121 `res224-all` | NIH ChestX-ray14, RSNA Pneumonia, CheXpert, MIMIC-CXR, PadChest |
| **CT** | RadImageNet ResNet50 | 1.35M annotated CT/MR/US radiology images (165 pathology classes) |
| **MRI (MR)** | NeuronZero/MRI-Reader (Swin) | Brain MRI — glioma, meningioma, pituitary, no tumor |
| **Ultrasound (US)** | Parveshiiii/breast-cancer-detector (ViT) | Breast ultrasound — benign / malignant / normal |

Models download automatically on first analysis. Grad-CAM / attention heatmaps drive the viewer overlay.

Check registered models: `GET /api/models`

## Tech Stack

- **Frontend:** Next.js 15, Tailwind CSS, professional canvas DICOM viewer
- **Backend:** FastAPI, pydicom, Pillow, SQLAlchemy, PyTorch, TorchXRayVision, Hugging Face Transformers
- **Database:** SQLite (local) / PostgreSQL (Docker)
- **AI:** Real pretrained models per modality (see above) with Grad-CAM heatmaps

## Project Structure

```
dr-scan/
├── frontend/     Next.js UI
├── backend/      FastAPI + AI + PACS
└── docker-compose.yml
```

## Cloud Deploy

- **Frontend:** Vercel (`NEXT_PUBLIC_API_URL` → your API URL)
- **Backend:** Railway / Render (set `DATABASE_URL`, mount storage volume)
- **Database:** Neon / Supabase PostgreSQL

## Datasets Referenced

- NIH Chest X-Ray Dataset
- RSNA Pneumonia Detection
- VinBigData Chest X-Ray Abnormalities
- Synthetic DICOM (seeded demo data)

---

Built for **Sfida Imazheri Mjekesore** — early anomaly detection, reduced diagnostic delay, data-driven clinical decisions.
