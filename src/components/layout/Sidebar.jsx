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
    <aside className="hidden md:flex flex-col bg-[#0A0A0A] h-screen sticky top-0 md:w-16 lg:w-56 transition-all duration-300 z-50 border-r border-[#2A2A2A]">
      {/* Logo */}
      <div className="h-16 px-4 flex items-center justify-center lg:justify-start border-b border-[#2A2A2A] gap-3 flex-shrink-0">
        <div className="w-8 h-8 rounded-lg bg-[#2563EB] flex items-center justify-center flex-shrink-0">
          <img
            src="/logo-icon.png"
            alt="Digi Moi"
            className="w-5 h-5 object-contain"
          />
        </div>
        <div className="hidden lg:flex flex-col leading-none">
          <span className="font-semibold text-[15px] text-white tracking-tight">Digi Moi</span>
          <span className="text-[10px] text-[#737373] font-medium tracking-wide mt-0.5">Wedding Collection</span>
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
                `flex items-center md:justify-center lg:justify-start gap-3 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A] ${
                  isActive
                    ? "bg-[#2563EB]/15 text-[#2563EB]"
                    : "text-[#737373] hover:text-white hover:bg-[#161616]"
                }`
              }
            >
              <Icon
                size={18}
                className="flex-shrink-0 transition-transform duration-150 group-hover:scale-105"
              />
              <span className="hidden lg:block whitespace-nowrap">{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-[#2A2A2A]">
        <div className="hidden lg:block text-[10px] text-[#737373] text-center tracking-widest font-mono">
          v1.0.0 Pro
        </div>
      </div>
    </aside>
  );
}
