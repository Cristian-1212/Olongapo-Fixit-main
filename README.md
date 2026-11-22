# Olongapo FixIt

Olongapo FixIt is a Node.js web-based public issue reporting and monitoring system for Olongapo City. Residents can submit and track reports, officials can review and manage cases, and **Ask FixIt AI** helps with barangay services and system questions using Google Gemini (server-side, text-only).

## Prerequisites

- Node.js **>= 22.5** (uses built-in `node:sqlite` and `process.loadEnvFile`)
- npm

## Install

```bash
npm install
```

## Configure environment (`.env`)

1. Copy `.env.example` to `.env` in the project root (same folder as `server.js`).
2. Set your Gemini API key (server-side only):

```env
GEMINI_API_KEY=your_real_gemini_api_key
GEMINI_MODEL=gemini-3-flash-preview
```

- Get a key from [Google AI Studio](https://aistudio.google.com/apikey).
- **Never** hardcode the key in source code, commit `.env`, expose it to frontend/browser JavaScript, include it in API responses, or print it in logs.
- `GEMINI_MODEL` defaults to `gemini-2.5-flash` in code if omitted; set a model available to your key/project (for example `gemini-3-flash-preview` or `gemini-flash-latest`) and restart if needed.
- Optional: `PORT` (default `3000`, auto-increments if busy when unset) and `DB_FILE` (SQLite path, default `fixit.db`).
- **Restart the server after any `.env` change.**

If Gemini is not configured or unavailable, Ask FixIt AI replies with a safe error message while the rest of Olongapo FixIt continues to work.

## Ask FixIt AI behavior

- **Text-only assistant**: no image/file/multimodal input or uploads in chat; media payloads are rejected.
- **No chat message storage**: conversation stays in the browser tab memory; only anonymous topic totals, thumbs-up/down feedback counts, and admin-managed verified service information are stored.
- **Role/data-aware**: responses and tools respect user roles and barangay scope (admin/brgy/resident/city) and never expose secrets or unnecessary personal data.
- **Verified services**: admins manage service requirements/fees/hours in **Ask FixIt AI insights** (`#/chat-insights`); the assistant only states verified service details from that data.

## Run the server

Development (auto-restart on file changes):

```bash
npm run dev
```

Production/start:

```bash
npm start
```

Then open `http://localhost:3000` (or the port shown in startup logs).

To restart: stop the running process (`Ctrl+C`) and run `npm run dev` or `npm start` again. Hard-refresh the browser (`Ctrl+F5`) after frontend/chat updates.

To reset demo data/database:

```bash
npm run reset-db
```

## Tests

```bash
npm test         # API/integration tests
npm run test:ui  # UI tests (requires jsdom dev dependency)
npm run test:all
```

Automated chat tests mock the Gemini API and do **not** require a real key. End-to-end verification of live Gemini responses requires a valid `GEMINI_API_KEY` with available quota/model access.

## Notes

- Image/report/residency verification in this codebase is based on upload validation and manual official review; there is no automated AI image-verification pipeline.
- Gemini is used only for the Ask FixIt AI text assistant via the Generative Language API (server-side). Other site features, auth, CSRF, sessions, uploads, and database behavior remain unchanged by chat configuration.