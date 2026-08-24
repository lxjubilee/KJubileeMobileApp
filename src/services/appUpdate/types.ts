/** Result of a successful update check where an update IS available. */
export interface UpdateCheckResult {
  updateAvailable: true;
  currentVersion: string;
  latestVersion: string;
  /** When true, the app must not be usable until updated (no "Later"). */
  mandatory: boolean;
  /** Store link the "Update" button opens (App Store / Play Store). */
  storeUrl: string;
  /** Optional server-provided popup title / message overrides. */
  title: string | null;
  message: string | null;
}
