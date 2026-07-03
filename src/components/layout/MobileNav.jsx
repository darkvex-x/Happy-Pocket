import React, { useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { NAV_ITEMS } from '../../constants/navItems';
import { usePermissions } from '../../context/PermissionContext';
import { ROLES } from '../../services/permissions';

export default function MobileNav() {
  const { role } = usePermissions();

  const visibleItems = useMemo(
    () => NAV_ITEMS.filter((item) => !item.adminOnly || role === ROLES.ADMIN),
    [role],
  );

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[var(--card)] border-t border-gray-200 dark:border-gray-800 flex items-center justify-around z-50 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
      {visibleItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                isActive ? 'text-[var(--color-primary-600)] dark:text-[var(--color-primary-400)]' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`
            }
          >
            <Icon size={20} />
            <span className="text-[10px] font-medium">{item.shortName}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

