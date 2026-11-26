"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  buildOfflineSyntheticResponse,
  cacheApiJson,
  enqueueOfflineMutation,
  getPendingSyncItems,
  OFFLINE_QUEUE_EVENT,
  removeOfflineQueueItem,
  resolveOfflineGetJson,
  syncPendingQueue,
} from "@/lib/offline/offline-sync";
import type { OfflineSyncItem } from "@/lib/offline/offline-db";
import { useToast } from "@/components/shared/ToastProvider";

interface OfflineContextValue {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  pendingItems: OfflineSyncItem[];
  lastSyncAt: number | null;
  syncNow: () => Promise<void>;
  removePendingItem: (id: string) => Promise<void>;
}

const OfflineContext = createContext<OfflineContextValue>({
  isOnline: true,
  isSyncing: false,
  pendingCount: 0,
  pendingItems: [],
  lastSyncAt: null,
  syncNow: async () => {},
  removePendingItem: async () => {},
});

export function useOffline() {
  return useContext(OfflineContext);
}

const SKIP_OFFLINE_QUEUE_PATHS = [
  "/api/auth/login",
  "/api/auth/logout",
  "/api/settings/verify-pin",
];

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const toast = useToast();
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [pendingItems, setPendingItems] = useState<OfflineSyncItem[]>([]);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);

  const nativeFetchRef = useRef<typeof window.fetch | null>(null);
  const syncingRef = useRef<boolean>(false);

  const refreshQueue = useCallback(async () => {
    const list = await getPendingSyncItems();
    setPendingItems(list);
    return list;
  }, []);

  const syncNow = useCallback(async () => {
    if (syncingRef.current) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    const nativeFetch = nativeFetchRef.current || window.fetch.bind(window);

    const before = await getPendingSyncItems();
    if (before.length === 0) return;

    syncingRef.current = true;
    setIsSyncing(true);
    try {
      const { synced, failed } = await syncPendingQueue(nativeFetch);
      await refreshQueue();
      if (synced > 0) {
        setLastSyncAt(Date.now());
        toast.success(
          `${synced} data offline berhasil disinkronkan ke server.${
            failed > 0 ? ` (${failed} gagal)` : ""
          }`
        );
      } else if (failed > 0) {
        toast.error(`${failed} data offline gagal disinkronkan. Periksa detail di indikator.`);
      }
    } finally {
      syncingRef.current = false;
      setIsSyncing(false);
    }
  }, [refreshQueue, toast]);

  const removePendingItem = useCallback(
    async (id: string) => {
      await removeOfflineQueueItem(id);
      await refreshQueue();
    },
    [refreshQueue]
  );

  // Pasang Service Worker + Interceptor Fetch Global + Listener Online/Offline
  // Gunakan useIsomorphicLayoutEffect agar window.fetch sudah ter-patch sebelum useEffect halaman anak berjalan
  useIsomorphicLayoutEffect(() => {
    if (typeof window === "undefined") return;

    setIsOnline(navigator.onLine);
    refreshQueue();

    // Daftarkan Service Worker untuk cache shell halaman & aset statis
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const originalFetch = window.fetch.bind(window);
    nativeFetchRef.current = originalFetch;

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const urlStr =
        typeof input === "string"
          ? input
          : input instanceof URL
          ? input.pathname + input.search
          : input.url;

      let parsedUrl: URL | null = null;
      try {
        parsedUrl = new URL(urlStr, window.location.origin);
      } catch {}

      const isSameOriginApi =
        parsedUrl &&
        parsedUrl.origin === window.location.origin &&
        parsedUrl.pathname.startsWith("/api/");

      if (!isSameOriginApi || !parsedUrl) {
        return originalFetch(input, init);
      }

      const apiPathWithQuery = parsedUrl.pathname + parsedUrl.search;
      const method = (
        init?.method ||
        (input instanceof Request ? input.method : "GET")
      ).toUpperCase();

      // 1. GET API: Network-first + simpan ke IndexedDB, fallback ke cache saat offline
      if (method === "GET") {
        if (!navigator.onLine) {
          const cachedData = await resolveOfflineGetJson(parsedUrl);
          if (cachedData !== null) {
            return new Response(JSON.stringify(cachedData), {
              status: 200,
              headers: {
                "Content-Type": "application/json",
                "X-Offline-Cache": "true",
              },
            });
          }
        }

        try {
          const res = await originalFetch(input, init);
          if (res.ok) {
            const ct = res.headers.get("content-type") || "";
            if (ct.includes("application/json")) {
              res
                .clone()
                .json()
                .then((json) => cacheApiJson(apiPathWithQuery, json))
                .catch(() => {});
            }
            return res;
          }
          if (res.status >= 500) {
            const cachedData = await resolveOfflineGetJson(parsedUrl);
            if (cachedData !== null) {
              return new Response(JSON.stringify(cachedData), {
                status: 200,
                headers: {
                  "Content-Type": "application/json",
                  "X-Offline-Cache": "true",
                },
              });
            }
          }
          return res;
        } catch (err) {
          // Jaringan putus saat fetch berlangsung -> pakai cache IndexedDB
          const cachedData = await resolveOfflineGetJson(parsedUrl);
          if (cachedData !== null) {
            setIsOnline(false);
            return new Response(JSON.stringify(cachedData), {
              status: 200,
              headers: {
                "Content-Type": "application/json",
                "X-Offline-Cache": "true",
              },
            });
          }
          throw err;
        }
      }

      // 2. MUTASI (POST/PATCH/PUT/DELETE)
      const isMutation =
        method === "POST" ||
        method === "PATCH" ||
        method === "PUT" ||
        method === "DELETE";

      if (
        isMutation &&
        !SKIP_OFFLINE_QUEUE_PATHS.some((p) => parsedUrl!.pathname.startsWith(p))
      ) {
        let bodyStr: string | null = null;
        if (typeof init?.body === "string") {
          bodyStr = init.body;
        }

        if (!navigator.onLine) {
          await enqueueOfflineMutation(
            apiPathWithQuery,
            method as "POST" | "PATCH" | "PUT" | "DELETE",
            bodyStr
          );
          return buildOfflineSyntheticResponse(
            parsedUrl.pathname,
            method,
            bodyStr
          );
        }

        try {
          return await originalFetch(input, init);
        } catch {
          // Koneksi terputus mendadak saat submit -> simpan ke antrean perangkat
          setIsOnline(false);
          await enqueueOfflineMutation(
            apiPathWithQuery,
            method as "POST" | "PATCH" | "PUT" | "DELETE",
            bodyStr
          );
          return buildOfflineSyntheticResponse(
            parsedUrl.pathname,
            method,
            bodyStr
          );
        }
      }

      return originalFetch(input, init);
    };

    // Pre-warm cache data master penting saat online
    if (navigator.onLine) {
      const warmUrls = [
        "/api/products",
        "/api/categories",
        "/api/members",
        "/api/settings",
      ];
      Promise.all(
        warmUrls.map((u) =>
          originalFetch(u)
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => (d ? cacheApiJson(u, d) : null))
            .catch(() => {})
        )
      );
    }

    const handleOnline = () => {
      setIsOnline(true);
      syncNow();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };
    const handleQueueEvent = () => {
      refreshQueue();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener(OFFLINE_QUEUE_EVENT, handleQueueEvent);

    // Cek sinkronisasi otomatis jika sebelumnya masih ada antrean tertunda saat online
    if (navigator.onLine) {
      syncNow();
    }

    return () => {
      window.fetch = originalFetch;
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener(OFFLINE_QUEUE_EVENT, handleQueueEvent);
    };
  }, [refreshQueue, syncNow]);

  return (
    <OfflineContext.Provider
      value={{
        isOnline,
        isSyncing,
        pendingCount: pendingItems.length,
        pendingItems,
        lastSyncAt,
        syncNow,
        removePendingItem,
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
}
