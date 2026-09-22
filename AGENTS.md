# AGENTS.md — COCONUDI

## What This Is

React SPA (TikTok-style video platform for models). Vite + React 18 + TypeScript + Tailwind + shadcn/ui. Backend is Supabase (auth, DB, edge functions/Deno). Videos via Bunny.net CDN. Deployed to production from branch `master` (see EASYPANEL.md).

## Commands

```bash
npm install --legacy-peer-deps   # matches Dockerfile; plain `npm install` also resolves today
npm run dev                      # Dev server on localhost:3000 (not 5173)
npm run build                    # vite build → dist/ (does NOT typecheck)
npm run build:dev                # dev-mode build (enables lovable-tagger)
npm run lint                     # eslint .
npm run preview                  # preview production build
npx tsc -p tsconfig.app.json --noEmit   # real typecheck — run this
```

- **`npx tsc --noEmit` (root) is a no-op** — root `tsconfig.json` has `files: []` and only project references; it exits 0 without checking `src/`. Always use `-p tsconfig.app.json` (or `npx tsc -b`).
- **No `type-check` script exists** despite README claiming `npm run type-check`. `npm run build` is bare `vite build` — it will succeed with type errors.
- Typecheck baseline is dirty: ~4 pre-existing errors in `MySales.tsx`, `TikTokApp.tsx`, `AudioSessionManager.ts`. Don't assume green.
- Lint baseline is dirty: ~1500 pre-existing errors (`eslint .` also lints Deno code under `supabase/functions/` and `tailwind.config.ts`; `@typescript-eslint/no-unused-vars` is off, `no-explicit-any` is on). Compare against baseline — don't try to fix the backlog.
- **No tests, no test runner, no CI** (no `.github/`, no vitest/jest/playwright configs, no `*.test.*` files). Verification = lint + typecheck + manual.

## Env / Config

