/** Wire shapes for the listening-entitlement gate API (`/api/listening/*`). */

/**
 * Response for `POST /api/listening/intent`. The server is authoritative: it
 * increments the caller's daily counter (Free plan) and reports whether THIS
 * play is allowed in full or capped to a preview. `mode:'limited'` means the
 * daily allowance is spent, so playback should stop at `preview_seconds`. Paid
 * plans always return `mode:'full'` with `unlimited:true`.
 */
export interface PlayIntent {
  mode: 'full' | 'limited';
  unlimited: boolean;
  plays_today: number | null;
  daily_limit: number | null;
  remaining: number | null;
  preview_seconds: number;
  status: string;
}
