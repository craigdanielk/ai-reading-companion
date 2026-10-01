# Jeralis — launch gates

Recorded blockers that must be cleared before any public launch beyond the
current private beta.

Gates 1 and 5 are the ones still standing between this build and a client
launch.

| # | Gate | Status |
| --- | --- | --- |
| 1 | Legal / IP review of translation & OCR processing, and of content supplied by users | **Blocking** — not started |
| 2 | BYOK credential encryption at rest | **Cleared** — credentials live in Supabase Vault; `provider_connection.credential_ref` holds a secret id, the plaintext is absent from the table, PostgREST cannot reach the `vault` schema, and deleting a connection deletes the secret. Reachable only through `fn_provider_credential`, a `SECURITY DEFINER` function scoped to `auth.uid()` |
| 3 | Retention & deletion policy for uploaded images and extracted text | Open — documented, not automated. Deletion is user-driven and cascades; nothing ages out on its own |
| 4 | Usage/cost telemetry reviewed against provider terms | Open — note that cost is now operator-only (`cost_ledger`, RLS on with no policies). A reader's `usage.counters` carries activity only |
| 5 | Dedicated Supabase project | **Blocking for client launch** — the app runs on the shared estate project, so storage quota *and* Vault are shared with unrelated systems |
| 6 | Reader onboarding | Open — public sign-up is removed for the private beta and access is by invitation, a recorded deviation from capability C1. Decide before launch: keep invite-only, or restore sign-up |
| 7 | Upload scanning | Open — uploads are capped at 25 MB and restricted by MIME allowlist, but nothing scans content for malware |
| 8 | The one-click demo account holds operator rights | **Cleared 2026-10-01.** `ADMIN_EMAILS` now names the owner, not `demo@adel.dev`, so the public "Continue as demo user" button no longer reaches the cost ledger, the margin or the reader list. Verified from outside: `/admin` redirects a demo session to `/library` and no console panel leaks. Re-open only if an operator address is ever added that a visitor can sign in as |

This file is the canonical record the privacy notice points at. Clearing a gate
does not happen here — it happens in the owning service and this table is updated.
