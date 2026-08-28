/**
 * Dashboard kiosk / shop mode: fullscreen + Screen Wake Lock for hands-free monitoring.
 */
import { useEffect, useState } from "preact/hooks";

const STORAGE_KEY = "tt-kiosk-mode";

type WakeLockSentinelLike = {
  release: () => Promise<void>;
  addEventListener?: (type: string, listener: () => void) => void;
};

type WakeLockNavigator = Navigator & {
  wakeLock?: {
    request: (type: "screen") => Promise<WakeLockSentinelLike>;
  };
};

export default function KioskModeToggle() {
  const [active, setActive] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    try {
      setActive(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      /* ignore */
    }
    const nav = navigator as WakeLockNavigator;
    setSupported(
      typeof document !== "undefined" &&
        (Boolean(nav.wakeLock) || "fullscreenEnabled" in document),
    );
  }, []);

  useEffect(() => {
    document.body.classList.toggle("is-kiosk", active);
    try {
      localStorage.setItem(STORAGE_KEY, active ? "1" : "0");
    } catch {
      /* ignore */
    }

    const lockHolder: { current: WakeLockSentinelLike | null } = { current: null };
    let cancelled = false;
    const nav = navigator as WakeLockNavigator;

    async function requestWakeLock() {
      if (!active || !nav.wakeLock) return;
      try {
        const lock = await nav.wakeLock.request("screen");
        lockHolder.current = lock;
        lock.addEventListener?.("release", () => {
          if (!cancelled && document.body.classList.contains("is-kiosk")) {
            void requestWakeLock();
          }
        });
      } catch {
        /* user gesture / permission / unsupported */
      }
    }

    async function enterFullscreen() {
      if (!active || !document.fullscreenEnabled) return;
      if (document.fullscreenElement) return;
      try {
        await document.documentElement.requestFullscreen();
      } catch {
        /* ignored */
      }
    }

    async function exitFullscreen() {
      if (document.fullscreenElement) {
        try {
          await document.exitFullscreen();
        } catch {
          /* ignore */
        }
      }
    }

    if (active) {
      void enterFullscreen();
      void requestWakeLock();
    } else {
      void exitFullscreen();
      void lockHolder.current?.release();
      lockHolder.current = null;
    }

    const onVisibility = () => {
      if (document.visibilityState === "visible" && active) {
        void requestWakeLock();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      void lockHolder.current?.release();
      document.body.classList.remove("is-kiosk");
    };
  }, [active]);

  if (!supported) return null;

  return (
    <button
      type="button"
      class="btn-ghost dashboard-kiosk-toggle"
      aria-pressed={active}
      title={
        active
          ? "Exit kiosk / shop mode"
          : "Kiosk / shop mode — fullscreen and keep screen awake"
      }
      onClick={() => setActive((v) => !v)}
    >
      {active ? "Exit kiosk" : "Kiosk mode"}
    </button>
  );
}
