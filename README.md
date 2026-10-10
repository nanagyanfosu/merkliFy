# MerkliFy

MerkliFy is a digital academic certificate verification platform. It helps
institutions publish certificate records and lets employers, schools, and
other authorized parties check whether a certificate record is authentic and
currently valid.

## What it does

- Provides public certificate verification using:
  - Certificate serial number
  - Graduate's full name
  - Issuing institution
- Allows authorized institution users to upload certificate records in CSV or
  JSON batches.
- Groups certificates into batches and records their integrity with Merkle
  roots.
- Uses cryptographic hashes and digital signatures to help detect altered
  records.
- Supports certificate lifecycle states such as verified, suspended, and
  revoked.
- Provides institution and administrator areas for managing issuers,
  certificates, batches, and verification activity.

## How verification works

1. A verifier enters the details shown on an academic certificate.
2. MerkliFy finds the matching record, if one exists.
3. The platform checks the record's stored data, Merkle proof, and digital
   signature.
4. The current certificate status is returned to the verifier.

An authentic result confirms the checks passed at the time of verification.
It does not replace an institution's official policies or legal authority over
its academic records.

## Project structure

```text
backend/       FastAPI application, database models, services, and API routes
frontend/      React and Vite web application
alembic/       Database migration configuration and revisions
requirements.txt
               Python dependencies
frontend/package.json
               Frontend scripts and dependencies
```

## Technology

- **Frontend:** React, Vite, React Router, TanStack Query, Tailwind CSS
- **Backend:** Python, FastAPI, SQLAlchemy, Pydantic
- **Security and integrity:** password hashing, signed authentication tokens,
  SHA-256-based record hashing, Merkle trees, and digital signatures
- **Database:** SQLAlchemy-supported relational database

## Run locally

### Prerequisites

- Python 3.11 or newer
- Node.js and npm
- A supported relational database

### Backend

Create and activate a virtual environment, then install the dependencies:

```bash
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
```

The backend reads its configuration from environment variables. Set the
database connection, authentication secrets, and any optional email settings
in your local environment before starting it. Use strong, unique values and
keep them private; do not commit `.env` files or real credentials.

Start the API from the repository root:

```bash
uvicorn backend.main:app --reload
```

The API is available at `http://localhost:8000`. A basic health check is
available at `/health`, and FastAPI's interactive API documentation is
available at `/docs` while the server is running.

### Frontend

Install frontend dependencies and start the development server:

```bash
cd frontend
npm install
npm run dev
```

By default, the frontend uses the local API at `http://localhost:8000`.
To use another API URL, set `VITE_API_URL` in a local frontend environment
file. Use only a non-sensitive URL there; never place tokens, passwords, or
private keys in frontend environment variables.

Useful frontend commands:

```bash
npm run lint
npm run build
npm run preview
```

## Data and privacy

Certificate and graduate information may be sensitive personal data. Only
upload records you are authorized to process, use appropriate access controls,
and follow the privacy and retention requirements that apply to your
organization.

This repository intentionally does not document or contain deploy-time
credentials, private keys, administrator passwords, production database
connections, or private environment-file values. Obtain those through the
appropriate project administrator or deployment secret manager.

## Status

MerkliFy is under active development. APIs, screens, and deployment details
may change as the platform evolves.
