# AI Code Learner

> A local-first, voice-enabled learning environment for unfamiliar codebases.
> Currently a work-in-progress — the web shell and terminal bridge are live;
> the LLM-powered backend is the next major milestone.

---

## What is this?

AI Code Learner is a personal project I'm building to make diving into an
unfamiliar codebase feel less like archaeology. The idea: point it at any
repo, ask questions in natural language (or by voice), and get answers
grounded in the actual code — with line numbers, call graphs, and folder
context, not hallucinated structure.

The full vision covers streaming chat, multi-level summarization, project
graph visualization, and push-to-talk voice. This repo currently contains
the **frontend shell** and the **browser terminal bridge**. The Python
backend, LLM integration, and voice pipeline are the next big pieces.

---

## What's built so far

| Component | Status | Description |
|---|---|---|
| `apps/web` | ✅ working | React 18 + Vite + TypeScript + Tailwind. Multi-page shell (Overview, Analyses, Explorer, Graph, History, Settings) with Monaco-ready layout, xterm.js terminal panel, React Flow graph canvas, and chat/voice UI scaffolding. |
| `apps/terminal-server` | ✅ working | A Node WebSocket server (`ws://127.0.0.1:8766`) that spawns a real local shell and pipes its stdio to the browser. Localhost-only, with a strict origin allowlist. |
| Python backend (FastAPI) | ⏳ planned | API + scanner + graph builder + summarizer + LLM client. Designed in `plan.txt` (kept local). |
| LLM integration (Claude / Ollama) | ⏳ planned | Streaming chat with grounded context packing. |
| Voice (Web Speech + Whisper + TTS) | ⏳ planned | Push-to-talk input, sentence-streamed output, barge-in support. |

---

## Tech stack

**Frontend** — React 18 · Vite · TypeScript · Tailwind CSS · React Router ·
React Flow · xterm.js · lucide-react

**Terminal bridge** — Node.js · `ws` (WebSocket) · child_process

**Planned backend** — Python 3.11+ · FastAPI · tree-sitter · SQLite ·
sentence-transformers · Claude (Sonnet/Haiku) / Ollama · faster-whisper

---

## Getting started

**Prerequisites:** Node ≥ 20.17, pnpm ≥ 9.

```bash
# Install everything
pnpm install

# Run the web app (http://localhost:5173)
pnpm dev

# Run the terminal server in a second terminal (ws://127.0.0.1:8766)
cd apps/terminal-server
pnpm start
```

The web app's terminal panel connects to the terminal-server automatically
when both are running.

---

## Project structure

```
aicodelearner/
├── apps/
│   ├── web/                # React + Vite frontend
│   │   ├── src/
│   │   │   ├── components/ # chat, layout, overview, UI primitives
│   │   │   ├── pages/      # Overview, Analyses, Explorer, Graph, History, Settings
│   │   │   ├── hooks/      # useChat, useVoice, useCodeExplain, useResize
│   │   │   └── types/
│   │   └── public/
│   └── terminal-server/    # WebSocket shell bridge
│       └── index.mjs
├── package.json
├── pnpm-workspace.yaml
└── .gitignore
```

---

## Roadmap

Roughly in execution order. The full design (architecture, prompt templates,
security model, performance targets) lives in my private `plan.txt` — not
checked into this repo.

1. **Backend skeleton** — FastAPI on `127.0.0.1:8765`, `/health` endpoint,
   CLI entry point.
2. **File scanner + tree UI** — proves project-root flow.
3. **Graph builder** — file-level (imports) + symbol-level (calls/inheritance)
   via tree-sitter + ripgrep.
4. **Multi-level summarizer** — symbol → file → folder → project, bottom-up
   with SQLite cache.
5. **Query router + streaming chat** — intent classification (highlight Q&A,
   free question, file/folder/project analysis) with the context packer.
6. **Analysis flows** — write-to-file for large outputs (`.md` reports).
7. **Voice input** — push-to-talk via Web Speech API, then server Whisper
   for high quality.
8. **Voice output** — sentence-streamed browser TTS, ElevenLabs upgrade path.
9. **Polish** — selection-aware context menu, bookmarks, tour mode, theme.

---

## Status

This is an active personal project, not a polished release. Expect rough
edges, missing features, and frequent refactors. The frontend and terminal
server are usable today; the AI features are next.

## License

Personal project — no license granted for reuse yet. Ask if you want to
build on it.
