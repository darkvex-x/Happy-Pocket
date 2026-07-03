import React, { useContext } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { Moon, Sun, ChevronRight, LogOut } from "lucide-react";
import { SettingsContext } from "../../context/SettingsContext";
import { ROUTES } from "../../constants/routes";
import { auth } from "../../firebase";

export default function Header() {
  const { theme, toggleTheme } = useContext(SettingsContext);
  const location = useLocation();
  const navigate = useNavigate();

  const getBreadcrumbs = () => {
    switch (location.pathname) {
      case ROUTES.DASHBOARD:
        return ["Home", "Dashboard"];
      case ROUTES.CREATE_EVENT:
        return ["Events", "Create New Event"];
      case ROUTES.CURRENT_EVENT:
        return ["Events", "Current Event"];
      case ROUTES.DATABASE:
        return ["Database", "Overview"];
      case ROUTES.HISTORY:
        return ["Events", "History"];
      case ROUTES.SETTINGS:
        return ["Application", "Settings"];
      case ROUTES.USER_MANAGEMENT:
        return ["Admin", "User Management"];
      default:
        return ["Digi Moi"];
    }
  };

  const breadcrumbs = getBreadcrumbs();

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900 flex items-center justify-between px-4 md:px-6 sticky top-0 z-40 bg-opacity-95 backdrop-blur-md text-white">
      <div className="flex items-center text-sm font-medium">
        {breadcrumbs.map((crumb, index) => (
          <React.Fragment key={index}>
            <span
              className={
                index === breadcrumbs.length - 1
                  ? "text-white font-semibold cursor-default"
                  : "text-slate-400 cursor-pointer hover:text-white transition-colors"
              }
            >
              {crumb}
            </span>
            {index < breadcrumbs.length - 1 && (
              <ChevronRight size={16} className="text-slate-500 mx-1.5" />
            )}
          </React.Fragment>
        ))}
      </div>

      <div className="flex items-center space-x-4">
        <div className="hidden sm:block text-sm text-slate-400 font-medium">
          {new Date().toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
          })}
        </div>
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-755 dark:bg-slate-800 dark:hover:bg-slate-700 transition-all text-slate-300 hover:text-white active:scale-95 border border-slate-800/80 shadow-sm"
          aria-label="Toggle Theme"
        >
          {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 transition-all hover:bg-slate-700 hover:text-white active:scale-95 shadow-sm"
          aria-label="Logout"
        >
          <LogOut size={16} />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
