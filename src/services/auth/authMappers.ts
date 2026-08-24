import { UserDTO } from './authDto';

/** Domain shape the app/Redux works with (decoupled from the API DTO). */
export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  accountType?: string;
  subscriptionStatus?: string;
  avatar?: string;
}

export const mapUser = (d: UserDTO): AuthUser => ({
  id: d.id,
  email: d.email,
  displayName: d.displayName ?? ([d.firstName, d.lastName].filter(Boolean).join(' ') || d.email),
  firstName: d.firstName,
  lastName: d.lastName,
  role: d.role,
  accountType: d.accountType,
  subscriptionStatus: d.subscriptionStatus,
  avatar: d.profile_picture_url,
});
