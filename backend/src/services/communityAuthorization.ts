import { Community, ICommunity } from '../models/Community.js';
import { CustomError } from '../utils/customError.js';

export const COMMUNITY_PERMISSIONS = [
  'manage_settings',
  'manage_channels',
  'manage_members',
  'manage_roles',
  'manage_events',
  'view_audit_log',
] as const;
export type CommunityPermission = typeof COMMUNITY_PERMISSIONS[number];

export const getCommunityPermissions = (community: ICommunity, userId: string): Set<CommunityPermission> => {
  if (community.creatorId.toString() === userId || community.admins.some((id) => id.toString() === userId)) {
    return new Set(COMMUNITY_PERMISSIONS);
  }
  const roleNames = community.memberRoles
    .filter((membership) => membership.userId.toString() === userId)
    .map((membership) => membership.roleName);
  const permissions = community.roles
    .filter((role) => roleNames.includes(role.name))
    .flatMap((role) => role.permissions || [])
    .filter((permission): permission is CommunityPermission =>
      COMMUNITY_PERMISSIONS.includes(permission as CommunityPermission)
    );
  return new Set(permissions);
};

export const requireCommunityPermission = async (
  communityId: string,
  userId: string,
  permission: CommunityPermission
) => {
  const community = await Community.findById(communityId);
  if (!community) throw new CustomError('Community not found', 404);
  if (!getCommunityPermissions(community, userId).has(permission)) {
    throw new CustomError('Community permission denied', 403);
  }
  return community;
};

export const isCommunityBanned = (community: ICommunity, userId: string, now = new Date()) =>
  community.bannedMembers.some((ban) =>
    ban.userId.toString() === userId && (!ban.expiresAt || ban.expiresAt > now)
  );
