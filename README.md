# Write Up

**Learning-first writing coach** — paste a draft, pause for coaching, and get mechanics plus higher-level feedback without losing your voice.

| | |
|---|---|
| **Live app** | https://csen-174-s26-team-project-write-up.vercel.app/ |
| **Demo video** | https://youtu.be/N43Mmq7o4cc |
| **Technical report** | [`TECHNICAL_REPORT.md`](TECHNICAL_REPORT.md) |
| **Architecture** | [`docs/architecture.md`](docs/architecture.md) |

![Write Up — add screenshot or GIF here](webapp/logo.png)

## Run locally

**1. Install dependencies**
```bash
npm run install:all
```

**2. Configure environment**

Copy the backend template and fill in your secrets:
```bash
cp backend/.env.example backend/.env
```

Create `webapp/.env` with your Firebase web app config (find these in the Firebase console under Project Settings → Your apps):
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=
```

**3. Start**
```bash
npm run dev:all      # API :8000 + webapp :5173
npm run dev:api      # API only
npm run dev:web      # webapp only
npm run dev:ext      # Chrome extension — follow the printed instructions
```

**First run:** startup takes ~60s while the embedding model downloads from HuggingFace. It's cached after that.

**Verify the API is up:** `http://localhost:8000/health` → `{"ok":true,"spellchecker":true}`

---

## Repository layout

```
backend/      FastAPI (Python) — auth, RAG, LLM coaching, mechanics engine
webapp/       React + Vite — web app UI
extension/    Chrome MV3 extension
shared/       Contracts and design tokens
game-prototypes/  Per-person Grammeia game prototypes
docs/         Architecture and product docs
```

Ownership:
- Miranda: user stories, mockups, integration flow (`docs/`, `shared/`)
- Cole: web app UI (`webapp/`)
- Ishika: extension UI (`extension/`)
- Catherine: database and Firestore integration (`backend/firebase/`, `backend/routes/`)
- Chris: RAG, LLM coaching, mechanics engine (`backend/`)
