# Lounge cleanup — approved scope, 2026-10-29

Keep rankings, Golden Glove, club detail and comparison. Remove lounge home and Supabase dependencies. Keep administration in an independent modal opened from navigation.

1. Add executable GAS authorization tests: verified OAuth session, administrator allowlist, expiry, denial without writes, own-account deletion ownership.
2. Issue six-hour authenticated session from successful OAuth token exchange. Add GAS admin wrappers and protect public account deletion. Configure administrators through ADMIN_EMAILS Script Property (comma/newline separated); empty list denies all.
3. Reuse current checkout because backend is outside web Git repository. Remove home markup, home/board client objects, adapters, routes, SQL and dependency. Preserve calculator and shared ranking code. Move admin entry to navigation and use GAS via Api.call.
4. Run npm test, syntax checks, diff checks and inspect remaining references. Document setup and deployment order. No deployment or database deletion requested.

Implementation ledger: User approved scope in chat. No Supabase credentials or administrator list are present in source; do not invent a default administrator. Admin reauthentication uses the existing Google popup, independent of convenience-only saved login. Existing deleteAccount API must verify ownership to prevent bypassing admin wrappers.
