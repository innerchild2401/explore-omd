'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface AdminSidebarProps {
  userRole: string;
  omdId: string | null;
}

export default function AdminSidebar({ userRole, omdId }: AdminSidebarProps) {
  const pathname = usePathname();

  const menuItems = [
    {
      label: 'Dashboard',
      href: '/admin',
      icon: '📊',
    },
    {
      label: 'Sections',
      href: '/admin/sections',
      icon: '📄',
    },
    {
      label: 'Businesses',
      href: '/admin/businesses',
      icon: '🏢',
    },
    {
      label: 'Amenities',
      href: '/admin/amenities',
      icon: '✨',
    },
    {
      label: 'Reservations',
      href: '/admin/reservations',
      icon: '📅',
    },
    {
      label: 'Reviews',
      href: '/admin/reviews',
      icon: '⭐',
    },
    {
      label: 'Translations',
      href: '/admin/translations',
      icon: '🌐',
    },
    {
      label: 'Users',
      href: '/admin/users',
      icon: '👥',
      adminOnly: true,
    },
  ];

  return (
    <aside className="w-64 bg-gray-900 text-white">
      <div className="p-6">
        <h2 className="text-2xl font-bold">OMD Admin</h2>
        <p className="mt-1 text-sm text-gray-400">
          {userRole === 'super_admin' ? 'Super Admin' : 'OMD Admin'}
        </p>
      </div>

      <nav className="mt-6">
        {menuItems.map((item) => {
          // Skip admin-only items for non-super admins
          if (item.adminOnly && userRole !== 'super_admin') {
            return null;
          }

          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center px-6 py-3 transition-colors',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800'
              )}
            >
              <span className="mr-3 text-xl">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="absolute bottom-0 w-64 border-t border-gray-800 p-6">
        <Link
          href="/"
          className="flex items-center text-gray-400 transition-colors hover:text-white"
        >
          <span className="mr-2">👁️</span>
          <span className="text-sm">View Public Site</span>
        </Link>
      </div>
    </aside>
  );
}

