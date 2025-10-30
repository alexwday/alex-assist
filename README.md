# Alex Assist

AI Assistant web application with a grid-based widget dashboard interface, featuring environment-aware LLM configuration for local development and RBC enterprise deployment.

## Features

- **Grid-Based Widget Dashboard**: Drag-and-drop, resizable widgets with snap-to-grid functionality
- **Chat Interface**: Real-time streaming chat with OpenAI-compatible LLMs
- **Environment Switching**: Seamlessly switch between local (OpenAI) and RBC (OAuth2 + custom endpoint) environments
- **Layout Persistence**: Widget layouts are automatically saved to localStorage
- **Modern Tech Stack**: FastAPI backend + React TypeScript frontend

## Architecture

### Backend (FastAPI + Python)
- **Environment-aware configuration**: Local vs RBC deployment modes
- **OAuth2 token management**: Automatic token refresh for RBC environment
- **Streaming chat responses**: Server-Sent Events (SSE) for real-time LLM responses
- **SSL certificate support**: RBC Security integration for enterprise environments

### Frontend (React + TypeScript + Vite)
- **react-grid-layout**: Drag-and-drop widget system with grid snapping
- **Tailwind CSS**: Modern utility-first styling
- **Real-time streaming**: SSE-based chat message streaming
- **Responsive design**: Dark mode support

## Project Structure

```
alex-assist/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI application
│   │   ├── config.py            # Environment configuration
│   │   ├── routers/
│   │   │   └── chat.py          # Chat API endpoints
│   │   └── utils/
│   │       ├── llm_client.py    # LLM client manager
│   │       └── oauth_manager.py # OAuth2 token manager
│   ├── requirements.txt
│   ├── .env.example             # Local environment template
│   ├── .env.rbc.example         # RBC environment template
│   ├── setup.sh                 # Setup script
│   └── run.sh                   # Run script
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── Dashboard/       # Grid layout components
    │   │   └── Widgets/         # Widget components
    │   ├── hooks/               # Custom React hooks
    │   ├── lib/                 # API client
    │   └── types/               # TypeScript definitions
    ├── package.json
    └── vite.config.ts
```

## Getting Started

### Prerequisites

- **Python 3.13+** (backend)
- **Node.js 18+** (frontend)
- **OpenAI API key** (for local development)

### Local Development Setup

#### 1. Backend Setup

```bash
cd backend

# Run setup script (creates venv, installs dependencies)
./setup.sh

# Edit .env file and add your OPENAI_API_KEY
nano .env

# Start the backend server
./run.sh
```

The backend will run on `http://localhost:8000`

#### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

The frontend will run on `http://localhost:5173`

#### 3. Open your browser

Navigate to `http://localhost:5173` and start chatting!

---

## Environment Configuration

### Local Environment (Default)

Uses OpenAI API directly:

```bash
ENV=local
OPENAI_API_KEY=sk-your-key-here
DEFAULT_MODEL=gpt-4o-mini
```

### RBC Environment

Uses custom LLM endpoint with OAuth2 authentication:

```bash
ENV=rbc
RBC_LLM_ENDPOINT=https://your-corporate-llm.com/v1
OAUTH_TOKEN_ENDPOINT=https://auth.yourcompany.com/oauth/token
OAUTH_CLIENT_ID=your-client-id
OAUTH_CLIENT_SECRET=your-client-secret
DEFAULT_MODEL=gpt-4o
```

See `.env.rbc.example` for full RBC configuration.

---

## Deployment to RBC Environment

### 1. Prepare the environment

```bash
# On your work computer
cd backend

# Copy RBC environment template
cp .env.rbc.example .env

# Edit with your RBC credentials
nano .env
```

### 2. Install RBC Security (if available)

```bash
pip install rbc_security
```

### 3. Run the application

```bash
./run.sh
```

The backend will:
- Initialize `rbc_security` for SSL certificates
- Setup OAuth2 token manager with automatic refresh
- Connect to your corporate LLM endpoint

---

## API Endpoints

### Chat

- `POST /api/chat/completions` - Send chat message (streaming or non-streaming)
- `GET /api/chat/models` - List available models
- `GET /api/chat/health` - Health check

### Documentation

- `GET /api/docs` - Swagger UI (Interactive API docs)
- `GET /api/redoc` - ReDoc (Alternative API docs)

---

## Widget System

Phase 1 includes the **Chat Widget**. Future phases will add:

- **Browser Preview Widget**: View web pages in an iframe
- **File Explorer Widget**: Browse and manage files
- **Thinking Widget**: Display agent reasoning steps
- **Code Editor Widget**: Edit files with syntax highlighting

### Adding New Widgets

1. Create widget component in `frontend/src/components/Widgets/`
2. Add widget type to `frontend/src/types/widget.ts`
3. Register widget in `Dashboard.tsx` render function
4. Widget layout will automatically persist to localStorage

---

## Development

### Backend

```bash
cd backend

# Activate virtual environment
source venv/bin/activate

# Run with auto-reload
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend

# Development server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## Testing

### Test Backend Locally

```bash
cd backend
source venv/bin/activate

# Check health
curl http://localhost:8000/health

# Test chat endpoint
curl -X POST http://localhost:8000/api/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Hello!"}],
    "stream": false
  }'
```

### Test Frontend

Open browser at `http://localhost:5173` and:
1. Type a message in the chat input
2. Verify streaming response works
3. Drag the chat widget around
4. Resize the chat widget
5. Refresh page and verify layout persists

---

## Troubleshooting

### Backend Issues

**OAuth token errors in RBC environment:**
- Verify `OAUTH_CLIENT_ID` and `OAUTH_CLIENT_SECRET` are correct
- Check `OAUTH_TOKEN_ENDPOINT` is accessible
- Review logs for detailed OAuth error messages

**SSL certificate errors:**
- Ensure `rbc_security` is installed: `pip install rbc_security`
- Verify you're in the RBC network

### Frontend Issues

**CORS errors:**
- Verify backend is running on `http://localhost:8000`
- Check `CORS_ORIGINS` in backend `.env` includes `http://localhost:5173`

**Widget layout not persisting:**
- Check browser localStorage is enabled
- Look for errors in browser console

---

## Contributing

1. Create a feature branch
2. Make your changes
3. Test locally
4. Commit and push
5. Create a pull request

---

## License

Internal use only.

---

## Roadmap

### Phase 1 (Current)
- ✅ Grid-based dashboard with snap-to-grid
- ✅ Chat widget with streaming responses
- ✅ Environment switching (local/RBC)
- ✅ Layout persistence

### Phase 2
- [ ] Browser preview widget
- [ ] Web search integration (DuckDuckGo)
- [ ] Web scraping (Crawl4AI)
- [ ] Link preview functionality

### Phase 3
- [ ] File operations tools
- [ ] File upload widget
- [ ] File explorer widget

### Phase 4
- [ ] Agent planning/thinking widget
- [ ] Tool execution visualization
- [ ] Chat history management

---

## Support

For issues or questions, contact the development team.
