# Self-Host with Docker & Custom PostgreSQL

Guide for self-hosting the database layer using Docker Compose or connecting alternative PostgreSQL providers (Neon, Railway, AWS RDS, Render).

---

## Architecture Overview

The Paperback Web API and mobile sync engine interact with PostgreSQL via a PostgREST interface. 

You have two primary self-hosting paths:
1. **Self-Hosted Supabase Stack** (Recommended for full self-hosting via Docker).
2. **Custom PostgreSQL + PostgREST** (For Neon, Railway, AWS RDS, or existing PostgreSQL instances).

---

## Option 1: Self-Hosted Supabase via Docker Compose

You can run the complete Supabase stack on any Linux VPS, home server, or Docker host.

### 1. Clone Official Supabase Docker Repository
```bash
git clone --depth 1 https://github.com/supabase/supabase
cd supabase/docker
```

### 2. Configure Environment
```bash
cp .env.example .env
```
Edit `.env` and set your own secure passwords for `POSTGRES_PASSWORD`, `JWT_SECRET`, and `ANON_KEY` / `SERVICE_ROLE_KEY`.

### 3. Start the Containers
```bash
docker compose up -d
```

### 4. Initialize the Database Schema
Execute [`supabase/schema.sql`](../../supabase/schema.sql) against your local database:
```bash
docker compose exec -T db psql -U postgres -d postgres < /path/to/reading-tracker/supabase/schema.sql
```

### 5. Point Next.js to Your Self-Hosted Instance
In your web app `.env.local` or hosting provider:
```env
SUPABASE_URL=http://your-server-ip:8000
SUPABASE_SERVICE_ROLE_KEY=your_generated_service_role_key
```

---

## Option 2: Connecting External PostgreSQL (Neon, Railway, AWS RDS)

The database schema in `supabase/schema.sql` is standard PostgreSQL 15+ compatible and requires no proprietary extensions beyond `pgcrypto` / `gen_random_uuid()`.

### 1. Execute the Schema
Connect to your PostgreSQL provider using `psql` or their web console and execute:
1. [`supabase/schema.sql`](../../supabase/schema.sql)
2. Versioned migrations in [`supabase/`](../../supabase/)

### 2. Run a PostgREST Gateway
Deploy a lightweight [PostgREST container](https://hub.docker.com/r/postgrest/postgrest) in front of your PostgreSQL instance:

```bash
docker run -d \
  --name postgrest \
  -p 3001:3000 \
  -e PGRST_DB_URI="postgres://user:password@your-db-host:5432/postgres" \
  -e PGRST_DB_SCHEMA="public" \
  -e PGRST_DB_ANON_ROLE="anon" \
  -e PGRST_JWT_SECRET="your_32_character_jwt_secret" \
  postgrest/postgrest
```

> [!IMPORTANT]
> **Production Security**: Never expose your raw PostgreSQL port (`5432`) to the public internet. Keep the database bound to `localhost` or an internal Docker network, and expose only the PostgREST / Web port behind SSL (e.g. Caddy, Nginx, or Cloudflare Tunnel).

### 3. Configure Web App
```env
SUPABASE_URL=http://your-postgrest-host:3001
SUPABASE_SERVICE_ROLE_KEY=your_signed_service_role_jwt
```

---

## Database Migrations
When updating releases, apply chronological migration scripts (`migration_v08_rls.sql` through `migration_v11_smart_updated_at.sql`) using `psql` or your provider's query editor.
