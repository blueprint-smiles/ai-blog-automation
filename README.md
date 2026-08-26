# AI Blog Automation

A beginner-friendly full-stack MVP for:

Google Sheet → AI (OpenAI/Gemini) → Telegram

## Stack
- Frontend: React + Vite
- Backend: Node.js + Express
- Deployment: Frontend can go to Netlify, backend to Render

## Current MVP
1. Paste a Google Sheet URL.
2. Choose OpenAI or Gemini.
3. Enter Telegram Bot Token + Chat ID.
4. Click Run Automation.
5. The backend finds the first `pending` topic from column A/B.
6. AI writes the blog.
7. The blog is sent to Telegram.

### Google Sheet format

| A | B | C |
|---|---|---|
| Blog Title | status | blog |
| The Art of Doing Nothing | pending | |
| Things I Wish I Knew at 20 | pending | |

For this first version, the sheet must be accessible to the backend for reading. We will add secure Google OAuth/write-back in the next step.

## Local setup

### Backend
```bash
cd backend
npm install
copy .env.example .env
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Set `VITE_API_URL` to your backend URL when deploying.

## Environment variables

Backend:
- `PORT`
- `OPENAI_API_KEY`
- `GEMINI_API_KEY`
- `CORS_ORIGIN`

Frontend:
- `VITE_API_URL`

Telegram bot token and chat ID are intentionally entered in the dashboard for this learning MVP. Do not commit them to GitHub.
