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

export default function Dashboard() {
  const navigate = useNavigate();
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
        color: "text-blue-500",
        bg: "bg-blue-100 dark:bg-blue-900/30",
      },
      {
        title: "Total Entries",
        value: totalEntries.toLocaleString("en-IN"),
        icon: Users,
        color: "text-indigo-500",
        bg: "bg-indigo-100 dark:bg-indigo-900/30",
      },
      {
        title: "Total Collection",
        value: `${currency} ${totalCollection.toLocaleString("en-IN")}`,
        icon: IndianRupee,
        color: "text-emerald-500",
        bg: "bg-emerald-100 dark:bg-emerald-900/30",
      },
      {
        title: "Today's Collection",
        value: `${currency} ${todaysCollection.toLocaleString("en-IN")}`,
        icon: TrendingUp,
        color: "text-amber-500",
        bg: "bg-amber-100 dark:bg-amber-900/30",
      },
    ],
    [totalEvents, totalEntries, totalCollection, todaysCollection, currency],
  );

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
      {/* Header & CTA */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Overview
          </h1>
          <p
            style={{ fontFamily: '"Lemon",Aerial' }}
            className="text-gray-500 dark:text-gray-400 mt-1"
          >
            Welcome back to Happy Pocket. Here is your summary.
          </p>
        </div>
        <Button
          size="lg"
          className="w-full sm:w-auto shadow-md"
          onClick={() => navigate(ROUTES.CREATE_EVENT)}
        >
          <Plus className="mr-2" size={20} />
          Create New Event
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card
                key={i}
                className="border-0 shadow-sm ring-1 ring-gray-200 dark:ring-gray-800"
              >
                <CardContent className="p-5 md:p-6 flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded-2xl flex-shrink-0" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-6 w-24" />
                  </div>
                </CardContent>
              </Card>
            ))
          : stats.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <Card
                  key={i}
                  className="border-0 shadow-sm ring-1 ring-gray-200 dark:ring-gray-800"
                >
                  <CardContent className="p-5 md:p-6 flex items-center space-x-4">
                    <div
                      className={`p-3 rounded-2xl ${stat.bg} ${stat.color} flex-shrink-0`}
                    >
                      <Icon size={24} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        {stat.title}
                      </p>
                      <h3 className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">
                        {stat.value}
                      </h3>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
      </div>

      {/* Recent Events Table */}
      <Card className="border-0 shadow-sm ring-1 ring-gray-200 dark:ring-gray-800 overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between py-5 px-6 border-b border-gray-100 dark:border-gray-800">
          <CardTitle className="text-lg">Recent Events</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(ROUTES.HISTORY)}
          >
            View All <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : recentEvents.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <p className="text-sm">
                No events found. Start by creating a new event!
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => navigate(ROUTES.CREATE_EVENT)}
              >
                Create Event
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
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
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    onClick={() =>
                      navigate(ROUTES.CURRENT_EVENT, {
                        state: { eventId: event.id },
                      })
                    }
                  >
                    <TableCell className="font-medium">
                      {event.eventName}
                      {/* Fallback for Mobile to see the date since column is hidden */}
                      <div className="md:hidden text-xs text-gray-500 mt-1">
                        {new Date(event.functionDate).toLocaleDateString(
                          "en-IN",
                          { day: "numeric", month: "short", year: "numeric" },
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-gray-500 dark:text-gray-400">
                      {new Date(event.functionDate).toLocaleDateString(
                        "en-IN",
                        { day: "numeric", month: "short", year: "numeric" },
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-gray-500 dark:text-gray-400">
                      {event.venue || "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      <Badge variant="default">{event.totalEntries}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-emerald-600 dark:text-emerald-400">
                      {currency} {event.totalAmount.toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <Button
                        variant="ghost"
                        size="sm"
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
        </CardContent>
      </Card>
    </div>
  );
}
