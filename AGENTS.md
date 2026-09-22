# AGENTS.md — COCONUDI

## What This Is

React SPA (TikTok-style video platform for models). Built with Vite + React 18 + TypeScript + Tailwind + shadcn/ui. Backend is Supabase (auth, DB, edge functions). Videos served via Bunny.net CDN.

## Commands

```bash
npm install --legacy-peer-deps   # MUST use --legacy-peer-deps (peer dep conflicts exist)
npm run dev                      # Dev server on localhost:3000
npm run build                    # Production build → dist/
npm run build:dev                # Dev-mode build (enables lovable-tagger)
npm run lint                     # ESLint (flat config, no Prettier)
npm run preview                  # Preview production build
npx tsc --noEmit                 # Manual type-check (no npm script exists)
```

- **No `type-check` script exists** despite README claiming `npm run type-check`. ESLint has `@typescript-eslint/no-unused-vars` off, so it won't catch dead code — run `npx tsc --noEmit` for real type safety. tsconfig sets `strictNullChecks: false` and `noImplicitAny: false`.
- No CI workflows (no `.github/`).

## Env / Config

- **No `.env` or `.env.example`.** README's `cp .env.example .env` step fails. Supabase URL/key are **hardcoded** in `src/integrations/supabase/client.ts` (auto-generated — do not edit); same project id `tnzvhwapfhkhqjgyiomk` is in `supabase/config.toml`.

## Dev Server Port

Vite config uses port **3000** (not the typical 5173). README is stale on this.

## Path Alias

`@/` maps to `./src/` — configured in both `vite.config.ts` and `tsconfig.json`. Use it everywhere.

## Project Structure

- `src/pages/` — ~50 route-level components. Feed entry is `Index.tsx` → renders `TikTokApp.tsx` (uses `useIntelligentFeed` + `useMainFeedQueue`)
- `src/components/` — Reusable components. `admin/`, `creator/`, `tiktok/`, `ui/` (shadcn)
- `src/hooks/` — 50+ custom hooks (PT-BR names/descriptions). Core: `useIntelligentFeed`, `useVideoActions`, `useGamification`
- `src/integrations/supabase/` — Auto-generated client + types (**do not edit `client.ts` manually**)
- `src/types/database.ts` — Core types (User, Video, Comment, Like); `Upload/Database` types flow from `client.ts` gitignore rule (auto-generated)
- `supabase/` — SQL migrations, edge functions, RLS policies. 389 `.sql` files incl. many ad-hoc fix scripts — check before creating new ones
- `cloudflare-worker/` — Share proxy for clean URLs (share.coconudi.com)

## Key Architecture (verified in `src/App.tsx`)

- **Routing**: React Router v6. `/:username` catch-all for profiles and `*` NotFound — both placed last intentionally. `/app`, `/tiktok`, `/home`, `/index`, `/main` all render the same feed component
- **State**: TanStack Query, 5min `staleTime` / 10min `gcTime`, `retry: 1`, `refetchOnWindowFocus: false`. `CartProvider` + `AudioSessionProvider` wrap everything at root
- **Auth**: Supabase Auth PKCE flow (`flowType: 'pkce'` in client). `ProtectedRoute` and `AdminRoute` wrappers. Session persisted in localStorage
- **Roles**: `user_roles` table. Roles: `user`, `creator`, `admin`, `moderator`
- **UI**: shadcn/ui, `slate` base color, CSS variables enabled

## Supabase Edge Functions

33 functions in `supabase/functions/` (Deno/TS). `supabase/config.toml` lists 19, but it's **out of sync**: 5 referenced functions have no directory (`payment-webhook`, `asaas-checkout`, `asaas-verify-payment`, `process-payment`, `check-payment-status`), and ~19 existing dirs are absent from config. All but `ig-create-creator-account` have `verify_jwt = false`. Stray `follow-model-rpc.sql` sits in the functions dir (not a deployed function).

Actual payment flow is the **neonpay-\*** family: `neonpay-pix`, `neonpay-pix-gateway`, `neonpay-pix-status`, `neonpay-card`, `neonpay-webhook`, `neon-vip`, `neon-vip-status`. Others: `share-video`, `share-profile`, `webhook-dispatcher`, `resend-webhook`, `trigger-webhook`, `ingest-instagram`, `ig-create-creator-account`, `instagram-import`, `bunny-video-upload`, `ai-chat`, `model-chat`.

## Known Issues (Verify Before Fixing)

- User ID inconsistency: localStorage vs Supabase Auth (documented in README)
- README claims intelligent feed is disabled; the code path uses `useIntelligentFeed` — actually active, treat README as stale
- RLS policies have caused recursion issues — see `supabase/rls-security/` (README, EXECUTION_GUIDE, TROUBLESHOOTING) and many fix scripts
- `supabase/` SQL sprawl (389 files) — check for an existing fix script before writing a new one
- README quick-start/env/deploy sections are stale (port, type-check, .env, env vars)

## Lovable Platform

Uses Lovable (lovable.dev). `vite.config.ts` injects `lovable-tagger` `componentTagger()` only in development mode. Dev-only plugins `@lovable.dev/vite-plugin-dev-server-bridge` and `hmr-gate` in devDependencies.

## Docker

Dockerfile builds with `npm install --legacy-peer-deps`, serves `dist/` via nginx (custom `nginx.conf`) on port 3000.

## Language

Codebase, comments, hooks, page names, and SQL comments are primarily in **Portuguese (Brazilian)**. Keep consistent.