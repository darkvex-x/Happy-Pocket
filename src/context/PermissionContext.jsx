import React, { createContext, useContext, useMemo, useState } from "react";
import {
  ROLES,
  normalizeRole,
  getRolePermissions,
} from "../services/permissions";

const PermissionContext = createContext(null);

export const PermissionProvider = ({ children }) => {
  const [role, setRole] = useState(ROLES.ADMIN);

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
