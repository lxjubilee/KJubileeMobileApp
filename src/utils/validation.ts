/**
 * Shared form validation for the auth flows.
 *
 * These rules were duplicated across SignUp / ForgotPassword / ChangePassword
 * with subtly different regexes (and Sign In had none at all). Centralising them
 * means the client agrees with the server on what it will accept, which matters
 * on the Jubilee Door: `/api/auth/*` is rate-limited to 50 requests per 15
 * minutes per IP, and on mobile carrier CGNAT puts thousands of users behind one
 * egress address — so a malformed email that we could have rejected locally
 * spends a request from a shared budget for a guaranteed 400.
 */

/**
 * The same pattern the web's Jubilee Door uses (`JubileeDoor.tsx`) and the same
 * one the API validates `email` with. Stricter than the old `/^\S+@\S+\.\S+$/`:
 * it also rejects an `@` inside the local part or the domain.
 */
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Server-side cap (`email` is `varchar(254)` and zod-checked at 254). */
export const MAX_EMAIL_LENGTH = 254;

/** Matches the API's `password` schema: 8–200 characters. */
export const MIN_PASSWORD_LENGTH = 8;

/** Minimum signup age. Enforced client-side; see `isOldEnough`. */
export const MIN_AGE = 13;

/** Trim + lowercase, matching what the server stores and compares against. */
export const normalizeEmail = (email: string): string => email.trim().toLowerCase();

export const isEmail = (email: string): boolean => {
  const value = email.trim();
  return value.length <= MAX_EMAIL_LENGTH && EMAIL_RE.test(value);
};

export const isPasswordLongEnough = (password: string): boolean =>
  password.length >= MIN_PASSWORD_LENGTH;

/** A password that is both long enough and matches its confirmation. */
export const passwordsMatch = (password: string, confirm: string): boolean =>
  isPasswordLongEnough(password) && password === confirm;

/** Whole-year age from a date of birth as of today. */
export const ageFrom = (dob: Date): number => {
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDelta = today.getMonth() - dob.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < dob.getDate())) age -= 1;
  return age;
};

export const isOldEnough = (dob: Date): boolean => ageFrom(dob) >= MIN_AGE;

/**
 * Format a Date as the `YYYY-MM-DD` the API expects for `date_of_birth`.
 *
 * Built from LOCAL date parts on purpose. `toISOString().slice(0, 10)` converts
 * to UTC first, which shifts the date back a day for every user west of UTC — a
 * 1 Jan 2000 birthday becomes 1999-12-31 in the Americas. That is wrong on its
 * own and it straddles the 13+ boundary.
 */
export const toIsoDate = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * Parse a date the identity authority sent us (`profile.date_of_birth`) into a
 * local Date, for pre-filling the date-of-birth field.
 *
 * Deliberately permissive. The server normalises to `YYYY-MM-DD`, but its own
 * fallback path can emit other shapes, and a stricter parser fails in the worst
 * possible way: it returns null, the field renders empty, and the user is asked
 * to retype a date the server already knows — with nothing logged.
 *
 * A leading `YYYY-MM-DD` is taken **verbatim**, never via `new Date()` + local
 * parts: `1990-12-10T00:00:00.000Z` parsed as an instant lands on 9 December for
 * everyone west of UTC. The calendar date the authority stored is the answer,
 * not the instant it happens to correspond to here.
 */
export const fromIsoDate = (value: string | null | undefined): Date | null => {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  // `YYYY-MM-DD` at the start, whatever follows it (a time, a zone, nothing).
  // `-` and `/` are both accepted as separators.
  const m = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/.exec(raw);
  if (m) {
    const [, y, mo, d] = m;
    const date = new Date(Number(y), Number(mo) - 1, Number(d));
    // Reject impossible dates that Date silently rolls over (e.g. 2001-02-30).
    if (
      date.getFullYear() === Number(y) &&
      date.getMonth() === Number(mo) - 1 &&
      date.getDate() === Number(d)
    ) {
      return date;
    }
    return null;
  }

  // Last resort for anything else parseable (e.g. "Dec 10 1990").
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
};
