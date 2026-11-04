# PermitGraph

### Open-Source Regulatory Intelligence & Compliance Automation Platform

**Simplifying Industrial Approvals in Maharashtra Through Regulatory Intelligence, Approval Dependency Mapping, and Automated Compliance Monitoring.**

---

## 1. Overview

PermitGraph is an open-source regulatory intelligence and compliance automation platform designed to simplify industrial regulatory processes in Maharashtra, India.

Industrial businesses often struggle to identify applicable permissions, understand approval dependencies, track regulatory amendments, and maintain compliance with changing government regulations.

PermitGraph addresses these challenges by converting regulatory documents into structured, machine-readable rules and connecting them through an intelligent approval dependency graph.

The platform enables businesses to discover required permissions, understand regulatory requirements, monitor regulatory changes, and identify their potential impact on businesses and applications.

### Core Concept

**Regulatory Text → Rule Extraction → Human Verification → Rules-as-Code → Approval Dependency Graph → Change Detection → Impact Analysis**

---

## 2. Problem Statement

Industrial establishment and expansion in Maharashtra involve multiple regulatory approvals from different government departments and authorities.

Businesses face several challenges:

* Difficulty identifying all applicable industrial permissions.
* Complex relationships and dependencies between approvals.
* Regulatory information scattered across multiple Acts, rules, and government documents.
* Lack of centralized regulatory change monitoring.
* Difficulty understanding how regulatory amendments affect existing approvals.
* Manual tracking of application deadlines and compliance documents.
* Limited visibility into approval workflows and regulatory requirements.

PermitGraph aims to address these challenges through a centralized, transparent, and extensible regulatory intelligence platform.

---

## 3. Key Features

### 3.1 Intelligent Permission Discovery

Recommends applicable industrial permissions based on business characteristics.

**Input parameters:**

* Industry type
* District
* Investment amount
* Number of employees
* Land type
* Pollution category

**Output:**

* Applicable permissions
* Required documents
* Approval dependencies
* Regulatory references

### 3.2 Regulatory Catalogue

Maintains structured regulatory information from Maharashtra legislation.

Currently includes:

* Maharashtra Industrial Development Act
* Maharashtra Industries (Facilitation) Act (MAITRI-related legislation)
* Maharashtra Khadi and Village Industries Board Act

Each regulatory record maintains:

* Act and section information
* Regulatory versions
* Original source URLs
* SHA-256 hashes
* Source provenance

### 3.3 Rules Engine (Rules-as-Code)

Converts regulatory requirements into structured YAML-based rules.

Features:

* Deterministic rule evaluation.
* Source-linked regulatory conditions.
* Verification status tracking.
* Reusable rule definitions.
* Traceable rule execution.

Unverified rules remain marked as `CANDIDATE`.

### 3.4 Human Verification Workflow

Ensures regulatory accuracy through human oversight.

* Review candidate rules.
* Approve or reject extracted rules.
* Record verification reasons.
* Maintain reviewer and administrator audit trails.
* Prevent automatic promotion of candidate rules to verified status.

### 3.5 Approval Dependency Graph

Visualizes relationships between industrial approvals.

Features:

* Upstream and downstream approval relationships.
* Dependency visualization.
* Approval sequencing.
* Cycle detection.
* Industry-specific approval relationships.
* Identification of prerequisite permissions.

### 3.6 Business Management

Enables users to create and manage industrial business profiles.

Business information includes:

* Business name
* Industry classification
* District
* Investment
* Employees
* Land type
* Pollution category

Supports synthetic business profiles for testing and demonstrations.

### 3.7 Application Workflow Management

Provides application lifecycle management.

Features:

* Application creation.
* Valid state transitions.
* Invalid transition prevention.
* Application status monitoring.
* Workflow history.
* Event tracking.

### 3.8 SLA Tracking

Monitors application timelines and service-level agreements.

Features:

* Application deadlines.
* SLA snapshots.
* Event timelines.
* Status monitoring.
* Deadline tracking.

### 3.9 Document Management

Provides document upload, processing, and validation.

Features:

* PDF and image uploads.
* SHA-256 document hashing.
* OCR-based text extraction.
* Structural validation.
* Document traceability.

### 3.10 Regulatory Change Detection

Identifies changes between different versions of regulatory documents.

Detectable change categories include:

* Deadline changes.
* Fee changes.
* Eligibility changes.
* Requirement changes.

