import { PermissionKey, User, Role } from '../types';
import { storage } from './storageService';

export class RBACService {
  static getCurrentUser(): User {
    return storage.getCurrentUser();
  }

  static getRoles(): Role[] {
    return storage.getRoles();
  }

  static getUserPermissions(user?: User): PermissionKey[] {
    const targetUser = user || storage.getCurrentUser();
    if (!targetUser) return [];

    // If user has custom permissions explicitly saved by manager, use those!
    if (targetUser.permissions && Array.isArray(targetUser.permissions)) {
      return targetUser.permissions;
    }

    // Otherwise fallback to their role template permissions
    const roles = storage.getRoles();
    const role = roles.find(r => r.id === targetUser.roleId);
    return role ? role.permissions : [];
  }

  static isSuperAdmin(user?: User): boolean {
    const targetUser = user || storage.getCurrentUser();
    if (!targetUser) return false;
    return (
      targetUser.roleId === 'role-super-admin' ||
      targetUser.roleTitle?.toLowerCase().includes('super admin') ||
      targetUser.roleTitle?.toLowerCase().includes('kurucu') ||
      targetUser.email === 'tdmfatih.FD@gmail.com'
    );
  }

  static hasPermission(permission: PermissionKey, user?: User): boolean {
    const targetUser = user || storage.getCurrentUser();
    if (!targetUser) return false;

    // Super admin bypass
    if (this.isSuperAdmin(targetUser)) return true;

    // Inactive user has no permissions
    if (targetUser.isActive === false) return false;

    const permissions = this.getUserPermissions(targetUser);
    return permissions.includes(permission);
  }

  static canViewCost(user?: User): boolean {
    const targetUser = user || storage.getCurrentUser();
    if (!targetUser) return false;
    if (this.isSuperAdmin(targetUser)) return true;
    if (typeof targetUser.canViewCost === 'boolean') {
      return targetUser.canViewCost;
    }
    return this.hasPermission('offers.view_cost', targetUser);
  }

  static canManageUsers(user?: User): boolean {
    const targetUser = user || storage.getCurrentUser();
    if (!targetUser) return false;
    if (this.isSuperAdmin(targetUser)) return true;
    return this.hasPermission('users.manage', targetUser) || this.hasPermission('settings.manage', targetUser);
  }

  static canEditServices(user?: User): boolean {
    return this.hasPermission('service.edit', user);
  }

  static canCompleteInstallation(user?: User): boolean {
    return this.hasPermission('installation.complete', user);
  }

  static canManageSettings(user?: User): boolean {
    return this.hasPermission('settings.manage', user);
  }

  static switchUser(userId: string): User {
    storage.setCurrentUser(userId);
    return storage.getCurrentUser();
  }
}
