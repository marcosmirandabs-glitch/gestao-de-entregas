import React from 'react';
import { useAuthStore } from '@/store/authStore';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Truck,
  Package,
  BoxIcon,
  FileText,
  Settings,
  BarChart3,
  Smartphone,
} from 'lucide-react';
import { canManageUsers, hasPermission } from '@/utils/permissions';

interface SidebarProps {
  isOpen: boolean;
}

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', permission: 'view_dashboard' },
  { id: 'suppliers', label: 'Fornecedores', icon: Truck, path: '/suppliers', permission: 'manage_suppliers' },
  { id: 'deliveries', label: 'Entregas', icon: Package, path: '/deliveries', permission: 'manage_deliveries' },
  { id: 'loads', label: 'Cargas', icon: BoxIcon, path: '/loads', permission: 'manage_loads' },
  { id: 'expeditions', label: 'Expedição', icon: FileText, path: '/expeditions', permission: 'manage_expeditions' },
  { id: 'reports', label: 'Relatórios', icon: BarChart3, path: '/reports', permission: 'view_reports' },
  { id: 'driver', label: 'Motorista', icon: Smartphone, path: '/driver', permission: 'view_dashboard' },
  { id: 'users', label: 'Usuários', icon: Users, path: '/users', permission: 'manage_users' },
  { id: 'settings', label: 'Configurações', icon: Settings, path: '/settings', permission: 'change_system_settings' },
];

export const Sidebar: React.FC<SidebarProps> = ({ isOpen }) => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) return null;

  const filteredMenuItems = menuItems.filter(item => {
    if (item.permission === 'manage_users') {
      return canManageUsers(user.role);
    }
    if (item.permission === 'change_system_settings') {
      return user.role === 'admin_master';
    }
    return hasPermission(user.role, item.permission);
  });

  return (
    <aside
      className={`${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } fixed left-0 top-16 h-screen w-64 bg-gray-900 text-white transition-transform duration-300 overflow-y-auto z-40 md:relative md:top-0 md:translate-x-0`}
    >
      <nav className="p-4">
        <div className="mb-8">
          <h2 className="text-xs uppercase tracking-wide text-gray-400 font-semibold mb-4">Menu Principal</h2>
          <ul className="space-y-2">
            {filteredMenuItems.map(item => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => navigate(item.path)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:bg-gray-800'
                    }`}
                  >
                    <Icon size={20} />
                    <span>{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="border-t border-gray-700 pt-4">
          <p className="text-xs text-gray-500 px-4">Perfil: <span className="text-gray-300 font-semibold capitalize">{user.role.replace('_', ' ')}</span></p>
        </div>
      </nav>
    </aside>
  );
};
