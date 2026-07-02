export const ROLES = {
  ADMIN: "admin",
  HELPER: "helper",
};

export const PERMISSIONS = {
  EDIT_EVENT: "editEvent",
  DELETE_EVENT: "deleteEvent",
  DELETE_ENTRIES: "deleteEntries",
  EXPORT_PDF: "exportPdf",
  EXPORT_EXCEL: "exportExcel",
  EXPORT_CSV: "exportCsv",
  SHARE_EVENT: "shareEvent",
  PRINT_RECEIPT: "printReceipt",
  ADD_ENTRY: "addEntry",
  EDIT_ENTRY: "editEntry",
  CHANGE_SETTINGS: "changeSettings",
};

export const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: [
    PERMISSIONS.EDIT_EVENT,
    PERMISSIONS.DELETE_EVENT,
    PERMISSIONS.DELETE_ENTRIES,
    PERMISSIONS.EXPORT_PDF,
    PERMISSIONS.EXPORT_EXCEL,
    PERMISSIONS.EXPORT_CSV,
    PERMISSIONS.SHARE_EVENT,
    PERMISSIONS.PRINT_RECEIPT,
    PERMISSIONS.ADD_ENTRY,
    PERMISSIONS.EDIT_ENTRY,
    PERMISSIONS.CHANGE_SETTINGS,
  ],
  [ROLES.HELPER]: [
    PERMISSIONS.ADD_ENTRY,
    PERMISSIONS.EDIT_ENTRY,
    PERMISSIONS.PRINT_RECEIPT,
  ],
};

export const ROLE_LABELS = {
  [ROLES.ADMIN]: "Admin",
  [ROLES.HELPER]: "Helper",
};

export const normalizeRole = (role) => {
  if (role === ROLES.HELPER) return ROLES.HELPER;
  return ROLES.ADMIN;
};

export const getRolePermissions = (role = ROLES.ADMIN) => {
  const normalizedRole = normalizeRole(role);
  return ROLE_PERMISSIONS[normalizedRole] || ROLE_PERMISSIONS[ROLES.ADMIN];
};

export const canPerform = (role = ROLES.ADMIN, permission) => {
  return getRolePermissions(role).includes(permission);
};
