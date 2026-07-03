import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Edit2,
  UserX,
  UserCheck,
  UsersRound,
  Search,
  ShieldCheck,
  Shield,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Badge from "../../components/ui/Badge";
import Modal from "../../components/ui/Modal";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import EmptyState from "../../components/ui/EmptyState";
import Skeleton from "../../components/ui/Skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/Table";
import { useToast } from "../../components/ui/Toast";
import { usePermissions } from "../../context/PermissionContext";
import { PERMISSIONS, ROLE_LABELS } from "../../services/permissions";
import { StorageService } from "../../services/storage";

const INITIAL_FORM = {
  name: "",
  email: "",
  role: "helper",
};

export default function UserManagement() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { permissions } = usePermissions();

  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Add / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Disable / Enable Confirm
  const [toggleUser, setToggleUser] = useState(null);

  // Access guard — redirect non-admins
  const canManage = permissions.includes(PERMISSIONS.MANAGE_USERS);

  useEffect(() => {
    if (!canManage) {
      navigate("/", { replace: true });
    }
  }, [canManage, navigate]);

  // Subscribe to users collection
  useEffect(() => {
    if (!canManage) return;

    const unsubscribe = StorageService.subscribeToUsers(
      (loadedUsers) => {
        setUsers(loadedUsers);
        setIsLoading(false);
      },
      (error) => {
        console.error("Failed to load users:", error);
        addToast({
          type: "error",
          title: "Load Failed",
          message: "Could not load users.",
        });
        setIsLoading(false);
      },
    );

    return () => unsubscribe();
  }, [canManage, addToast]);

  // Filtered users based on search
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(
      (u) =>
        (u.name || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q) ||
        (u.role || "").toLowerCase().includes(q),
    );
  }, [users, searchQuery]);

  // ── Form Handlers ──

  const openAddModal = () => {
    setEditingUser(null);
    setFormData(INITIAL_FORM);
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name || "",
      email: user.email || "",
      role: user.role || "helper",
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    setFormData(INITIAL_FORM);
    setFormErrors({});
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = "Name is required.";
    if (!formData.email.trim()) {
      errors.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = "Enter a valid email address.";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);

    try {
      if (editingUser) {
        await StorageService.updateUser(editingUser.id, {
          name: formData.name.trim(),
          email: formData.email.trim(),
          role: formData.role,
        });
        addToast({
          type: "success",
          title: "User Updated",
          message: `${formData.name.trim()} has been updated.`,
        });
      } else {
        await StorageService.createUser({
          name: formData.name.trim(),
          email: formData.email.trim(),
          role: formData.role,
          active: true,
        });
        addToast({
          type: "success",
          title: "User Added",
          message: `${formData.name.trim()} has been added as a ${ROLE_LABELS[formData.role] || formData.role}.`,
        });
      }
      closeModal();
    } catch (error) {
      addToast({
        type: "error",
        title: editingUser ? "Update Failed" : "Add Failed",
        message: error.message || "Something went wrong.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Toggle Active/Disabled ──

  const handleToggleActive = async () => {
    if (!toggleUser) return;

    try {
      const nextActive = !toggleUser.active;
      await StorageService.updateUser(toggleUser.id, { active: nextActive });
      addToast({
        type: "success",
        title: nextActive ? "User Enabled" : "User Disabled",
        message: `${toggleUser.name || toggleUser.email} has been ${nextActive ? "enabled" : "disabled"}.`,
      });
    } catch (error) {
      addToast({
        type: "error",
        title: "Action Failed",
        message: error.message || "Could not update user status.",
      });
    } finally {
      setToggleUser(null);
    }
  };

  if (!canManage) return null;

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            User Management
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage helpers and their access to the system.
          </p>
        </div>
        <Button
          size="lg"
          className="w-full sm:w-auto shadow-md"
          onClick={openAddModal}
        >
          <Plus className="mr-2" size={20} />
          Add Helper
        </Button>
      </div>

      {/* Search */}
      {users.length > 0 && (
        <div className="relative max-w-md">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            type="text"
            placeholder="Search by name, email or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex h-10 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 pl-10 pr-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-transparent transition-shadow"
          />
        </div>
      )}

      {/* Users Table */}
      <Card className="border-0 shadow-sm ring-1 ring-gray-200 dark:ring-gray-800 overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between py-5 px-6 border-b border-gray-100 dark:border-gray-800">
          <CardTitle className="text-lg flex items-center gap-2">
            <UsersRound size={20} className="text-indigo-500" />
            All Users
            {!isLoading && (
              <Badge variant="default" className="ml-1">
                {filteredUsers.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <EmptyState
              icon={UsersRound}
              title={
                searchQuery ? "No users match your search" : "No users yet"
              }
              description={
                searchQuery
                  ? "Try adjusting your search query."
                  : "Add your first helper to get started."
              }
              actionLabel={!searchQuery ? "Add Helper" : undefined}
              onAction={!searchQuery ? openAddModal : undefined}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden md:table-cell">Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">
                    Added On
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow
                    key={user.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-sm font-bold">
                          {(user.name || user.email || "?")
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {user.name || "—"}
                          </p>
                          <p className="md:hidden text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {user.email || "—"}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-gray-500 dark:text-gray-400">
                      {user.email || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          user.role === "admin" ? "primary" : "default"
                        }
                        className="gap-1"
                      >
                        {user.role === "admin" ? (
                          <ShieldCheck size={12} />
                        ) : (
                          <Shield size={12} />
                        )}
                        {ROLE_LABELS[user.role] || user.role || "Helper"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          user.active === false ? "danger" : "success"
                        }
                      >
                        {user.active === false ? "Disabled" : "Active"}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-gray-500 dark:text-gray-400 text-sm">
                      {user.createdAt
                        ? new Date(user.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(user)}
                          title="Edit user"
                        >
                          <Edit2 size={15} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setToggleUser(user)}
                          title={
                            user.active === false
                              ? "Enable user"
                              : "Disable user"
                          }
                          className={
                            user.active === false
                              ? "text-emerald-600 hover:text-emerald-700"
                              : "text-red-500 hover:text-red-600"
                          }
                        >
                          {user.active === false ? (
                            <UserCheck size={15} />
                          ) : (
                            <UserX size={15} />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingUser ? "Edit User" : "Add Helper"}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="userName"
              className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300"
            >
              Full Name
            </label>
            <Input
              id="userName"
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="e.g. Priya Sharma"
              error={formErrors.name}
              disabled={isSubmitting}
              autoFocus
            />
          </div>

          <div>
            <label
              htmlFor="userEmail"
              className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300"
            >
              Email Address
            </label>
            <Input
              id="userEmail"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, email: e.target.value }))
              }
              placeholder="priya@example.com"
              error={formErrors.email}
              disabled={isSubmitting}
            />
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Must match the email used to sign in.
            </p>
          </div>

          <div>
            <label
              htmlFor="userRole"
              className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300"
            >
              Role
            </label>
            <select
              id="userRole"
              value={formData.role}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, role: e.target.value }))
              }
              disabled={isSubmitting}
              className="flex h-10 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-transparent transition-shadow disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="helper">Helper</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={closeModal}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {editingUser ? "Save Changes" : "Add User"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Disable / Enable Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!toggleUser}
        onClose={() => setToggleUser(null)}
        onConfirm={handleToggleActive}
        title={
          toggleUser?.active === false ? "Enable User?" : "Disable User?"
        }
        message={
          toggleUser?.active === false
            ? `Re-enable access for ${toggleUser?.name || toggleUser?.email}? They will be able to sign in again.`
            : `Disable ${toggleUser?.name || toggleUser?.email}? They will not be able to sign in until re-enabled.`
        }
        confirmText={toggleUser?.active === false ? "Enable" : "Disable"}
        isDanger={toggleUser?.active !== false}
      />
    </div>
  );
}
