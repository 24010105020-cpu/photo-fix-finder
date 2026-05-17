# FixLens v2 — Full Platform Build

Turn the current single-page diagnose tool into a multi-user app with auth, persistent history, image storage, and a dashboard.

## 1. Database (one migration)

- `profiles` table: `id uuid PK references auth.users`, `full_name`, `email`, `avatar_url`, `created_at`. Auto-created via `handle_new_user` trigger on `auth.users` insert.
- Rebuild `diagnostics` table (replaces existing public `diagnoses`):
  `id`, `user_id uuid not null`, `image_url text`, `device_type`, `ai_diagnosis text`, `problems jsonb`, `estimated_repair_cost_min numeric`, `estimated_repair_cost_max numeric`, `confidence_score text`, `repair_urgency text`, `recommended_solution text`, `repair_time text`, `created_at`.
- Drop the old open `diagnoses` table.
- RLS on both tables — users can only SELECT/INSERT/UPDATE/DELETE their own rows (`auth.uid() = user_id` / `id`).
- Storage bucket `device-images` (public read so AI + UI can load URLs). Policies: authenticated users insert/update/delete only within their own `{user_id}/...` folder.

## 2. Auth

- Use Supabase email/password + Google OAuth (configure social auth in same turn).
- New routes:
  - `/login`, `/signup` — forms, redirect to `/dashboard` on success.
  - `_authenticated` pathless layout — gates `/dashboard`, `/scan`, `/scan/$id`.
- `useAuth` hook subscribing to `onAuthStateChange` + `getSession`, exposes `user`, `signOut`.
- Root layout shows nav with Login/Signup or Dashboard/Sign out.

## 3. Server functions

- `diagnoseDevice` (rewrite existing): `requireSupabaseAuth` middleware. Accepts `imageUrl` (from storage) + optional `deviceHint`. Calls Lovable AI Gateway (`google/gemini-2.5-flash`) with the public storage URL. Saves row into `diagnostics` scoped to `userId`. Returns full diagnostic + new row id.
- `listMyDiagnostics`, `getMyDiagnostic(id)` — auth-protected reads.

## 4. UI

- `/` landing — keep existing hero, CTA → Sign up / Try scan.
- `/scan` — drag-and-drop + camera capture + file upload. Uploads to `device-images/{user_id}/{uuid}.jpg`, then calls `diagnoseDevice`, redirects to `/scan/$id`.
- `/scan/$id` — results page: image, device, problems, cost range, confidence badge, urgency badge, recommendation, scan date, "Download report" button (client-side PDF via `jspdf`), technician recommendation block.
- `/dashboard` — grid of past scans (thumbnail, device, date, urgency badge, cost). Click → results page.
- Dark/light mode toggle in header (class on `<html>`, persisted in localStorage).
- Loading skeletons, progress indicator during upload+analysis, toast errors via `sonner`.

## 5. Files touched

New: `src/hooks/useAuth.tsx`, `src/components/Nav.tsx`, `src/components/ThemeToggle.tsx`, `src/components/ScanUploader.tsx`, `src/components/DiagnosticCard.tsx`, `src/lib/diagnostics.functions.ts`, route files for `login`, `signup`, `_authenticated`, `_authenticated/dashboard`, `_authenticated/scan`, `_authenticated/scan.$id`.
Updated: `src/routes/__root.tsx` (theme + nav + auth provider + onAuthStateChange invalidation), `src/routes/index.tsx` (landing).
Removed: old `src/lib/diagnose.functions.ts` (replaced).

## 6. Technical notes

- `attachSupabaseAuth` already wired — confirm `src/start.ts` includes it.
- Storage bucket public so Gemini can fetch URL; uploads scoped per-user via RLS.
- `configure_social_auth` for Google in same turn.
- Light theme variables added alongside existing dark theme.
- Add `jspdf` for PDF report.
