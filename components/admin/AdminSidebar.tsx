'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface AdminSidebarProps {
  userRole: string;
  activeOmdId: string | null;
}

export default function AdminSidebar({ userRole, activeOmdId }: AdminSidebarProps) {
  const pathname = usePathname();
  const isSuperAdmin = userRole === 'super_admin';
  const isGlobalView = isSuperAdmin && !activeOmdId;

  interface MenuItem {
    label: string;
    href: string;
    icon: string;
    adminOnly?: boolean;
  }

  const destinationMenuItems: MenuItem[] = [
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
      label: 'Analytics',
      href: '/admin/analytics',
      icon: '📈',
    },
    {
      label: 'Amenities',
      href: '/admin/amenities',
      icon: '✨',
    },
    {
      label: 'Areas',
      href: '/admin/areas',
      icon: '📍',
    },
    {
      label: 'Reservations',
      href: '/admin/reservations',
      icon: '📅',
    },
    {
      label: 'Ratings & Feedback',
      href: '/admin/ratings',
      icon: '⭐',
    },
    {
      label: 'Labels',
      href: '/admin/labels',
      icon: '🏷️',
    },
    {
      label: 'Auto Top Pages',
      href: '/admin/auto-top-pages',
      icon: '📊',
    },
    {
      label: 'Landing Pages',
      href: '/admin/landing-pages',
      icon: '🌐',
    },
    {
      label: 'OMD Approvals',
      href: '/admin/omd-approvals',
      icon: '🏛️',
      adminOnly: true,
    },
    {
      label: 'Contact Inquiries',
      href: '/admin/contact-inquiries',
      icon: '📧',
      adminOnly: true,
    },
    {
      label: 'Users',
      href: '/admin/users',
      icon: '👥',
      adminOnly: true,
    },
  ];

  const platformMenuItems: MenuItem[] = [
    {
      label: 'Dashboard',
      href: '/admin',
      icon: '🧭',
    },
    {
      label: 'OMD Approvals',
      href: '/admin/omd-approvals',
      icon: '🏛️',
    },
    {
      label: 'Contact Inquiries',
      href: '/admin/contact-inquiries',
      icon: '📧',
    },
    {
      label: 'Booking Issues',
      href: '/admin/booking-issues',
      icon: '🚨',
    },
    {
      label: 'Ratings & Feedback',
      href: '/admin/ratings',
      icon: '⭐',
    },
    {
      label: 'Users',
      href: '/admin/users',
      icon: '👥',
    },
  ];

  const menuToRender = isGlobalView ? platformMenuItems : destinationMenuItems;

  return (
    <aside className="w-64 bg-gray-900 text-white">
      <div className="p-6">
        <h2 className="text-2xl font-bold">
          {isGlobalView ? 'Super Admin' : 'OMD Admin'}
        </h2>
        <p className="mt-1 text-sm text-gray-400">
          {isGlobalView
            ? 'Global platform oversight'
            : userRole === 'super_admin'
            ? 'Super Admin • Destination mode'
            : 'OMD Admin'}
        </p>
      </div>

      {isSuperAdmin && !isGlobalView && (
        <div className="px-6 text-xs uppercase tracking-wide text-gray-500">
          Destination Tools
        </div>
      )}

      <nav className="mt-6">
        {menuToRender.map((item) => {
          // Skip admin-only items for non-super admins
          if (item.adminOnly && !isSuperAdmin) {
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

      {isSuperAdmin && !isGlobalView && (
        <div className="mt-8 px-6">
          <div className="rounded-lg border border-blue-400 bg-blue-500/10 p-4 text-xs text-blue-100">
            Viewing destination-specific tools. Use the selector above to switch or return to the global view.
          </div>
        </div>
      )}

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

