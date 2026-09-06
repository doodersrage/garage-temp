import { BAYBUDDY_NAME, BAYBUDDY_TAGLINE } from "./bayBuddy";
import { DESKTOP_NAME, DESKTOP_TAGLINE } from "./desktop";

export const COMPANION_APPS_HUB_PATH = "/apps";

export type CompanionApp = {
  id: string;
  name: string;
  path: string;
  platform: string;
  summary: string;
  cta: string;
};

/** Clients that watch ThermalTrace — not sensors, not hardware accessories. */
export const COMPANION_APPS: CompanionApp[] = [
  {
    id: "android",
    name: "Android app",
    path: "/android",
    platform: "Phone / tablet",
    summary:
      "Native companion for live probes, history, freeze/flood alerts, devices, MFA, and household tools. Phone is not a sensor.",
    cta: "Android details",
  },
  {
    id: "desktop",
    name: DESKTOP_NAME,
    path: "/desktop",
    platform: "Windows · macOS · Linux",
    summary: DESKTOP_TAGLINE,
    cta: "Desktop details",
  },
  {
    id: "bay-buddy",
    name: BAYBUDDY_NAME,
    path: "/bay-buddy",
    platform: "Windows · macOS · Linux",
    summary: BAYBUDDY_TAGLINE,
    cta: "Bay Buddy details",
  },
  {
    id: "pwa",
    name: "Progressive Web App",
    path: "/about/install-pwa",
    platform: "Browser / home screen",
    summary:
      "Install the dashboard from Chrome or Edge for a phone-friendly client while native apps catch up — same account, no store wait.",
    cta: "PWA install guide",
  },
];
