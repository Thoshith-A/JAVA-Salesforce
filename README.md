# JAVA-Salesforce - Quiz Leaderboard Engine

Live Demo: [https://java-salesforce.vercel.app/](https://java-salesforce.vercel.app/)

---

## Why I Built This

I built this project as a practical full-stack system design + implementation exercise:

- consume external quiz events poll-by-poll
- deduplicate noisy event streams correctly
- compute a deterministic leaderboard in real time
- expose backend progress to users through SSE + WebSocket
- present everything in a clean, high-impact UI

This is not a template clone. The data flow, backend orchestration, dedup logic, live event feed behavior, and deployment structure were built and iterated specifically for this use case.

---

## What The App Does

Given a registration number:

1. Triggers a 10-poll run (5-second interval per poll)
2. Fetches quiz events from an external API
3. Deduplicates events by `roundId:participant`
4. Aggregates participant scores
5. Produces ranked leaderboard + grand total
6. Submits final result exactly once
7. Streams live progress to the frontend

The UI shows:

- live poll status cards
- dedup metrics
- animated leaderboard
- live score distribution
- live trace feed (accepted/duplicate events)
- final submission status

---

## Architecture Overview

### Backend (Spring Boot, Java 17)

- Poll orchestration service controls run lifecycle
- Replay cache persisted on disk for fallback/replay support
- Strong duplicate protection with in-memory set + persisted cache
- SSE endpoint for progress updates
- STOMP/SockJS WebSocket for live spectator updates
- Result submission endpoint with idempotent behavior
- Global exception handling for consistent API error responses

### Frontend (React + Vite + Tailwind)

- Dashboard for run execution and live monitoring
- Hooks for SSE and WebSocket subscriptions
- Real-time list/chart/leaderboard updates
- Scroll-safe audit feed behavior for manual user control
- Styled for a polished "arena" presentation

---

## Core API Endpoints

- `POST /api/quiz/run`
- `POST /api/quiz/replay`
- `GET /api/quiz/progress/{jobId}` (SSE)
- `GET /api/quiz/result?jobId=...`
- `POST /api/quiz/submit`
- `GET /api/quiz/audit/{jobId}`
- WebSocket endpoint: `/ws`

---

## Local Run

### Prerequisites

- Java 17+
- Maven
- Node.js 20+

### Start Backend + Frontend (dev)

```bash
# backend
mvn spring-boot:run

# frontend (new terminal)
cd frontend
npm install
npm run dev
```

### Production Build

```bash
mvn clean package -DskipTests
java -jar target/quiz-leaderboard-1.0.0.jar
```

---

## Deployment

### Frontend

- Vercel
- Live URL: [https://java-salesforce.vercel.app/](https://java-salesforce.vercel.app/)

### Backend

- Render (Docker Web Service)
- Frontend uses `VITE_API_BASE_URL` to target backend domain

---

## Engineering Decisions I Focused On

- **Determinism over guesswork:** ranking and totals are stable and reproducible
- **Fault tolerance:** timeout/retry/fallback paths for external API instability
- **Operational clarity:** progress events and trace feed make each run auditable
- **User control:** live feed avoids forced scrolling behavior
- **Deployability:** separate frontend/backend deploy model with clean env-based wiring

---

## Originality Note

This project is intentionally written as an implementation-focused engineering submission, not a copied boilerplate.  
Problem framing, architecture decisions, and feature integration were done specifically around the quiz leaderboard assignment requirements and judged demo flow.

---

## Next Improvements

- add authentication for admin-only run trigger
- persist job history to database
- add unit/integration test coverage dashboard
- split large frontend bundle using route/component chunking

---

## Author

Thoshith A