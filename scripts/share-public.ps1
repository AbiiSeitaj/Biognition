# Publish Biognition so teammates can open the link in any browser (no Tailscale install).
# Requires: Docker running (`docker compose up -d`) and Tailscale signed in on this machine.

Write-Host "Checking Docker web container on port 3000..."
$health = curl.exe -s -o NUL -w "%{http_code}" http://127.0.0.1:3000/api/health
if ($health -ne "200") {
  Write-Host "Web/API not healthy (HTTP $health). Run: docker compose up -d" -ForegroundColor Red
  exit 1
}

Write-Host "Enabling Tailscale Funnel (public HTTPS)..."
tailscale funnel reset
tailscale funnel --bg --https=443 http://127.0.0.1:3000
tailscale funnel status

Write-Host ""
Write-Host "Share this URL with your team:" -ForegroundColor Green
tailscale funnel status | Select-String "https://"
