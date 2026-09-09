# The Counteroffer

A voice-based salary negotiation simulator. An AI hiring manager calls you with a
lowball offer and you negotiate with her out loud, in real time. She responds to
technique: market data, competing offers, and deliberate silence move her number;
vague asks and premature acceptance do not. At any point you can ask for feedback
and she will step out of character and coach you.

## Features

- Real-time voice conversation with a configurable AI hiring manager
- Adjustable scenario: role, opening offer, hidden salary ceiling, and manager temperament
- Live transcript with in-progress speech rendering
- On-demand coaching that breaks character and reviews your performance
- Persistent call history with full transcripts
- Persona defined in plain language and editable without touching the frontend

## Architecture
```
┌──────────────────────────────────────────────────────┐
│               React Frontend                         │
│               localhost:5173                         │
│                                                      │
│   [Start Call]   [Live Transcript]   [End Call]      │
└──────────────────────────────────────────────────────┘
              │                         │
              │ REST API                │ VAPI Web SDK
              ▼                         ▼
┌──────────────────────────┐   ┌─────────────────────────┐
│     FastAPI Backend      │   │          VAPI           │
│     localhost:8000       │   │     Voice Platform      │
│                          │   │                         │
│  /api/config             │   │  Deepgram (STT)        │
│  /api/moods              │   │       ↓                 │
│  /api/assistant          │   │  GPT-4o                 │
│  /api/sessions           │   │       ↓                 │
└──────────────────────────┘   │  ElevenLabs (TTS)       │
              │                └─────────────────────────┘
              ▼
┌──────────────────────────┐
│      SQLite Database     │
│      counteroffer.db     │
└──────────────────────────┘
                                     
```

The voice call does not pass through the application server. Audio streams
directly between the browser and VAPI over WebRTC, and VAPI coordinates the
speech-to-text, language model, and text-to-speech providers. The backend is
responsible only for configuration, persona generation, and persistence.

| Component | Responsibility |
|---|---|
| **React frontend** | Scenario form, call controls, live transcript, history view. `useVapi.js` wraps the SDK and exposes call state as React state. |
| **FastAPI backend** | Serves the VAPI public key, builds the assistant configuration from a scenario, and stores completed calls. |
| **SQLite** | Single-file database for call history. Created automatically on first run. |
| **VAPI** | Manages the media session and the STT → LLM → TTS pipeline. The assistant is defined inline per call, so no dashboard configuration is required. |

### Call lifecycle

1. On load, the frontend fetches the public key, the list of manager moods, and past sessions.
2. When the user starts a call, the frontend posts the scenario to `/api/assistant` and receives a complete VAPI assistant definition, including the system prompt.
3. The frontend passes that definition to `vapi.start()`. VAPI opens a WebRTC session and begins the conversation.
4. Transcript events stream back to the browser and are rendered as they arrive.
5. When the call ends, the frontend posts the final transcript and duration to `/api/sessions`.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 5, `@vapi-ai/web` |
| Backend | Python 3.10+, FastAPI, Uvicorn, Pydantic |
| Storage | SQLite via the standard library |
| Voice | VAPI with Deepgram, OpenAI GPT-4o, and ElevenLabs |

## Getting started

### Prerequisites

- Python 3.10 or later
- Node.js 18 or later
- A [VAPI](https://vapi.ai) account and its **public** API key (Dashboard → API Keys)

### Backend

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
cp .env.example .env
```

Edit `.env` and set `VAPI_PUBLIC_KEY`, then start the server:

```bash
.venv/bin/uvicorn main:app --reload --port 8000
```

Interactive API documentation is available at http://localhost:8000/docs.

### Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173, grant microphone access, and press the coin to start a call.

## Configuration

| Variable | Location | Description |
|---|---|---|
| `VAPI_PUBLIC_KEY` | `backend/.env` | VAPI public key. Safe to expose to browsers; restrict it by domain in the VAPI dashboard for production use. |

The Vite dev server proxies `/api/*` to `http://localhost:8000` (see `frontend/vite.config.js`). CORS is configured in `backend/main.py` for the dev origin.

## API reference

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | Liveness check |
| `GET` | `/api/config` | Returns the VAPI public key |
| `GET` | `/api/moods` | Lists available hiring manager temperaments |
| `POST` | `/api/assistant` | Accepts a scenario, returns a VAPI assistant definition |
| `GET` | `/api/sessions` | Lists past calls (summaries) |
| `GET` | `/api/sessions/{id}` | Returns one call with its full transcript |
| `POST` | `/api/sessions` | Saves a completed call |
| `DELETE` | `/api/sessions/{id}` | Deletes a call |

Scenario payload for `POST /api/assistant` and `POST /api/sessions`:

```json
{
  "role": "Senior Software Engineer",
  "offer": 120000,
  "ceiling": 150000,
  "difficulty": "firm"
}
```

## Project structure

```
backend/
  main.py          API routes, CORS, startup
  persona.py       Hiring manager persona and assistant builder
  db.py            SQLite access layer
  requirements.txt
  .env.example
frontend/
  src/
    App.jsx        Top-level state and layout
    useVapi.js     React hook around the VAPI SDK
    api.js         Backend client
    components/    ScenarioForm, Coin, Transcript, History
  vite.config.js
```

## Customizing the persona

The hiring manager's behavior is defined entirely by the system prompt in
`build_assistant()` in `backend/persona.py`. Uvicorn reloads on save, so changes
take effect on the next call. Common adjustments:

- **Difficulty**: change the concession step size (`$3,000 to $8,000`) or the rules for what earns a raise.
- **Temperaments**: add an entry to the `MOODS` dictionary. The frontend dropdown is populated from `/api/moods`, so no UI change is needed.
- **Voice and model**: edit the `voice` and `model` blocks in the returned configuration. Any provider supported by VAPI can be used.
- **Domain**: the role is free text, so the same persona works for non-technical negotiations.

## Troubleshooting

| Issue | Cause and fix |
|---|---|
| "Couldn't reach the backend" on the page | The API is not running on port 8000. Start Uvicorn. |
| `VAPI_PUBLIC_KEY is not set` | `backend/.env` is missing or still contains the placeholder. |
| Call connects but the manager never speaks | Check the browser console. Usually exhausted trial credit or a provider not enabled on the VAPI account. Switching the voice provider in `persona.py` (for example to `playht`) often resolves it. |
| Microphone blocked | Allow microphone access for `localhost` via the lock icon in the address bar. |

## Cost

VAPI bills per minute of call time plus pass-through model and voice usage. A
ten-minute session typically costs well under one US dollar. Calls are capped at
fifteen minutes (`maxDurationSeconds` in `persona.py`) to prevent runaway usage.
