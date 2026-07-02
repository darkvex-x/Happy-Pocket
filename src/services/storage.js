import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "../firebase";

/**
 * Storage Service - Firestore Database Abstraction
 *
 * This file strictly handles ALL data operations.
 * It is completely separated from React UI components.
 * The public API remains unchanged so existing pages keep working.
 */

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

const SETTINGS_DOC_ID = "app";
const DB_KEY = "happy_pocket_db";

const normalizeSettings = (data = {}) => ({
  ...defaultDB.settings,
  ...data,
});

const normalizeEvent = (docSnap) => ({
  id: docSnap.id,
  ...docSnap.data(),
});

const normalizeEntry = (docSnap) => ({
  id: docSnap.id,
  ...docSnap.data(),
});

const getEventsCollection = () => collection(db, "events");
const getEntriesCollection = () => collection(db, "entries");
const getSettingsDoc = () => doc(db, "settings", SETTINGS_DOC_ID);

const readLocalDB = () => {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) return defaultDB;
    const parsed = JSON.parse(raw);
    if (!parsed.events || !parsed.entries || !parsed.settings) return defaultDB;
    return parsed;
  } catch (error) {
    console.error("Failed to read local storage fallback DB:", error);
    return defaultDB;
  }
};

const localDbSubscribers = new Set();

const notifyLocalSubscribers = () => {
  const current = readLocalDB();
  localDbSubscribers.forEach((subscriber) => subscriber(current));
};

const writeLocalDB = (dbState) => {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(dbState));
    notifyLocalSubscribers();
  } catch (error) {
    console.error("Failed to write local storage fallback DB:", error);
    throw error;
  }
};

const readLocalSettings = () => readLocalDB().settings;
const writeLocalSettings = (settings) => {
  const current = readLocalDB();
  const next = { ...current, settings };
  writeLocalDB(next);
  return settings;
};

