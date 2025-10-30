# Quick Start Guide

## Easy Way - Single Command

From the project root:
```bash
./start.sh
```

This will start both backend and frontend. Open your browser to:
- **http://localhost:5173** (Frontend UI)

Press `Ctrl+C` to stop both services.

---

## Manual Way - Two Terminals

### Terminal 1: Backend
```bash
cd alex-assist/backend
bash run.sh
```

### Terminal 2: Frontend
```bash
cd alex-assist/frontend
npm install  # Only needed first time
npm run dev
```

Then open: **http://localhost:5173**

---

## What You'll See

The dashboard has:
- **Chat Widget**: AI assistant powered by your configured LLM
- **Browser Widget**: Web browser with "Send to AI" button to scrape pages and send to chat

Click the "Widgets" button in the sidebar to add more widgets to your dashboard.

---

## Troubleshooting

**Backend won't start?**
- Check your `.env` file in `backend/` directory
- For local development: Ensure `ENV=local` and `OPENAI_API_KEY` is set
- For RBC: Ensure `ENV=rbc` and all OAuth credentials are configured

**Frontend won't start?**
- Make sure you ran `npm install` in the frontend directory
- Check that port 5173 isn't already in use

**Browser widget not loading pages?**
- The backend proxy must be running (port 8000)
- Some websites block embedding in iframes - this is normal

---

## Configuration

See `backend/.env.example` for environment setup examples:
- `backend/.env.local.example` - Local development with OpenAI
- `backend/.env.rbc.example` - RBC corporate environment with OAuth
