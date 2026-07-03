import React, { useEffect, useState, useMemo, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { formatDate } from "../../utils/date";
import { StorageService } from "../../services/storage";
import { ROUTES } from "../../constants/routes";
import { PAYMENT_METHODS } from "../../constants/paymentMethods";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import TextArea from "../../components/ui/TextArea";
import Button from "../../components/ui/Button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/Table";
import EmptyState from "../../components/ui/EmptyState";
import Modal from "../../components/ui/Modal";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import SearchInput from "../../components/ui/SearchInput";
import PrintPreviewModal from "../../components/print/PrintPreviewModal";
import {
  CalendarDays,
  Banknote,
  Printer,
  Edit2,
  Share2,
  Trash2,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  Inbox,
  UserPlus,
  UserMinus,
  Copy,
} from "lucide-react";
import { cn } from "../../utils/cn";
import { useReceiptNumber } from "../../hooks/useReceiptNumber";
import { useSearch } from "../../hooks/useSearch";
import { usePrint } from "../../hooks/usePrint";
import { validateEntry, validateEvent } from "../../utils/validation";
import { useToast } from "../../components/ui/Toast";
import { usePermissions } from "../../context/PermissionContext";
import { PERMISSIONS } from "../../services/permissions";

export default function EventView() {
  const location = useLocation();
  const navigate = useNavigate();
  const { shareId } = useParams();
  const { addToast } = useToast();
  const { permissions } = usePermissions();
  const nameInputRef = useRef(null);

  const [activeEvent, setActiveEvent] = useState(null);
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Create Form State
  const initialFormState = {
    name: "",
    amount: "",
    paymentMethod: "Cash",
    notes: "",
  };
  const [formData, setFormData] = useState(initialFormState);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Global Settings
  const [receiptPrefix, setReceiptPrefix] = useState("MR-");
  const [currency, setCurrency] = useState("₹");

  // Search & Sort State
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState({
    key: "createdAt",
    direction: "desc",
  });

  // Modals State
  const [editingEntry, setEditingEntry] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState(null);
  const [isEditingEvent, setIsEditingEvent] = useState(false);
  const [eventEditForm, setEventEditForm] = useState(null);
  const [eventEditErrors, setEventEditErrors] = useState({});
  const [isEventSaving, setIsEventSaving] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareEmailInput, setShareEmailInput] = useState("");
  const [isSharingSubmitting, setIsSharingSubmitting] = useState(false);

  // Custom Hook: Print targeting
  const {
    printTarget: printEntry,
    isPrintOpen,
    handlePrint: setPrintEntry,
    handleClosePrint,
  } = usePrint();

  useEffect(() => {
    const unsubscribeSettings = StorageService.subscribeToSettings(
      (settings) => {
        if (settings?.receiptPrefix) setReceiptPrefix(settings.receiptPrefix);
        if (settings?.currency) setCurrency(settings.currency);
      },
    );

    return () => {
      unsubscribeSettings();
    };
  }, []);

  useEffect(() => {
    setIsLoading(true);
    setLoadError("");

    const unsubscribeEvents = StorageService.subscribeToEvents(
      (events) => {
        let nextEvent = null;

        if (shareId) {
          nextEvent = events.find((event) => event.shareId === shareId) || null;
        } else if (location.state?.eventId) {
          nextEvent =
            events.find((event) => event.id === location.state.eventId) || null;
        } else if (events.length > 0) {
          nextEvent = events[0];
        }

        if (!nextEvent) {
          setActiveEvent(null);
          setEntries([]);
          setIsLoading(false);
          setLoadError("");
          return;
        }

        setActiveEvent(nextEvent);
        setLoadError("");
      },
      (error) => {
        console.error("Failed to load event data from Firestore:", error);
        setActiveEvent(null);
        setEntries([]);
        setIsLoading(false);
        setLoadError(
          "Unable to load event data from Firestore. Please refresh the page and try again.",
        );
      },
    );

    return () => {
      unsubscribeEvents();
    };
  }, [location.state?.eventId, shareId]);

  useEffect(() => {
    if (!activeEvent?.id) {
      setEntries([]);
      setIsLoading(false);
      setLoadError("");
      return;
    }

    setIsLoading(true);
    setLoadError("");
    const unsubscribeEntries = StorageService.subscribeToEntries(
      activeEvent.id,
      (evEntries) => {
        setEntries(evEntries);
        setIsLoading(false);
        setLoadError("");
      },
      (error) => {
        console.error("Failed to load guest entries from Firestore:", error);
        setEntries([]);
        setIsLoading(false);
        setLoadError(
          "Unable to load guest entries from Firestore. Please refresh the page and try again.",
        );
      },
    );

    return () => {
      unsubscribeEntries();
    };
  }, [activeEvent?.id]);

  // Custom Hook: Receipt sequential serial sequence generator preview
  const nextReceiptPreview = useReceiptNumber(entries, receiptPrefix);

  // Custom Hook: Standardized item searching logic
  const searchedEntries = useSearch(
    entries,
    searchQuery,
    ["name", "receiptNumber", "paymentMethod"],
    receiptPrefix,
  );

  const filteredAndSortedEntries = useMemo(() => {
    let result = [...searchedEntries];

    result.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      if (sortConfig.key === "amount" || sortConfig.key === "receiptNumber") {
        aVal = Number(aVal);
        bVal = Number(bVal);
      }

      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [searchedEntries, sortConfig]);

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "desc" ? "asc" : "desc",
    }));
  };

  const validateForm = (data, setErrors) => {
    const { errors, isValid } = validateEntry(data);
    setErrors(errors);
    return isValid;
  };

  const handleShareEvent = () => {
    setIsShareModalOpen(true);
  };

  const handleCopyLink = async () => {
    if (!activeEvent) return;

    try {
      const resolvedShareId =
        activeEvent.shareId ||
        (await StorageService.ensureEventShareId(activeEvent.id));
      const shareUrl = `${window.location.origin}/#${ROUTES.EVENT_BY_SHARE.replace(
        ":shareId",
        resolvedShareId,
      )}`;

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const tempInput = document.createElement("textarea");
        tempInput.value = shareUrl;
        tempInput.setAttribute("readonly", "");
        tempInput.style.position = "fixed";
        tempInput.style.left = "-9999px";
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand("copy");
        document.body.removeChild(tempInput);
      }

      addToast({
        type: "success",
        title: "Share Link Copied",
        message: "The event link is ready to share.",
      });
    } catch (error) {
      addToast({
        type: "error",
        title: "Unable to Share",
        message: error.message || "Could not copy the event link.",
      });
    }
  };

  const handleAddHelper = async (e) => {
    e.preventDefault();
    if (!shareEmailInput.trim()) return;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shareEmailInput.trim())) {
      addToast({
        type: "error",
        title: "Invalid Email",
        message: "Please enter a valid email address.",
      });
      return;
    }

    setIsSharingSubmitting(true);
    try {
      await StorageService.shareEventWithEmail(activeEvent.id, shareEmailInput);
      addToast({
        type: "success",
        title: "Helper Added",
        message: `${shareEmailInput.trim()} can now access this event.`,
      });
      setShareEmailInput("");
    } catch (error) {
      addToast({
        type: "error",
        title: "Unable to Add",
        message: error.message || "Something went wrong.",
      });
    } finally {
      setIsSharingSubmitting(false);
    }
  };

  const handleRemoveHelper = async (email) => {
    try {
      await StorageService.unshareEventWithEmail(activeEvent.id, email);
      addToast({
        type: "success",
        title: "Helper Removed",
        message: `${email} access has been revoked.`,
      });
    } catch (error) {
      addToast({
        type: "error",
        title: "Unable to Remove",
        message: error.message || "Something went wrong.",
      });
    }
  };

  const handleOpenEventEdit = () => {
    if (!activeEvent) return;
    setEventEditForm({
      eventName: activeEvent.eventName || "",
      brideName: activeEvent.brideName || "",
      groomName: activeEvent.groomName || "",
      venue: activeEvent.venue || "",
      functionDate:
        activeEvent.functionDate || new Date().toISOString().split("T")[0],
      functionTime: activeEvent.functionTime || "",
      description: activeEvent.notes || activeEvent.description || "",
    });
    setEventEditErrors({});
    setIsEditingEvent(true);
  };

  const handleSaveEventEdit = async (e) => {
    e.preventDefault();
    if (!eventEditForm) return;

    const { errors, isValid } = validateEvent(eventEditForm);
    setEventEditErrors(errors);
    if (!isValid) {
      addToast({
        type: "error",
        title: "Validation Error",
        message: "Event name is required.",
      });
      return;
    }

    setIsEventSaving(true);
    try {
      const updatedEvent = await StorageService.updateEvent(activeEvent.id, {
        eventName: eventEditForm.eventName.trim(),
        brideName: eventEditForm.brideName.trim(),
        groomName: eventEditForm.groomName.trim(),
        venue: eventEditForm.venue.trim(),
        functionDate: eventEditForm.functionDate,
        functionTime: eventEditForm.functionTime.trim(),
        notes: eventEditForm.description.trim(),
        description: eventEditForm.description.trim(),
      });
      setActiveEvent(updatedEvent);
      addToast({
        type: "success",
        title: "Event Updated",
        message: "Event details were updated successfully.",
      });
      setIsEditingEvent(false);
      setEventEditForm(null);
    } catch (error) {
      addToast({
        type: "error",
        title: "Update Failed",
        message: error.message || "Could not update event details.",
      });
    } finally {
      setIsEventSaving(false);
    }
  };

  const handleCreateEntry = async (e) => {
    e.preventDefault();
    if (!permissions.includes(PERMISSIONS.ADD_ENTRY)) {
      addToast({
        type: "error",
        title: "Permission Denied",
        message: "You do not have permission to add entries.",
      });
      return;
    }

    if (!validateForm(formData, setFormErrors) || !activeEvent) {
      addToast({
        type: "error",
        title: "Validation Error",
        message:
          "Please fill out guest name and contribution amount correctly.",
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const entryData = {
        eventId: activeEvent.id,
        name: formData.name.trim(),
        amount: Number(formData.amount),
        paymentMethod: formData.paymentMethod,
        notes: formData.notes.trim(),
      };
      await StorageService.createEntry(entryData);
      addToast({
        type: "success",
        title: "Entry Recorded",
        message: `Moi of ${currency}${entryData.amount.toLocaleString("en-IN")} saved for ${entryData.name}.`,
      });
      setFormData(initialFormState);
      nameInputRef.current?.focus();
    } catch (error) {
      addToast({
        type: "error",
        title: "Failed to Save",
        message: error.message || "Could not record contribution entry.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    if (!permissions.includes(PERMISSIONS.EDIT_ENTRY)) {
      addToast({
        type: "error",
        title: "Permission Denied",
        message: "You do not have permission to edit entries.",
      });
      return;
    }

    const errors = {};
    if (!editForm.name?.trim()) errors.name = "Name is required";
    if (!editForm.amount || Number(editForm.amount) <= 0)
      errors.amount = "Invalid amount";

    if (Object.keys(errors).length > 0) {
      addToast({
        type: "error",
        title: "Invalid Entry Details",
        message: "Valid guest name and amount are required.",
      });
      return;
    }

    setIsEditSubmitting(true);
    try {
      const updatedData = {
        name: editForm.name.trim(),
        amount: Number(editForm.amount),
        paymentMethod: editForm.paymentMethod,
      };
      await StorageService.updateEntry(editingEntry.id, updatedData);
      addToast({
        type: "success",
        title: "Entry Updated",
        message: "The contribution entry was successfully modified.",
      });
      setEditingEntry(null);
    } catch (err) {
      addToast({
        type: "error",
        title: "Update Failed",
        message: err.message || "Failed to update ledger entry.",
      });
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!permissions.includes(PERMISSIONS.DELETE_ENTRIES)) {
      addToast({
        type: "error",
        title: "Permission Denied",
        message: "You do not have permission to delete entries.",
      });
      return;
    }

    try {
      await StorageService.deleteEntry(entryToDelete);
      addToast({
        type: "success",
        title: "Entry Removed",
        message: "Guest contribution deleted successfully.",
      });
    } catch (err) {
      addToast({
        type: "error",
        title: "Deletion Failed",
        message: err.message || "Could not remove entry from database.",
      });
    } finally {
      setEntryToDelete(null);
    }
  };

  // Helper for rendering sorting header
  const SortableHead = ({ label, sortKey, className }) => (
    <TableHead
      className={cn(
        "cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group",
        className,
      )}
      onClick={() => handleSort(sortKey)}
    >
      <div className="flex items-center space-x-1">
        <span>{label}</span>
        <span className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300">
          {sortConfig.key === sortKey ? (
            sortConfig.direction === "asc" ? (
              <ChevronUp size={14} />
            ) : (
              <ChevronDown size={14} />
            )
          ) : (
            <ArrowUpDown
              size={14}
              className="opacity-0 group-hover:opacity-100"
            />
          )}
        </span>
      </div>
    </TableHead>
  );

  if (loadError) {
    return (
      <div className="p-8 text-center">
        <div className="text-sm font-semibold text-red-600 dark:text-red-400">
          Unable to load event data
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          {loadError}
        </p>
      </div>
    );
  }

  if (isLoading)
    return (
      <div className="p-8 text-center opacity-50">Loading Event Data...</div>
    );

  if (!activeEvent)
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState
          icon={CalendarDays}
          title={shareId ? "Event Not Found" : "No Active Event"}
          description={
            shareId
              ? "The shared event could not be found. The link may be invalid or the event may have been removed."
              : "Create an event to start."
          }
          actionLabel={shareId ? "Go Home" : "Create Event"}
          onAction={() =>
            navigate(shareId ? ROUTES.DASHBOARD : ROUTES.CREATE_EVENT)
          }
        />
      </div>
    );

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-20">
      {/* Event Header Banner */}
      <div className="bg-[var(--card)] rounded-2xl p-6 shadow-sm ring-1 ring-gray-200 dark:ring-gray-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-gradient-to-br from-indigo-500/10 to-transparent rounded-full pointer-events-none blur-3xl"></div>
        <div className="z-10">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white uppercase">
              {activeEvent.eventName}
            </h1>
            <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-1 rounded-full font-bold dark:bg-emerald-900/30 dark:text-emerald-400">
              ACTIVE
            </span>
            <div className="flex flex-wrap gap-2">
              {permissions.includes(PERMISSIONS.SHARE_EVENT) && (
                <Button variant="outline" size="sm" onClick={handleShareEvent}>
                  <Share2 className="mr-2" size={16} /> Share Event
                </Button>
              )}
              {permissions.includes(PERMISSIONS.EDIT_EVENT) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenEventEdit}
                >
                  <Edit2 className="mr-2" size={16} /> Edit Event
                </Button>
              )}
            </div>
          </div>
          <div className="text-gray-500 dark:text-gray-400 font-medium flex flex-wrap gap-4 text-sm">
            {activeEvent.brideName && activeEvent.groomName && (
              <span>
                {activeEvent.brideName} & {activeEvent.groomName}
              </span>
            )}
            {activeEvent.venue && <span>• {activeEvent.venue}</span>}
            <span>• {formatDate(activeEvent.functionDate)}</span>
            {activeEvent.functionTime && (
              <span>• {activeEvent.functionTime}</span>
            )}
          </div>
        </div>
        <div className="flex gap-4 md:gap-8 z-10 w-full md:w-auto">
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-sm font-semibold mb-1 uppercase tracking-wide">
              Entries
            </p>
            <p className="text-3xl font-bold text-gray-800 dark:text-gray-200">
              {activeEvent.totalEntries}
            </p>
          </div>
          <div className="w-px bg-gray-200 dark:bg-gray-800 self-stretch"></div>
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-sm font-semibold mb-1 uppercase tracking-wide">
              Running Total
            </p>
            <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              {currency}
              {activeEvent.totalAmount.toLocaleString("en-IN")}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: ENTRY FORM */}
        <div className="lg:col-span-4 lg:sticky lg:top-24">
          <Card className="border-0 shadow-sm ring-1 ring-gray-200 dark:ring-gray-800 bg-[var(--card)]">
            <CardHeader className="border-b border-gray-100 dark:border-gray-800 pb-4">
              <CardTitle className="text-lg flex justify-between items-center">
                <span>New Entry</span>
                <span className="text-sm font-mono text-gray-400 bg-gray-50 dark:bg-gray-800/50 px-2 py-1 rounded-md">
                  #{nextReceiptPreview}
                </span>
              </CardTitle>
            </CardHeader>
            <form onSubmit={handleCreateEntry}>
              <CardContent className="space-y-4 pt-5">
                <div className="flex items-center text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/10 p-2 rounded-lg font-medium">
                  <Printer size={14} className="mr-2" />
                  Date & Time recorded automatically.
                </div>
                <div>
                  <label
                    htmlFor="entryNameInput"
                    className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5"
                  >
                    Guest Name{" "}
                    <span className="text-red-500" aria-hidden="true">
                      *
                    </span>
                  </label>
                  <Input
                    id="entryNameInput"
                    ref={nameInputRef}
                    name="name"
                    placeholder="Enter guest name"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData((p) => ({ ...p, name: e.target.value }));
                      if (formErrors.name)
                        setFormErrors((p) => ({ ...p, name: null }));
                    }}
                    error={formErrors.name}
                    autoComplete="off"
                    autoFocus
                    tabIndex={1}
                    aria-required="true"
                  />
                </div>
                <div>
                  <label
                    htmlFor="entryAmountInput"
                    className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex justify-between"
                  >
                    <span>
                      Amount{" "}
                      <span className="text-red-500" aria-hidden="true">
                        *
                      </span>
                    </span>
                    <span className="text-xs text-gray-400 font-normal">
                      ({currency})
                    </span>
                  </label>
                  <Input
                    id="entryAmountInput"
                    name="amount"
                    type="number"
                    min="1"
                    placeholder="2000"
                    value={formData.amount}
                    onChange={(e) => {
                      setFormData((p) => ({ ...p, amount: e.target.value }));
                      if (formErrors.amount)
                        setFormErrors((p) => ({ ...p, amount: null }));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        e.target.closest("form")?.requestSubmit();
                      }
                    }}
                    error={formErrors.amount}
                    className="text-lg font-semibold h-12"
                    tabIndex={2}
                    aria-required="true"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Payment Method
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {PAYMENT_METHODS.map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            paymentMethod: method,
                          }))
                        }
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-sm font-medium transition-all border outline-none",
                          formData.paymentMethod === method
                            ? "bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/40 dark:border-indigo-500/50 dark:text-indigo-300 ring-2 ring-indigo-500 ring-offset-[var(--background)]"
                            : "bg-transparent border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800",
                        )}
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
              <div className="p-5 pt-0 mt-2">
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full py-6 rounded-xl shadow-md text-base"
                  isLoading={isSubmitting}
                  disabled={!permissions.includes(PERMISSIONS.ADD_ENTRY)}
                >
                  <Banknote className="mr-2" size={20} /> Add Entry
                </Button>
              </div>
            </form>
          </Card>
        </div>

        {/* RIGHT COLUMN: LIVE RECENT ENTRIES TABLE */}
        <div className="lg:col-span-8">
          <Card className="border-0 shadow-sm ring-1 ring-gray-200 dark:ring-gray-800">
            <CardHeader className="border-b border-gray-100 dark:border-gray-800 py-3 px-4 md:py-4 md:px-5 flex flex-col sm:flex-row gap-3 sm:items-center justify-between bg-gray-50/50 dark:bg-gray-800/30 rounded-t-2xl">
              <CardTitle className="text-lg whitespace-nowrap">
                Live Ledger
              </CardTitle>
              <SearchInput
                placeholder="Search name, receipt..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-xs h-9 bg-white dark:bg-gray-900"
              />
            </CardHeader>
            <CardContent className="p-0">
              {filteredAndSortedEntries.length === 0 ? (
                <EmptyState
                  icon={Inbox}
                  title={
                    searchQuery ? "No results found" : "No entries logged yet"
                  }
                  description={
                    searchQuery
                      ? "Try adjusting filters or search terms."
                      : "Record the first Moi using the form on the left."
                  }
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortableHead
                        label="Rcpt"
                        sortKey="receiptNumber"
                        className="w-20"
                      />
                      <SortableHead label="Name" sortKey="name" />
                      <SortableHead
                        label="Method"
                        sortKey="paymentMethod"
                        className="hidden sm:table-cell"
                      />
                      <SortableHead
                        label="Time"
                        sortKey="createdAt"
                        className="hidden md:table-cell"
                      />
                      <SortableHead
                        label="Amount"
                        sortKey="amount"
                        className="text-right flex-row-reverse"
                      />
                      <TableHead className="w-24 text-right pr-4">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedEntries.map((entry) => {
                      const createdInfo = entry.createdByEmail
                        ? `Added by ${entry.createdByEmail} on ${new Date(entry.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}`
                        : "";
                      const updatedInfo = entry.updatedByEmail && entry.updatedAt
                        ? ` · Edited by ${entry.updatedByEmail} on ${new Date(entry.updatedAt).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}`
                        : "";
                      return (
                      <TableRow
                        key={entry.id}
                        className="group"
                        title={createdInfo + updatedInfo || undefined}
                      >
                        <TableCell className="font-mono text-gray-500 text-xs py-3">
                          {receiptPrefix}
                          {entry.receiptNumber}
                        </TableCell>
                        <TableCell className="font-semibold text-gray-900 dark:text-gray-100 py-3">
                          {entry.name}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell py-3">
                          <span className="text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 px-2.5 py-1 rounded-md">
                            {entry.paymentMethod}
                          </span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-xs text-gray-400 py-3">
                          {entry.time.slice(0, 5)}
                        </TableCell>
                        <TableCell className="text-right font-bold text-emerald-600 dark:text-emerald-400 py-3">
                          {currency}
                          {entry.amount.toLocaleString("en-IN")}
                        </TableCell>
                        <TableCell className="pr-4 py-3 text-right">
                          <div className="flex items-center justify-end space-x-1 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                            {permissions.includes(
                              PERMISSIONS.PRINT_RECEIPT,
                            ) && (
                              <button
                                onClick={() => setPrintEntry(entry)}
                                className="p-1.5 text-gray-400 hover:text-indigo-500 transition-colors rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
                                title="Print Receipt"
                                aria-label={`Print receipt for ${entry.name}`}
                              >
                                <Printer size={16} />
                              </button>
                            )}
                            {permissions.includes(PERMISSIONS.EDIT_ENTRY) && (
                              <button
                                onClick={() => {
                                  setEditingEntry(entry);
                                  setEditForm({
                                    name: entry.name,
                                    amount: entry.amount,
                                    paymentMethod: entry.paymentMethod,
                                  });
                                }}
                                className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30"
                                title="Edit"
                                aria-label={`Edit entry for ${entry.name}`}
                              >
                                <Edit2 size={16} />
                              </button>
                            )}
                            {permissions.includes(
                              PERMISSIONS.DELETE_ENTRIES,
                            ) && (
                              <button
                                onClick={() => setEntryToDelete(entry.id)}
                                className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30"
                                title="Delete"
                                aria-label={`Delete entry for ${entry.name}`}
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* EDIT MODAL */}
      <Modal
        isOpen={!!editingEntry}
        onClose={() => setEditingEntry(null)}
        title="Edit Entry"
      >
        {editForm && (
          <form onSubmit={handleEditSave} className="space-y-4">
            <div>
              <label
                htmlFor="editGuestNameInput"
                className="block text-sm font-semibold mb-1.5 text-gray-700 dark:text-gray-300"
              >
                Name
              </label>
              <Input
                id="editGuestNameInput"
                value={editForm.name}
                onChange={(e) =>
                  setEditForm((p) => ({ ...p, name: e.target.value }))
                }
                autoFocus
                aria-required="true"
              />
            </div>
            <div>
              <label
                htmlFor="editAmountInput"
                className="block text-sm font-semibold mb-1.5 text-gray-700 dark:text-gray-300"
              >
                Amount ({currency})
              </label>
              <Input
                id="editAmountInput"
                type="number"
                value={editForm.amount}
                onChange={(e) =>
                  setEditForm((p) => ({ ...p, amount: e.target.value }))
                }
                aria-required="true"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
                Payment Method
              </label>
              <div className="flex flex-wrap gap-2">
                {PAYMENT_METHODS.map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() =>
                      setEditForm((prev) => ({
                        ...prev,
                        paymentMethod: method,
                      }))
                    }
                    className={cn(
                      "px-3 py-1 text-sm font-medium transition-all border rounded-lg",
                      editForm.paymentMethod === method
                        ? "bg-indigo-50 border-indigo-300 text-indigo-700 dark:bg-indigo-900/40 dark:border-indigo-500/50 dark:text-indigo-300"
                        : "bg-transparent border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-400",
                    )}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>
            {editingEntry && (editingEntry.createdByEmail || editingEntry.updatedByEmail) && (
              <div className="text-xs text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-gray-800 pt-3 mt-1 space-y-1">
                {editingEntry.createdByEmail && (
                  <p>
                    <span className="font-semibold">Added by:</span>{" "}
                    {editingEntry.createdByEmail}
                    {editingEntry.createdAt && (
                      <span className="ml-1">
                        on {new Date(editingEntry.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                  </p>
                )}
                {editingEntry.updatedByEmail && editingEntry.updatedAt && (
                  <p>
                    <span className="font-semibold">Last edited by:</span>{" "}
                    {editingEntry.updatedByEmail}
                    <span className="ml-1">
                      on {new Date(editingEntry.updatedAt).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </p>
                )}
              </div>
            )}
            <div className="flex justify-end pt-4 space-x-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditingEntry(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={isEditSubmitting}
              >
                Save Updates
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        isOpen={isEditingEvent}
        onClose={() => {
          setIsEditingEvent(false);
          setEventEditForm(null);
          setEventEditErrors({});
        }}
        title="Edit Event"
      >
        {eventEditForm && (
          <form onSubmit={handleSaveEventEdit} className="space-y-4">
            <div>
              <label
                htmlFor="editEventNameInput"
                className="block text-sm font-semibold mb-1.5 text-gray-700 dark:text-gray-300"
              >
                Event Name
              </label>
              <Input
                id="editEventNameInput"
                value={eventEditForm.eventName}
                onChange={(e) => {
                  setEventEditForm((prev) => ({
                    ...prev,
                    eventName: e.target.value,
                  }));
                  if (eventEditErrors.eventName)
                    setEventEditErrors((prev) => ({
                      ...prev,
                      eventName: null,
                    }));
                }}
                error={eventEditErrors.eventName}
                autoFocus
                aria-required="true"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="editBrideNameInput"
                  className="block text-sm font-semibold mb-1.5 text-gray-700 dark:text-gray-300"
                >
                  Bride Name
                </label>
                <Input
                  id="editBrideNameInput"
                  value={eventEditForm.brideName}
                  onChange={(e) =>
                    setEventEditForm((prev) => ({
                      ...prev,
                      brideName: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label
                  htmlFor="editGroomNameInput"
                  className="block text-sm font-semibold mb-1.5 text-gray-700 dark:text-gray-300"
                >
                  Groom Name
                </label>
                <Input
                  id="editGroomNameInput"
                  value={eventEditForm.groomName}
                  onChange={(e) =>
                    setEventEditForm((prev) => ({
                      ...prev,
                      groomName: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="editVenueInput"
                  className="block text-sm font-semibold mb-1.5 text-gray-700 dark:text-gray-300"
                >
                  Venue
                </label>
                <Input
                  id="editVenueInput"
                  value={eventEditForm.venue}
                  onChange={(e) =>
                    setEventEditForm((prev) => ({
                      ...prev,
                      venue: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label
                  htmlFor="editFunctionTimeInput"
                  className="block text-sm font-semibold mb-1.5 text-gray-700 dark:text-gray-300"
                >
                  Function Time
                </label>
                <Input
                  id="editFunctionTimeInput"
                  type="time"
                  value={eventEditForm.functionTime}
                  onChange={(e) =>
                    setEventEditForm((prev) => ({
                      ...prev,
                      functionTime: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="editFunctionDateInput"
                className="block text-sm font-semibold mb-1.5 text-gray-700 dark:text-gray-300"
              >
                Function Date
              </label>
              <Input
                id="editFunctionDateInput"
                type="date"
                value={eventEditForm.functionDate}
                onChange={(e) =>
                  setEventEditForm((prev) => ({
                    ...prev,
                    functionDate: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <label
                htmlFor="editEventDescriptionInput"
                className="block text-sm font-semibold mb-1.5 text-gray-700 dark:text-gray-300"
              >
                Description
              </label>
              <TextArea
                id="editEventDescriptionInput"
                value={eventEditForm.description}
                onChange={(e) =>
                  setEventEditForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                rows={4}
                placeholder="Add any notes or description for this event"
              />
            </div>
            <div className="flex justify-end pt-4 space-x-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setIsEditingEvent(false);
                  setEventEditForm(null);
                  setEventEditErrors({});
                }}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={isEventSaving}>
                Save Changes
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* DELETE CONFIRMATION */}
      <ConfirmDialog
        isOpen={!!entryToDelete}
        onClose={() => setEntryToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Entry"
        message="Are you sure you want to delete this entry? The total collection amount will be automatically recalculated. This action cannot be undone."
        confirmText="Delete Entry"
        cancelText="Cancel"
        isDanger={true}
      />

      {/* PRINT PREVIEW MODAL */}
      <PrintPreviewModal
        isOpen={isPrintOpen}
        onClose={handleClosePrint}
        entry={printEntry}
        event={activeEvent}
      />

      {/* MANAGE ACCESS MODAL */}
      <Modal
        isOpen={isShareModalOpen}
        onClose={() => {
          setIsShareModalOpen(false);
          setShareEmailInput("");
        }}
        title="Manage Event Access"
      >
        <div className="space-y-6">
          {/* Share Link Row */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Share Link
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={`${window.location.origin}/#${ROUTES.EVENT_BY_SHARE.replace(
                  ":shareId",
                  activeEvent?.shareId || "",
                )}`}
                className="flex-1 h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 px-3 py-2 text-xs text-gray-500 dark:text-gray-400 select-all focus:outline-none"
              />
              <Button variant="outline" size="sm" onClick={handleCopyLink} title="Copy share link">
                <Copy size={16} />
              </Button>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gray-200 dark:bg-gray-800" />

          {/* Add Helper Form */}
          <form onSubmit={handleAddHelper} className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Add Helper
            </h3>
            <div className="flex gap-2">
              <Input
                type="email"
                required
                value={shareEmailInput}
                onChange={(e) => setShareEmailInput(e.target.value)}
                placeholder="helper@example.com"
                disabled={isSharingSubmitting}
                className="flex-1"
              />
              <Button type="submit" variant="primary" isLoading={isSharingSubmitting}>
                <UserPlus size={16} className="mr-1.5" /> Add
              </Button>
            </div>
          </form>

          {/* Shared Helpers List */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Shared Helpers
            </h3>
            {(!activeEvent?.sharedEmails || activeEvent.sharedEmails.length === 0) ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                This event has not been shared with any helpers yet.
              </p>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-800 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden bg-gray-50/50 dark:bg-gray-900/10">
                {activeEvent.sharedEmails.map((email) => (
                  <li
                    key={email}
                    className="flex justify-between items-center px-4 py-3 text-sm text-gray-700 dark:text-gray-300"
                  >
                    <span className="truncate">{email}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveHelper(email)}
                      className="text-red-500 hover:text-red-600 p-1.5 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"
                      title="Revoke access"
                    >
                      <UserMinus size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
