import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Users,
  IndianRupee,
  TrendingUp,
  Plus,
  ArrowRight,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/Table";
import Badge from "../../components/ui/Badge";
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
        setRecentEvents(loadedEvents.slice(0, 3));
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
        color: "text-blue-400",
        bg: "bg-blue-500/10",
        glow: "hover:border-blue-500/30",
      },
      {
        title: "Total Entries",
        value: totalEntries.toLocaleString("en-IN"),
        icon: Users,
        color: "text-purple-400",
        bg: "bg-purple-500/10",
        glow: "hover:border-purple-500/30",
      },
      {
        title: "Total Collection",
        value: `${currency} ${totalCollection.toLocaleString("en-IN")}`,
        icon: IndianRupee,
        color: "text-emerald-400",
        bg: "bg-emerald-500/10",
        glow: "hover:border-emerald-500/30",
      },
      {
        title: "Today's Collection",
        value: `${currency} ${todaysCollection.toLocaleString("en-IN")}`,
        icon: TrendingUp,
        color: "text-amber-400",
        bg: "bg-amber-500/10",
        glow: "hover:border-amber-500/30",
      },
    ],
    [totalEvents, totalEntries, totalCollection, todaysCollection, currency],
  );

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 text-white">
      {/* Header & CTA */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
            Overview
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            Welcome back to Digi Moi. Here is your summary.
          </p>
        </div>
        {permissions.includes(PERMISSIONS.EDIT_EVENT) && (
          <Button
            size="lg"
            className="w-full sm:w-auto shadow-md"
            onClick={() => navigate(ROUTES.CREATE_EVENT)}
          >
            <Plus className="mr-2" size={20} />
            Create New Event
          </Button>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-slate-800 rounded-2xl p-6 border border-slate-700/30 shadow-xl">
                <div className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded-2xl flex-shrink-0 bg-slate-700" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-20 bg-slate-700" />
                    <Skeleton className="h-6 w-24 bg-slate-700" />
                  </div>
                </div>
              </div>
            ))
          : stats.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div
                  key={i}
                  className={`bg-slate-800 rounded-2xl p-6 border border-slate-700/30 shadow-xl relative overflow-hidden group transition-all duration-300 ${stat.glow}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">{stat.title}</p>
                      <h3 className="text-2xl font-extrabold mt-1 text-white">{stat.value}</h3>
                    </div>
                    <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color} flex-shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                      <Icon size={22} />
                    </div>
                  </div>
                </div>
              );
            })}
      </div>

      {/* Recent Events Table */}
      <div className="bg-slate-800 rounded-2xl border border-slate-700/30 shadow-xl overflow-hidden">
        <div className="flex flex-row items-center justify-between py-5 px-6 border-b border-slate-700/30">
          <h2 className="text-lg font-bold text-white">Recent Events</h2>
          <Button variant="ghost" size="sm" onClick={() => navigate(ROUTES.HISTORY)} className="text-slate-400 hover:text-white">
            View All <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
        <div className="p-0 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 430px)', minHeight: '200px' }}>
          {isLoading ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-10 w-full bg-slate-700" />
              <Skeleton className="h-10 w-full bg-slate-700" />
              <Skeleton className="h-10 w-full bg-slate-700" />
            </div>
          ) : recentEvents.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <p className="text-sm">No events found.</p>
              {permissions.includes(PERMISSIONS.EDIT_EVENT) && (
                <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate(ROUTES.CREATE_EVENT)}>
                  Create Event
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 bg-slate-950/90 z-10 backdrop-blur-sm">
                <TableRow>
                  <TableHead>Event Name</TableHead>
                  <TableHead className="hidden md:table-cell">Date</TableHead>
                  <TableHead className="hidden lg:table-cell">Venue</TableHead>
                  <TableHead className="text-right">Entries</TableHead>
                  <TableHead className="text-right">Collection</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentEvents.map((event) => (
                  <TableRow
                    key={event.id}
                    className="cursor-pointer hover:bg-slate-700/40 transition-colors"
                    onClick={() =>
                      navigate(ROUTES.CURRENT_EVENT, {
                        state: { eventId: event.id },
                      })
                    }
                  >
                    <TableCell className="font-semibold text-white">
                      {event.eventName}
                      <div className="md:hidden text-xs text-slate-500 mt-1">
                        {new Date(event.functionDate).toLocaleDateString(
                          "en-IN",
                          { day: "numeric", month: "short", year: "numeric" },
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-slate-400">
                      {new Date(event.functionDate).toLocaleDateString(
                        "en-IN",
                        { day: "numeric", month: "short", year: "numeric" },
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-slate-400">
                      {event.venue || "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      <Badge variant="default">{event.totalEntries}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-emerald-400">
                      {currency} {event.totalAmount.toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-400 hover:text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(ROUTES.CURRENT_EVENT, {
                            state: { eventId: event.id },
                          });
                        }}
                      >
                        Open
                      </Button>
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