const generateId = (prefix) => {
  return `${prefix}_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
};

const generateUniqueShareId = async () => {
  const candidate = `evt-${Math.random().toString(36).substr(2, 8)}-${Date.now().toString(36)}`;

  if (!isFirebaseConfigured) {
    const current = readLocalDB();
    const exists = current.events.some((event) => event.shareId === candidate);
    return exists ? generateUniqueShareId() : candidate;
  }

  const snapshot = await getDocs(
    query(getEventsCollection(), where("shareId", "==", candidate)),
  );
  if (snapshot.empty) {
    return candidate;
  }

  return generateUniqueShareId();
};

const getSortedEvents = async () => {
  if (!isFirebaseConfigured) {
    return readLocalDB()
      .events.slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  const q = query(getEventsCollection(), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(normalizeEvent);
};

const subscribeToLocalDB = (callback) => {
  const handler = (dbState) => callback(dbState);
  localDbSubscribers.add(handler);
  handler(readLocalDB());
  return () => {
    localDbSubscribers.delete(handler);
  };
};

const subscribeToSortedEvents = (callback) => {
  if (!isFirebaseConfigured) {
    return subscribeToLocalDB((dbState) => {
      callback(
        dbState.events
          .slice()
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
      );
    });
  }

  const q = query(getEventsCollection(), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(normalizeEvent));
  });
};

const subscribeToSortedEntries = (eventId = null, callback) => {
  if (!isFirebaseConfigured) {
    return subscribeToLocalDB((dbState) => {
      let entries = dbState.entries;
      if (eventId) {
        entries = entries.filter((entry) => entry.eventId === eventId);
      }
      callback(
        entries
          .slice()
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
      );
    });
  }

  let q = query(getEntriesCollection(), orderBy("createdAt", "desc"));
  if (eventId) {
    q = query(
      getEntriesCollection(),
      where("eventId", "==", eventId),
      orderBy("createdAt", "desc"),
    );
  }

  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(normalizeEntry));
  });
};

const getSortedEntries = async (eventId = null) => {
  if (!isFirebaseConfigured) {
    const localDB = readLocalDB();
    let entries = localDB.entries;
    if (eventId) {
      entries = entries.filter((entry) => entry.eventId === eventId);
    }
    return entries
      .slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  let q = query(getEntriesCollection());
  if (eventId) {
    q = query(getEntriesCollection(), where("eventId", "==", eventId));
  }
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map(normalizeEntry)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

// -- SETTINGS MODULE --
export const StorageService = {
  subscribeToSettings: (callback) => {
    if (!isFirebaseConfigured) {
      return subscribeToLocalDB((dbState) => callback(dbState.settings));
    }

    return onSnapshot(getSettingsDoc(), (snapshot) => {
      if (!snapshot.exists()) {
        callback(defaultDB.settings);
        return;
      }
      callback(normalizeSettings(snapshot.data()));
    });
  },

  subscribeToEvents: (callback) => subscribeToSortedEvents(callback),

  subscribeToEntries: (eventId = null, callback) =>
    subscribeToSortedEntries(eventId, callback),

  getSettings: async () => {
    if (!isFirebaseConfigured) {
      return readLocalSettings();
    }

    try {
      const snapshot = await getDoc(getSettingsDoc());
      if (!snapshot.exists()) {
        await setDoc(getSettingsDoc(), defaultDB.settings, { merge: true });
        return defaultDB.settings;
      }
      return normalizeSettings(snapshot.data());
    } catch (error) {
      console.error("Failed to load settings from Firestore:", error);
      throw error;
    }
  },

  saveSettings: async (updates) => {
    if (!isFirebaseConfigured) {
      const current = readLocalSettings();
      const nextSettings = normalizeSettings({ ...current, ...updates });
      writeLocalSettings(nextSettings);
      return nextSettings;
    }

    try {
      const current = await StorageService.getSettings();
      const nextSettings = normalizeSettings({ ...current, ...updates });
      await setDoc(getSettingsDoc(), nextSettings, { merge: true });
      return nextSettings;
    } catch (error) {
      console.error("Failed to save settings to Firestore:", error);
      throw error;
    }
  },

  // -- EVENTS MODULE --
  getEvents: async () => {
    return getSortedEvents();
  },

  ensureEventShareId: async (id) => {
    if (!id) return null;

    if (!isFirebaseConfigured) {
      const current = readLocalDB();
      const eventIndex = current.events.findIndex((entry) => entry.id === id);
      if (eventIndex === -1) throw new Error("Event not found");
      if (current.events[eventIndex].shareId) {
        return current.events[eventIndex].shareId;
      }
      const shareId = await generateUniqueShareId();
      current.events[eventIndex] = {
        ...current.events[eventIndex],
        shareId,
      };
      writeLocalDB(current);
      return shareId;
    }

    const ref = doc(db, "events", id);
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) {
      throw new Error("Event not found");
    }

    const existing = snapshot.data();
    if (existing.shareId) {
      return existing.shareId;
    }

    const shareId = await generateUniqueShareId();
    await setDoc(ref, { shareId }, { merge: true });
    return shareId;
  },

  getEventById: async (id) => {
    if (!isFirebaseConfigured) {
      const event = readLocalDB().events.find((entry) => entry.id === id);
      if (!event) throw new Error("Event not found");
      return event.shareId
        ? event
        : { ...event, shareId: await StorageService.ensureEventShareId(id) };
    }

    const snapshot = await getDoc(doc(db, "events", id));
    if (!snapshot.exists()) {
      throw new Error("Event not found");
    }
    const event = normalizeEvent(snapshot);
    const shareId =
      event.shareId || (await StorageService.ensureEventShareId(id));
    return { ...event, shareId };
  },

  getEventByShareId: async (shareId) => {
    if (!shareId) throw new Error("Event not found");

    if (!isFirebaseConfigured) {
      const event = readLocalDB().events.find(
        (entry) => entry.shareId === shareId,
      );
      if (!event) throw new Error("Event not found");
      return event.shareId
        ? event
        : {
            ...event,
            shareId: await StorageService.ensureEventShareId(event.id),
          };
    }

    const snapshot = await getDocs(
      query(getEventsCollection(), where("shareId", "==", shareId)),
    );
    if (snapshot.empty) {
      throw new Error("Event not found");
    }

    const event = normalizeEvent(snapshot.docs[0]);
    return {
      ...event,
      shareId:
        event.shareId || (await StorageService.ensureEventShareId(event.id)),
    };
  },

  createEvent: async (data) => {
    const shareId = await generateUniqueShareId();

    if (!isFirebaseConfigured) {
      const current = readLocalDB();
      const newEvent = {
        id: generateId("evt"),
        shareId,
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
        nextReceiptNumber: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      writeLocalDB({ ...current, events: [newEvent, ...current.events] });
      return newEvent;
    }

    const newEvent = {
      id: generateId("evt"),
      shareId,
      eventName: data.eventName,
      brideName: data.brideName || "",
      groomName: data.groomName || "",
      venue: data.venue || "",
      functionDate: data.functionDate || new Date().toISOString().split("T")[0],
      functionTime: data.functionTime || "",
      notes: data.notes || data.description || "",
      description: data.description || data.notes || "",
      totalAmount: 0,
      totalEntries: 0,
      nextReceiptNumber: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await setDoc(doc(db, "events", newEvent.id), newEvent);
    return newEvent;
  },

  updateEvent: async (id, updates) => {
    if (!isFirebaseConfigured) {
      const current = readLocalDB();
      const eventIndex = current.events.findIndex((entry) => entry.id === id);
      if (eventIndex === -1) throw new Error("Event not found");

      const nextEvent = {
        ...current.events[eventIndex],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      current.events[eventIndex] = nextEvent;
      writeLocalDB(current);
      return nextEvent;
    }

    const ref = doc(db, "events", id);
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) {
      throw new Error("Event not found");
    }

    const nextEvent = {
      id,
      ...snapshot.data(),
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await setDoc(ref, nextEvent, { merge: true });
    return nextEvent;
  },

  deleteEvent: async (id) => {
    if (!isFirebaseConfigured) {
      const current = readLocalDB();
      const existing = current.events.some((entry) => entry.id === id);
      if (!existing) throw new Error("Event not found");
      writeLocalDB({
        ...current,
        events: current.events.filter((entry) => entry.id !== id),
        entries: current.entries.filter((entry) => entry.eventId !== id),
      });
      return true;
    }

    const eventRef = doc(db, "events", id);
    const eventSnapshot = await getDoc(eventRef);
    if (!eventSnapshot.exists()) {
      throw new Error("Event not found");
    }

    const matchingEntries = await getDocs(
      query(getEntriesCollection(), where("eventId", "==", id)),
    );

    const batch = writeBatch(db);
    batch.delete(eventRef);
    matchingEntries.docs.forEach((entryDoc) => {
      batch.delete(entryDoc.ref);
    });
    await batch.commit();
    return true;
  },

  // -- ENTRIES MODULE --
  getEntries: async (eventId = null) => {
    return getSortedEntries(eventId);
  },

  createEntry: async (data) => {
    if (!isFirebaseConfigured) {
      const current = readLocalDB();
      if (!data.eventId) throw new Error("eventId is required");
      if (!data.amount || data.amount <= 0) {
        throw new Error("Valid amount is required");
      }
      if (!data.name?.trim()) throw new Error("Name is required");

      const eventIndex = current.events.findIndex(
        (entry) => entry.id === data.eventId,
      );
      if (eventIndex === -1) throw new Error("Target Event does not exist");

      const eventEntries = current.entries.filter(
        (entry) => entry.eventId === data.eventId,
      );
      const maxReceipt = eventEntries.reduce((max, entry) => {
        const num = parseInt(entry.receiptNumber, 10);
        return num && !isNaN(num) && num > max ? num : max;
      }, 0);
      const receiptNumber = String(maxReceipt + 1).padStart(3, "0");

      const newEntry = {
        id: generateId("ent"),
        eventId: data.eventId,
        receiptNumber,
        name: data.name.trim(),
        amount: Number(data.amount),
        paymentMethod: data.paymentMethod || "Cash",
        date: data.date || new Date().toISOString().split("T")[0],
        time:
          data.time ||
          new Date().toLocaleTimeString("en-US", { hour12: false }),
        createdAt: new Date().toISOString(),
      };

      current.entries = [newEntry, ...current.entries];
      current.events[eventIndex].totalAmount += newEntry.amount;
      current.events[eventIndex].totalEntries += 1;
      current.events[eventIndex].updatedAt = new Date().toISOString();
      writeLocalDB(current);
      return newEntry;
    }

    if (!data.eventId) throw new Error("eventId is required");
    if (!data.amount || data.amount <= 0) {
      throw new Error("Valid amount is required");
    }
    if (!data.name?.trim()) throw new Error("Name is required");

    const eventRef = doc(db, "events", data.eventId);
    const eventSnapshot = await getDoc(eventRef);
    if (!eventSnapshot.exists()) {
      throw new Error("Target Event does not exist");
    }

    const newEntry = await runTransaction(db, async (transaction) => {
      const latestEvent = await transaction.get(eventRef);
      if (!latestEvent.exists()) {
        throw new Error("Target Event does not exist");
      }

      const eventData = latestEvent.data();
      const nextReceiptNumber = Number(eventData.nextReceiptNumber || 1);
      const receiptNumber = String(nextReceiptNumber).padStart(3, "0");
      const entryData = {
        id: generateId("ent"),
        eventId: data.eventId,
        receiptNumber,
        name: data.name.trim(),
        amount: Number(data.amount),
        paymentMethod: data.paymentMethod || "Cash",
        date: data.date || new Date().toISOString().split("T")[0],
        time:
          data.time ||
          new Date().toLocaleTimeString("en-US", { hour12: false }),
        createdAt: new Date().toISOString(),
      };

      transaction.set(doc(db, "entries", entryData.id), entryData);
      transaction.update(eventRef, {
        totalAmount: (eventData.totalAmount || 0) + entryData.amount,
        totalEntries: (eventData.totalEntries || 0) + 1,
        nextReceiptNumber: nextReceiptNumber + 1,
        updatedAt: new Date().toISOString(),
      });

      return entryData;
    });

    return newEntry;
  },

  updateEntry: async (id, updates) => {
    if (!isFirebaseConfigured) {
      const current = readLocalDB();
      const entryIndex = current.entries.findIndex((entry) => entry.id === id);
      if (entryIndex === -1) throw new Error("Entry not found");

      const oldEntry = current.entries[entryIndex];
      const newAmount =
        updates.amount !== undefined ? Number(updates.amount) : oldEntry.amount;
      const amountDiff = newAmount - oldEntry.amount;
      const nextEntry = { ...oldEntry, ...updates, id };
      current.entries[entryIndex] = nextEntry;

      if (amountDiff !== 0) {
        const eventIndex = current.events.findIndex(
          (event) => event.id === oldEntry.eventId,
        );
        if (eventIndex !== -1) {
          current.events[eventIndex].totalAmount += amountDiff;
          current.events[eventIndex].updatedAt = new Date().toISOString();
        }
      }

      writeLocalDB(current);
      return nextEntry;
    }

    const entryRef = doc(db, "entries", id);
    const entrySnapshot = await getDoc(entryRef);
    if (!entrySnapshot.exists()) {
      throw new Error("Entry not found");
    }

    const oldEntry = entrySnapshot.data();
    const newAmount =
      updates.amount !== undefined ? Number(updates.amount) : oldEntry.amount;
    const amountDiff = newAmount - oldEntry.amount;
    const nextEntry = { id, ...oldEntry, ...updates };

    const batch = writeBatch(db);
    batch.set(entryRef, nextEntry, { merge: true });

    if (amountDiff !== 0) {
      const eventRef = doc(db, "events", oldEntry.eventId);
      const eventSnapshot = await getDoc(eventRef);
      if (eventSnapshot.exists()) {
        batch.update(eventRef, {
          totalAmount: (eventSnapshot.data().totalAmount || 0) + amountDiff,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    await batch.commit();
    return nextEntry;
  },

  deleteEntry: async (id) => {
    if (!isFirebaseConfigured) {
      const current = readLocalDB();
      const entry = current.entries.find((item) => item.id === id);
      if (!entry) throw new Error("Entry not found");

      current.entries = current.entries.filter((item) => item.id !== id);
      const eventIndex = current.events.findIndex(
        (event) => event.id === entry.eventId,
      );
      if (eventIndex !== -1) {
        current.events[eventIndex].totalAmount -= entry.amount;
        current.events[eventIndex].totalEntries -= 1;
        current.events[eventIndex].updatedAt = new Date().toISOString();
      }

      writeLocalDB(current);
      return true;
    }

    const entryRef = doc(db, "entries", id);
    const entrySnapshot = await getDoc(entryRef);
    if (!entrySnapshot.exists()) {
      throw new Error("Entry not found");
    }

    const entry = entrySnapshot.data();
    const eventRef = doc(db, "events", entry.eventId);
    const eventSnapshot = await getDoc(eventRef);
    const batch = writeBatch(db);
    batch.delete(entryRef);

    if (eventSnapshot.exists()) {
      batch.update(eventRef, {
        totalAmount: (eventSnapshot.data().totalAmount || 0) - entry.amount,
        totalEntries: (eventSnapshot.data().totalEntries || 0) - 1,
        updatedAt: new Date().toISOString(),
      });
    }

    await batch.commit();
    return true;
  },

  // -- BACKUP & RESTORE MODULE --

  /**
   * Returns the entire database as a JSON string for download.
   */
  exportBackup: async () => {
    if (!isFirebaseConfigured) {
      const localDB = readLocalDB();
      const payload = {
        _meta: {
          app: "happy_pocket",
          version: "1.0.0",
          exportedAt: new Date().toISOString(),
          eventCount: localDB.events.length,
          entryCount: localDB.entries.length,
        },
        ...localDB,
      };
      return JSON.stringify(payload, null, 2);
    }

    const [settings, events, entries] = await Promise.all([
      StorageService.getSettings(),
      StorageService.getEvents(),
      StorageService.getEntries(),
    ]);

    const payload = {
      _meta: {
        app: "happy_pocket",
        version: "1.0.0",
        exportedAt: new Date().toISOString(),
        eventCount: events.length,
        entryCount: entries.length,
      },
      settings,
      events,
      entries,
    };

    return JSON.stringify(payload, null, 2);
  },

  /**
   * Validates and writes a full backup JSON into Firestore.
   * Returns the imported database stats.
   */
  importBackup: async (jsonString) => {
    if (!isFirebaseConfigured) {
      const parsed = JSON.parse(jsonString);
      const cleanedSettings = {
        businessName: String(
          parsed?.settings?.businessName || defaultDB.settings.businessName,
        ),
        receiptPrefix: String(
          parsed?.settings?.receiptPrefix || defaultDB.settings.receiptPrefix,
        ),
        currency: String(
          parsed?.settings?.currency || defaultDB.settings.currency,
        ),
        paperWidth: String(
          parsed?.settings?.paperWidth || defaultDB.settings.paperWidth,
        ),
        theme: String(parsed?.settings?.theme || defaultDB.settings.theme),
      };
      const cleanedEvents = Array.isArray(parsed?.events) ? parsed.events : [];
      const cleanedEntries = Array.isArray(parsed?.entries)
        ? parsed.entries
        : [];
      writeLocalDB({
        settings: cleanedSettings,
        events: cleanedEvents,
        entries: cleanedEntries,
      });
      return {
        eventCount: cleanedEvents.length,
        entryCount: cleanedEntries.length,
      };
    }

    const parsed = JSON.parse(jsonString);

    if (!parsed || typeof parsed !== "object") {
      throw new Error("Invalid backup: Payload must be a JSON object.");
    }
    if (!parsed.settings || typeof parsed.settings !== "object") {
      throw new Error(
        "Malformed backup: Settings block is missing or invalid.",
      );
    }
    if (!Array.isArray(parsed.events)) {
      throw new Error("Malformed backup: Events list must be an array.");
    }
    if (!Array.isArray(parsed.entries)) {
      throw new Error("Malformed backup: Entries list must be an array.");
    }

    const cleanSettings = {
      businessName: String(
        parsed.settings.businessName || defaultDB.settings.businessName,
      ),
      receiptPrefix: String(
        parsed.settings.receiptPrefix || defaultDB.settings.receiptPrefix,
      ),
      currency: String(parsed.settings.currency || defaultDB.settings.currency),
      paperWidth: String(
        parsed.settings.paperWidth || defaultDB.settings.paperWidth,
      ),
      theme: String(parsed.settings.theme || defaultDB.settings.theme),
    };

    const cleanEvents = [];
    for (let i = 0; i < parsed.events.length; i++) {
      const e = parsed.events[i];
      if (!e.id || typeof e.id !== "string") {
        throw new Error(
          `Malformed backup: Event at index ${i} is missing a valid id.`,
        );
      }
      if (!e.eventName || typeof e.eventName !== "string") {
        throw new Error(
          `Malformed backup: Event '${e.id}' is missing a valid eventName.`,
        );
      }
      if (e.totalAmount !== undefined && typeof e.totalAmount !== "number") {
        throw new Error(
          `Malformed backup: Event '${e.id}' has an invalid non-numeric totalAmount.`,
        );
      }
      if (e.totalEntries !== undefined && typeof e.totalEntries !== "number") {
        throw new Error(
          `Malformed backup: Event '${e.id}' has an invalid non-numeric totalEntries.`,
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

    const cleanEntries = [];
    for (let i = 0; i < parsed.entries.length; i++) {
      const entry = parsed.entries[i];
      if (!entry.id || typeof entry.id !== "string") {
        throw new Error(
          `Malformed backup: Entry at index ${i} is missing a valid id.`,
        );
      }
      if (!entry.eventId || typeof entry.eventId !== "string") {
        throw new Error(
          `Malformed backup: Entry '${entry.id}' is missing eventId.`,
        );
      }
      if (!entry.name || typeof entry.name !== "string") {
        throw new Error(
          `Malformed backup: Entry '${entry.id}' is missing a guest name.`,
        );
      }
      if (entry.amount === undefined || typeof entry.amount !== "number") {
        throw new Error(
          `Malformed backup: Entry '${entry.id}' must contain a numeric amount.`,
        );
      }
      if (entry.amount <= 0) {
        throw new Error(
          `Malformed backup: Entry '${entry.id}' has an invalid non-positive amount.`,
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

    const existingEvents = await StorageService.getEvents();
    const existingEntries = await StorageService.getEntries();
    const batch = writeBatch(db);

    existingEvents.forEach((event) => {
      batch.delete(doc(db, "events", event.id));
    });
    existingEntries.forEach((entry) => {
      batch.delete(doc(db, "entries", entry.id));
    });
    batch.set(getSettingsDoc(), cleanSettings, { merge: true });

    cleanEvents.forEach((event) => {
      batch.set(doc(db, "events", event.id), event);
    });
    cleanEntries.forEach((entry) => {
      batch.set(doc(db, "entries", entry.id), entry);
    });

    await batch.commit();
    return {
      eventCount: cleanEvents.length,
      entryCount: cleanEntries.length,
    };
  },

  /**
   * Completely wipes all data and resets to factory defaults.
   */
  resetAll: async () => {
    if (!isFirebaseConfigured) {
      writeLocalDB(defaultDB);
      return true;
    }

    const [events, entries] = await Promise.all([
      StorageService.getEvents(),
      StorageService.getEntries(),
    ]);

    const batch = writeBatch(db);
    events.forEach((event) => {
      batch.delete(doc(db, "events", event.id));
    });
    entries.forEach((entry) => {
      batch.delete(doc(db, "entries", entry.id));
    });
    batch.set(getSettingsDoc(), defaultDB.settings, { merge: true });
    await batch.commit();
    return true;
  },
};
