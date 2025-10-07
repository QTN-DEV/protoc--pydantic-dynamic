# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a full-stack application for dynamically generating and validating Pydantic models through an interactive graph-based visual editor. The system allows users to:
- Define Pydantic class schemas visually using a node-based graph editor
- Generate structured data from natural language prompts using OpenAI with strict schema validation
- Persist graph states with versioning support
- Navigate between graph views and detailed node editors

## Architecture

**Monorepo Structure:**
- `be/` - Backend FastAPI application
- `fe/` - Frontend React/Vite application with XYFlow graph visualization

**Backend Architecture:**
The backend uses FastAPI with a clean separation of concerns:
- `be/main.py` - Application entry point with CORS middleware and lifespan management (MongoDB connection)
- `be/src/controllers/` - API route handlers:
  - `pydantic_generator.py` - Core dynamic Pydantic model generation and OpenAI integration
  - `graph.py` - Graph state persistence, versioning, publishing, and restoration endpoints
  - `health.py` & `root.py` - Basic service endpoints
- `be/src/models/` - Data models using Pydantic and Beanie ODM:
  - `pydantic_form.py` - Schema definitions for dynamic attribute types (STRING, INT, NESTED, LIST_STRING, LIST_NESTED)
  - `graph.py` - Graph document model for working state
  - `published_graph.py` - Versioned snapshots of published graphs
- `be/src/utils/` - Shared utilities:
  - `mongodb.py` - Database connection management with Beanie initialization
  - `openai.py` - OpenAI Instructor integration with streaming support

**Key Backend Concepts:**
- Dynamic Pydantic model creation happens in `pydantic_generator.py:create_pydantic_model_from_attributes()` which recursively builds nested models based on attribute definitions
- Graph persistence supports two states: working drafts (Graph collection) and published versions (PublishedGraph collection with version numbers)
- OpenAI integration uses the Instructor library with TOOLS_STRICT mode for structured output generation

**Frontend Architecture:**
- React with TypeScript, React Router for navigation, and XYFlow for graph visualization
- Main routes (`fe/src/App.tsx`):
  - `/` - Landing page
  - `/:graph_id` - Graph editor view
  - `/:graph_id/:node_id` - Detailed node editor
- `fe/src/components/PCDNetworkGraphEditor.tsx` - Primary graph visualization component using XYFlow
- `fe/src/services/api.ts` (inferred) - API service layer for backend communication

## Common Development Commands

### Backend (Python/FastAPI)

**Setup:**
```bash
cd be
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

**Environment:**
Create `be/.env` based on `be/.env.example`:
```
OPENAI_API_KEY=your_openai_api_key_here
```

**Run development server:**
```bash
cd be
python main.py
```
Server runs on `http://0.0.0.0:8000` with 4 workers.

**Linting:**
```bash
cd be
ruff check .
ruff check . --fix  # Auto-fix issues
```

### Frontend (React/TypeScript/Vite)

**Setup:**
```bash
cd fe
npm install
```

**Run development server:**
```bash
cd fe
npm run dev
```

**Build:**
```bash
cd fe
npm run build
```

**Lint:**
```bash
cd fe
npm run lint
```

## Code Style

**Backend:**
- Uses Ruff for linting with comprehensive rule set (pycodestyle, pyflakes, pylint, bandit, etc.)
- Line length: 88 characters
- Target Python: 3.10+
- Design-related pylint codes (PLR) are ignored
- First-party imports: `src`
- Known third-party: `fastapi`, `pydantic`, `beanie`, `motor`, `instructor`, `dotenv`, `uvicorn`

**Frontend:**
- ESLint configured with TypeScript, React, and Prettier
- Uses HeroUI component library for UI elements
- Tailwind CSS for styling

## Important Implementation Details

**Dynamic Pydantic Model Creation:**
The core logic in `be/src/controllers/pydantic_generator.py` handles five attribute types:
- `STRING` and `INT` with nullable and default value support
- `NESTED` - recursively creates nested Pydantic models
- `LIST_STRING` - list of strings
- `LIST_NESTED` - list of nested models (creates models with "Item" suffix)

When nullable is true, the field type becomes a union with None. For lists, empty list `[]` is the default; for nullable nested types, `None` is the default.

**MongoDB Schema:**
- Database: `pcdnge`
- Collections: `graphs` (working state), published_graphs (versioned snapshots)
- Connection hardcoded in `mongodb.py` - consider externalizing to environment variables
- Uses Beanie ODM for async document operations

**Graph State Management:**
- Graphs are identified by `graph_id` (UUID v7)
- Working state in `Graph` collection is mutable
- Publishing creates immutable snapshots in `PublishedGraph` with incrementing version numbers
- Restore endpoint copies published version back to working state

**OpenAI Integration:**
- Uses GPT-5 model (configured in `openai.py`)
- Streaming partial responses with Instructor library
- Response model is dynamically constructed from user-defined schema
