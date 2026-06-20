# Dr Scan

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

### Run

```bash
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

## Tailscale Hosting

Use this when one teammate runs the Docker stack and shares it privately with the tailnet.

1. Install Tailscale and sign in on the host machine.
2. Start Dr Scan:

```bash
docker compose up --build
```

3. In another terminal, publish the local services through Tailscale Serve:

```bash
tailscale serve reset
tailscale serve --bg --https=443 http://127.0.0.1:3000
tailscale serve --bg --set-path /api http://127.0.0.1:8000
tailscale serve status
```

4. Share the HTTPS URL shown by `tailscale serve status` with teammates in the same tailnet.

Tailscale Serve keeps the app private to the tailnet by default. Use Tailscale Funnel only if the app must be reachable from the public internet.

## Configuration

The Docker Compose file includes working defaults:

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | `postgresql://drscan:drscan@db:5432/drscan` | Backend database connection inside Docker. |
| `STORAGE_DIR` | `/app/storage` | PACS storage path inside the API container. |
| `MODELS_DIR` | `/app/storage/models` | Model cache path inside the API container. |
| `CORS_ORIGINS` | `http://localhost:3000,http://127.0.0.1:3000` | Browser origins allowed outside Tailscale mode. |
| `TAILSCALE` | `1` | Allows direct tailnet/LAN browser access without credentialed CORS. |

For a custom frontend API URL, set `NEXT_PUBLIC_API_URL` during the frontend image build. The default image infers `http://127.0.0.1:8000` for local Docker and same-origin `/api` for Tailscale Serve HTTPS hosts.

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

See the hosting notes in the final handoff for the recommended production paths.
