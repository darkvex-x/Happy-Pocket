import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Users,
  IndianRupee,
  TrendingUp,
  Plus,
  ArrowRight,
  ChevronRight,
} from "lucide-react";
import Button from "../../components/ui/Button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/Table";
import Skeleton from "../../components/ui/Skeleton";
import { ROUTES } from "../../constants/routes";
import { StorageService } from "../../services/storage";
import { useTotals } from "../../hooks/useTotals";
import { usePermissions } from "../../context/PermissionContext";
import { PERMISSIONS } from "../../services/permissions";

export default function Dashboard() {
  const navigate = useNavigate();
  const { permissions } = usePermissions();
  const [events, setEvents] = useState([]);
  const [entries, setEntries] = useState([]);
  const [recentEvents, setRecentEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currency, setCurrency] = useState("₹");

  useEffect(() => {
    setIsLoading(true);

    const unsubscribeSettings = StorageService.subscribeToSettings(
      (settings) => {
        setCurrency(settings?.currency || "₹");
      },
    );

    const unsubscribeEvents = StorageService.subscribeToEvents(
      (loadedEvents) => {
        setEvents(loadedEvents);
        setRecentEvents(loadedEvents.slice(0, 5));
      },
    );

    const unsubscribeEntries = StorageService.subscribeToEntries(
      null,
      (loadedEntries) => {
        setEntries(loadedEntries);
        setIsLoading(false);
      },
    );

    return () => {
      unsubscribeSettings();
      unsubscribeEvents();
      unsubscribeEntries();
    };
  }, []);

  const { totalEvents, totalEntries, totalCollection, todaysCollection } =
    useTotals(events, entries);

  const stats = useMemo(
    () => [
      {
        title: "Total Events",
        value: String(totalEvents),
        icon: Calendar,
        iconColor: "text-[#2563EB]",
        iconBg: "bg-[#2563EB]/15",
      },
      {
        title: "Total Entries",
        value: totalEntries.toLocaleString("en-IN"),
        icon: Users,
        iconColor: "text-[#A3A3A3]",
        iconBg: "bg-[#2A2A2A]",
      },
      {
        title: "Total Collection",
        value: `${currency} ${totalCollection.toLocaleString("en-IN")}`,
        icon: IndianRupee,
        iconColor: "text-[#10B981]",
        iconBg: "bg-[#10B981]/15",
      },
      {
        title: "Today's Collection",
        value: `${currency} ${todaysCollection.toLocaleString("en-IN")}`,
        icon: TrendingUp,
        iconColor: "text-[#10B981]",
        iconBg: "bg-[#10B981]/15",
      },
    ],
    [totalEvents, totalEntries, totalCollection, todaysCollection, currency],
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-white">Overview</h1>
          <p className="text-[#737373] mt-0.5 text-sm">Welcome back to Digi Moi.</p>
        </div>
        {permissions.includes(PERMISSIONS.EDIT_EVENT) && (
          <Button
            size="default"
            className="w-full sm:w-auto"
            onClick={() => navigate(ROUTES.CREATE_EVENT)}
          >
            <Plus className="mr-1.5" size={15} />
            Create Event
          </Button>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-[#2A2A2A] bg-[#161616] p-5">
                <Skeleton className="h-3 w-20 bg-[#2A2A2A] rounded mb-3" />
                <Skeleton className="h-6 w-24 bg-[#2A2A2A] rounded" />
              </div>
            ))
          : stats.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div
                  key={i}
                  className="rounded-xl border border-[#2A2A2A] bg-[#161616] p-5 group hover:border-[#3A3A3A] transition-colors duration-200"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-[#737373] mb-2">
                        {stat.title}
                      </p>
                      <p className="text-2xl font-semibold text-white leading-none">{stat.value}</p>
                    </div>
                    <div className={`p-2 rounded-lg ${stat.iconBg} ${stat.iconColor} mt-0.5`}>
                      <Icon size={16} />
                    </div>
                  </div>
                </div>
              );
            })}
      </div>

      {/* Recent Events */}
      <div className="rounded-xl border border-[#2A2A2A] bg-[#161616] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2A2A2A]">
          <h2 className="text-[14px] font-semibold text-white">Recent Events</h2>
          <button
            onClick={() => navigate(ROUTES.HISTORY)}
            className="flex items-center gap-1 text-[12px] text-[#737373] hover:text-white transition-colors font-medium"
          >
            View all <ArrowRight size={12} />
          </button>
        </div>
        <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 400px)", minHeight: "200px" }}>
          {isLoading ? (
            <div className="p-5 space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-9 w-full bg-[#2A2A2A] rounded-lg" />
              ))}
            </div>
          ) : recentEvents.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-[#737373] text-sm">No events found.</p>
              {permissions.includes(PERMISSIONS.EDIT_EVENT) && (
                <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate(ROUTES.CREATE_EVENT)}>
                  Create Event
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead className="hidden md:table-cell">Date</TableHead>
                  <TableHead className="hidden lg:table-cell">Venue</TableHead>
                  <TableHead className="text-right">Entries</TableHead>
                  <TableHead className="text-right">Collection</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentEvents.map((event) => (
                  <TableRow
                    key={event.id}
                    className="cursor-pointer"
                    onClick={() => navigate(ROUTES.CURRENT_EVENT, { state: { eventId: event.id } })}
                  >
                    <TableCell className="font-semibold text-white py-3">
                      {event.eventName}
                      <div className="md:hidden text-[11px] text-[#737373] mt-0.5">
                        {new Date(event.functionDate).toLocaleDateString("en-IN", {
                          day: "numeric", month: "short", year: "numeric",
                        })}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-[#A3A3A3] py-3 text-[13px]">
                      {new Date(event.functionDate).toLocaleDateString("en-IN", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-[#A3A3A3] py-3 text-[13px]">
                      {event.venue || "—"}
                    </TableCell>
                    <TableCell className="text-right py-3">
                      <span className="text-[12px] font-semibold text-white bg-[#2A2A2A] px-2 py-0.5 rounded-md border border-[#3A3A3A]/60">
                        {event.totalEntries}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-[#10B981] py-3 text-[13px]">
                      {currency} {event.totalAmount.toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell className="text-right pr-4 py-3">
                      <button
                        className="text-[11px] text-[#737373] hover:text-white transition-colors font-medium flex items-center gap-0.5 ml-auto"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(ROUTES.CURRENT_EVENT, { state: { eventId: event.id } });
                        }}
                      >
                        Open <ChevronRight size={11} />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
