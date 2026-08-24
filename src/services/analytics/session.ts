/**
 * A stable listening-analytics session id for this app launch — mirrors the
 * web's per-tab `sessionStorage` id. Kept in memory (a new id per cold start is
 * fine: the server only uses it to group a now-playing presence row and to count
 * distinct sessions). Not persisted, so it resets when the app is killed.
 */

let sessionId: string | null = null;

export function getSessionId(): string {
  if (!sessionId) {
    const rand = Math.random().toString(36).slice(2, 10);
    sessionId = `s-${Date.now().toString(36)}-${rand}`;
  }
  return sessionId;
}
