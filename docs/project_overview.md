# Happy Pocket — Wedding Moi Management System

## What It Does

**Happy Pocket** is a **wedding gift ("Moi") management web application** built for tracking monetary contributions (gifts) received at Indian wedding events. It's essentially a digital ledger that replaces pen-and-paper tracking of "who gave how much" at wedding functions.

### Core Workflow
1. **Create an Event** (wedding / reception) with details like bride/groom names, venue, date
2. **Record Entries** — each guest contribution: name, amount, payment method (Cash/UPI/Card/Cheque/Bank Transfer)
3. **Auto-generate receipt numbers** sequentially per event
4. **Print receipts** for guests
5. **Export data** to PDF, Excel, or CSV
6. **Share events** via unique share links
7. **View history** of all past events with totals

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | React 19 + Vite 8 |
| **Routing** | React Router DOM v7 (HashRouter) |
| **Styling** | Tailwind CSS v4 (via `@tailwindcss/vite` plugin) |
| **Backend/DB** | Firebase (Firestore + Firebase Auth) |
| **Auth** | Google Sign-In + Email/Password with **whitelist** enforcement |
| **Exports** | jsPDF + jspdf-autotable (PDF), xlsx (Excel), custom CSV |
| **Icons** | Lucide React |
| **Print** | react-to-print |

---

## Architecture

```
src/
├── App.jsx                    # Root: auth gate, routing, provider wrappers
├── main.jsx                   # Vite entry point
├── firebase.js                # Firebase config (env-driven, with demo fallbacks)
├── components/
│   ├── layout/                # MainLayout, Sidebar, Header, MobileNav
│   ├── ui/                    # Reusable UI: Button, Card, Modal, Toast, Table, etc.
│   ├── icons/                 # Custom icon components
│   └── print/                 # PrintPreviewModal for receipt printing
├── context/
│   ├── EventContext.jsx       # Active event state (auto-selects newest)
│   ├── PermissionContext.jsx  # RBAC: fetches user role from Firestore
│   ├── SettingsContext.jsx    # App settings (business name, currency, theme)
│   └── ThemeContext.jsx       # Light/dark mode toggle
├── pages/
│   ├── Auth/Login.jsx         # Login (email+password + Google, whitelist-gated)
│   ├── Dashboard/             # Overview: stats cards + recent events table
│   ├── EventCreate/           # Form to create a new event
│   ├── EventView/             # Main working page: entry form + entries table + modals
│   ├── Database/              # Full database view/management
│   ├── EventHistory/          # All past events listing
│   └── Settings/              # App configuration
├── services/
│   ├── storage.js             # THE data layer — all Firestore CRUD + localStorage fallback
│   ├── permissions.js         # Role definitions (Admin/Helper) + permission constants
│   └── export.js              # CSV, Excel, PDF generation
├── hooks/
│   ├── useLocalStorage.js     # Persistent local state
│   ├── usePrint.js            # Print modal state management
│   ├── useReceiptNumber.js    # Next receipt number calculation
│   ├── useSearch.js           # Filtering/search logic
│   └── useTotals.js           # Aggregate statistics (total events, entries, collections)
├── models/
│   ├── Event.js               # Event data shape + validation
│   └── Entry.js               # Entry data shape + validation
├── constants/
│   ├── routes.js              # Route path constants
│   ├── navItems.js            # Sidebar/nav configuration
│   ├── paymentMethods.js      # Cash, UPI, Card, etc.
│   ├── receipt.js             # Receipt formatting config
│   └── theme.js               # Theme tokens
└── utils/
    ├── cn.js                  # clsx + tailwind-merge utility
    ├── currency.js            # Currency formatting
    ├── date.js                # Date formatting helpers
    ├── format.js              # General formatters
    ├── helpers.js             # Misc helpers
    ├── receipt.js             # Receipt number utilities
    └── validation.js          # Form validation logic
```

---

## Key Design Decisions

### 1. Dual Storage Strategy
[storage.js](file:///c:/Users/Elayaraja%20G/OneDrive/Documents/Wedding%20Moi%20project/src/services/storage.js) implements **every** CRUD operation with two paths:
- **Firestore** (primary, when configured) — with real-time `onSnapshot` subscriptions
- **localStorage** fallback — for offline/demo mode when Firebase isn't configured

### 2. Whitelist-Based Access Control
Authentication is **not open registration**. The flow:
1. User signs in via Firebase Auth (Google or email/password)
2. App checks Firestore `users` collection for a matching email
3. If not whitelisted → immediately signed out + "Access Denied"
4. If whitelisted → auth metadata merged into user doc, proceeds to app

### 3. Role-Based Permissions (RBAC)
Two roles defined in [permissions.js](file:///c:/Users/Elayaraja%20G/OneDrive/Documents/Wedding%20Moi%20project/src/services/permissions.js):
- **Admin** — full access (edit/delete events, export, share, settings, all entry operations)
- **Helper** — limited to: add entry, edit entry, print receipt

### 4. Denormalized Totals
Events store `totalAmount` and `totalEntries` directly (updated via Firestore transactions), avoiding expensive aggregation queries.

### 5. Share Links
Events get unique `shareId` values, enabling access via `/event/:shareId` URLs.

---

## Data Models

### Event
| Field | Type | Description |
|-------|------|-------------|
| `id` | string | `evt_<uuid>_<timestamp>` |
| `shareId` | string | Unique shareable slug |
| `ownerId` | string | Firebase Auth UID |
| `eventName` | string | Display name |
| `brideName`, `groomName` | string | Couple names |
| `venue`, `functionDate`, `functionTime` | string | Event details |
| `totalAmount` | number | Denormalized sum |
| `totalEntries` | number | Denormalized count |
| `nextReceiptNumber` | number | Auto-incrementing counter |

### Entry
| Field | Type | Description |
|-------|------|-------------|
| `id` | string | `ent_<uuid>_<timestamp>` |
| `eventId` | string | FK to parent event |
| `receiptNumber` | string | Sequential, zero-padded (e.g., "001") |
| `name` | string | Guest name |
| `amount` | number | Gift amount (must be > 0) |
| `paymentMethod` | string | Cash / UPI / Card / Cheque / Bank Transfer |

---

## Firestore Collections
- **`users`** — whitelist + role assignments (email, role, uid, displayName)
- **`events`** — wedding events owned by users
- **`entries`** — individual gift contributions linked to events
- **`settings`** — app-wide configuration (single doc: `app`)

---

## Pages Summary

| Page | Purpose | Size |
|------|---------|------|
| **Login** | Auth with whitelist enforcement | ~225 lines |
| **Dashboard** | Stats cards + recent events | ~280 lines |
| **EventCreate** | New event form | ~8KB |
| **EventView** | **Main page** — entry form, entries table, edit/delete/print/share modals | ~1141 lines (largest) |
| **Database** | Full data management | ~26KB |
| **EventHistory** | Past events listing | ~11KB |
| **Settings** | App configuration | ~17KB |

---

## I'm Ready!

I've fully reviewed all source files, architecture, data models, services, and patterns. Ready for your next request — whether it's new features, bug fixes, refactoring, or anything else. What would you like to work on?
