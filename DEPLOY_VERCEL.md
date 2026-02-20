# SciBrain Vercel Deployment

## 1) Push project to GitHub
- Push this `SciBrain` folder to a GitHub repository.

## 2) Import into Vercel
- In Vercel, click **Add New... > Project** and import the repo.
- Framework preset can stay **Other**.
- Root directory: project root (`SciBrain`).

## 3) Add environment variables

Required (hosted AI):
- `AI_PROVIDER=openai`
- `OPENAI_API_KEY=...`
- `OPENAI_API_URL=https://api.openai.com/v1/chat/completions`
- `OPENAI_MODEL=gpt-4o-mini`

Optional local AI mode:
- `AI_PROVIDER=ollama`
- `OLLAMA_URL=http://localhost:11434/api/generate`
- `OLLAMA_MODEL=llama3.1:8b`

Recommended for persistent storage:
- Add **Vercel KV** from the Storage tab.
- Vercel will auto-inject:
  - `KV_REST_API_URL`
  - `KV_REST_API_TOKEN`
  - `KV_REST_API_READ_ONLY_TOKEN`

If KV variables are missing, SciBrain still runs but storage is in-memory (non-persistent).

## 4) Deploy
- Click **Deploy**.
- App homepage is served from:
  - `/src/pages/HomePage/index.html`

## 5) Health check
- Open:
  - `/api/health`
- You should get JSON with status `ok`.

## Notes
- This deployment uses serverless API routes under `/api/*`.
- Frontend now calls same-origin API (`window.location.origin`), so it works on your Vercel domain.

