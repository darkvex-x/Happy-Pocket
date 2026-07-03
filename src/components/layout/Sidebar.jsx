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
    <aside className="hidden md:flex flex-col border-r border-gray-200 dark:border-gray-800 bg-[var(--card)] h-screen sticky top-0 md:w-20 lg:w-64 transition-all duration-300 z-50">
      <div className="p-4 lg:p-6 h-16 flex items-center justify-center lg:justify-start border-b border-transparent">
        <img
          src="/logo-icon.png"
          alt="Digi Moi"
          className="w-9 h-9 object-contain flex-shrink-0"
        />
        <h1
          style={{
    fontFamily: "'Sekuya', serif",
    fontSize: "25px",
    fontWeight: "700",
    background: "linear-gradient(90deg,#4b148c,#ff0a7a)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    margin: 7,
    letterSpacing: "-0.5px",
    textShadow: "0 2px 5px rgba(0,0,0,0.2)"
  }}

          className="hidden lg:block ml-3 text-xl font-bold text-gray-900 dark:text-white truncate"
        >
          Digi Moi
        </h1>
      </div>

      <nav className="flex-1 px-3 space-y-2 mt-6 overflow-y-auto no-scrollbar">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center md:justify-center lg:justify-start px-3 py-3 rounded-xl transition-all duration-200 group relative ${
                  isActive
                    ? "bg-[var(--color-primary-50)] text-[var(--color-primary-600)] dark:bg-[var(--color-primary-900)]/30 dark:text-[var(--color-primary-400)] font-semibold shadow-sm ring-1 ring-[var(--color-primary-500)]/10"
                    : "text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800/60"
                }`
              }
              title={item.name}
            >
              <Icon size={22} className="flex-shrink-0" />
              <span className="hidden lg:block ml-3.5 whitespace-nowrap text-sm">
                {item.name}
              </span>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-200 dark:border-gray-800">
        <div className="hidden lg:block text-xs text-gray-400 dark:text-gray-500 text-center">
          v1.0.0 Pro
        </div>
      </div>
    </aside>
  );
}