Maintains comparisons between previous and updated regulatory text.

### 3.11 Regulatory Impact Analysis

Identifies potentially affected entities when regulations change.

Features:

* Affected approval identification.
* Affected business-type identification.
* Affected application identification.
* Impact scoring.
* Impact methodology.
* Explanatory disclaimers.

### 3.12 Audit Logging

Maintains traceable records of important system activities.

Includes:

* Rule verification decisions.
* Application workflow events.
* Important user actions.
* Administrative activities.

### 3.13 Role-Based Authentication

JWT-based authentication with role-based access control.

Supported roles:

* Admin
* Reviewer
* Officer
* Business User
* Developer
* Read-Only User

### 3.14 Web Application

A React-based interface containing 19 pages covering:

* Dashboard
* Permission Discovery
* Regulatory Catalogue
* Rules Management
* Approval Catalogue
* Approval Dependency Graph
* Business Management
* Applications
* Document Management
* Regulatory Changes
* Impact Analysis
* Audit Logs
* Authentication
* Rule Review

### 3.15 REST API

FastAPI-powered backend providing endpoints for major platform functionalities.

Supports:

* Regulatory management
* Permission discovery
* Rules management
* Approval dependencies
* Business profiles
* Applications
* Documents
* Regulatory changes
* Impact analysis
* Authentication
* Audit operations

### 3.16 Command-Line Interface (CLI)

PermitGraph provides a CLI client that communicates with the same REST API used by the web application.

This enables developers and technical users to interact with the platform through terminal commands.

### 3.17 Synthetic Datasets

Includes synthetic datasets for testing and demonstrations.

Supports thousands of generated records involving:

* Businesses
* Applications
* Documents
* Workflow events
* Regulatory changes
* Approval dependency graphs

Real, candidate, and synthetic data are explicitly distinguished.

---

## 4. System Architecture

```text
                 REGULATORY SOURCES
                         |
                         v
               REGULATORY DOCUMENTS
                         |
                         v
                TEXT EXTRACTION
                         |
                         v
                CANDIDATE RULES
                         |
                         v
                HUMAN VERIFICATION
                         |
                         v
                  RULES-AS-CODE
                         |
                         v
             APPROVAL DEPENDENCY GRAPH
                         |
                         v
              REGULATORY CHANGE DETECTION
                         |
                         v
                  IMPACT ANALYSIS
                         |
                         v
        +----------------+----------------+
        |                |                |
        v                v                v
    WEB UI           REST API            CLI
        |                |                |
        +----------------+----------------+
                         |
                         v
                  FASTAPI BACKEND
                         |
                         v
                    POSTGRESQL
```

### Architecture Principles

* Modular and extensible architecture.
* API-first backend design.
* Deterministic rules evaluation.
* Human-in-the-loop verification.
* Source-backed regulatory information.
* Role-based access control.
* Separation of real, candidate, and synthetic data.

---

## 5. Technology Stack

| Layer                      | Technology                           |
| -------------------------- | ------------------------------------ |
| Frontend                   | React                                |
| Backend                    | Python, FastAPI                      |
| Database                   | PostgreSQL                           |
| Rules Engine               | YAML-based rules                     |
| Authentication             | JWT                                  |
| Document Processing        | OCR                                  |
| Document Integrity         | SHA-256                              |
| API Communication          | REST API                             |
| Dependency Visualization   | Graph-based visualization            |
| CLI                        | Python                               |
| Containerization           | Docker, Docker Compose               |
| Web Server / Reverse Proxy | Nginx                                |
| Testing                    | Automated Unit and Integration Tests |
| Code Quality               | Ruff                                 |
| CI/CD                      | GitHub Actions                       |

---

## 6. Project Structure

```text
PermitGraph/
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── rules/
│   │   ├── regulatory/
│   │   ├── approvals/
│   │   ├── applications/
│   │   ├── documents/
│   │   ├── impact/
│   │   └── auth/
│   │
│   └── tests/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── assets/
│   │
│   └── package.json
│
├── cli/
│   └── permitgraph/
│
├── datasets/
│   └── synthetic/
│
├── docker/
│
├── docs/
│
├── docker-compose.yml
├── README.md
└── .github/
    └── workflows/
```

*Note: This is a logical representation of the project structure; adapt directory names to the actual repository.*

---

## 7. Installation and Setup

