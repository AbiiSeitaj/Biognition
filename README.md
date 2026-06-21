# Biognition

AI-assisted medical imaging and PACS platform for uploading studies, viewing DICOM images, running modality-specific analysis, generating structured reports, and sharing high-risk alerts across departments.

## Features

| Area | Implementation |
| --- | --- |
| Image upload and viewing | Upload DICOM, PNG, or JPEG studies and review them in a canvas-based medical image viewer. |
| AI analysis | Run pretrained model pipelines for X-ray, CT, MRI, and ultrasound studies. |
| Structured reports | Generate findings, impressions, recommendations, anomaly lists, and risk scores. |
| PACS archive | Store source studies, thumbnails, overlays, and analysis outputs. |
| Department access | Share studies and notifications across Radiology, Cardiology, Surgery, ER, and Operations. |
| High-risk alerts | Route urgent cases to the relevant department workflows. |

## Quick Start With Docker

Docker is the supported local setup for teammates.

### Prerequisites

- Docker Desktop or Docker Engine with Docker Compose v2.
- At least 8 GB RAM available to Docker. The AI dependencies are large.
- Internet access on first analysis so pretrained model weights can download.

### Clone And Run

```bash
git clone https://github.com/AbiiSeitaj/Dr-Scan-.git
cd Dr-Scan-
docker compose up --build
```

Open the application:

- Frontend: `http://localhost:3000`
- API health check: `http://localhost:8000/api/health`

The first API startup seeds demo studies automatically. Model weights are downloaded only when an analysis path needs them and are cached in the Docker volume.

### Stop

```bash
docker compose down
```

### Reset All Local Data

This removes the PostgreSQL database and stored PACS/model files.

```bash
docker compose down -v
```



## Configuration

The Docker Compose file includes working defaults:

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | `postgresql://drscan:drscan@db:5432/drscan` | Backend database connection inside Docker. |
| `STORAGE_DIR` | `/app/storage` | PACS storage path inside the API container. |
| `MODELS_DIR` | `/app/storage/models` | Model cache path inside the API container. |
| `CORS_ORIGINS` | `http://localhost:3000,http://127.0.0.1:3000` | Browser origins allowed outside Tailscale mode. |
| `TAILSCALE` | `1` | Allows direct tailnet/LAN browser access without credentialed CORS. |

For a custom frontend API URL, set `NEXT_PUBLIC_API_URL` during the frontend image build. The default Docker image uses same-origin `/api` requests proxied to the API container.

### "Failed to fetch" when analyzing

1. Rebuild after pulling changes: `docker compose up --build`
2. Confirm API health: `curl http://localhost:8000/api/health`
3. Confirm proxy from the web container: open the hosted site, then check browser DevTools > Network. `/api/studies/upload` should hit your site origin, not port 8000 directly.
4. For manual dev, set `frontend/.env.local` with `API_PROXY_URL=http://127.0.0.1:8000` or your backend port.

## Manual Development

Docker is recommended. Use manual setup only when developing a specific service.

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## API Checks

```bash
curl http://localhost:8000/api/health
curl http://localhost:8000/api/models
```

## Project Structure

```text
dr-scan/
|-- backend/              FastAPI API, PACS storage, AI services
|-- frontend/             Next.js web application
|-- docker-compose.yml    Local PostgreSQL, API, and frontend stack
`-- README.md
```

## AI Models

| Modality | Model |
| --- | --- |
| X-Ray | TorchXRayVision DenseNet121 `res224-all` |
| CT | RadImageNet ResNet50 |
| MRI | NeuronZero/MRI-Reader |
| Ultrasound | Parveshiiii/breast-cancer-detector |

## Deployment Options

For production hosting, run the frontend and API as separate services behind HTTPS, or use Docker Compose on a private host with the same environment variables shown above.
