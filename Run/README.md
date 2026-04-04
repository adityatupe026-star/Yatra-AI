# Run Folder

Use these PowerShell scripts from the repo root.

## Scripts

- `run_backend.ps1` starts the FastAPI backend
- `run_frontend.ps1` starts the backend in a separate window and opens the app after it boots
- `run_dashboard.ps1` starts the India tourism Streamlit dashboard
- `run_all.ps1` starts backend + dashboard in separate windows
- `seed_dashboard_data.ps1` regenerates sample CSV data for the logging layer

## What To Open

- App: `http://localhost:8000/`
- Dashboard: `http://localhost:8501/`

## Notes

- The frontend is served through the backend, not as a separate static server.
- The dashboard reads the India tourism datasets in `data/`.
- The logging CSV files are stored in `data/analytics/`.
- The translate page needs a local LibreTranslate server on port 5000.

```powershell
docker run --rm -p 5000:5000 libretranslate/libretranslate
```
