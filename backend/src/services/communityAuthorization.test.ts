import { describe, expect, it } from 'vitest';
import { Types } from 'mongoose';
import { getCommunityPermissions, isCommunityBanned } from './communityAuthorization.js';

const id = () => new Types.ObjectId();

describe('community authorization', () => {
  it('resolves custom role capabilities without granting unrelated permissions', () => {
    const owner = id();
    const moderator = id();
    const community = {
      creatorId: owner,
      admins: [],
      roles: [{ name: 'Moderator', permissions: ['manage_members', 'view_audit_log'] }],
      memberRoles: [{ userId: moderator, roleName: 'Moderator' }],
      bannedMembers: [],
    } as any;
    const permissions = getCommunityPermissions(community, moderator.toString());
    expect(permissions.has('manage_members')).toBe(true);
    expect(permissions.has('manage_settings')).toBe(false);
  });

  it('treats active bans as blocking and expired bans as inactive', () => {
    const user = id();
    expect(isCommunityBanned({ bannedMembers: [{ userId: user }] } as any, user.toString())).toBe(true);
    expect(isCommunityBanned({
      bannedMembers: [{ userId: user, expiresAt: new Date(Date.now() - 1000) }],
    } as any, user.toString())).toBe(false);
  });
});
