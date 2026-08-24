import { authClient } from '@/services/auth/authClient';
import type { Entitlement, EntitlementDto } from './types';

/**
 * Thin client for the plan-entitlement endpoint (`/api/subscriptions/me` on
 * api.kjubilee.com). Uses the shared `authClient`. Reports the signed-in user's
 * plan so the app is plan-aware after login; the per-track playback gate itself
 * is driven by the server-authoritative `/api/listening/intent` (see listeningApi).
 */

const DEFAULT_PREVIEW_SECONDS = 60;

export const entitlementApi = {
  /** Fetch the caller's plan entitlement. */
  getMe: async (): Promise<Entitlement> => {
    const { data } = await authClient.get<EntitlementDto>('/api/subscriptions/me');
    const e = data.entitlement ?? {};
    return {
      isPaid: !!e.isPaid,
      dailySongLimit: e.dailySongLimit ?? null,
      previewSeconds: e.previewSeconds ?? DEFAULT_PREVIEW_SECONDS,
      planCode: e.plan?.code,
      planName: e.plan?.name,
    };
  },
};
