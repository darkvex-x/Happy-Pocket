import { LayoutDashboard, PlusCircle, CalendarDays, Database, History, Settings, UsersRound } from 'lucide-react';
import { ROUTES } from './routes';

export const NAV_ITEMS = [
  { name: 'Dashboard', shortName: 'Dash', path: ROUTES.DASHBOARD, icon: LayoutDashboard },
  { name: 'New Event', shortName: 'New', path: ROUTES.CREATE_EVENT, icon: PlusCircle },
  { name: 'Current Event', shortName: 'Event', path: ROUTES.CURRENT_EVENT, icon: CalendarDays },
  { name: 'Database', shortName: 'Data', path: ROUTES.DATABASE, icon: Database },
  { name: 'History', shortName: 'Hist', path: ROUTES.HISTORY, icon: History },
  { name: 'Settings', shortName: 'Settings', path: ROUTES.SETTINGS, icon: Settings },
  { name: 'Users', shortName: 'Users', path: ROUTES.USER_MANAGEMENT, icon: UsersRound, adminOnly: true },
];

