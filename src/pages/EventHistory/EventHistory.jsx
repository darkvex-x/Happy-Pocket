import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { StorageService } from "../../services/storage";
import { ROUTES } from "../../constants/routes";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import PrintPreviewModal from "../../components/print/PrintPreviewModal";
import {
  Users,
  IndianRupee,
  Printer,
  ExternalLink,
  Copy,
  Trash2,
  CalendarHeart,
} from "lucide-react";
import { usePrint } from "../../hooks/usePrint";
import { useToast } from "../../components/ui/Toast";
import { usePermissions } from "../../context/PermissionContext";
import { PERMISSIONS } from "../../services/permissions";
export default function EventHistory() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { permissions } = usePermissions();
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currency, setCurrency] = useState("₹");

  const [eventToDelete, setEventToDelete] = useState(null);
  const [isDuplicating, setIsDuplicating] = useState(false);

  // Custom Hook: Print targeting
  const {
    printTarget,
    isPrintOpen,
    handlePrint: setPrintTarget,
    handleClosePrint,
  } = usePrint();

  useEffect(() => {
    setIsLoading(true);

    const unsubscribeSettings = StorageService.subscribeToSettings(
      (settings) => {
        if (settings?.currency) setCurrency(settings.currency);
      },
    );

    const unsubscribeEvents = StorageService.subscribeToEvents((allEvents) => {
      setEvents(allEvents);
      setIsLoading(false);
    });

    return () => {
      unsubscribeSettings();
      unsubscribeEvents();
    };
  }, []);

  const handleOpen = (eventId) => {
    navigate(ROUTES.CURRENT_EVENT, { state: { eventId } });
  };

  const handleDuplicate = async (event) => {
    setIsDuplicating(true);
    try {
      const copyData = {
        eventName: `${event.eventName} (Copy)`,
        brideName: event.brideName,
        groomName: event.groomName,
        venue: event.venue,
        functionDate: new Date().toISOString().split("T")[0],
        notes: `Duplicated from ${event.eventName}`,
      };
      await StorageService.createEvent(copyData);
      addToast({
        type: "success",
        title: "Event Duplicated",
        message: `Created duplicate copy of "${event.eventName}".`,
      });
    } catch (err) {
      addToast({
        type: "error",
        title: "Duplication Failed",
        message: err.message || "Failed to duplicate event.",
      });
    } finally {
      setIsDuplicating(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!eventToDelete) return;
    try {
      await StorageService.deleteEvent(eventToDelete.id);
      addToast({
        type: "success",
        title: "Event Deleted",
        message: `Ledger and entries for "${eventToDelete.eventName}" deleted.`,
      });
    } catch (err) {
      addToast({
        type: "error",
        title: "Deletion Failed",
        message: err.message || "Could not delete the event ledger.",
      });
    } finally {
      setEventToDelete(null);
    }
  };

  const handlePrintSummary = (event) => {
    setPrintTarget({ event });
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-300 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight">Event History</h1>
            {!isLoading && events.length > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#2563EB]/10 text-[#2563EB] border border-[#2563EB]/20 uppercase tracking-wider">
                {events.length} {events.length === 1 ? "event" : "events"}
              </span>
            )}
          </div>
          <p className="text-[#A3A3A3] mt-1 text-sm">
            Access, print, and manage all of your past operations here.
          </p>
        </div>
        {permissions.includes(PERMISSIONS.EDIT_EVENT) && (
          <Button onClick={() => navigate(ROUTES.CREATE_EVENT)}>
            Create New Event
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64 text-gray-400">
          Loading Events...
        </div>
      ) : events.length === 0 ? (
        <Card className="border border-[#2A2A2A] shadow-sm">
          <EmptyState
            icon={CalendarHeart}
            title="No Past Events"
            description="You have not created any events yet. Once you host events, they will be archived here safely."
            actionLabel="Create First Event"
            onAction={() => navigate(ROUTES.CREATE_EVENT)}
          />
        </Card>
      ) : (
        <div className="overflow-y-auto pr-1" style={{ maxHeight: 'calc(100vh - 220px)' }}>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-4">
            {events.map((event) => (
            <Card
              key={event.id}
              className="border border-[#2A2A2A] bg-[#161616] shadow-md flex flex-col group hover:shadow-lg hover:border-[#2563EB]/25 transition-all duration-300 relative overflow-hidden"
            >
              {/* Decorative Gradient Background */}
              <div className="absolute top-0 right-0 -mr-12 -mt-12 w-32 h-32 bg-gradient-to-br from-[#2563EB]/5 to-transparent rounded-full pointer-events-none blur-2xl group-hover:from-[#2563EB]/10 transition-colors"></div>

              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold text-white line-clamp-1 pr-8">
                  {event.eventName}
                </CardTitle>
                <div className="text-xs font-semibold text-[#A3A3A3] mt-1 line-clamp-1">
                  {event.brideName || event.groomName ? (
                    <span>
                      {event.brideName}{" "}
                      {event.brideName && event.groomName && "&"}{" "}
                      {event.groomName}
                    </span>
                  ) : (
                    <span>
                      {new Date(event.functionDate).toLocaleDateString(
                        "en-IN",
                        { day: "numeric", month: "long", year: "numeric" },
                      )}
                    </span>
                  )}
                </div>
              </CardHeader>

              <CardContent className="flex-1 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#111111] p-4 rounded-xl flex items-center space-x-3 border border-[#2A2A2A]">
                    <div className="bg-emerald-500/10 text-emerald-400 p-2 rounded-lg">
                      <IndianRupee size={16} />
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-[#737373] tracking-wider">
                        Collected
                      </div>
                      <div
                        className="font-bold text-white leading-tight block truncate sm:max-w-24 md:max-w-none text-sm"
                        title={`${currency}${event.totalAmount.toLocaleString("en-IN")}`}
                      >
                        {currency}
                        {event.totalAmount.toLocaleString("en-IN")}
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#111111] p-4 rounded-xl flex items-center space-x-3 border border-[#2A2A2A]">
                    <div className="bg-[#2563EB]/10 text-[#2563EB] p-2 rounded-lg">
                      <Users size={16} />
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-[#737373] tracking-wider">
                        Entries
                      </div>
                      <div className="font-bold text-white leading-tight block truncate text-sm">
                        {event.totalEntries}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="border-t border-[#2A2A2A] bg-slate-900/40 py-3 px-4 grid grid-cols-4 gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full text-xs h-8 px-2"
                  title="Open Event"
                  aria-label={`Open event ledger for ${event.eventName}`}
                  onClick={() => handleOpen(event.id)}
                >
                  <ExternalLink size={14} />
                </Button>
                {permissions.includes(PERMISSIONS.PRINT_RECEIPT) && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full text-xs h-8 px-2"
                    title="Print Summary"
                    aria-label={`Print summary receipt for ${event.eventName}`}
                    onClick={() => handlePrintSummary(event)}
                  >
                    <Printer size={14} />
                  </Button>
                )}
                {permissions.includes(PERMISSIONS.EDIT_EVENT) && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full text-xs h-8 px-2"
                    title="Duplicate Event"
                    aria-label={`Duplicate event ledger for ${event.eventName}`}
                    disabled={isDuplicating}
                    onClick={() => handleDuplicate(event)}
                  >
                    <Copy size={14} />
                  </Button>
                )}
                {permissions.includes(PERMISSIONS.DELETE_EVENT) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs h-8 px-2 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                    title="Delete Event"
                    aria-label={`Delete event ledger for ${event.eventName}`}
                    onClick={() => setEventToDelete(event)}
                  >
                    <Trash2 size={14} />
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!eventToDelete}
        onClose={() => setEventToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Event Permanently"
        message={`Are you absolutely sure you want to delete "${eventToDelete?.eventName}"? ALL entries associated with this event will be permanently destroyed. This action CANNOT be undone.`}
        confirmText="Yes, Destroy Everything"
        cancelText="Cancel"
        isDanger={true}
      />

      {/* Thermal Print Preview — Summary (no specific entry) */}
      <PrintPreviewModal
        isOpen={isPrintOpen}
        onClose={handleClosePrint}
        entry={null}
        event={printTarget?.event}
      />
    </div>
  );
}
