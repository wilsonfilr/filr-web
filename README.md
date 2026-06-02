# Filr Web

A lightweight web version of Filr for using your library on a computer. It talks to the
**same Supabase backend** as the mobile app, so everything you scan on your phone shows up here
(and PDFs you upload here sync back to the phone).

## What it does

- **Sign in** with the same Filr account — Apple, Google, or Email (magic link).
- **Browse** the same folders and documents that sync from your phone.
- **Search** across document titles and OCR text.
- **View** documents — scanned page images, or open/download the original PDF.
- **Upload** PDFs from your computer (stored in Supabase, so they appear on the phone too).
- **Organize** — create folders, rename documents, delete documents.

It is intentionally a *simplified* version. Native-only features (camera scanning, on-device OCR,
ID vault / Face ID, AI smart filing) live only in the mobile app.

## Tech

- [Vite](https://vite.dev) + React 19 + TypeScript
- Tailwind CSS v4
- `@supabase/supabase-js` (Auth + Postgres + Storage) — reuses the existing schema:
  `folders`, `documents`, `user_tags`, and the `documents` storage bucket.

## Run locally

```bash
cd filr-web
cp .env.example .env.local   # already filled in for this project
npm install
npm run dev                  # http://localhost:5180
```

`.env.local` holds the **public** Supabase URL + anon key (the same values the mobile app ships).
These are safe in a browser bundle because Row Level Security restricts every row to its owner.

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## Deploy to `web.myfilr.app`

The app builds to static files (`npm run build` → `dist/`), so any static host works. Below is the
quickest path with **Vercel** (Netlify / Cloudflare Pages are nearly identical).

### 1. Build settings

| Setting | Value |
|---|---|
| Root directory | `filr-web` |
| Build command | `npm run build` |
| Output directory | `dist` |
| Env vars | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |

### 2. Deploy

- **Vercel:** `npm i -g vercel`, then `vercel` from `filr-web/` and follow prompts. Add the two env
  vars in the project settings, then `vercel --prod`.
- Or push this repo to GitHub and import it in the Vercel/Netlify/Cloudflare dashboard, pointing the
  project root at `filr-web/`.

### 3. Point the subdomain

1. In your host (Vercel/Netlify/Cloudflare Pages), add the custom domain **`web.myfilr.app`**.
2. In your DNS provider for `myfilr.app`, add the record the host shows you — usually a **CNAME**:
   - Name/host: `web`
   - Target: the host's domain (e.g. `cname.vercel-dns.com`)
3. Wait for DNS + the auto-issued HTTPS certificate, then open `https://web.myfilr.app`.

### 4. Supabase auth config (so login works on the new domain)

In the Supabase dashboard → **Authentication → URL Configuration**:

- **Site URL:** `https://web.myfilr.app`
- **Redirect URLs:** add `https://web.myfilr.app` (and `http://localhost:5180` for local dev).

This is what lets the magic-link email and the Apple/Google OAuth redirect return to the web app.

### Providers (Apple + Google) — Supabase → Authentication → Providers

The login screen offers **Apple**, **Google**, and **Email (magic link)**. Email magic link works
as soon as the redirect URLs above are set. The two social buttons use Supabase OAuth and need the
matching provider enabled in the dashboard:

- **Google:** enable the Google provider and paste a **Web** OAuth client ID + secret
  (Google Cloud Console → Credentials → "Web application"). Add Supabase's callback URL
  (`https://<project-ref>.supabase.co/auth/v1/callback`) to that client's authorized redirect URIs.
- **Apple:** enable the Apple provider and configure a **Services ID** + key
  (Apple Developer → Certificates, Identifiers & Profiles), using the same Supabase callback URL.

Until a provider is configured, its button will return a provider error — email magic link still
works on its own.

## Notes

- Storage access uses short-lived **signed URLs**, so document files are never publicly exposed.
- Uploaded PDFs are stored at `{userId}/{documentId}.pdf` to match the mobile app's convention.
