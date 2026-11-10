# HMRS performance audit — 10 November 2026

Scope: inspected `masharzy/hmrs` master at `58e5806` (5 November 2026), then made fixes in `feat/hmrs-performance-notice-pin-home-20261110`.

## Findings and fixes

| Impact | Code path | Finding | Change / verification |
| --- | --- | --- | --- |
| Critical | `app/api/portal/route.js` GET | Staff-only guard preceded `dashboard.data`, so a student dashboard request could return 403. | Move authorized role-specific dashboard resource before staff guard. Test all four roles by direct URL reload. |
| High | `DashboardPortal.jsx` route cache | Only the section name was used as a cache key, so attendance dates and marks exam IDs could collide. | Date/exam-keyed cache and per-selection refresh. Switch dates/exams then return to prior selection; check correct rows. |
| High | `DashboardPortal.jsx` attendance | Rendering desktop and mobile lists repeatedly scanned attendance (`find` per student). | Memoized `Map` by student ID. Profile before/after with 900 students. |
| Medium | `DashboardPortal.jsx` mutators | Routine and notice save/delete forced collection refresh. | Apply server-returned record directly to state and cached route. Verify 0 follow-up `dashboard.data` requests after save. |
| Medium | `RoutineManager.jsx` uploader | User had to upload image and then click Save. | Single Save performs optional image upload followed by metadata save. Confirm no duplicate upload. |
| Medium | `lib/dashboard-data.js` | Class teachers read up to 900 students, then filtered results after Firestore read. | Query assigned grades with `where("grade","in",grades)` before select/limit. Verify permissions and composite-index behavior. |
| Medium | `lib/server-auth.js` | `verifyIdToken(token,true)` and Firestore user lookup run on every authorized request; potentially dominant network latency. | Left intact for account revocation security. Instrument separately before altering. |
| Medium | `DashboardPortal.jsx` | Large component and one shared data state cause broad React re-renders; desktop and mobile layouts are both part of the tree. | Lazy-load notice and PIN forms; further split attendance/marks into memoized modules once Profiler confirms cost. |
| Low | `lib/public-client.js` | 15-second shared cache deduplicates homepage fetch, but cannot eliminate network on cold page loads. | Retained. Add public API CDN caching only after content freshness policy defined. |

## Fast manual verification

1. **Navigation:** DevTools Network with Preserve log and Disable cache. Log in, navigate Overview → Attendance → Marks → Routines → Overview, then browser Back/Forward. A second visit to a cached route should not fetch `dashboard.data` again. A direct reload must still work.
2. **Date/exam correctness:** Attendance date A → B → A and Marks exam X → Y → X. No stale cross-selection records should appear.
3. **Mobile:** 360 px, 390 px, and 768 px widths. Open/close drawer, check focus restore, overflow and bottom dock visibility. Run Chrome Performance profiler with 4× CPU slowdown and count component commits.
4. **Routine:** Open routine editor cold, upload 3 MB image, Save, navigate away and back. Verify one image upload + one save, immediate list update, and old data never returns. Test edit and delete.
5. **Notice:** Create notice with text only, JPG only, PDF only, and both. Validate forbidden upload (non-principal), corrupt PDF signature, >4 MB, public notice modal links, edit/remove attachment and deletion.
6. **PIN:** Each role changes its own PIN with correct old PIN, rejected wrong old PIN, rejected repeated/new mismatch; ensure old PIN fails, new PIN works and stale sessions are rejected.
7. **Backend:** Compare `dashboard.data` endpoint timing (TTFB), request counts, Firestore read counts and 95th percentile on 4G throttle. Do not infer a measured speedup from code review alone.

## Cloudflare R2 configuration

Create a Standard R2 bucket and attach a public custom domain; grant a scoped Cloudflare API token write permission to this bucket. Set on the Vercel project (server-side only):

- `CLOUDFLARE_ACCOUNT_ID` — Cloudflare account ID (32 hexadecimal characters).
- `CLOUDFLARE_R2_BUCKET` — bucket name, e.g. `hmrs-notices`.
- `CLOUDFLARE_R2_API_TOKEN` — Cloudflare API token for the R2 object upload REST API; not an S3 access key.
- `CLOUDFLARE_R2_PUBLIC_URL` — HTTPS public custom domain root, e.g. `https://files.example.edu`.

`IMGBB_API_KEY` is reused for notice images. No credentials are sent to clients. PDFs are limited to 4 MB to stay below common Vercel request body limits. For larger PDFs, migrate to S3-compatible presigned browser-to-R2 uploads. This implementation stores public school notices, not private student documents.

## Remaining performance work (needs measurements)

- Superseded route GETs now use `AbortController`; role cache is invalidated on Firebase user change and stale auth responses are discarded. Verify no visible `AbortError`, no old-account data leaks, and no unhandled promise rejections during rapid switching and sign-out.
- Extract Attendance and Marks route components from the monolithic portal, memoize data grids and minimize state dependencies.
- Replace client-side fetching of up to 900 students with Firestore pagination only after full record editing and filtering semantics are validated.
- Optimize Firestore reads in summary: current attendance read fetches all today's rows before class-scoped filtering; review indexes before adding `where("grade","in",...)`.
- Consider a safe, short-lived authentication claim cache only if revocation/lockout enforcement can be retained; no auth bypass in the current PR.
