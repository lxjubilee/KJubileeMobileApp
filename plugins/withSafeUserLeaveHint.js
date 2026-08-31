const { withMainActivity } = require('expo/config-plugins');

/**
 * Stop the app dying when it is left during startup.
 *
 * WHAT CRASHES. `ReactActivityDelegate.onUserLeaveHint()` is
 *
 *     public void onUserLeaveHint() {
 *       Objects.requireNonNull(mReactDelegate).onUserLeaveHint();
 *     }
 *
 * and `mReactDelegate` is only assigned once `onCreate` has run far enough to
 * build it. Android calls `onUserLeaveHint` whenever the user leaves the
 * activity — Home button, recents, app switch — and it will do so during a cold
 * start if the person is quick. The framework then throws an unhandled NPE out
 * of a system lifecycle callback and the process dies:
 *
 *     FATAL EXCEPTION: main
 *     java.lang.NullPointerException
 *       at com.facebook.react.ReactActivityDelegate.onUserLeaveHint(...:191)
 *       at com.facebook.react.ReactActivity.onUserLeaveHint(...:139)
 *       at android.app.Activity.performUserLeaving(Activity.java:9943)
 *
 * Caught in negative testing (NEG-005 / 006 / 136 / 142) on 2026-08-31.
 *
 * WHY A PLUGIN. `android/` is gitignored and rewritten by `expo prebuild`, so an
 * edit to MainActivity.kt would survive exactly until the next prebuild — which
 * is how the launcher-icon fix was nearly lost. This runs as part of prebuild
 * instead, so the guard is reapplied every time the directory is regenerated.
 *
 * WHY SWALLOWING IS RIGHT HERE. `onUserLeaveHint` is a notification, not a
 * transaction: React Native forwards it so JS can react to the user leaving. If
 * there is no delegate yet there is no JS to notify, so there is nothing to do
 * and nothing is lost by skipping it. Only this one NPE is swallowed — any other
 * failure still propagates.
 */
const GUARD = `
  /**
   * Guarded by the withSafeUserLeaveHint config plugin. See plugins/ for why:
   * the framework's delegate is null until onCreate finishes, and Android can
   * call this before then, which kills the process.
   */
  override fun onUserLeaveHint() {
    try {
      super.onUserLeaveHint()
    } catch (e: NullPointerException) {
      // No delegate yet means no JS to notify. Nothing to forward, nothing lost.
    }
  }
`;

module.exports = function withSafeUserLeaveHint(config) {
  return withMainActivity(config, (cfg) => {
    const { modResults } = cfg;

    if (modResults.language !== 'kt') {
      throw new Error(
        `withSafeUserLeaveHint expects a Kotlin MainActivity, found "${modResults.language}".`,
      );
    }
    // Idempotent: prebuild may run against an already-patched file.
    if (modResults.contents.includes('override fun onUserLeaveHint()')) {
      return cfg;
    }

    const anchor = 'override fun getMainComponentName(): String = "main"';
    if (!modResults.contents.includes(anchor)) {
      throw new Error(
        'withSafeUserLeaveHint could not find getMainComponentName in MainActivity — ' +
          'the template changed, so the guard was NOT applied. Fix the anchor rather ' +
          'than letting the crash back in.',
      );
    }

    modResults.contents = modResults.contents.replace(anchor, `${anchor}\n${GUARD}`);
    return cfg;
  });
};
