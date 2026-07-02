/**
 * Storage Service - Local Database Abstraction
 *
 * This file strictly handles ALL data operations.
 * It is completely separated from React UI components.
 * Returning Promises mimics network latency and Firebase NoSQL behavior,
 * ensuring a painless migration to Firestore in the future.
 */

const DB_KEY = "happy_pocket_db";

const defaultDB = {
  settings: {
    businessName: "Happy Pocket",
    receiptPrefix: "Moi-",
    currency: "₹",
    paperWidth: "58mm",
    theme: "light",
  },
  events: [],
  entries: [],
};

// -- INTERNAL DB HELPERS --
const readDB = () => {
  try {
    const data = localStorage.getItem(DB_KEY);
    if (!data) return defaultDB;
    const parsed = JSON.parse(data);
    // Simple schema validation fallback
    if (!parsed.events || !parsed.entries || !parsed.settings) return defaultDB;
    return parsed;
  } catch (error) {
    console.error(
      "Local Storage Data Corruption. Resetting to defaults.",
      error,
    );
    return defaultDB;
  }
};

const writeDB = (db) => {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch (error) {
    console.error("Failed to write to Local Storage. Quota exceeded?", error);
    throw new Error("Unable to save data. Storage might be full.");
  }
};

const generateId = (prefix) => {
  return `${prefix}_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
};

// -- SETTINGS MODULE --
export const StorageService = {
  getSettings: () => {
    return new Promise((resolve) => {
      const db = readDB();
      resolve(db.settings);
    });
  },

  saveSettings: (updates) => {
    return new Promise((resolve, reject) => {
      try {
        const db = readDB();
        db.settings = { ...db.settings, ...updates };
        writeDB(db);
        resolve(db.settings);
      } catch (err) {
        reject(err);
      }
    });
  },

  // -- EVENTS MODULE --
  getEvents: () => {
    return new Promise((resolve) => {
      const db = readDB();
      // Emulate descending order by creation
      resolve(
        [...db.events].sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
        ),
      );
    });
  },

  getEventById: (id) => {
    return new Promise((resolve, reject) => {
      const db = readDB();
      const event = db.events.find((e) => e.id === id);
      if (!event) return reject(new Error("Event not found"));
      resolve(event);
    });
  },

  createEvent: (data) => {
    return new Promise((resolve, reject) => {
      try {
        const db = readDB();
        const newEvent = {
          id: generateId("evt"),
          eventName: data.eventName,
          brideName: data.brideName || "",
          groomName: data.groomName || "",
          venue: data.venue || "",
          functionDate:
            data.functionDate || new Date().toISOString().split("T")[0],
          functionTime: data.functionTime || "",
          notes: data.notes || data.description || "",
          description: data.description || data.notes || "",
          totalAmount: 0,
          totalEntries: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        db.events.push(newEvent);
        writeDB(db);
        resolve(newEvent);
      } catch (err) {
        reject(err);
      }
    });
  },

  updateEvent: (id, updates) => {
    return new Promise((resolve, reject) => {
      try {
        const db = readDB();
        const index = db.events.findIndex((e) => e.id === id);
        if (index === -1) return reject(new Error("Event not found"));

        db.events[index] = {
          ...db.events[index],
          ...updates,
          updatedAt: new Date().toISOString(),
        };
        writeDB(db);
        resolve(db.events[index]);
      } catch (err) {
        reject(err);
      }
    });
  },

  deleteEvent: (id) => {
    return new Promise((resolve, reject) => {
      try {
        const db = readDB();
        const initialLen = db.events.length;
        db.events = db.events.filter((e) => e.id !== id);
        if (db.events.length === initialLen)
          return reject(new Error("Event not found"));

        // Cascade delete entries
        db.entries = db.entries.filter((e) => e.eventId !== id);
        writeDB(db);
        resolve(true);
      } catch (err) {
        reject(err);
      }
    });
  },

  // -- ENTRIES MODULE --
  getEntries: (eventId = null) => {
    return new Promise((resolve) => {
      const db = readDB();
      let res = db.entries;
      if (eventId) {
        res = res.filter((e) => e.eventId === eventId);
      }
      // Newest first by default
      resolve(
        [...res].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
      );
    });
  },

  createEntry: (data) => {
    return new Promise((resolve, reject) => {
      try {
        if (!data.eventId) return reject(new Error("eventId is required"));
        if (!data.amount || data.amount <= 0)
          return reject(new Error("Valid amount is required"));
        if (!data.name?.trim()) return reject(new Error("Name is required"));

        const db = readDB();

        // Find parent event to validate and update totals atomically
        const eventIndex = db.events.findIndex((e) => e.id === data.eventId);
        if (eventIndex === -1)
          return reject(new Error("Target Event does not exist"));

        // Generate Receipt Number automatically (Max current + 1)
        const eventEntries = db.entries.filter(
          (e) => e.eventId === data.eventId,
        );
        const maxReceipt = eventEntries.reduce((max, entry) => {
          const num = parseInt(entry.receiptNumber, 10);
          return num && !isNaN(num) && num > max ? num : max;
        }, 0);
        const receiptNumber = String(maxReceipt + 1).padStart(3, "0");

        const newEntry = {
          id: generateId("ent"),
          eventId: data.eventId,
          receiptNumber: receiptNumber,
          name: data.name.trim(),
          amount: Number(data.amount),
          paymentMethod: data.paymentMethod || "Cash",
          date: data.date || new Date().toISOString().split("T")[0],
          time:
            data.time ||
            new Date().toLocaleTimeString("en-US", { hour12: false }),
          createdAt: new Date().toISOString(),
        };

        db.entries.push(newEntry);

        // Denormalization: update Event totals
        db.events[eventIndex].totalAmount += newEntry.amount;
        db.events[eventIndex].totalEntries += 1;
        db.events[eventIndex].updatedAt = new Date().toISOString();

        writeDB(db);
        resolve(newEntry);
      } catch (err) {
        reject(err);
      }
    });
  },

  updateEntry: (id, updates) => {
    return new Promise((resolve, reject) => {
      try {
        const db = readDB();
        const entryIndex = db.entries.findIndex((e) => e.id === id);
        if (entryIndex === -1) return reject(new Error("Entry not found"));

        const oldEntry = db.entries[entryIndex];
        const newAmount =
          updates.amount !== undefined
            ? Number(updates.amount)
            : oldEntry.amount;
        const amountDiff = newAmount - oldEntry.amount;

        db.entries[entryIndex] = { ...oldEntry, ...updates };

        // Adjust Event parent total if amount changed
        if (amountDiff !== 0) {
          const eventIndex = db.events.findIndex(
            (e) => e.id === oldEntry.eventId,
          );
          if (eventIndex !== -1) {
            db.events[eventIndex].totalAmount += amountDiff;
            db.events[eventIndex].updatedAt = new Date().toISOString();
          }
        }

        writeDB(db);
        resolve(db.entries[entryIndex]);
      } catch (err) {
        reject(err);
      }
    });
  },

  deleteEntry: (id) => {
    return new Promise((resolve, reject) => {
      try {
        const db = readDB();
        const entry = db.entries.find((e) => e.id === id);
        if (!entry) return reject(new Error("Entry not found"));

        db.entries = db.entries.filter((e) => e.id !== id);

        // Discard from event totals
        const eventIndex = db.events.findIndex((e) => e.id === entry.eventId);
        if (eventIndex !== -1) {
          db.events[eventIndex].totalAmount -= entry.amount;
          db.events[eventIndex].totalEntries -= 1;
          db.events[eventIndex].updatedAt = new Date().toISOString();
        }

        writeDB(db);
        resolve(true);
      } catch (err) {
        reject(err);
      }
    });
  },

  // -- BACKUP & RESTORE MODULE --

  /**
   * Returns the entire database as a JSON string for download.
   */
  exportBackup: () => {
    return new Promise((resolve) => {
      const db = readDB();
      const payload = {
        _meta: {
          app: "happy_pocket",
          version: "1.0.0",
          exportedAt: new Date().toISOString(),
          eventCount: db.events.length,
          entryCount: db.entries.length,
        },
        ...db,
      };
      resolve(JSON.stringify(payload, null, 2));
    });
  },

  /**
   * Validates and writes a full backup JSON into localStorage.
   * Returns the imported database stats.
   */
  importBackup: (jsonString) => {
    return new Promise((resolve, reject) => {
      try {
        const parsed = JSON.parse(jsonString);

        // 1. Structural Check
        if (!parsed || typeof parsed !== "object") {
          return reject(
            new Error("Invalid backup: Payload must be a JSON object."),
          );
        }
        if (!parsed.settings || typeof parsed.settings !== "object") {
          return reject(
            new Error(
              "Malformed backup: Settings block is missing or invalid.",
            ),
          );
        }
        if (!Array.isArray(parsed.events)) {
          return reject(
            new Error("Malformed backup: Events list must be an array."),
          );
        }
        if (!Array.isArray(parsed.entries)) {
          return reject(
            new Error("Malformed backup: Entries list must be an array."),
          );
        }

        // 2. Settings Validation (No HTML escaping)
        const cleanSettings = {
          businessName: String(
            parsed.settings.businessName || defaultDB.settings.businessName,
          ),
          receiptPrefix: String(
            parsed.settings.receiptPrefix || defaultDB.settings.receiptPrefix,
          ),
          currency: String(
            parsed.settings.currency || defaultDB.settings.currency,
          ),
          paperWidth: String(
            parsed.settings.paperWidth || defaultDB.settings.paperWidth,
          ),
          theme: String(parsed.settings.theme || defaultDB.settings.theme),
        };

        // 3. Events Validation and Structural Sanitization
        const cleanEvents = [];
        for (let i = 0; i < parsed.events.length; i++) {
          const e = parsed.events[i];
          if (!e.id || typeof e.id !== "string") {
            return reject(
              new Error(
                `Malformed backup: Event at index ${i} is missing a valid id.`,
              ),
            );
          }
          if (!e.eventName || typeof e.eventName !== "string") {
            return reject(
              new Error(
                `Malformed backup: Event '${e.id}' is missing a valid eventName.`,
              ),
            );
          }
          if (
            e.totalAmount !== undefined &&
            typeof e.totalAmount !== "number"
          ) {
            return reject(
              new Error(
                `Malformed backup: Event '${e.id}' has an invalid non-numeric totalAmount.`,
              ),
            );
          }
          if (
            e.totalEntries !== undefined &&
            typeof e.totalEntries !== "number"
          ) {
            return reject(
              new Error(
                `Malformed backup: Event '${e.id}' has an invalid non-numeric totalEntries.`,
              ),
            );
          }

          cleanEvents.push({
            id: String(e.id),
            eventName: String(e.eventName),
            brideName: String(e.brideName || ""),
            groomName: String(e.groomName || ""),
            venue: String(e.venue || ""),
            functionDate: String(e.functionDate || ""),
            functionTime: String(e.functionTime || ""),
            notes: String(e.notes || e.description || ""),
            description: String(e.description || e.notes || ""),
            totalAmount: Number(e.totalAmount || 0),
            totalEntries: Number(e.totalEntries || 0),
            createdAt: String(e.createdAt || new Date().toISOString()),
            updatedAt: String(e.updatedAt || new Date().toISOString()),
          });
        }

        // 4. Entries Validation and Structural Sanitization
        const cleanEntries = [];
        for (let i = 0; i < parsed.entries.length; i++) {
          const entry = parsed.entries[i];
          if (!entry.id || typeof entry.id !== "string") {
            return reject(
              new Error(
                `Malformed backup: Entry at index ${i} is missing a valid id.`,
              ),
            );
          }
          if (!entry.eventId || typeof entry.eventId !== "string") {
            return reject(
              new Error(
                `Malformed backup: Entry '${entry.id}' is missing eventId.`,
              ),
            );
          }
          if (!entry.name || typeof entry.name !== "string") {
            return reject(
              new Error(
                `Malformed backup: Entry '${entry.id}' is missing a guest name.`,
              ),
            );
          }
          if (entry.amount === undefined || typeof entry.amount !== "number") {
            return reject(
              new Error(
                `Malformed backup: Entry '${entry.id}' must contain a numeric amount.`,
              ),
            );
          }
          if (entry.amount <= 0) {
            return reject(
              new Error(
                `Malformed backup: Entry '${entry.id}' has an invalid non-positive amount.`,
              ),
            );
          }

          cleanEntries.push({
            id: String(entry.id),
            eventId: String(entry.eventId),
            receiptNumber: String(entry.receiptNumber || "001"),
            name: String(entry.name),
            amount: Number(entry.amount),
            paymentMethod: String(entry.paymentMethod || "Cash"),
            date: String(entry.date || ""),
            time: String(entry.time || ""),
            createdAt: String(entry.createdAt || new Date().toISOString()),
          });
        }

        const db = {
          settings: cleanSettings,
          events: cleanEvents,
          entries: cleanEntries,
        };

        writeDB(db);
        resolve({
          eventCount: db.events.length,
          entryCount: db.entries.length,
        });
      } catch (err) {
        if (err instanceof Error) {
          reject(err);
        } else {
          reject(new Error("Corrupted backup file. Could not parse JSON."));
        }
      }
    });
  },

  /**
   * Completely wipes all data and resets to factory defaults.
   */
  resetAll: () => {
    return new Promise((resolve) => {
      writeDB(defaultDB);
      resolve(true);
    });
  },
};
