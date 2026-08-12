export const SUPPORTED_LOCALES = ['zh-CN', 'en-US'] as const;
export const THEME_PREFERENCES = ['system', 'light', 'dark'] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export type ThemePreference = (typeof THEME_PREFERENCES)[number];

/** Exact member shape persisted by T0-T4. Kept only for V1 migration. */
export interface MemberV1 {
  id: string;
  name: string;
  avatar?: string;
}

export interface Member extends MemberV1 {
  email: string;
  createdAt: string;
}

export interface MemberFields {
  name: string;
  email: string;
}

export type MemberValidationIssue =
  | 'name_required'
  | 'name_too_long'
  | 'email_required'
  | 'email_invalid'
  | 'email_duplicate';

export class MemberValidationError extends Error {
  constructor(readonly issue: MemberValidationIssue) {
    super(`Invalid member: ${issue}`);
    this.name = 'MemberValidationError';
  }
}

export function normalizeMemberEmail(email: string): string {
  return email.trim().toLocaleLowerCase();
}

export function validateMemberFields(
  fields: MemberFields,
  members: readonly Member[] = [],
): MemberValidationIssue | null {
  const name = fields.name.trim();
  const email = normalizeMemberEmail(fields.email);
  if (!name) return 'name_required';
  if (name.length > 80) return 'name_too_long';
  if (!email) return 'email_required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'email_invalid';
  if (members.some((member) => normalizeMemberEmail(member.email) === email)) {
    return 'email_duplicate';
  }
  return null;
}

export function createMember(
  fields: MemberFields,
  members: readonly Member[],
  dependencies: { createId(): string; now(): string },
): Member {
  const issue = validateMemberFields(fields, members);
  if (issue) throw new MemberValidationError(issue);
  return {
    id: dependencies.createId(),
    name: fields.name.trim(),
    email: normalizeMemberEmail(fields.email),
    createdAt: dependencies.now(),
  };
}

export interface UserPreferences {
  locale: SupportedLocale;
  theme: ThemePreference;
  lastProjectId: string | null;
  recentProjectIds: string[];
}
