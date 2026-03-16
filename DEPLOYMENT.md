# StayAura Backend Deployment

This backend is a Node.js (Express) API with:
- Start command: `npm start`
- Health check endpoint: `GET /health`

## 1) Required environment variables

Set these on your hosting provider:

- `PORT` (optional on most hosts)
- `FRONTEND_ORIGIN` (comma-separated list for CORS)
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `RESEND_API_KEY`
- `ADMIN_EMAIL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`

You can copy from `.env.example`.

## 2) Deploy on Render (Node service)

1. Push this repo to GitHub.
2. In Render, create a new `Web Service` and connect the repo.
3. Use:
   - Runtime: `Node`
   - Build Command: `npm ci`
   - Start Command: `npm start`
4. Add all environment variables listed above.
5. Set health check path to `/health`.
6. Deploy.

### Render Blueprint (one-click from repo)

This repo includes `render.yaml`.

1. In Render, choose `New` -> `Blueprint`.
2. Select this repository.
3. Render reads `render.yaml` and creates the service with build/start/health settings.
4. Fill in the required secret env vars when prompted.

## 3) Deploy on Railway

1. Create a new project in Railway and link this repo.
2. Railway auto-detects Node and runs `npm start`.
3. Add all environment variables listed above.
4. Deploy and verify `/health`.

## 4) Deploy with Docker (any VPS/container host)

Build and run locally:

```bash
docker build -t stayaura-backend .
docker run --env-file .env -p 5000:5000 stayaura-backend
```

Then open:
- `http://localhost:5000/health`

## 5) Post-deploy checks

- `GET /health` returns `{"success":true,"status":"ok"}`
- CORS works from your frontend domain(s)
- Form submission works end-to-end (Cloudinary upload + email delivery)
