import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, query, where } from "firebase/firestore";
import { auth, db } from "../firebase";
import {
  ROLES,
  normalizeRole,
  getRolePermissions,
} from "../services/permissions";

const PermissionContext = createContext(null);

export const PermissionProvider = ({ children }) => {
  const [role, setRole] = useState(ROLES.ADMIN);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user || !user.email) {
        setRole(ROLES.ADMIN);
        return;
      }

      try {
        const q = query(
          collection(db, "users"),
          where("email", "==", user.email.toLowerCase()),
        );
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const userData = snapshot.docs[0].data();
          setRole(normalizeRole(userData.role));
        } else {
          setRole(ROLES.ADMIN);
        }
      } catch (error) {
        console.error("Failed to fetch user role:", error);
        setRole(ROLES.ADMIN);
      }
    });

    return () => unsubscribe();
  }, []);

  const value = useMemo(
    () => ({
      role: normalizeRole(role),
      permissions: getRolePermissions(role),
      setRole,
    }),
    [role],
  );

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
};

export const usePermissions = () => {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error("usePermissions must be used within a PermissionProvider");
  }
  return context;
};

export { PermissionContext };
