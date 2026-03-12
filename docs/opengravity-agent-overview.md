# OpenGravity Agent Overview

An executive briefing and lightweight PRD for prospective leads evaluating a bespoke AI chief-of-staff. It captures the current capabilities of OpenGravity, highlights differentiators, and outlines how the stack can be repurposed for new deployments.

---

## 1. Executive Summary
- **Channel-first experience:** Telegram bot (`src/bot/telegram.ts`) delivers a fast, secure UI with text + voice, grounded on a strict allowlist.
- **Cognitive core:** Groq Llama 3.3 70B is the primary model (`src/agent/llm.ts`) with OpenRouter failover and structured tool-calling.
- **Persistent memory:** Firestore (`src/memory/db.ts`) tracks users, conversations, and meeting archives injected via Read AI webhooks.
- **Productivity integrations:** Google Workspace, Slack, Tavily web search, ElevenLabs TTS, and a dynamic Skill marketplace give the agent breadth without bloating the core.
- **Deploy-anywhere footprint:** Dockerized Node/TypeScript stack with `.env` driven secrets, ready for VPS or cloud runtimes.

---

## 2. Core Value Proposition
| Need | How OpenGravity addresses it |
| --- | --- |
| Realtime personal assistant | Telegram long-polling bot answers instantly, handles audio, and mirrors conversation history. |
| Meeting intelligence | Read AI webhook listener (`src/services/webhook.service.ts`) ingests transcripts, categorizes them, and exposes them to the agent via `query_meetings`. |
| Unified work console | Built-in tools for Gmail, Calendar, Slack, skill discovery, and web search keep users inside one chat thread. |
| Safe extensibility | The Skill system (see `src/agent/tools/skill_lookup.ts` + root `SKILL.md`) lets the agent install new workflows on demand. |

---

## 3. Key Capabilities
### 3.1 Conversational Assistant
- Telegram bot with middleware-based allowlist and per-user conversation state.
- Voice flow: download OGG, transcribe via Groq Whisper (`transcribeAudio`), answer, synthesize reply through ElevenLabs, and send MP3 back.
- Long responses chunked to respect Telegram limits; errors relayed in Spanish for consistency with the user base.

### 3.2 Knowledge & Memory Layer
- Firebase Admin bootstraps from `GOOGLE_CREDENTIALS_JSON` or mounted service accounts.
- `conversations` collection stores full tool traces, enabling the agent to cite past answers or debug automations.
- Meeting objects persist in `meetings` with normalized transcript blocks, categories, tasks, and raw payloads for audit trails; `pending_tasks` tracks follow-ups.

### 3.3 Read AI Meeting Ingestion
1. Express webhook server listens on `/webhooks/read-ai`.
2. Payload normalization (`src/services/meeting-processor.ts`) handles `session_id` fallbacks, transcripts, topics, and action items.
3. Groq categorizes each meeting (tools disabled to keep inference lean) and tasks are mirrored to Firestore + Telegram notifications.
4. `query_meetings` tool exposes searchable summaries for later Q&A.

### 3.4 Productivity Integrations
- **Google Workspace:** OAuth desktop flow using `@google-cloud/local-auth`; supports Gmail list/read and Calendar agenda queries.
- **Slack:** `SlackService` leverages `conversations.list`/`history` and resolves user IDs; tools allow leads to ask “¿Qué se habló en #ventas?” from Telegram.
- **Web Search:** Tavily-backed `search_web` keeps responses grounded with live sources.
- **Skill System:** Bridges to prompts.chat marketplace—agent can search, fetch, and install new skills without redeploying the core.

### 3.5 Voice & Presence
- ElevenLabs multilingual voice ensures parity between written and spoken replies.
- Temp audio storage (`temp_audio/`) is mounted inside Docker for deterministic cleanup.

---

## 4. Architecture Snapshot
```
Telegram User ↔ grammy Bot ↔ Agent Loop (Groq/OpenRouter)
                                ↘ Tools Layer ──┬─ Google Workspace
                                                 ├─ Slack
                                                 ├─ Tavily Web Search
                                                 └─ Skill Marketplace
Read AI Webhooks → Express Listener → Meeting Processor → Firestore
                                                      ↘ Telegram Alerts / Pending Tasks
```

**Tech Stack**
- Node.js + TypeScript (`tsx` dev runner, `tsc` builds).
- Express for webhook hosting; grammy for Telegram.
- Firebase Admin SDK for persistence.
- Groq SDK + OpenRouter HTTP client for LLM access.
- Docker multi-stage build + docker-compose for deployment (volumes for DB, creds, and temp audio).

---

## 5. Experience Flow (Example)
1. User schedules a meeting and Read AI records it.
2. Upon completion, Read AI sends the report to `/webhooks/read-ai`.
3. Meeting Processor categorizes, stores, and announces the meeting; `pending_tasks` is populated.
4. Later, the user asks via Telegram: “Recuérdame las acciones de la última reunión de Ingeniería.”
5. Agent loop invokes `query_meetings`, retrieves Firestore data, and responds with category, summary, and tasks.
6. User notices a related conversation in Slack and asks: “¿Qué dijeron hoy en #ventas?” → `slack_read_messages`.

---

## 6. Deployment & Operations
- `.env` (or Hostinger’s panel) supplies tokens for Telegram, Groq, OpenRouter, ElevenLabs, Tavily, Slack, and Firebase.
- Docker Compose maps persistent files: `memory.db`, `temp_audio`, Google credentials, and Read AI secrets.
- Logs from Telegram, webhook server, and meeting processor stream to the container output for quick SSH debugging.
- Hostinger VPS can rebuild via `docker compose up -d --build`; the same artifacts run locally for QA.

---

## 7. Extensibility & Roadmap Ideas
1. **CRM/Task sync:** push `pending_tasks` into ClickUp, Notion, or HubSpot via new tools or skills.
2. **Advanced analytics:** generate meeting health dashboards by aggregating Firestore data (cloud function or BigQuery export).
3. **Multi-channel expansion:** add WhatsApp or web chat adapters by reusing the agent loop.
4. **Autonomous playbooks:** orchestrate follow-up emails or Slack reminders automatically after each meeting.
5. **Team insights:** leverage Slack + meeting history to build pulse reports (“sentiment”, “top blockers”) for leadership.

---

## 8. Why This Matters for Prospective Leads
- Demonstrates end-to-end craftsmanship: integrations, data orchestration, LLM safety nets, and DevOps discipline in one repo.
- Shows how quickly bespoke agents can absorb new workflows (skills) without a rewrite.
- Provides a reusable PRD: hand this document to a dev team and they can replicate or extend the agent for any executive or team.

> Ready to adapt OpenGravity to your org? Swap credentials, configure the desired integrations, and customize the skills—most of the scaffolding is already built.
