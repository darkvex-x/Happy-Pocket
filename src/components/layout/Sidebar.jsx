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
    <aside className="hidden md:flex flex-col bg-[#111827] h-screen sticky top-0 md:w-16 lg:w-56 transition-all duration-300 z-50 border-r border-[#1F2937]">
      {/* Logo */}
      <div className="h-14 px-4 flex items-center justify-center lg:justify-start border-b border-[#1F2937] gap-2.5 flex-shrink-0">
        <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
          <img
            src="/logo-icon.png"
            alt="Digi Moi"
            className="w-5 h-5 object-contain"
          />
        </div>
        <div className="hidden lg:flex flex-col leading-none">
          <span className="font-bold text-[15px] text-white tracking-tight">Digi Moi</span>
          <span className="text-[10px] text-[#4B5563] font-medium tracking-wide">Wedding Collection</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto no-scrollbar">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              title={item.name}
              className={({ isActive }) =>
                `flex items-center md:justify-center lg:justify-start gap-3 px-2.5 py-2 rounded-xl text-[13px] font-medium transition-all duration-150 group ${
                  isActive
                    ? "bg-blue-600/15 text-blue-400 border border-blue-500/20"
                    : "text-[#6B7280] hover:text-slate-200 hover:bg-[#1F2937]"
                }`
              }
            >
              <Icon
                size={16}
                className="flex-shrink-0 transition-transform duration-150 group-hover:scale-105"
              />
              <span className="hidden lg:block whitespace-nowrap">{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-[#1F2937]">
        <div className="hidden lg:block text-[10px] text-[#374151] text-center tracking-widest font-mono">
          v1.0.0 Pro
        </div>
      </div>
    </aside>
  );
}
