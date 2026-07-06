import React, {
  useState,
  useEffect,
  useContext,
  useRef,
  useCallback,
} from "react";
import { useNavigate } from "react-router-dom";
import { StorageService } from "../../services/storage";
import { SettingsContext } from "../../context/SettingsContext";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import {
  Save,
  Download,
  Upload,
  RotateCcw,
  Sun,
  Moon,
  Printer,
  Building2,
  Check,
} from "lucide-react";
import { cn } from "../../utils/cn";
import { useToast } from "../../components/ui/Toast";
import { PAPER_OPTIONS, CURRENCY_OPTIONS } from "../../constants/receipt";
import { usePermissions } from "../../context/PermissionContext";
import { PERMISSIONS } from "../../services/permissions";

export default function Settings() {
  const navigate = useNavigate();
  const { theme, toggleTheme, updateSettings } = useContext(SettingsContext);
  const { addToast } = useToast();
  const { permissions } = usePermissions();
  const canChangeSettings = permissions.includes(PERMISSIONS.CHANGE_SETTINGS);

  useEffect(() => {
    if (!canChangeSettings) {
      navigate("/", { replace: true });
    }
  }, [canChangeSettings, navigate]);

  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    businessName: "",
    receiptPrefix: "",
    currency: "₹",
    paperWidth: "58mm",
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [restoreConfirm, setRestoreConfirm] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const s = await StorageService.getSettings();
      setForm({
        businessName: s.businessName || "",
        receiptPrefix: s.receiptPrefix || "",
        currency: s.currency || "₹",
        paperWidth: s.paperWidth || "58mm",
      });
    } catch (err) {
      console.error(err);
      addToast({
        type: "error",
        title: "Error Loading Settings",
        message: "Could not load preferences from database.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    if (!canChangeSettings) {
      addToast({
        type: "error",
        title: "Permission Denied",
        message: "You do not have permission to change settings.",
      });
      return;
    }

    setIsSaving(true);
    try {
      await updateSettings({ ...form, theme });
      setSaved(true);
      addToast({
        type: "success",
        title: "Settings Saved",
        message: "Your application preferences have been updated.",
      });
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      addToast({
        type: "error",
        title: "Save Failed",
        message: err.message || "Could not update configuration.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // ── Backup ──
  const handleBackup = async () => {
    try {
      const json = await StorageService.exportBackup();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `digi_moi_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addToast({
        type: "success",
        title: "Backup Successful",
        message: "Backup JSON data file exported.",
      });
    } catch (err) {
      addToast({
        type: "error",
        title: "Backup Failed",
        message: err.message || "Could not export database state.",
      });
    }
  };

  // ── Restore ──
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setRestoreConfirm(true);
    e.target.value = "";
  };

  const handleRestoreConfirm = async () => {
    if (!pendingFile) return;
    try {
      const text = await pendingFile.text();
      const stats = await StorageService.importBackup(text);
      addToast({
        type: "success",
        title: "Restore Completed",
        message: `Restored ${stats.eventCount} events and ${stats.entryCount} entries successfully.`,
      });
      await loadSettings();
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      addToast({
        type: "error",
        title: "Restore Failed",
        message: err.message || "Invalid JSON backup document.",
      });
    } finally {
      setPendingFile(null);
      setRestoreConfirm(false);
    }
  };

  // ── Factory Reset ──
  const handleResetConfirm = async () => {
    try {
      await StorageService.resetAll();
      addToast({
        type: "success",
        title: "Database Wiped",
        message: "All application data has been hard-reset.",
      });
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      addToast({
        type: "error",
        title: "Reset Failed",
        message: err.message || "Failed to wipe database.",
      });
    } finally {
      setResetConfirm(false);
    }
  };

  // ── Toggle Group Helper ──
  const ToggleGroup = ({ options, value, onChange, className }) => (
    <div
      className={cn(
        "flex rounded-xl overflow-hidden border border-[var(--border)]",
        className,
      )}
    >
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={cn(
            "px-4 py-2.5 text-sm font-semibold transition-all flex-1",
            value === opt
              ? "bg-[var(--primary)] text-white shadow-inner"
              : "bg-[var(--card)] text-[var(--muted)] hover:bg-[var(--border-hover)]",
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  );

  if (!canChangeSettings) return null;

  if (isLoading) {
    return (
      <div className="p-8 text-center opacity-50">Loading Settings...</div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300 pb-20">
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight text-[var(--text-primary)]">Settings</h1>
        <p
          className="text-[var(--muted)] mt-1"
        >
          Configure your application preferences and manage your data.
        </p>
      </div>

      {/* ── GENERAL SETTINGS ── */}
      <Card className="border-0 shadow-sm ring-1 ring-[var(--border)]">
        <CardHeader className="border-b border-[var(--border)] pb-4">
            <CardTitle className="font-heading flex items-center gap-2 text-[var(--text-primary)]">
             <Building2 size={20} className="text-[var(--primary)]" /> General
           </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 pt-6">
          <div>
            <label
              htmlFor="settingsBusinessName"
              className="block text-sm font-semibold text-[var(--muted)] mb-1.5"
            >
              Business Name
            </label>
            <Input
              id="settingsBusinessName"
              value={form.businessName}
              onChange={(e) => handleChange("businessName", e.target.value)}
              placeholder="Digi Moi"
              disabled={!canChangeSettings}
            />
            <p className="text-xs text-[var(--muted)] mt-1">
              Displayed on printed receipts.
            </p>
          </div>

          <div>
            <label
              htmlFor="settingsReceiptPrefix"
              className="block text-sm font-semibold text-[var(--muted)] mb-1.5"
            >
              Receipt Prefix
            </label>
            <Input
              id="settingsReceiptPrefix"
              value={form.receiptPrefix}
              onChange={(e) => handleChange("receiptPrefix", e.target.value)}
              placeholder="Moi-"
              disabled={!canChangeSettings}
            />
            <p className="text-xs text-[var(--muted)] mt-1">
              Prepended to all receipt numbers (e.g., Moi-001).
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[var(--muted)] mb-2">
              Currency Symbol
            </label>
            <ToggleGroup
              options={CURRENCY_OPTIONS}
              value={form.currency}
              onChange={(v) => handleChange("currency", v)}
              className="max-w-xs"
              disabled={!canChangeSettings}
            />
          </div>
        </CardContent>
      </Card>

      {/* ── APPEARANCE ── */}
      <Card className="border-0 shadow-sm ring-1 ring-[var(--border)]">
        <CardHeader className="border-b border-[var(--border)] pb-4">
            <CardTitle className="font-heading flex items-center gap-2 text-[var(--text-primary)]">
             <Sun size={20} className="text-amber-500" /> Appearance
           </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 pt-6">
          <div>
            <label className="block text-sm font-semibold text-[var(--muted)] mb-2">
              Theme
            </label>
            <div className="flex rounded-xl overflow-hidden border border-[var(--border)] max-w-xs">
              <button
                type="button"
                onClick={() => {
                  if (theme === "dark" && canChangeSettings) toggleTheme();
                }}
                className={cn(
                  "px-4 py-2.5 text-sm font-semibold transition-all flex-1 flex items-center justify-center gap-2",
                  theme === "light"
                    ? "bg-[var(--primary)] text-white"
                    : "bg-[var(--card)] text-[var(--muted)] hover:bg-[var(--border-hover)]",
                )}
              >
                <Sun size={16} /> Light
              </button>
              <button
                type="button"
                onClick={() => {
                  if (theme === "light" && canChangeSettings) toggleTheme();
                }}
                className={cn(
                  "px-4 py-2.5 text-sm font-semibold transition-all flex-1 flex items-center justify-center gap-2",
                  theme === "dark"
                    ? "bg-[var(--primary)] text-white"
                    : "bg-[var(--card)] text-[var(--muted)] hover:bg-[var(--border-hover)]",
                )}
              >
                <Moon size={16} /> Dark
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── PRINTING ── */}
      <Card className="border-0 shadow-sm ring-1 ring-[var(--border)]">
        <CardHeader className="border-b border-[var(--border)] pb-4">
            <CardTitle className="font-heading flex items-center gap-2 text-[var(--text-primary)]">
             <Printer size={20} className="text-teal-500" /> Printing
           </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 pt-6">
          <div>
            <label className="block text-sm font-semibold text-[var(--muted)] mb-2">
              Paper Width
            </label>
            <ToggleGroup
              options={PAPER_OPTIONS}
              value={form.paperWidth}
              onChange={(v) => handleChange("paperWidth", v)}
              className="max-w-xs"
              disabled={!canChangeSettings}
            />
            <p className="text-xs text-[var(--muted)] mt-2">
              Standard thermal roll widths. Most POS printers use 58mm.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ── SAVE BUTTON ── */}
      <div className="flex justify-end">
        <Button
          variant="primary"
          size="lg"
          onClick={handleSave}
          isLoading={isSaving}
          disabled={!canChangeSettings}
          className="min-w-40 shadow-md shadow-[var(--primary)]/20"
        >
          {saved ? (
            <>
              <Check size={18} className="mr-2" /> Saved
            </>
          ) : (
            <>
              <Save size={18} className="mr-2" /> Save Settings
            </>
          )}
        </Button>
      </div>

      {/* ── DATA MANAGEMENT ── */}
      <Card className="border-0 shadow-sm ring-1 ring-[var(--border)]">
        <CardHeader className="border-b border-[var(--border)] pb-4">
            <CardTitle className="font-heading flex items-center gap-2 text-[var(--text-primary)]">
             <Download size={20} className="text-[var(--primary)]" /> Data Management
           </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {/* Backup */}
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 p-4 bg-[var(--card)] rounded-xl border border-[var(--border)]">
            <div>
              <h3 className="font-semibold text-[var(--text-primary)]">
                Backup Data
              </h3>
              <p className="text-sm text-[var(--muted)] mt-0.5">
                Download all events, entries, and settings as a JSON file.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleBackup}
              className="shrink-0"
            >
              <Download size={16} className="mr-2" /> Download Backup
            </Button>
          </div>

          {/* Restore */}
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 p-4 bg-[var(--card)] rounded-xl border border-[var(--border)]">
            <div>
              <h3 className="font-semibold text-[var(--text-primary)]">
                Restore Data
              </h3>
              <p className="text-sm text-[var(--muted)] mt-0.5">
                Import a previously exported JSON backup. This will replace all
                current data.
              </p>
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="shrink-0"
              >
                <Upload size={16} className="mr-2" /> Upload Backup
              </Button>
            </div>
          </div>

          {/* Factory Reset */}
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 p-4 bg-[var(--card)] rounded-xl border border-[var(--border)]">
            <div>
              <h3 className="font-semibold text-[var(--danger)]">
                Factory Reset
              </h3>
              <p className="text-sm text-[var(--muted)] mt-0.5">
                Permanently erase all events, entries, and settings. Cannot be
                undone.
              </p>
            </div>
            <Button
              variant="ghost"
              onClick={() => setResetConfirm(true)}
              className="text-[var(--danger)] hover:bg-[var(--border-hover)] shrink-0"
            >
              <RotateCcw size={16} className="mr-2" /> Reset Everything
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Confirm Dialogs ── */}
      <ConfirmDialog
        isOpen={restoreConfirm}
        onClose={() => {
          setRestoreConfirm(false);
          setPendingFile(null);
        }}
        onConfirm={handleRestoreConfirm}
        title="Restore from Backup"
        message={`This will completely replace all your current data with the contents of "${pendingFile?.name || "selected file"}". Are you sure you want to continue?`}
        confirmText="Yes, Restore"
        cancelText="Cancel"
        isDanger={true}
      />

      <ConfirmDialog
        isOpen={resetConfirm}
        onClose={() => setResetConfirm(false)}
        onConfirm={handleResetConfirm}
        title="Factory Reset"
        message="This will permanently destroy ALL your events, entries, and settings. There is no recovery. Are you absolutely sure?"
        confirmText="Yes, Destroy Everything"
        cancelText="Cancel"
        isDanger={true}
      />
    </div>
  );
}
