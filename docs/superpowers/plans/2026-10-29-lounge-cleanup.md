# Lounge cleanup — approved scope, 2026-10-29

Keep rankings, Golden Glove, club detail and comparison. Remove lounge home and Supabase dependencies. Keep administration in an independent modal opened from navigation.

1. Add executable GAS authorization tests: verified OAuth session, administrator allowlist, expiry, denial without writes, own-account deletion ownership.
2. Issue six-hour authenticated session from successful OAuth token exchange. Add GAS admin wrappers and protect public account deletion. Read administrator permission from the user DB column headed 관리자 (currently I); only TRUE grants access. Missing column/user denies access.
3. Reuse current checkout because backend is outside web Git repository. Remove home markup, home/board client objects, adapters, routes, SQL and dependency. Preserve calculator and shared ranking code. Move admin entry to navigation and use GAS via Api.call.
4. Run npm test, syntax checks, diff checks and inspect remaining references. Document setup and deployment order. No deployment or database deletion requested.

Implementation ledger: User approved scope in chat. User added the 관리자 column to user DB I on 2026-11-04. Read permission live from Sheets; never fall back to the old Script Property. Admin reauthentication uses the existing Google popup, independent of convenience-only saved login. Existing deleteAccount API must verify ownership to prevent bypassing admin wrappers.
