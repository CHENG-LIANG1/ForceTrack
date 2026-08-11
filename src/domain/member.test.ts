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
});
