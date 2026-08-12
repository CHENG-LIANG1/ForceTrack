import {
  createMember,
  MemberValidationError,
  validateMemberFields,
} from '@/domain/member';
import { FIXED_NOW, makeDependencies, testMembers } from '@/test/fixtures';

describe('member domain', () => {
  it('normalizes valid fields and records identity time', () => {
    expect(
      createMember(
        { name: '  Grace Kim ', email: ' GRACE@Example.com ' },
        testMembers,
        makeDependencies(['member-grace']),
      ),
    ).toEqual({
      id: 'member-grace',
      name: 'Grace Kim',
      email: 'grace@example.com',
      createdAt: FIXED_NOW,
    });
  });

  it('enforces field validation and case-insensitive email uniqueness in the domain', () => {
    expect(
      validateMemberFields(
        { name: 'Another Ada', email: ' ADA@EXAMPLE.COM ' },
        testMembers,
      ),
    ).toBe('email_duplicate');
    expect(validateMemberFields({ name: '', email: 'not-email' })).toBe(
      'name_required',
    );
    expect(() =>
      createMember(
        { name: 'Duplicate', email: 'ada@example.com' },
        testMembers,
        makeDependencies(),
      ),
    ).toThrow(MemberValidationError);
  });

  it.each([
    [{ name: '', email: 'member@example.com' }, 'name_required'],
    [{ name: 'x'.repeat(81), email: 'member@example.com' }, 'name_too_long'],
    [{ name: 'Grace', email: '' }, 'email_required'],
    [{ name: 'Grace', email: 'not-email' }, 'email_invalid'],
  ] as const)('returns the precise issue for %o', (fields, expectedIssue) => {
    expect(validateMemberFields(fields)).toBe(expectedIssue);
  });
});
