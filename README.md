# HireFlow — Applicant Tracking System

<p align="center">
  <img src="docs/screenshot-kanban.png" alt="HireFlow Kanban Board" width="800"/>
</p>

**HireFlow** is an open-source, multi-tenant Applicant Tracking System (ATS) built for modern engineering teams. It features a drag-and-drop Kanban pipeline, a dynamic job form builder, CV uploads, recruiter notes, email notifications, and reporting — all in one self-hostable package.

---

## ✨ Features

| Area | Capabilities |
|---|---|
| **Multi-tenancy** | Isolated company workspaces; JWT embeds `company_id` |
| **Job postings** | Rich text description, custom application form builder (10 field types) |
| **Pipeline** | Drag-and-drop Kanban: Applied → Screened → Interview → Offer → Hired/Rejected |
| **Candidate profiles** | Inline CV preview (PDF.js), recruiter notes, full stage history |
| **File uploads** | MinIO locally, S3 in production; presigned URL downloads |
| **Email notifications** | Async background worker; SMTP (MailHog in dev) or Resend |
| **Reporting** | Time-to-hire bar chart, pipeline conversion funnel |
| **Self-hostable** | Single `docker compose up` brings everything up |

---

## 🏗 Tech Stack

### Backend
- **Go 1.23** + **Gin** — HTTP API
- **PostgreSQL 16** — primary database with JSONB for dynamic form schemas
- **Redis 7** — JWT refresh token store + async task queue
- **asynq** — Redis-backed background worker (email tasks)
- **MinIO** — S3-compatible local file storage
- **sqlc** — type-safe SQL → Go codegen
- **golang-migrate** — schema migrations

### Frontend
- **React 18** + **TypeScript** + **Vite**
- **Tailwind CSS** — styling
- **TanStack Query** — server state with optimistic Kanban updates
- **Zustand** — client state (auth, UI)
- **@dnd-kit** — drag-and-drop
- **Recharts** — reporting charts
- **react-pdf** — inline CV rendering

---

## 🚀 Quick Start

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) & [Docker Compose](https://docs.docker.com/compose/)
- [Go 1.23+](https://golang.org/dl/) (for local dev without Docker)
- [Node.js 20+](https://nodejs.org/) (for local frontend dev)

### 1. Clone & configure

```bash
git clone https://github.com/your-org/hireflow.git
cd hireflow
cp .env.example .env
# Edit .env if needed (defaults work out of the box for local dev)
```

### 2. Start all services

```bash
make dev
# or: docker compose up --build
```

This starts:
| Service | URL |
|---|---|
| **API** | http://localhost:8080 |
| **Frontend** | http://localhost:5173 |
| **MinIO Console** | http://localhost:9001 (minioadmin / minioadmin) |
| **MailHog** | http://localhost:8025 |
| **PostgreSQL** | localhost:5432 |
| **Redis** | localhost:6379 |

### 3. Run migrations

```bash
make migrate
```

### 4. (Optional) Load demo data

```bash
make seed
```

Navigate to **http://localhost:5173** and register your company.

---

## 🗃 Project Structure

```
hireflow/
├── backend/                  # Go API + worker
│   ├── cmd/api/              # API server entrypoint
│   ├── cmd/worker/           # Async email worker entrypoint
│   ├── internal/
│   │   ├── config/           # Env/config loading (viper)
│   │   ├── db/               # PostgreSQL pool
│   │   ├── redis/            # Redis client
│   │   ├── storage/          # MinIO/S3 abstraction
│   │   ├── email/            # SMTP + Resend adapters
│   │   ├── middleware/       # Auth, tenant scope, CORS, rate-limit
│   │   ├── models/           # DB model structs (sqlc-generated)
│   │   ├── handlers/         # Gin route handlers (by domain)
│   │   ├── services/         # Business logic
│   │   └── worker/           # asynq task definitions
│   └── migrations/           # SQL migration files
├── frontend/                 # React 18 + TS + Vite
│   └── src/
│       ├── api/              # Axios client + TanStack Query hooks
│       ├── components/       # UI, Kanban, Forms, Charts
│       ├── pages/            # Route-level page components
│       ├── store/            # Zustand stores
│       └── types/            # Shared TypeScript types
├── docker-compose.yml
├── Makefile
└── .env.example
```

---

## 📡 API Overview

All routes are prefixed `/api/v1`. Protected routes require `Authorization: Bearer <token>`.

### Auth
| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/register` | Create company + admin user |
| `POST` | `/auth/login` | Get access + refresh tokens |
| `POST` | `/auth/refresh` | Rotate tokens |
| `DELETE` | `/auth/logout` | Invalidate refresh token |

### Jobs
| Method | Path | Description |
|---|---|---|
| `GET` | `/jobs` | List company's jobs |
| `POST` | `/jobs` | Create job with form schema |
| `GET` | `/jobs/:id` | Get job details |
| `PATCH` | `/jobs/:id` | Update job / form schema |
| `DELETE` | `/jobs/:id` | Archive job |
| `GET` | `/jobs/:id/pipeline` | Kanban data (stages + bucketed applications) |
| `GET` | `/jobs/:id/form-schema` | **Public** — candidate form definition |
| `POST` | `/jobs/:id/apply` | **Public** — submit candidate application |

### Applications
| Method | Path | Description |
|---|---|---|
| `GET` | `/applications` | List applications (with filters) |
| `GET` | `/applications/:id` | Full applicant profile |
| `PATCH` | `/applications/:id/stage` | Move stage (triggers email) |
| `DELETE` | `/applications/:id` | Delete application |
| `POST` | `/applications/:id/files` | Upload CV / attachment |
| `GET` | `/applications/:id/files/:fid` | Presigned URL redirect |
| `POST` | `/applications/:id/notes` | Add recruiter note |
| `GET` | `/applications/:id/notes` | List notes |

### Reports
| Method | Path | Description |
|---|---|---|
| `GET` | `/reports/time-to-hire` | Avg. days to hire, grouped by job/month |
| `GET` | `/reports/conversion` | Stage-by-stage conversion rates |

---

## ⚙️ Configuration

All configuration is via environment variables. See [`.env.example`](.env.example) for the full reference.

Key variables:

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | postgres://... | PostgreSQL connection string |
| `REDIS_URL` | redis://localhost:6379 | Redis connection string |
| `JWT_SECRET` | — | **Required in prod** — random 64-char string |
| `STORAGE_PROVIDER` | `minio` | `minio` or `s3` |
| `EMAIL_PROVIDER` | `smtp` | `smtp` or `resend` |
| `MAX_UPLOAD_SIZE_MB` | `20` | Max file upload size |

---

## 🧪 Development

```bash
# Run backend tests
make test

# Run frontend type-check + lint
make typecheck lint-fe

# Run everything
make test-all

# Open a psql shell
make psql

# Tail logs
make logs
```

### Creating a migration

```bash
make migrate-create name=add_interview_slots
# Edit backend/migrations/<timestamp>_add_interview_slots.up.sql
# Edit backend/migrations/<timestamp>_add_interview_slots.down.sql
make migrate
```

---

## 🚢 Production Deployment

1. Set `APP_ENV=production` and a strong `JWT_SECRET`
2. Switch `STORAGE_PROVIDER=s3` and configure `AWS_*` variables
3. Switch `EMAIL_PROVIDER=resend` and set `RESEND_API_KEY`
4. Point `DATABASE_URL` and `REDIS_URL` to managed services
5. Build: `make build`
6. Deploy via your container platform of choice (Fly.io, Railway, AWS ECS, etc.)

---

## 📄 License

[MIT](LICENSE) — free to use, modify, and self-host.
