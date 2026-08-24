/** Wire + domain shapes for the plan-entitlement API (`/api/subscriptions/me`). */

/**
 * Raw server payload from `GET /api/subscriptions/me` (only the fields we read).
 * `dailySongLimit`/`previewSeconds` live on the entitlement itself; `plan` carries
 * the code/name. Mirrors the web `Entitlement` shape (lib/subscription.ts).
 */
export interface EntitlementDto {
  entitlement?: {
    isPaid?: boolean;
    status?: string;
    dailySongLimit?: number | null;
    previewSeconds?: number;
    plan?: { code?: string; name?: string } | null;
  } | null;
}

/**
 * Domain shape the app works with. `dailySongLimit` is `null` for unlimited
 * (paid) plans and a number (e.g. 7) for Free. `previewSeconds` is the preview
 * cap applied once the daily allowance is spent.
 */
export interface Entitlement {
  isPaid: boolean;
  dailySongLimit: number | null;
  previewSeconds: number;
  planCode?: string;
  planName?: string;
}
