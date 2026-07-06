import React, { useState, useEffect, useMemo } from "react";
import { StorageService } from "../../services/storage";
import { ExportService } from "../../services/export";
import { PAYMENT_METHODS } from "../../constants/paymentMethods";
import { Card, CardContent } from "../../components/ui/Card";
import Skeleton from "../../components/ui/Skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/Table";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Dropdown from "../../components/ui/Dropdown";
import SearchInput from "../../components/ui/SearchInput";
import Modal from "../../components/ui/Modal";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import {
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  FileText,
  FileDown,
  Inbox,
} from "lucide-react";
import { cn } from "../../utils/cn";
import { useSearch } from "../../hooks/useSearch";
import { useToast } from "../../components/ui/Toast";
import EmptyState from "../../components/ui/EmptyState";
import { debounce } from "../../utils/helpers";
import { usePermissions } from "../../context/PermissionContext";
import { PERMISSIONS } from "../../services/permissions";

export default function Database() {
  const { addToast } = useToast();
  const { permissions } = usePermissions();
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [receiptPrefix, setReceiptPrefix] = useState("MR-");
  const [currency, setCurrency] = useState("₹");

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [displayQuery, setDisplayQuery] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("All");

  // Sort
  const [sortConfig, setSortConfig] = useState({
    key: "createdAt",
    direction: "desc",
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 15;

  // Modals
  const [editingEntry, setEditingEntry] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState(null);

  useEffect(() => {
    const unsubscribeSettings = StorageService.subscribeToSettings(
      (settings) => {
        if (settings?.receiptPrefix) setReceiptPrefix(settings.receiptPrefix);
        if (settings?.currency) setCurrency(settings.currency);
      },
    );

    const unsubscribeEvents = StorageService.subscribeToEvents((allEvents) => {
      setEvents(allEvents);
      if (allEvents.length === 0) {
        setSelectedEventId("");
        setEntries([]);
        setIsLoading(false);
        return;
      }

      setSelectedEventId((prevSelectedEventId) => {
        if (
          prevSelectedEventId &&
          allEvents.some((event) => event.id === prevSelectedEventId)
        ) {
          return prevSelectedEventId;
        }
        return allEvents[0].id;
      });
      setCurrentPage(1);
    });

    return () => {
      unsubscribeSettings();
      unsubscribeEvents();
    };
  }, []);

  useEffect(() => {
    if (!selectedEventId) {
      setEntries([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const unsubscribeEntries = StorageService.subscribeToEntries(
      selectedEventId,
      (evEntries) => {
        setEntries(evEntries);
        setIsLoading(false);
      },
    );

    return () => {
      unsubscribeEntries();
    };
  }, [selectedEventId]);

  // Debounced search text state setter
  const debouncedSetSearchQuery = useMemo(
    () =>
      debounce((val) => {
        setSearchQuery(val);
        setCurrentPage(1);
      }, 250),
    [],
  );

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setDisplayQuery(val);
    debouncedSetSearchQuery(val);
  };

  // Custom Hook: Standardized item searching logic
  const searchedEntries = useSearch(
    entries,
    searchQuery,
    ["name", "receiptNumber"],
    receiptPrefix,
  );

  // --- PROCESSING CHAIN: Filter -> Sort -> Paginate ---
  const filteredAndSortedEntries = useMemo(() => {
    let result = [...searchedEntries];

    // 1. Payment Method Filter
    if (paymentFilter !== "All") {
      result = result.filter((e) => e.paymentMethod === paymentFilter);
    }

    // 2. Sort
    result.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      if (sortConfig.key === "amount" || sortConfig.key === "receiptNumber") {
        aVal = Number(aVal);
        bVal = Number(bVal);
      }

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortConfig.direction === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [searchedEntries, paymentFilter, sortConfig]);

  const filteredTotals = useMemo(() => {
    const totalAmount = filteredAndSortedEntries.reduce(
      (sum, e) => sum + e.amount,
      0,
    );
    return {
      count: filteredAndSortedEntries.length,
      amount: totalAmount,
    };
  }, [filteredAndSortedEntries]);

  const totalPages = Math.ceil(
    filteredAndSortedEntries.length / ITEMS_PER_PAGE,
  );

  // Keyboard navigation for pagination (Left/Right Arrows)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        ["INPUT", "TEXTAREA", "SELECT"].includes(
          document.activeElement?.tagName,
        )
      ) {
        return;
      }
      if (e.key === "ArrowLeft") {
        setCurrentPage((p) => Math.max(1, p - 1));
      } else if (e.key === "ArrowRight") {
        setCurrentPage((p) => Math.min(totalPages, p + 1));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [totalPages]);

  const pageNumbers = useMemo(() => {
    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  }, [currentPage, totalPages]);

  const paginatedEntries = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAndSortedEntries.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredAndSortedEntries, currentPage]);

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "desc" ? "asc" : "desc",
    }));
  };

  // --- ACTIONS ---
  const handleEditSave = async (e) => {
    e.preventDefault();
    if (
      !editForm.name.trim() ||
      !editForm.amount ||
      Number(editForm.amount) <= 0
    ) {
      addToast({
        type: "error",
        title: "Validation Error",
        message: "Name and amount are required.",
      });
      return;
    }
    setIsEditSubmitting(true);
    try {
      await StorageService.updateEntry(editingEntry.id, {
        name: editForm.name.trim(),
        amount: Number(editForm.amount),
        paymentMethod: editForm.paymentMethod,
      });
      addToast({
        type: "success",
        title: "Entry Updated",
        message: "Guest record updated successfully.",
      });
      setEditingEntry(null);
    } catch (err) {
      addToast({
        type: "error",
        title: "Update Failed",
        message: err.message || "Could not update guest entry.",
      });
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      await StorageService.deleteEntry(entryToDelete);
      addToast({
        type: "success",
        title: "Entry Deleted",
        message: "Guest contribution removed.",
      });
    } catch (err) {
      addToast({
        type: "error",
        title: "Deletion Failed",
        message: err.message || "Could not remove guest entry.",
      });
    } finally {
      setEntryToDelete(null);
    }
  };

  // --- EXPORT HELPERS ---
  const getExportContext = () => {
    const event = events.find((e) => e.id === selectedEventId);
    return {
      eventName: event?.eventName,
      prefix: receiptPrefix,
      currency: "₹",
    };
  };


  const handleExportCSV = () => {
    const { eventName, prefix, currency } = getExportContext();
    ExportService.toCSV(filteredAndSortedEntries, eventName, prefix, currency);
    addToast({
      type: "success",
      title: "CSV Exported",
      message: `Exported ${filteredAndSortedEntries.length} items to CSV.`,
    });
  };

  const handleExportExcel = () => {
    const { eventName, prefix, currency } = getExportContext();
    ExportService.toExcel(
      filteredAndSortedEntries,
      eventName,
      prefix,
      currency,
    );
    addToast({
      type: "success",
      title: "Excel Exported",
      message: `Exported ${filteredAndSortedEntries.length} items to Excel.`,
    });
  };

  const handleExportPDF = async () => {
    const event = events.find((e) => e.id === selectedEventId);
    try {
      await ExportService.toPDF(
        filteredAndSortedEntries,
        event,
        receiptPrefix,
        currency,
      );
      addToast({
        type: "success",
        title: "PDF Exported",
        message: `Exported ${filteredAndSortedEntries.length} items to PDF.`,
      });
    } catch (err) {
      console.error("PDF export failed:", err);
      addToast({
        type: "error",
        title: "Export Failed",
        message: "Failed to generate the PDF report.",
      });
    }
  };

  const SortableHead = ({ label, sortKey, className }) => (
    <TableHead
      className={cn(
        "cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group px-6",
        className,
      )}
      onClick={() => handleSort(sortKey)}
    >
      <div className="flex items-center space-x-1">
        <span className="font-semibold text-gray-700 dark:text-gray-300">
          {label}
        </span>
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

  return (
    <div className="space-y-6 animate-in fade-in duration-300 h-full flex flex-col">
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Database Viewer</h1>
          <p
            style={{ fontFamily: '"Lemon",Aerial' }}
            className="text-gray-500 dark:text-gray-400 mt-1"
          >
            Deep dive, filter, and export all recorded transactions.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {permissions.includes(PERMISSIONS.EXPORT_CSV) && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={filteredAndSortedEntries.length === 0}
            >
              <FileDown size={16} className="mr-1.5 text-emerald-600" /> CSV
            </Button>
          )}
          {permissions.includes(PERMISSIONS.EXPORT_EXCEL) && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              disabled={filteredAndSortedEntries.length === 0}
            >
              <FileSpreadsheet size={16} className="mr-1.5 text-green-600" />
              Excel
            </Button>
          )}
          {permissions.includes(PERMISSIONS.EXPORT_PDF) && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPDF}
              disabled={filteredAndSortedEntries.length === 0}
            >
              <FileText size={16} className="mr-1.5 text-red-500" /> PDF
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col border border-slate-800 bg-[#1E293B] shadow-md rounded-2xl overflow-hidden">
        {/* Top Controls Bar */}
        <div className="p-4 md:p-5 border-b border-slate-800/60 bg-slate-900/40 flex flex-col xl:flex-row gap-4 justify-between xl:items-center">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 w-full xl:w-auto">
            <div className="w-full md:w-64">
              <Dropdown
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                options={events.map((e) => ({
                  value: e.id,
                  label: e.eventName,
                }))}
                className="bg-[#111827] border-slate-850"
                disabled={isLoading || events.length === 0}
              />
            </div>

            <div className="text-xs font-semibold text-slate-400 bg-slate-950/60 px-3 py-2 rounded-lg border border-slate-800">
              Showing {filteredTotals.count} entries • Total: ₹
              {filteredTotals.amount.toLocaleString("en-IN")}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto">
            <SearchInput
              placeholder="Search name, receipt..."
              value={displayQuery}
              onChange={handleSearchChange}
              className="w-full sm:w-64 bg-[#111827] border-slate-850 text-slate-200 placeholder:text-slate-550"
            />
            <Dropdown
              value={paymentFilter}
              onChange={(e) => {
                setPaymentFilter(e.target.value);
                setCurrentPage(1);
              }}
              options={[
                { value: "All", label: "All Methods" },
                ...PAYMENT_METHODS,
              ]}
              className="w-full sm:w-48 bg-[#111827] border-slate-850"
            />
          </div>
        </div>

        {/* Data Grid */}
        <CardContent className="p-0 flex-1 overflow-y-auto relative" style={{ maxHeight: 'calc(100vh - 290px)', minHeight: '300px' }}>
          {isLoading ? (
            <Table className="w-full border-collapse">
              <TableHeader className="bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-sm sticky top-0 z-10 shadow-sm border-b">
                <TableRow>
                  <TableHead>Receipt</TableHead>
                  <TableHead>Guest Name</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Date Recorded</TableHead>
                  <TableHead className="text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="px-6 py-4"><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell className="px-6 py-4"><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell className="px-6 py-4 text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                    <TableCell className="px-6 py-4"><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell className="px-6 py-4"><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="px-6 py-4 text-right pr-6"><Skeleton className="h-4 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : paginatedEntries.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="No records found"
              description={
                searchQuery || paymentFilter !== "All"
                  ? "Try clearing filters to view all entries."
                  : "There are no guest records recorded for this event yet."
              }
              actionLabel={
                searchQuery || paymentFilter !== "All" ? "Clear Filters" : null
              }
              onAction={
                searchQuery || paymentFilter !== "All"
                  ? () => {
                      setSearchQuery("");
                      setDisplayQuery("");
                      setPaymentFilter("All");
                    }
                  : null
              }
            />
          ) : (
            <Table className="w-full border-collapse">
              <TableHeader className="bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-sm sticky top-0 z-10 shadow-sm border-b">
                <TableRow>
                  <SortableHead label="Receipt" sortKey="receiptNumber" />
                  <SortableHead label="Guest Name" sortKey="name" />
                  <SortableHead
                    label={`Amount (${currency})`}
                    sortKey="amount"
                    className="text-right flex-row-reverse"
                  />
                  <SortableHead label="Method" sortKey="paymentMethod" />
                  <SortableHead label="Date Recorded" sortKey="createdAt" />
                  <TableHead className="text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedEntries.map((entry, index) => {
                  const createdInfo = entry.createdByEmail
                    ? `Added by ${entry.createdByEmail} on ${new Date(entry.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}`
                    : "";
                  const updatedInfo = entry.updatedByEmail && entry.updatedAt
                    ? ` · Edited by ${entry.updatedByEmail} on ${new Date(entry.updatedAt).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}`
                    : "";
                  return (
                  <TableRow
                    key={entry.id}
                    className={cn(
                      "hover:bg-slate-800/40 transition-colors border-b border-slate-800/40",
                      index % 2 === 0
                        ? "bg-slate-900/10"
                        : "bg-[#1E293B]/20",
                    )}
                    title={createdInfo + updatedInfo || undefined}
                  >
                    <TableCell className="px-6 font-mono text-xs text-[#7C3AED]">
                      {receiptPrefix}
                      {entry.receiptNumber}
                    </TableCell>
                    <TableCell className="px-6 font-semibold text-white whitespace-nowrap">
                      {entry.name}
                    </TableCell>
                    <TableCell className="px-6 text-right font-bold text-[#10B981] whitespace-nowrap">
                      {entry.amount.toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell className="px-6">
                      <span className="text-[10px] font-bold bg-slate-800 text-[#94A3B8] px-2 py-0.5 rounded-md border border-slate-700/50 uppercase tracking-wide">
                        {entry.paymentMethod}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 text-xs text-[#94A3B8] whitespace-nowrap">
                      {new Date(entry.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell className="px-6 text-right">
                      <div className="flex justify-end gap-2">
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
                            className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md transition-colors"
                            aria-label={`Edit guest entry for ${entry.name}`}
                          >
                            <Edit2 size={16} />
                          </button>
                        )}
                        {permissions.includes(PERMISSIONS.DELETE_ENTRIES) && (
                          <button
                            onClick={() => setEntryToDelete(entry.id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors"
                            aria-label={`Delete guest entry for ${entry.name}`}
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

        {/* Pagination Footer */}
        <div className="border-t border-gray-200 dark:border-gray-800 p-4 flex flex-col sm:flex-row items-center justify-between text-sm text-gray-500 bg-gray-50/50 dark:bg-gray-800/30 gap-4">
          <div>
            Showing{" "}
            <span className="font-semibold text-gray-900 dark:text-white">
              {(currentPage - 1) * ITEMS_PER_PAGE +
                (paginatedEntries.length > 0 ? 1 : 0)}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-gray-900 dark:text-white">
              {(currentPage - 1) * ITEMS_PER_PAGE + paginatedEntries.length}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-gray-900 dark:text-white">
              {filteredAndSortedEntries.length}
            </span>{" "}
            results
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              aria-label="Previous Page"
            >
              <ChevronLeft size={16} />
            </Button>

            <div className="flex gap-1">
              {pageNumbers.map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={cn(
                    "h-8 w-8 rounded-lg text-xs font-semibold transition-colors outline-none",
                    currentPage === page
                      ? "bg-indigo-600 text-white font-bold"
                      : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700",
                  )}
                  aria-label={`Go to Page ${page}`}
                >
                  {page}
                </button>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages || totalPages === 0}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Next Page"
            >
              <ChevronRight size={16} />
            </Button>
          </div>
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
                htmlFor="editDbGuestNameInput"
                className="block text-sm font-semibold mb-1.5 text-gray-700 dark:text-gray-300"
              >
                Name
              </label>
              <Input
                id="editDbGuestNameInput"
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
                htmlFor="editDbAmountInput"
                className="block text-sm font-semibold mb-1.5 text-gray-700 dark:text-gray-300"
              >
                Amount (₹)
              </label>
              <Input
                id="editDbAmountInput"
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

      <ConfirmDialog
        isOpen={!!entryToDelete}
        onClose={() => setEntryToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Entry"
        message="Are you sure you want to completely remove this entry? The total collection amount for this event will be automatically adjusted."
        confirmText="Delete Record"
        cancelText="Cancel"
        isDanger={true}
      />
    </div>
  );
}
