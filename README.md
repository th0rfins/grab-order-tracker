# Grab Order Tracker

MVP workspace: Fastify + SQLite API/poller, responsive Vite dashboard, Android Compose client.

## Requirements

Node.js 20+ and npm. Android build requires Android Studio with Android SDK and Gradle.

## Run locally

Run `npm install`, `npm run dev --workspace @grab-tracker/server`, and `npm run build --workspace @grab-tracker/web`. Serve web app with `npm run dev --workspace @grab-tracker/web`; set `VITE_API_URL` when API is not at `http://localhost:3000`. API has no client authentication; keep API private on a trusted network or protect it with Cloudflare Access before exposing any public tunnel. Do not put shared secrets in browser or Android builds.

`npm test` runs URL-validation and poller-age tests. SQLite file defaults to `orders.sqlite`. Poller runs once per 30 seconds, marks 404 and 90-minute-old orders terminal, retries transient failures on next pass. Grab share-link API is unofficial and may change.

## Deploy

Build server and web workspaces, start server with `PORT` and persistent `DB_PATH`, serve Vite `dist` as static files, then set `VITE_API_URL` to the API origin and `CORS_ORIGIN` to the web origin. For cloudflared, protect both web and API routes with Cloudflare Access; ensure API origin cannot bypass Access through another public route. CORS is not authentication. API remains unauthenticated and stores shared orders without per-user isolation, so any user who can reach it can read and modify all orders. Use only on trusted LAN or behind enforced Access; do not expose API publicly without that protection.

## Android

Open `apps/android` in Android Studio after Gradle wrapper bootstrap or use installed Gradle. Set API origin in `BuildConfig.API_BASE_URL`; use HTTPS outside local development. Android supports shared text links, dashboard list/analytics, manual order creation, and external browser launch.

## Follow-ups

- TODO: Add authentication and per-user ownership for deployments not protected by Cloudflare Access.
- TODO: Add polling metrics, rate limiting, and database backups.
