# Security checklist (Market360)

## Immediate actions (do these now)

1. **Rotate credentials**
   - MongoDB user/password in Atlas: rotate or delete the leaked user.
   - Cloudinary: rotate the API key/secret (or regenerate the API secret).
   - JWT/CSRF secrets: generate new random secrets for production.

2. **Purge secrets from git history**
   - Install `git-filter-repo` (recommended) and rewrite history to remove previously committed `.env` files.
   - After rewriting history, force-push and coordinate with anyone who has cloned the repo (they must re-clone).

   Example (run from repo root):
   - `git filter-repo --path Backend/.env --path Frontend/.env --invert-paths`
   - `git push --force --all`
   - `git push --force --tags`

3. **Move secrets to platform env vars**
   - Render (backend): set `MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CSRF_SECRET`, `FRONTEND_ORIGINS`, `CLOUDINARY_*`, `COOKIE_SECURE=true`, `COOKIE_SAMESITE=none`, `NODE_ENV=production`.
   - Vercel (frontend): set `REACT_APP_API_URL` to your backend origin + `/api`.

## Auth model (implemented)

- Access token is issued as an `httpOnly` cookie named `access_token`.
- CSRF protection is required for unsafe methods (POST/PUT/PATCH/DELETE) when the auth cookie is present.
- Frontend fetches CSRF via `GET /api/auth/csrf` and sends it as `x-csrf-token`.

