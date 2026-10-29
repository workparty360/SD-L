import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
} from "react";
import { seedData } from "./data.js";
import { execute, active, scope, validateFile } from "./domain.js";
import { authenticate, resolveSession } from "./session.js";
import {
  DATA_KEY as KEY,
  SESSION_KEY as SESSION,
  readSavedData,
} from "./persistence.js";
const Context = createContext();
function load() {
  return readSavedData(localStorage, seedData);
}
export function Provider({ children }) {
  const [initial] = useState(load),
    [db, setDb] = useState(initial.db),
    [session, setSession] = useState(() => {
      try {
        return JSON.parse(localStorage.getItem(SESSION));
      } catch {
        return null;
      }
    }),
    [toast, setToast] = useState(initial.warning || ""),
    [storageError, setStorageError] = useState(""),
    [, setTick] = useState(0);
  const ref = useRef(db);
  ref.current = db;
  const user = resolveSession(db, session);
  const persist = (next) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
      setStorageError("");
    } catch {
      setStorageError(
        "Browser storage is unavailable or full. Your change was not saved. Keep a copy of your input and retry.",
      );
      throw Error("Unable to save to browser storage. No change was applied.");
    }
    ref.current = next;
    setDb(next);
  };
  const run = (command, p = {}) => {
    const result = execute(ref.current, user?.id, command, p);
    persist(result.db);
    if (result.message) setToast(result.message);
    return result.id;
  };
  const login = (email, password) => {
    const { user: u, session: s } = authenticate(ref.current, email, password);
    localStorage.setItem(SESSION, JSON.stringify(s));
    setSession(s);
    const pending = ref.current.notifications
      .filter(
        (n) =>
          n.recipientId === u.id &&
          !n.isRead &&
          n.message.includes("resubmitted"),
      )
      .at(-1);
    setToast(
      pending ? `Welcome, ${u.name}. ${pending.message}` : `Welcome, ${u.name}`,
    );
    return u;
  };
  const logout = () => {
    localStorage.removeItem(SESSION);
    setSession(null);
  };
  useEffect(() => {
    if (!user) return;
    try {
      const { db: next } = execute(
        ref.current,
        user.id,
        "overdueNotifications",
      );
      if (next.notifications.length !== ref.current.notifications.length)
        persist(next);
    } catch (e) {
      setStorageError(e.message);
    }
    const t = setInterval(() => {
      setTick((t) => t + 1);
      if (session.expiresAt <= Date.now()) {
        logout();
        setToast("Your demo session expired. Please sign in again.");
      } else {
        try {
          const r = execute(ref.current, user.id, "overdueNotifications");
          if (r.db.notifications.length !== ref.current.notifications.length)
            persist(r.db);
        } catch {}
      }
    }, 30000);
    return () => clearInterval(t);
  }, [user?.id, session?.expiresAt]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 6000);
    return () => clearTimeout(t);
  }, [toast]);
  return (
    <Context.Provider
      value={{
        db,
        user,
        session,
        data: user ? scope(db, user) : null,
        run,
        login,
        logout,
        toast,
        setToast,
        storageError,
        reset: () => {
          persist(seedData());
          setToast("Original demonstration data restored.");
        },
      }}
    >
      {children}
      {toast && (
        <div className="toast" role="status">
          {toast}
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            ×
          </button>
        </div>
      )}
    </Context.Provider>
  );
}
export const useApp = () => useContext(Context);
const blobs = new Map();
export function prepareFile(file, comment = false) {
  validateFile(file, comment);
  const token = crypto.randomUUID();
  blobs.set(token, URL.createObjectURL(file));
  return { name: file.name, size: file.size, type: file.type, token };
}
export const fileURL = (file) => (file?.token ? blobs.get(file.token) : null);
