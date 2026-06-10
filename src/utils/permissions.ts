import { UserRole } from '@/types';

type Permission = string;

const rolePermissions: Record<UserRole, Permission[]> = {
  admin_master: [
    'view_dashboard',
    'manage_users',
    'manage_suppliers',
    'manage_deliveries',
    'manage_loads',
    'manage_expeditions',
    'view_reports',
    'view_audit_logs',
    'change_system_settings',
    'export_reports',
  ],
  admin: [
    'view_dashboard',
    'manage_suppliers',
    'manage_deliveries',
    'manage_loads',
    'manage_expeditions',
    'view_reports',
    'export_reports',
  ],
  operator: [
    'view_dashboard',
    'manage_deliveries',
    'manage_loads',
    'manage_expeditions',
    'view_reports',
  ],
  consultant: [
    'view_dashboard',
    'view_reports',
  ],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return rolePermissions[role]?.includes(permission) || false;
}

export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(role, permission));
}

export function canManageUsers(role: UserRole): boolean {
  return role === 'admin_master';
}

export function canViewReports(role: UserRole): boolean {
  return hasPermission(role, 'view_reports');
}

export function canExportReports(role: UserRole): boolean {
  return hasPermission(role, 'export_reports');
}
