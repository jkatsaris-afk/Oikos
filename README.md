# Oikos

Local development uses Create React App and talks directly to Supabase.

## Local setup

1. Install dependencies with `npm install`
2. Copy `.env.example` to `.env.local`
3. Start the app with `npm start`

The default local URL is `http://localhost:3000`.

## Why this helps

You can iterate on UI, auth flows, routing, and most product logic locally without triggering a Vercel deployment for every change. Vercel should only be needed when you want a shared preview or a production push.
