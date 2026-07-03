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
    <header className="h-16 border-b border-gray-200 dark:border-gray-800 bg-[var(--card)] flex items-center justify-between px-4 md:px-6 sticky top-0 z-40 bg-opacity-90 backdrop-blur-md">
      <div className="flex items-center text-sm font-medium">
        {breadcrumbs.map((crumb, index) => (
          <React.Fragment key={index}>
            <span
              className={
                index === breadcrumbs.length - 1
                  ? "text-gray-900 dark:text-gray-100 font-semibold cursor-default"
                  : "text-gray-500 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
              }
            >
              {crumb}
            </span>
            {index < breadcrumbs.length - 1 && (
              <ChevronRight size={16} className="text-gray-400 mx-1.5" />
            )}
          </React.Fragment>
        ))}
      </div>

      <div className="flex items-center space-x-4">
        <div className="hidden sm:block text-sm text-gray-500 font-medium">
          {new Date().toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
          })}
        </div>
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300 active:scale-95"
          aria-label="Toggle Theme"
        >
          {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 rounded-full border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          aria-label="Logout"
        >
          <LogOut size={16} />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
