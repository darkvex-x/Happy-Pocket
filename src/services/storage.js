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
  or,
} from "firebase/firestore";
import { auth, db, isFirebaseConfigured } from "../firebase";

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

const getCurrentOwner = () => {
  const currentUser = auth.currentUser;
  if (!currentUser) return null;

  return {
    ownerId: currentUser.uid,
    ownerEmail: currentUser.email || "",
  };
};

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
  const owner = getCurrentOwner();

  if (!isFirebaseConfigured) {
    const userEvents = owner
      ? readLocalDB().events.filter(
          (event) =>
            event.ownerId === owner.ownerId ||
            (Array.isArray(event.sharedEmails) &&
              event.sharedEmails.includes(owner.ownerEmail.toLowerCase())),
        )
      : [];
    return userEvents
      .slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  if (!owner) {
    return [];
  }

  const q = query(
    getEventsCollection(),
    or(
      where("ownerId", "==", owner.ownerId),
      where("sharedEmails", "array-contains", owner.ownerEmail.toLowerCase()),
    ),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map(normalizeEvent)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

const subscribeToLocalDB = (callback) => {
  const handler = (dbState) => callback(dbState);
  localDbSubscribers.add(handler);
  handler(readLocalDB());
  return () => {
    localDbSubscribers.delete(handler);
  };
};

const subscribeToSortedEvents = (callback, onError = null) => {
  const owner = getCurrentOwner();

  if (!isFirebaseConfigured) {
    return subscribeToLocalDB((dbState) => {
      const userEvents = owner
        ? dbState.events.filter(
            (event) =>
              event.ownerId === owner.ownerId ||
              (Array.isArray(event.sharedEmails) &&
                event.sharedEmails.includes(owner.ownerEmail.toLowerCase())),
          )
        : [];
      callback(
        userEvents.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
        ),
      );
    });
  }

  if (!owner) {
    callback([]);
    return () => {};
  }

  const q = query(
    getEventsCollection(),
    or(
      where("ownerId", "==", owner.ownerId),
      where("sharedEmails", "array-contains", owner.ownerEmail.toLowerCase()),
    ),
  );
  return onSnapshot(
    q,
    (snapshot) => {
      callback(
        snapshot.docs
          .map(normalizeEvent)
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
      );
    },
    (error) => {
      console.error("Failed to subscribe to events from Firestore:", error);
      if (onError) {
        onError(error);
      } else {
        callback([]);
      }
    },
  );
};

const getEntriesForEventIds = async (eventIds) => {
  if (!eventIds || eventIds.length === 0) return [];

  // Split eventIds into chunks of 30 due to Firestore's 'in' operator limits
  const chunks = [];
  for (let i = 0; i < eventIds.length; i += 30) {
    chunks.push(eventIds.slice(i, i + 30));
  }

  const promises = chunks.map((chunk) => {
    const q = query(getEntriesCollection(), where("eventId", "in", chunk));
    return getDocs(q);
  });

  try {
    const snapshots = await Promise.all(promises);
    const allDocs = [];
    snapshots.forEach((snap) => {
      allDocs.push(...snap.docs);
    });
    return allDocs.map(normalizeEntry);
  } catch (error) {
    console.error("Failed to query entries for multiple events:", error);
    throw error;
  }
};

const subscribeToSortedEntries = (eventId = null, callback, onError = null) => {
  const owner = getCurrentOwner();

  if (!isFirebaseConfigured) {
    return subscribeToLocalDB((dbState) => {
      let entries = dbState.entries;
      if (eventId) {
        entries = entries.filter((entry) => entry.eventId === eventId);
      } else {
        const userEventIds = new Set(
          owner
            ? dbState.events
                .filter(
                  (e) =>
                    e.ownerId === owner.ownerId ||
                    (Array.isArray(e.sharedEmails) &&
                      e.sharedEmails.includes(owner.ownerEmail.toLowerCase())),
                )
                .map((e) => e.id)
            : [],
        );
        entries = entries.filter((entry) => userEventIds.has(entry.eventId));
      }
      callback(
        entries
          .slice()
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
      );
    });
  }

  if (eventId) {
    const q = query(getEntriesCollection(), where("eventId", "==", eventId));
    return onSnapshot(
      q,
      (snapshot) => {
        const entries = snapshot.docs.map(normalizeEntry);
        callback(
          entries.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
        );
      },
      (error) => {
        console.error("Failed to subscribe to entries from Firestore:", error);
        if (onError) {
          onError(error);
        } else {
          callback([]);
        }
      },
    );
  } else {
    if (!owner) {
      callback([]);
      return () => {};
    }

    let userEventIds = [];
    let entryUnsubscribes = [];
    let entriesMap = new Map(); // eventId -> Array of entries

    const emitMerged = () => {
      const allEntries = [];
      entriesMap.forEach((entriesList) => {
        allEntries.push(...entriesList);
      });
      callback(
        allEntries.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
      );
    };

    const setupEntriesListeners = (eventIdsList) => {
      // Unsubscribe all existing entry listeners
      entryUnsubscribes.forEach((unsub) => unsub());
      entryUnsubscribes = [];
      entriesMap.clear();

      if (eventIdsList.length === 0) {
        callback([]);
        return;
      }

      eventIdsList.forEach((id) => {
        const q = query(getEntriesCollection(), where("eventId", "==", id));
        const unsub = onSnapshot(
          q,
          (snapshot) => {
            const eventEntries = snapshot.docs.map(normalizeEntry);
            entriesMap.set(id, eventEntries);
            emitMerged();
          },
          (error) => {
            console.error(`Failed to subscribe to entries for event ${id}:`, error);
          },
        );
        entryUnsubscribes.push(unsub);
      });
    };

    const qEvents = query(
      getEventsCollection(),
      or(
        where("ownerId", "==", owner.ownerId),
        where("sharedEmails", "array-contains", owner.ownerEmail.toLowerCase()),
      ),
    );
    const unsubscribeEvents = onSnapshot(
      qEvents,
      (eventsSnapshot) => {
        const newEventIds = eventsSnapshot.docs.map((doc) => doc.id);
        
        // Only re-setup listeners if the list of event IDs actually changed
        const hasChanged = 
          newEventIds.length !== userEventIds.length ||
          newEventIds.some((id, idx) => id !== userEventIds[idx]);

        if (hasChanged) {
          userEventIds = newEventIds;
          setupEntriesListeners(userEventIds);
        }
      },
      (error) => {
        console.error("Failed to subscribe to events in entries subscription:", error);
        if (onError) {
          onError(error);
        } else {
          callback([]);
        }
      },
    );

    return () => {
      unsubscribeEvents();
      entryUnsubscribes.forEach((unsub) => unsub());
    };
  }
};

const getSortedEntries = async (eventId = null) => {
  const owner = getCurrentOwner();

  if (!isFirebaseConfigured) {
    const localDB = readLocalDB();
    let entries = localDB.entries;
    if (eventId) {
      entries = entries.filter((entry) => entry.eventId === eventId);
    } else {
      const userEventIds = new Set(
        owner
          ? localDB.events
              .filter(
                (e) =>
                  e.ownerId === owner.ownerId ||
                  (Array.isArray(e.sharedEmails) &&
                    e.sharedEmails.includes(owner.ownerEmail.toLowerCase())),
              )
              .map((e) => e.id)
          : [],
      );
      entries = entries.filter((entry) => userEventIds.has(entry.eventId));
    }
    return entries
      .slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  if (eventId) {
    const q = query(getEntriesCollection(), where("eventId", "==", eventId));
    const snapshot = await getDocs(q);
    return snapshot.docs
      .map(normalizeEntry)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } else {
    if (!owner) return [];

    try {
      const qEvents = query(
        getEventsCollection(),
        or(
          where("ownerId", "==", owner.ownerId),
          where("sharedEmails", "array-contains", owner.ownerEmail.toLowerCase()),
        ),
      );
      const snapshotEvents = await getDocs(qEvents);
      const userEventIds = snapshotEvents.docs.map((doc) => doc.id);

      if (userEventIds.length === 0) return [];

      const entries = await getEntriesForEventIds(userEventIds);
      return entries.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (error) {
      console.error("Failed to fetch sorted entries:", error);
      throw error;
    }
  }
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

  subscribeToEvents: (callback, onError) =>
    subscribeToSortedEvents(callback, onError),

  subscribeToEntries: (eventId = null, callback, onError) =>
    subscribeToSortedEntries(eventId, callback, onError),

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
    const owner = getCurrentOwner();

    if (!isFirebaseConfigured) {
      const event = readLocalDB().events.find((entry) => entry.id === id);
      if (!event) throw new Error("Event not found");

      const hasAccess =
        owner &&
        (event.ownerId === owner.ownerId ||
          (Array.isArray(event.sharedEmails) &&
            event.sharedEmails.includes(owner.ownerEmail.toLowerCase())));
      if (!hasAccess) throw new Error("Event not found");

      return event.shareId
        ? event
        : { ...event, shareId: await StorageService.ensureEventShareId(id) };
    }

    const snapshot = await getDoc(doc(db, "events", id));
    if (!snapshot.exists()) {
      throw new Error("Event not found");
    }
    const event = normalizeEvent(snapshot);

    const hasAccess =
      owner &&
      (event.ownerId === owner.ownerId ||
        (Array.isArray(event.sharedEmails) &&
          event.sharedEmails.includes(owner.ownerEmail.toLowerCase())));
    if (!hasAccess) throw new Error("Event not found");

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
    const owner = getCurrentOwner();
    if (!owner) {
      throw new Error("Authentication required");
    }

    const shareId = await generateUniqueShareId();

    if (!isFirebaseConfigured) {
      const current = readLocalDB();
      const newEvent = {
        id: generateId("evt"),
        shareId,
        ownerId: owner.ownerId,
        ownerEmail: owner.ownerEmail,
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
      ownerId: owner.ownerId,
      ownerEmail: owner.ownerEmail,
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

    const owner = getCurrentOwner();
    if (!owner) {
      throw new Error("Authentication required");
    }

    const ref = doc(db, "events", id);
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) {
      throw new Error("Event not found");
    }

    const existingEvent = snapshot.data();
    if (existingEvent.ownerId && existingEvent.ownerId !== owner.ownerId) {
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

  shareEventWithEmail: async (eventId, email) => {
    const cleanEmail = email.trim().toLowerCase();

    if (!isFirebaseConfigured) {
      const current = readLocalDB();
      const eventIndex = current.events.findIndex((e) => e.id === eventId);
      if (eventIndex === -1) throw new Error("Event not found");
      const event = current.events[eventIndex];
      const sharedEmails = Array.isArray(event.sharedEmails) ? event.sharedEmails : [];
      if (sharedEmails.includes(cleanEmail)) {
        throw new Error("This email is already added.");
      }
      current.events[eventIndex] = {
        ...event,
        sharedEmails: [...sharedEmails, cleanEmail],
        updatedAt: new Date().toISOString(),
      };
      writeLocalDB(current);
      return current.events[eventIndex];
    }

    const ref = doc(db, "events", eventId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      throw new Error("Event not found");
    }
    const data = snap.data();
    const sharedEmails = Array.isArray(data.sharedEmails) ? data.sharedEmails : [];
    if (sharedEmails.includes(cleanEmail)) {
      throw new Error("This email is already added.");
    }
    const updated = [...sharedEmails, cleanEmail];
    await setDoc(ref, { sharedEmails: updated, updatedAt: new Date().toISOString() }, { merge: true });
    return { id: eventId, ...data, sharedEmails: updated };
  },

  unshareEventWithEmail: async (eventId, email) => {
    const cleanEmail = email.trim().toLowerCase();

    if (!isFirebaseConfigured) {
      const current = readLocalDB();
      const eventIndex = current.events.findIndex((e) => e.id === eventId);
      if (eventIndex === -1) throw new Error("Event not found");
      const event = current.events[eventIndex];
      const sharedEmails = Array.isArray(event.sharedEmails) ? event.sharedEmails : [];
      current.events[eventIndex] = {
        ...event,
        sharedEmails: sharedEmails.filter((e) => e !== cleanEmail),
        updatedAt: new Date().toISOString(),
      };
      writeLocalDB(current);
      return current.events[eventIndex];
    }

    const ref = doc(db, "events", eventId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      throw new Error("Event not found");
    }
    const data = snap.data();
    const sharedEmails = Array.isArray(data.sharedEmails) ? data.sharedEmails : [];
    const updated = sharedEmails.filter((e) => e !== cleanEmail);
    await setDoc(ref, { sharedEmails: updated, updatedAt: new Date().toISOString() }, { merge: true });
    return { id: eventId, ...data, sharedEmails: updated };
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

    const owner = getCurrentOwner();
    if (!owner) {
      throw new Error("Authentication required");
    }

    const eventRef = doc(db, "events", id);
    const eventSnapshot = await getDoc(eventRef);
    if (!eventSnapshot.exists()) {
      throw new Error("Event not found");
    }

    const existingEvent = eventSnapshot.data();
    if (existingEvent.ownerId && existingEvent.ownerId !== owner.ownerId) {
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

      const creator = getCurrentOwner();
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
        createdBy: creator?.ownerId || "",
        createdByEmail: creator?.ownerEmail || "",
        updatedAt: null,
        updatedBy: null,
        updatedByEmail: null,
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
      const creator = getCurrentOwner();
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
        createdBy: creator?.ownerId || "",
        createdByEmail: creator?.ownerEmail || "",
        updatedAt: null,
        updatedBy: null,
        updatedByEmail: null,
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

      const editor = getCurrentOwner();
      const oldEntry = current.entries[entryIndex];
      const newAmount =
        updates.amount !== undefined ? Number(updates.amount) : oldEntry.amount;
      const amountDiff = newAmount - oldEntry.amount;
      const nextEntry = {
        ...oldEntry,
        ...updates,
        id,
        updatedAt: new Date().toISOString(),
        updatedBy: editor?.ownerId || "",
        updatedByEmail: editor?.ownerEmail || "",
      };
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

    const editor = getCurrentOwner();
    const oldEntry = entrySnapshot.data();
    const newAmount =
      updates.amount !== undefined ? Number(updates.amount) : oldEntry.amount;
    const amountDiff = newAmount - oldEntry.amount;
    const nextEntry = {
      id,
      ...oldEntry,
      ...updates,
      updatedAt: new Date().toISOString(),
      updatedBy: editor?.ownerId || "",
      updatedByEmail: editor?.ownerEmail || "",
    };

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

  // -- USER MANAGEMENT MODULE --

  /**
   * Subscribes to real-time updates of all users in the "users" collection.
   * Returns an unsubscribe function.
   */
  subscribeToUsers: (callback, onError = null) => {
    if (!isFirebaseConfigured) {
      callback([]);
      return () => {};
    }

    const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
    return onSnapshot(
      q,
      (snapshot) => {
        const users = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        callback(users);
      },
      (error) => {
        console.error("Failed to subscribe to users:", error);
        if (onError) {
          onError(error);
        } else {
          callback([]);
        }
      },
    );
  },

  /**
   * One-shot fetch of all users.
   */
  getUsers: async () => {
    if (!isFirebaseConfigured) {
      return [];
    }

    const snapshot = await getDocs(collection(db, "users"));
    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));
  },

  /**
   * Creates a new user (helper) document in the "users" collection.
   * The document ID is auto-generated.
   */
  createUser: async (data) => {
    if (!isFirebaseConfigured) {
      throw new Error("Firebase is not configured.");
    }

    if (!data.email?.trim()) throw new Error("Email is required.");
    if (!data.name?.trim()) throw new Error("Name is required.");

    // Check for duplicate email
    const existing = await getDocs(
      query(
        collection(db, "users"),
        where("email", "==", data.email.trim().toLowerCase()),
      ),
    );
    if (!existing.empty) {
      throw new Error("A user with this email already exists.");
    }

    const userId = `user_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
    const newUser = {
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      role: data.role || "helper",
      active: data.active !== undefined ? data.active : true,
      createdAt: new Date().toISOString(),
    };

    await setDoc(doc(db, "users", userId), newUser);
    return { id: userId, ...newUser };
  },

  /**
   * Updates an existing user document.
   */
  updateUser: async (id, updates) => {
    if (!isFirebaseConfigured) {
      throw new Error("Firebase is not configured.");
    }

    const ref = doc(db, "users", id);
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) {
      throw new Error("User not found.");
    }

    // If email is being changed, check for duplicate
    if (updates.email) {
      const normalizedEmail = updates.email.trim().toLowerCase();
      const existing = await getDocs(
        query(
          collection(db, "users"),
          where("email", "==", normalizedEmail),
        ),
      );
      const duplicate = existing.docs.find((d) => d.id !== id);
      if (duplicate) {
        throw new Error("A user with this email already exists.");
      }
      updates.email = normalizedEmail;
    }

    if (updates.name) {
      updates.name = updates.name.trim();
    }

    const nextUser = { ...snapshot.data(), ...updates };
    await setDoc(ref, nextUser, { merge: true });
    return { id, ...nextUser };
  },

  /**
   * Deletes a user document from the "users" collection.
   */
  deleteUser: async (id) => {
    if (!isFirebaseConfigured) {
      throw new Error("Firebase is not configured.");
    }

    const { deleteDoc } = await import("firebase/firestore");
    const ref = doc(db, "users", id);
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) {
      throw new Error("User not found.");
    }

    await deleteDoc(ref);
    return true;
  },
};

