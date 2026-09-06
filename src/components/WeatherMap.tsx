import { useEffect, useId, useRef } from "preact/hooks";
import { weatherMapExternalUrl } from "../lib/FetchWeather";

type LeafletMap = {
  remove: () => void;
  invalidateSize: () => void;
  setView: (center: [number, number], zoom: number) => LeafletMap;
};

type LeafletNS = {
  map: (el: HTMLElement) => LeafletMap;
  tileLayer: (
    url: string,
    options?: Record<string, unknown>,
  ) => { addTo: (map: LeafletMap) => unknown };
  circleMarker: (
    latlng: [number, number],
    options?: Record<string, unknown>,
  ) => { addTo: (map: LeafletMap) => { bindPopup: (html: string) => unknown } };
  control: {
    layers: (
      bases: Record<string, unknown>,
      overlays: Record<string, unknown>,
      options?: Record<string, unknown>,
    ) => { addTo: (map: LeafletMap) => unknown };
  };
};

declare global {
  interface Window {
    L?: LeafletNS;
  }
}

interface Props {
  lat: number;
  lon: number;
  label: string;
  /** OpenWeather map tiles key (omit to show basemap + marker only). */
  owmApiKey?: string | null;
  zoom?: number;
}

const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

function ensureLeafletCss(): void {
  if (document.querySelector(`link[href="${LEAFLET_CSS}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = LEAFLET_CSS;
  link.crossOrigin = "";
  document.head.appendChild(link);
}

function loadLeaflet(): Promise<LeafletNS> {
  if (window.L) return Promise.resolve(window.L);
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${LEAFLET_JS}"]`);
    if (existing) {
      existing.addEventListener("load", () => {
        if (window.L) resolve(window.L);
        else reject(new Error("Leaflet failed to load"));
      });
      return;
    }
    const script = document.createElement("script");
    script.src = LEAFLET_JS;
    script.crossOrigin = "";
    script.onload = () => {
      if (window.L) resolve(window.L);
      else reject(new Error("Leaflet failed to load"));
    };
    script.onerror = () => reject(new Error("Leaflet failed to load"));
    document.head.appendChild(script);
  });
}

export default function WeatherMap({
  lat,
  lon,
  label,
  zoom = 10,
}: Props) {
  const mapId = useId().replace(/:/g, "");
  const containerId = `weather-map-${mapId}`;
  const mapRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    let cancelled = false;
    ensureLeafletCss();

    void loadLeaflet()
      .then((L) => {
        if (cancelled) return;
        const el = document.getElementById(containerId);
        if (!el) return;

        mapRef.current?.remove();
        mapRef.current = null;
        // Leaflet leaves a private id on reused DOM nodes; clear it to avoid
        // "Map container is already initialized" console errors on remount.
        const leafletEl = el as HTMLElement & { _leaflet_id?: number };
        if (leafletEl._leaflet_id != null) {
          delete leafletEl._leaflet_id;
        }
        el.replaceChildren();

        const map = L.map(el).setView([lat, lon], zoom);
        mapRef.current = map;

        const base = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 18,
          subdomains: "abc",
        }).addTo(map);

        // Same-origin tile proxy keeps the OpenWeather key server-side.
        {
          const owmAttr =
            'Weather &copy; <a href="https://openweathermap.org/">OpenWeather</a>';
          const tempLayer = L.tileLayer(
            "/api/weather/tiles/temp_new/{z}/{x}/{y}",
            { opacity: 0.55, maxZoom: 18, attribution: owmAttr },
          ).addTo(map);
          const precipLayer = L.tileLayer(
            "/api/weather/tiles/precipitation_new/{z}/{x}/{y}",
            { opacity: 0.55, maxZoom: 18, attribution: owmAttr },
          );
          L.control
            .layers({ Map: base }, { Temperature: tempLayer, Precipitation: precipLayer }, {
              collapsed: true,
            })
            .addTo(map);
        }

        L.circleMarker([lat, lon], {
          radius: 9,
          color: "#e85500",
          fillColor: "#e85500",
          fillOpacity: 0.85,
          weight: 2,
        })
          .addTo(map)
          .bindPopup(label);
        // Leaflet needs a tick after mount in flex/card layouts.
        requestAnimationFrame(() => map.invalidateSize());
      })
      .catch(() => {
        /* keep empty frame; caption still links out */
      });

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [containerId, label, lat, lon, zoom]);

  return (
    <figure class="weather-map mb-6">
      <div
        id={containerId}
        class="weather-map-frame freeze-map-frame"
        role="img"
        aria-label={`Weather map of ${label}`}
      />
      <figcaption class="weather-map-caption">
        <a
          class="text-link"
          href={weatherMapExternalUrl(lat, lon)}
          target="_blank"
          rel="noreferrer"
        >
          Open larger map
        </a>
        <span class="text-[var(--color-text-muted)]">
          {" "}
          · © OpenStreetMap
          {key ? " · weather © OpenWeather" : ""}
        </span>
      </figcaption>
    </figure>
  );
}
