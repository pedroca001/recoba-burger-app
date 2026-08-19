type Fbq = ((...args: unknown[]) => void) & { queue?: unknown[][] };

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: unknown;
  }
}

const pixelId = import.meta.env.VITE_META_PIXEL_ID as string | undefined;

export const initAnalytics = () => {
  if (!pixelId || window.fbq) return;
  const fbq: Fbq = (...args: unknown[]) => {
    (fbq.queue ||= []).push(args);
  };
  window.fbq = fbq;
  const script = document.createElement("script");
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(script);
  window.fbq?.("init", pixelId);
  window.fbq?.("track", "PageView");
};

export const track = (event: string, data?: Record<string, unknown>) => window.fbq?.("track", event, data);

export const captureAttribution = () => {
  const params = new URLSearchParams(window.location.search);
  const current = Object.fromEntries(
    [...params.entries()].filter(([key]) => key.startsWith("utm_") || ["fbclid", "gclid", "ttclid"].includes(key)),
  );
  if (Object.keys(current).length) localStorage.setItem("recoba.attribution", JSON.stringify(current));
  try {
    return JSON.parse(localStorage.getItem("recoba.attribution") || "{}") as Record<string, string>;
  } catch {
    return {};
  }
};