- **No `.env` or `.env.example`.** README's `cp .env.example .env` step fails. Supabase URL/key are **hardcoded** in `src/integrations/supabase/client.ts` (auto-generated — do not edit); same project id `tnzvhwapfhkhqjgyiomk` in `supabase/config.toml`.
- Almost nothing reads `import.meta.env` (only `.DEV` flags) — **except** `AdminIngestInstagramLog.tsx` uses `VITE_SUPABASE_URL`, which is `undefined` with no `.env` (latent bug; `EASYPANEL.md` documents that var for deploy).
- Edge-function secrets (`NEONPAY_*`, `RESEND_*`, `BUNNY_*`, `GOOGLE_MAPS_API_KEY`, `RAPIDAPI_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) live in the Supabase dashboard, not the repo.
- Lockfiles: `package-lock.json` is canonical (Dockerfile/npm). Stray `bun.lock` + `bun.lockb` also exist — ignore unless asked.
- `components.json`: shadcn/ui, base color `slate`, CSS variables enabled.

## Path Alias

`@/` → `./src/` in both `vite.config.ts` and all tsconfigs. Use it everywhere.

## Project Structure

- `src/main.tsx` → `src/App.tsx` (all routing). Feed entry: `Index.tsx` → `TikTokApp.tsx` (**~4,600 lines**, monolith — main feed UI + logic live here).
- `src/pages/` — 52 route-level components. `src/components/` — `admin/`, `creator/`, `tiktok/`, `ui/` (shadcn), `checkout/`, `profile/`. Root also has `AdminDashboard.tsx`, `ProtectedRoute.tsx`, `AdminRoute.tsx`.
- `src/hooks/` — 52 custom hooks (PT-BR names). Core: `useIntelligentFeed`, `useMainFeedQueue`, `useVideoActions`, `useGamification`, `useUserRoles`.
- `src/integrations/supabase/` — auto-generated `client.ts` + `types.ts` (**do not edit**). Core domain types in `src/types/database.ts`.
- `src/services/` — `AudioSessionManager` (singleton audio layer), `profileSearch`. Contexts: `CartContext`, `AudioSessionContext` (both wrap app at root).
- `supabase/` — 390 `.sql` files total: 307 timestamped in `migrations/`, ~76 loose ad-hoc scripts in `supabase/` root, plus `rls-security/`. Check for an existing fix script before writing a new one.
- `cloudflare-worker/` — share proxy (`share.coconudi.com`); paste `share-proxy.js` into Cloudflare dashboard (no wrangler config).
- `docs/` — PRD, TECHNICAL_IMPROVEMENTS, IMPLEMENTATION_CHECKLIST (partially stale).

## Key Architecture (verified in `src/App.tsx`)

- **Routing**: React Router v6. `/` is `SplashScreen` (home), **not** the feed. Feed is open (no auth) at `/app`, `/tiktok`, `/home`, `/index`, `/main` → same `Index`. `/:username` profile catch-all and `*` NotFound are intentionally last. Admin behind `AdminRoute`, some pages behind `ProtectedRoute`.
- **State**: TanStack Query — 5min `staleTime` / 10min `gcTime`, `retry: 1`, `refetchOnWindowFocus: false`. Root providers: `QueryClientProvider` → `CartProvider` → `AudioSessionProvider` → `TooltipProvider`.
- **Auth**: Supabase PKCE (`flowType: 'pkce'`). Session in localStorage key `sb-tnzvhwapfhkhqjgyiomk-auth-token` (project-specific — hardcoded in `ProtectedRoute`/`getUserId`). Anonymous users get a UUID in localStorage (`src/utils/getUserId.ts`). `ProtectedRoute` has special iOS token-refresh recovery logic.
- **Roles**: `user_roles` table — `user`, `creator`, `admin`, `moderator`. Hooks: `useUserRoles`, `useCreatorRole`, `useAdminRole`.
- **Feed**: intelligent feed is **active** (`TikTokApp` calls `useIntelligentFeed` + `useMainFeedQueue`; comment says "reativado"). README claims it's disabled — README is stale.

## Supabase Edge Functions

- 33 function dirs in `supabase/functions/` (Deno/TS, each `index.ts`). `supabase/config.toml` lists only 19 and is **out of sync**: 5 referenced functions have no directory (`payment-webhook`, `asaas-checkout`, `asaas-verify-payment`, `process-payment`, `check-payment-status` — Asaas is legacy), and ~19 existing dirs are absent from config.
- Config entries: all `verify_jwt = false` except `ig-create-creator-account` (`true`). Functions not in config fall back to CLI defaults.
- Stray `follow-model-rpc.sql` sits in the functions dir (not a deployed function).
- **Real payment flow is neonpay-\***: `neonpay-pix`, `neonpay-pix-gateway`, `neonpay-pix-status`, `neonpay-card`, `neonpay-webhook`, `neon-vip`, `neon-vip-status`. Other families: `share-video`/`share-profile`, webhooks (`webhook-dispatcher`, `resend-webhook`, `trigger-webhook`), Instagram ingest (`ingest-instagram`, `instagram-import`, `ig-create-creator-account`), `bunny-video-upload`, `ai-chat`/`model-chat`, email/SMS (`send-email`, `send-sms`, `strong-sms`, `send-welcome-email`), `geolocate`/`geocode-businesses`, `process-scheduled-posts`, `schedule-carousel`, `api-events`.
- **Migrations**: README's quick-start (`create_tables.sql` → `create_rls_policies.sql` → …) references files that **don't exist**. Real migrations are timestamped in `supabase/migrations/`; many one-off fixes are loose `.sql` files in `supabase/` root — search before creating new SQL.
- **RLS**: history of recursion issues. Curated scripts + guides in `supabase/rls-security/` (`00`–`05` numbered, `README.md`, `EXECUTION_GUIDE.md`, `TROUBLESHOOTING.md`) run via Supabase Dashboard SQL editor.

## Deploy

- **Docker** (production path): multi-stage `node:20-alpine` (`npm install --legacy-peer-deps` + `npm run build`) → `nginx:alpine` serving `dist/` on **port 3000** via custom `nginx.conf` (SPA fallback; `index.html` never cached; assets cached 1y; CSP allows Supabase/Bunny/NeonPay/Asaas/Google Maps).
- **EasyPanel** (`EASYPANEL.md`): builds from Dockerfile, branch `master`, port 3000, auto-deploy on push.
- **Lovable**: dev-only `lovable-tagger` in `vite.config.ts`; dev plugins `@lovable.dev/*` in devDependencies; `.lovable/` dir present.
- No CI workflows.

## Known Issues (verify before "fixing")

- User ID inconsistency: localStorage anonymous UUID vs Supabase Auth id (see `src/utils/getUserId.ts`, documented in README).
- README is stale on: port (says 5173, is 3000), `type-check` script (doesn't exist), `.env.example` (doesn't exist), intelligent feed "disabled" (it's active), migration file names, env var list.
- `AUTHENTICATION_SETUP.md` references `supabase/migrations/auto_user_role_trigger.sql` — not present.
- tsconfig is loose by design: `strict: false`, `strictNullChecks: false`, `noImplicitAny: false` — typecheck won't catch much; don't "fix" this without being asked.
- Repo hygiene: untracked junk `index.html.main` and `supabase/.temp/` (Supabase CLI temp) — don't commit them; `.gitignore` doesn't cover them.
- **`git remote` embeds a personal access token in the URL** — never paste `git remote -v` / remote URLs into commits, issues, logs, or chat.

## Language

Code, comments, hooks, page names, SQL, and docs are primarily **Portuguese (Brazilian)**. Keep new code consistent with surrounding language.
