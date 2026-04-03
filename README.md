# MAS Visual Builder 🧠
An n8n-like graphical tool for Multi-Agent System research.

Drag-and-drop agents onto a canvas, pick LLM models per agent, define topologies,
run experiments, and compare results — all from a clean visual interface.

## Stack
- **Frontend**: React + React Flow + Tailwind CSS + Zustand
- **Backend**: FastAPI + SQLite (SQLAlchemy)
- **Orchestration**: LangGraph (mock mode works without any API keys)

## Quick Start
```bash
# 1. Backend
cd backend
pip install -r requirements.txt
cp ../.env.example .env       # set MOCK_MODE=true to skip API keys
uvicorn main:app --reload --port 8000

# 2. Frontend (new terminal)
cd frontend
npm install
npm run dev

# 3. Open http://localhost:5173
```

## Docker (optional)
```bash
cp .env.example .env
docker-compose up --build
```

## Features
- 🎨 Drag-and-drop visual canvas (React Flow)
- 🤖 6 predefined agent roles: Coordinator, Planner, Researcher, Analyst, Coder, Critic
- 🧩 LLM model selector per node: GPT-4o, Claude 3.5 Sonnet, Gemini 1.5 Pro, Llama 3.3 (Groq), Mock
- 🔀 Topology templates: Hierarchical, Sequential, Star, Peer-to-Peer, Custom
- 🛠 Tool binding per agent: python_repl, web_search, file_reader, sql_query, chart_gen
- ▶️ Run panel with per-agent logs, tokens, and latency
- 📊 Experiment history drawer with metrics
- 💾 Save/export workflow configs as JSON
