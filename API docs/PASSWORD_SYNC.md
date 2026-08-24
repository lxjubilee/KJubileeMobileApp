# Password sync: KJubilee → JubileeInspire (server-to-server)

When a user changes or resets their password on KJubilee, the new password must
also be pushed to the **JubileeInspire (JI)** user DB so cross-platform sign-in
stays consistent.

> **This is a backend responsibility. The mobile app does NOT implement it.**

## The mobile app's part (already done)

- **Change password** → `POST https://api.kjubilee.com/api/auth/change-password`
  (`current_password`, `new_password`). See `src/services/auth/accountApi.ts` /
  `authService.ts`.
- **Reset password** → the emailed link is redeemed on the website
  (`kjubilee.com/reset-password?token=…`); the app only requests it via
  `POST /api/auth/forgot-password`.

That's the entire client responsibility. The app sends the new password to the
KJubilee backend and stops there.

## The backend's part (api.kjubilee.com — NOT this repo)

Inside its `change-password` and `reset-password` handlers, right after the local
KJubilee DB is updated, the backend pushes the password to JI:

```bash
# 1) Mint a JI service token (cache ~1h).
curl -X POST https://api.jubileeinspire.com/api/auth/service/token \
  -H 'Content-Type: application/json' \
  -d '{"client_id":"kjubilee","client_secret":"<the-shared-secret>"}'
# → { "access_token":"<TOKEN>", "expires_in":3600, "scope":"admin.set_password admin.provision" }

# 2) Push the new password to JI.
curl -X POST https://api.jubileeinspire.com/api/auth/admin/set-password \
  -H 'Authorization: Bearer <TOKEN>' \
  -H 'Content-Type: application/json' \
  -d '{"email":"user@example.com","newPassword":"<the new password>"}'
# → 200 { "ok": true }
```

Recommended: best-effort + logged/retried, so a JI hiccup doesn't fail the user's
password change. (Mirrors how JI already calls KJubilee — see `AUTH_API 1.md`
§11–§12.)

## ⚠️ Security boundary — do NOT move this into the app

The `client_secret`, the `service/token` exchange, and the `admin/set-password`
call must live **only on the server**. They are not part of the browser/app
surface. If the secret shipped in the mobile binary it would be trivially
extractable (decompile / MITM), letting anyone mint a service token and set **any
JI user's password** — full account takeover. The app therefore contains no
service secret and never calls JI's admin endpoints.
