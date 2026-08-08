# AGENTS.md — COCONUDI

## What This Is

React SPA (TikTok-style video platform for models). Built with Vite + React 18 + TypeScript + Tailwind + shadcn/ui. Backend is Supabase (auth, DB, edge functions). Videos served via Bunny.net CDN.

## Commands

```bash
npm run dev          # Dev server on localhost:3000
npm run build        # Production build → dist/
npm run build:dev    # Dev-mode build
npm run lint         # ESLint (flat config)
npm run preview      # Preview production build
```

**No type-check script exists in package.json** despite README claiming `npm run type-check`. TypeScript checking happens through ESLint. Run `npx tsc --noEmit` manually if needed.

## Dev Server Port

Vite config uses port **3000** (not the typical 5173). README is stale on this.

## Path Alias

`@/` maps to `./src/`. Use this everywhere — configured in both `vite.config.ts` and `tsconfig.json`.

## Project Structure

- `src/pages/` — Route-level components (80+ pages). Main entry: `TikTokApp.tsx` / `Index.tsx`
- `src/components/` — Reusable components. `admin/`, `creator/`, `tiktok/`, `ui/` (shadcn)
- `src/hooks/` — 50+ custom hooks. Core: `useIntelligentFeed`, `useVideoActions`, `useGamification`
- `src/integrations/supabase/` — Auto-generated Supabase client. **Do not edit `client.ts` manually**
- `src/types/database.ts` — Core type definitions (User, Video, Comment, Like)
- `supabase/` — SQL migrations, edge functions, RLS policies. Many ad-hoc fix scripts
- `cloudflare-worker/` — Share proxy for clean URLs (share.coconudi.com)

## Key Architecture Decisions

- **Routing**: React Router v6. `/:username` catch-all route for profiles — placed last intentionally
- **State**: TanStack Query (React Query) with 5min stale time. Cart and audio contexts at root
- **Auth**: Supabase Auth with PKCE flow. `ProtectedRoute` and `AdminRoute` wrappers
- **Roles**: `user_roles` table. Roles: `user`, `creator`, `admin`, `moderator`
- **Supabase client**: Hardcoded URL/key in `src/integrations/supabase/client.ts` (auto-generated, do not edit)
- **UI**: shadcn/ui with `slate` base color, CSS variables enabled

## Supabase Edge Functions

19+ edge functions in `supabase/functions/`. Most have `verify_jwt = false` (check `supabase/config.toml`). Key ones:
- `generate-pix`, `verify-payment`, `process-payment` — Payment flow
- `follow-model`, `share-video`, `share-profile` — Social features
- `webhook-dispatcher`, `neonpay-webhook`, `payment-webhook` — Payment webhooks
- `ingest-instagram`, `ig-create-creator-account` — Instagram integration

## Known Issues (Verify Before Fixing)

- User ID inconsistency: localStorage vs Supabase Auth (documented in README)
- Intelligent feed may be disabled in favor of basic feed
- RLS policies have caused recursion issues — many fix scripts in `supabase/`
- README's `npm run type-check` script does not exist

## Lovable Platform

This project uses Lovable (lovable.dev). Plugins in `vite.config.ts`:
- `lovable-tagger` — component tagger (dev only)
- `@lovable.dev/vite-plugin-dev-server-bridge` and `hmr-gate` in devDependencies

## Docker

Dockerfile builds with `npm install --legacy-peer-deps` (peer dep conflicts exist). Serves via nginx on port 3000.

## Language

Codebase and comments are primarily in **Portuguese (Brazilian)**. Page names, route descriptions, and SQL comments are in PT-BR. Keep consistent with this convention.