### Prerequisites

Ensure the following tools are installed:

* Python 3.10+
* Node.js and npm
* PostgreSQL
* Docker and Docker Compose (for containerized deployment)
* Git

### Step 1: Clone the Repository

```bash
git clone <YOUR_REPOSITORY_URL>
cd PermitGraph
```

### Step 2: Backend Setup

```bash
cd backend

python -m venv venv
```

Activate the virtual environment.

**Windows:**

```bash
venv\Scripts\activate
```

**Linux/macOS:**

```bash
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Start the backend:

```bash
uvicorn app.main:app --reload
```

### Step 3: Frontend Setup

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

### Step 4: Database Configuration

Configure PostgreSQL connection details using the project's environment configuration.

Example:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/permitgraph
```

Use the actual environment variable names and database initialization commands defined in the repository.

### Step 5: Docker Deployment

For containerized deployment:

```bash
docker compose up --build
```

The deployment configuration includes:

* PostgreSQL
* FastAPI backend
* React frontend
* Nginx reverse proxy
* Optional synthetic data seeding

---

## 8. How PermitGraph Works

### Step 1: Business Registration

The user creates a business profile by entering industry, location, investment, employee count, land type, and pollution category.

### Step 2: Permission Discovery

The platform evaluates the business profile against verified regulatory rules.

### Step 3: Approval Mapping

Applicable permissions are connected through the approval dependency graph.

### Step 4: Compliance Preparation

Users can understand the documents and prerequisites associated with required approvals.

### Step 5: Application Tracking

Applications are created and monitored through their defined workflow states.

### Step 6: Regulatory Monitoring

The system compares regulatory document versions and identifies changes.

### Step 7: Impact Analysis

The platform identifies potentially affected approvals, business types, and applications.

### Step 8: Audit and Traceability

Important decisions and system events are recorded for accountability.

---

## 9. API Documentation

PermitGraph uses FastAPI to expose REST endpoints.

When the backend is running, interactive API documentation is available through:

```text
http://localhost:8000/docs
```

Alternative documentation:

```text
http://localhost:8000/redoc
```

The exact available routes can be explored through the generated API documentation.

---

## 10. Testing

The project includes automated testing across major subsystems.

Current acceptance report:

**90 automated tests.**

Testing coverage includes:

* Backend package tests.
* API integration tests.
* Frontend lint checks.
* Frontend production build checks.
* Ruff code-quality checks.
* GitHub Actions CI workflows.

Run backend tests using the repository's configured test command, typically:

```bash
# Python packages + API dependencies
for pkg in shared rules-engine graph-engine change-detection impact-analysis \
           document-engine regulatory-parser workflow-engine; do
  pip install -e "packages/$pkg"
done
pip install -r apps/api/requirements.txt -r apps/api/requirements-dev.txt
pip install -e cli

# Seed database: real + candidate corpus, demo users, and initial regulatory alerts
python scripts/seed_real_corpus.py
python scripts/demo_apply_reviewer_approvals.py # promotes a documented subset to VERIFIED
python scripts/load_synthetic_dataset.py        # ~5k synthetic businesses/applications (optional)
```

#### Run Backend API (FastAPI)
* **Linux / macOS**:
  ```bash
  cd apps/api && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
  ```
* **Windows PowerShell (from repo root)**:
  ```powershell
  python -m uvicorn app.main:app --app-dir apps/api --host 127.0.0.1 --port 8000 --reload
  ```
* API available at `http://127.0.0.1:8000` (interactive OpenAPI docs at `/docs`).

#### Run Frontend Web UI (Vite + React)
```bash
# In a separate terminal
cd apps/web && npm install && npm run dev
```
* Web application available at `http://localhost:5173`.
* Proxies `/api`, `/health`, `/ready` to backend port `8000` via `vite.config.ts`.

#### Demo Credentials & Roles

| Role | Email | Dev Password | Dashboard / Access Level |
|---|---|---|---|
| **Admin** | `admin@permitgraph.dev` | `permitgraph-dev-only` | System configuration, user administration & review queue |
| **Reviewer** | `reviewer@permitgraph.dev` | `permitgraph-dev-only` | Human verification gate, review candidate rules & changes |
| **Compliance Officer** | `officer@permitgraph.dev` | `permitgraph-dev-only` | Regulatory alerts dashboard, inspection schedules & audit log |
| **Applicant / Business** | `applicant@permitgraph.dev` | `permitgraph-dev-only` | Permission discovery, smart checklists & applications |

