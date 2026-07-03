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
    <aside className="hidden md:flex flex-col border-r border-slate-800 bg-slate-900 h-screen sticky top-0 md:w-20 lg:w-64 transition-all duration-300 z-50 text-white">
      <div className="p-4 lg:p-6 h-16 flex items-center justify-center lg:justify-start border-b border-slate-800/40">
        <img
          src="/logo-icon.png"
          alt="Digi Moi"
          className="w-9 h-9 object-contain flex-shrink-0 animate-pulse"
        />
        <h1
          style={{
            fontFamily: "'Sekuya', serif",
            fontSize: "25px",
            fontWeight: "700",
            background: "linear-gradient(90deg,#7C3AED,#ff0a7a)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            margin: 7,
            letterSpacing: "-0.5px",
            textShadow: "0 2px 5px rgba(0,0,0,0.2)"
          }}
          className="hidden lg:block ml-3 text-xl font-bold truncate"
        >
          Digi Moi
        </h1>
      </div>

      <nav className="flex-1 px-4 space-y-2 mt-6 overflow-y-auto no-scrollbar">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center md:justify-center lg:justify-start px-3.5 py-3 rounded-xl transition-all duration-300 group relative ${
                  isActive
                    ? "bg-slate-800 text-white font-semibold shadow-lg shadow-purple-500/5 border-l-[3px] border-purple-500 pl-3"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                }`
              }
              title={item.name}
            >
              <Icon size={20} className="flex-shrink-0 transition-transform duration-300 group-hover:scale-110" />
              <span className="hidden lg:block ml-3 whitespace-nowrap text-sm tracking-wide">
                {item.name}
              </span>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="hidden lg:block text-xs text-slate-500 text-center tracking-widest font-mono">
          v1.0.0 Pro
        </div>
      </div>
    </aside>
  );
}

