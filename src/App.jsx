import React, { lazy, Suspense, useEffect, useState } from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, getDocs, query, where } from "firebase/firestore";
import { auth, db } from "./firebase";
import { SettingsProvider } from "./context/SettingsContext";
import { EventProvider } from "./context/EventContext";
import { ToastProvider } from "./components/ui/Toast";
import MainLayout from "./components/layout/MainLayout";
import { ROUTES } from "./constants/routes";
import { PermissionProvider } from "./context/PermissionContext";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";
// Lazy loaded page components
const Dashboard = lazy(() => import("./pages/Dashboard/Dashboard"));
const EventCreate = lazy(() => import("./pages/EventCreate/EventCreate"));
const EventView = lazy(() => import("./pages/EventView/EventView"));
const Database = lazy(() => import("./pages/Database/Database"));
const EventHistory = lazy(() => import("./pages/EventHistory/EventHistory"));
const Settings = lazy(() => import("./pages/Settings/Settings"));
const Login = lazy(() => import("./pages/Auth/Login"));
const UserManagement = lazy(() => import("./pages/UserManagement/UserManagement"));

const ACCESS_DENIED_KEY = "hp_access_denied";

const PageLoader = () => (
  <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
    <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
      Loading Page...
    </p>
  </div>
);

export default function App() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      if (nextUser) {
        // Validate returning / auto-logged-in user against the whitelist
        // Network failures MUST NOT bypass security - users without valid
        // whitelist status are signed out immediately.
        try {
          const q = query(
            collection(db, "users"),
            where("email", "==", (nextUser.email || "").toLowerCase()),
          );
          const snapshot = await getDocs(q);

          if (snapshot.empty) {
            // Not whitelisted — sign them out immediately
            sessionStorage.setItem(ACCESS_DENIED_KEY, "1");
            await signOut(auth);
            setUser(null);
            setAuthReady(true);
            return;
          }

          const userData = snapshot.docs[0].data();
          // Disabled users cannot continue
          if (userData.active === false) {
            sessionStorage.setItem(ACCESS_DENIED_KEY, "1");
            await signOut(auth);
            setUser(null);
            setAuthReady(true);
            return;
          }
        } catch (error) {
          console.error("Whitelist validation failed:", error);
          // On any error (including network failures), deny access
          // This ensures security is never bypassed
          sessionStorage.setItem(ACCESS_DENIED_KEY, "1");
          await signOut(auth);
          setUser(null);
          setAuthReady(true);
          return;
        }

        setUser(nextUser);
        setAuthReady(true);
      } else {
        setUser(null);
        setAuthReady(true);
      }
    });

    return () => unsubscribe();
  }, []);

  if (!authReady) {
    return <PageLoader />;
  }

  const ProtectedRoute = ({ children }) => {
    if (!user) {
      return <Navigate to="/login" replace />;
    }
    return children;
  };

  return (
    <ErrorBoundary>
      <SettingsProvider>
        <ToastProvider>
          <EventProvider>
            <PermissionProvider>
              <HashRouter>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route
                      path="/"
                      element={
                        <ProtectedRoute>
                          <MainLayout />
                        </ProtectedRoute>
                      }
                    >
                      <Route index element={<Dashboard />} />
                      <Route
                        path={ROUTES.CREATE_EVENT}
                        element={<EventCreate />}
                      />
                      <Route
                        path={ROUTES.CURRENT_EVENT}
                        element={<EventView />}
                      />
                      <Route
                        path={ROUTES.EVENT_BY_SHARE}
                        element={<EventView />}
                      />
                      <Route path={ROUTES.DATABASE} element={<Database />} />
                      <Route path={ROUTES.HISTORY} element={<EventHistory />} />
                      <Route path={ROUTES.SETTINGS} element={<Settings />} />
                      <Route path={ROUTES.USER_MANAGEMENT} element={<UserManagement />} />
                    </Route>
                    <Route
                      path="*"
                      element={<Navigate to={user ? "/" : "/login"} replace />}
                    />
                  </Routes>
                </Suspense>
              </HashRouter>
            </PermissionProvider>
          </EventProvider>
        </ToastProvider>
      </SettingsProvider>
    </ErrorBoundary>
  );
}