> **Security Note:** Demo accounts and passwords are for development/evaluation only. **Never reuse these in a production deployment** — see [`SECURITY.md`](SECURITY.md).

#### CLI (separate terminal)
```bash
permitgraph status
permitgraph auth login --email reviewer@permitgraph.dev --password permitgraph-dev-only
permitgraph discover --industry food_processing --district Pune --employees 80 \
  --investment 50000000 --land-type midc_industrial_area
```

## 11. Open-Source Approach

PermitGraph is designed around open-source development principles.

Its architecture supports:

* Reusable regulatory data structures.
* YAML-based rules-as-code.
* Publicly inspectable source code.
* REST API integration.
* Developer-oriented CLI.
* Self-hosted deployment.
* Extensible approval dependency graphs.
* Community contributions.

### Repository layout

```
apps/api        FastAPI service: routers, models, services (the public API)
apps/web        React + TypeScript + Vite + Tailwind UI (22 pages)
packages/*      8 installable Python packages, each with its own unit tests:
                  shared, rules-engine, graph-engine, change-detection,
                  impact-analysis, document-engine, regulatory-parser, workflow-engine
cli/            `permitgraph` developer CLI (Typer) — a pure REST client
data/real/      Transcribed text of the 3 source Acts + provenance registry
data/candidate/ AI-extracted candidate rules, pending/partial human review
data/synthetic/ ~5.2k synthetic businesses, applications, documents, change
                scenarios, approval graphs — all explicitly is_synthetic=true
docs/           Research, architecture, and this project's own acceptance report
scripts/        Seed scripts + synthetic data generators
docker/         Dockerfiles; docker-compose.yml lives at the repo root
.github/        CI workflow
```

The platform can be extended to support additional Acts, rules, industries, approval authorities, and geographical regions.

**License:** To be finalized and specified in the repository's LICENSE file.

---

## 12. Limitations and Future Scope

### Current Limitations

* Original referenced regulatory PDFs were not available for direct ingestion during the reported development process.
* Docker deployment configuration has been created but was not executed in the development sandbox.
* Background workers for queued OCR and regulatory change-processing jobs are not yet implemented.
* Regulatory data coverage and accuracy depend on source availability and human verification.
* Synthetic datasets are intended for testing and demonstration, not as evidence of actual government application activity.

### Future Enhancements

1. Background processing with Celery or an equivalent job queue.
2. Automated ingestion of official regulatory publications.
3. Regulatory alerts and subscription-based notifications.
4. Smart compliance checklists.
5. More advanced regulatory impact scoring.
6. Additional state-level regulatory catalogues.
7. Enhanced graph analytics.
8. Improved OCR and document understanding.
9. Email and notification integrations.
10. Expanded developer APIs and integrations.

---

## 13. Important Disclaimer

PermitGraph is an independent open-source regulatory intelligence and compliance assistance platform.

* It is not an official government platform.
* It is not government-approved or government-affiliated.
* It does not submit applications to government departments.
* It does not replace NSWS, MAITRI, or MIDC systems.
* Its regulatory recommendations should be independently verified against applicable official sources.
* AI-extracted or unverified regulatory information must not be treated as authoritative legal advice.

The platform is intended to improve regulatory transparency, information accessibility, and compliance planning.

---

## 14. Contribution Guidelines

Contributions are welcome!

Developers can contribute by:

* Adding regulatory datasets.
* Improving the rules engine.
* Extending approval dependency graphs.
* Improving document extraction.
* Enhancing frontend components.
* Adding API endpoints.
* Improving testing and documentation.

Suggested contribution workflow:

1. Fork the repository.
2. Create a feature branch.
3. Implement your changes.
4. Add or update tests.
5. Submit a Pull Request.

---

## 15. Project Vision

Our vision is to build an open, transparent, and extensible regulatory intelligence infrastructure that makes industrial compliance easier to understand, manage, and monitor.

PermitGraph aims to bridge the gap between complex regulatory documents and actionable industrial compliance information.

**From regulatory complexity to connected compliance intelligence.**

---

### PermitGraph

**Open Source | Regulatory Intelligence | Compliance Automation | Approval Dependency Mapping**

Built for a more transparent and accessible industrial regulatory ecosystem in Maharashtra, India.
