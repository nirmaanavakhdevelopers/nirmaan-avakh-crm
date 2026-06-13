# Nirmaan Avakh CRM & Portal - Deployment Documentation

This guide describes how to configure, build, and deploy the **Nirmaan Avakh CRM & Portal** application to production.

---

## 1. Project Overview & Architecture

* **Frontend**: React 19 SPA built with Vite 6, Tailwind CSS v4, Motion (animations), and Recharts.
* **Backend**: Express.js server (TypeScript compiled to ES Modules using esbuild).
* **Database & Auth**: Supabase integration with real-time replication. Supports a browser local-storage fallback for offline/local-only mode.
* **AI Capabilities**: Gemini AI integration dependencies included.

---

## 2. Environment Configurations

Create a `.env` file in the project root for local testing, or configure these variables in your hosting provider's dashboard:

```env
# Google Gemini API key (optional, for AI features)
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"

# Public URL of this application
APP_URL="https://nirmaan-avakh-crm.run.app"

# Supabase Credentials (optional, client fallback in UI is supported)
VITE_SUPABASE_URL="https://your-project-id.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-key-here"

# Express server port (defaults to 3000)
PORT=3000
```

---

## 3. Database Schema Setup

Before connecting Supabase, you must initialize the database tables, indices, and RLS policies:
1. Log into your [Supabase Dashboard](https://supabase.com).
2. Go to **SQL Editor** -> **New Query**.
3. Copy the entire contents of [supabase_migration.sql](supabase_migration.sql) (or copy it from the CRM Dashboard setup screen).
4. Run the script. This provisions:
   * Tables: `projects`, `plots`, `leads`, `customers`, `site_visits`, `bookings`, `payments`, `installments`, `legal_documents`, `notifications`, `audit_logs`, `support_tickets`, `crm_users`.
   * Indexes for optimized querying.
   * RLS (Row Level Security) policies allowing full public access for initial integration.

---

## 4. Local Build & Run

Ensure you have [Node.js](https://nodejs.org) v18+ installed.

### Install dependencies:
```bash
npm install
```

### Run in Development mode (with HMR):
```bash
npm run dev
```

### Typecheck (TS Lint):
```bash
npm run lint
```

### Build for Production:
```bash
npm run build
```
This outputs:
* `dist/`: Bundled and minified frontend assets.
* `server.js` & `server.js.map`: Compiled Express backend script.

### Run Production Server locally:
```bash
npm start
```

---

## 5. Containerized Deployment (Docker)

The project includes a multi-stage, production-ready `Dockerfile` and a `.dockerignore` file.

### Build the Docker Image:
```bash
docker build -t nirmaan-avakh-crm:latest .
```

### Run the Docker Container locally:
```bash
docker run -p 3000:3000 \
  -e GEMINI_API_KEY="your-gemini-key" \
  -e VITE_SUPABASE_URL="https://xyz.supabase.co" \
  -e VITE_SUPABASE_ANON_KEY="your-anon-key" \
  nirmaan-avakh-crm:latest
```
Visit the app at `http://localhost:3000`.

---

## 6. Google Cloud Deployment (GCP & Cloud Run)

The repository provides a `cloudbuild.yaml` configuration to build and deploy to **Google Cloud Run** using Google Cloud Build.

### Deployment steps:
1. Ensure the Google Cloud SDK (`gcloud`) is installed and authenticated.
2. Enable the **Cloud Build**, **Artifact Registry**, and **Cloud Run** APIs in your GCP Project.
3. Create an Artifact Registry repository:
   ```bash
   gcloud artifacts repositories create crm-portal \
     --repository-format=docker \
     --location=asia-south1
   ```
4. Run Cloud Build to build, push, and deploy:
   ```bash
   gcloud builds submit --config=cloudbuild.yaml
   ```

### Custom Substitutions:
You can override default configuration variables at submit time:
```bash
gcloud builds submit --config=cloudbuild.yaml \
  --substitutions=_SERVICE_NAME="my-crm-app",_AR_REGION="asia-south1",_RUN_REGION="asia-south1"
```

---

## 7. SPA Routing & 404 Prevention

Since the application uses React client-side routing, page reloads on sub-pages (e.g., `/dashboard` or `/portal`) will return `404 Not Found` if served directly by a standard file server.

**How we solved this**:
The Express backend implements a wildcard fallback handler in `server.ts`:
```typescript
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});
```
This forces all unmatched requests to route back to `index.html`, allowing the React router to load the correct route on the client side.

---

## 8. Verifications & Fallbacks

* **Offline Resiliency**: If Supabase credentials (`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`) are missing, the client initializes in **Local Offline Mode**. All data is written to and read from the browser's `localStorage` and will not fail.
* **Credentials Sync**: You can connect to Supabase at any time by configuring credentials in the **CRM Dashboard -> Settings** UI panel.
