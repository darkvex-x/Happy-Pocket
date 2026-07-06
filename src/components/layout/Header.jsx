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
    <header className="h-16 border-b border-[var(--border)] bg-[var(--background-secondary)]/95 flex items-center justify-between px-5 sticky top-0 z-40 backdrop-blur-md">
{/* Breadcrumbs */}
       <div className="flex items-center gap-1.5 text-sm">
         {breadcrumbs.map((crumb, index) => (
           <React.Fragment key={index}>
              <span
                className={
                  index === breadcrumbs.length - 1
                    ? "font-heading text-[var(--text-primary)] font-semibold text-[13px]"
                    : "font-heading text-[var(--muted)] text-[13px] cursor-pointer hover:text-[var(--text-primary)] transition-colors"
                }
              >
               {crumb}
             </span>
             {index < breadcrumbs.length - 1 && (
               <ChevronRight size={13} className="text-[var(--muted)]" />
             )}
           </React.Fragment>
         ))}
       </div>

{/* Right actions */}
       <div className="flex items-center gap-2">
         <span className="hidden sm:block text-[11px] text-[var(--muted)] font-medium tracking-wide">
           {new Date().toLocaleDateString("en-US", {
             weekday: "short",
             month: "short",
             day: "numeric",
           })}
         </span>
         <button
           onClick={toggleTheme}
           className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--card-secondary)] text-[var(--muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border-hover)] transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
           aria-label="Toggle Theme"
         >
           {theme === "light" ? <Moon size={14} /> : <Sun size={14} />}
         </button>
         <button
           onClick={handleLogout}
           className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[var(--border)] bg-[var(--card-secondary)] text-[11px] font-semibold text-[var(--muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border-hover)] transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
           aria-label="Logout"
         >
           <LogOut size={13} />
           <span className="hidden sm:inline">Logout</span>
         </button>
       </div>
     </header>
  );
}
