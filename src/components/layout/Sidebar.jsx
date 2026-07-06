import React, { useMemo } from "react";
import { NavLink } from "react-router-dom";
import { NAV_ITEMS } from "../../constants/navItems";
import { usePermissions } from "../../context/PermissionContext";
import { ROLES } from "../../services/permissions";

export default function Sidebar() {
  const { role } = usePermissions();

  const visibleItems = useMemo(
    () => NAV_ITEMS.filter((item) => !item.adminOnly || role === ROLES.ADMIN),
    [role],
  );

  return (
    <aside className="hidden md:flex flex-col bg-[var(--card-secondary)] h-screen sticky top-0 md:w-16 lg:w-56 transition-all duration-300 z-50 border-r border-[var(--border)]">
      {/* Logo */}
      <div className="h-16 px-4 flex items-center justify-center lg:justify-start border-b border-[var(--border)] gap-3 flex-shrink-0">
        <div className="w-8 h-8 rounded-lg bg-[var(--primary)] flex items-center justify-center flex-shrink-0">
          <img
            src="/logo-icon.png"
            alt="Digi Moi"
            className="w-5 h-5 object-contain"
          />
        </div>
        <div className="hidden lg:flex flex-col leading-none">
          <span className="font-display font-bold text-[15px] text-[var(--text-primary)] tracking-tight">Digi Moi</span>
          <span className="font-heading text-[10px] text-[var(--muted)] font-medium tracking-wide mt-0.5">Wedding Collection</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto no-scrollbar">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              title={item.name}
              className={({ isActive }) =>
                `flex items-center md:justify-center lg:justify-start gap-3 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background-secondary)] ${
                  isActive
                    ? "bg-[var(--primary)]/15 text-[var(--primary)]"
                    : "text-[var(--muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-secondary)]"
                }`
              }
            >
              <Icon
                size={18}
                className="flex-shrink-0 transition-transform duration-150 group-hover:scale-105"
              />
              <span className="hidden lg:block font-heading whitespace-nowrap">{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-[var(--border)]">
        <div className="hidden lg:block text-[10px] text-[var(--muted)] text-center tracking-widest font-mono">
          v1.0.0 Pro
        </div>
      </div>
    </aside>
  );
}
