import { STORE } from "./store";

export type StoreClock = {
  open: boolean;
  hour: number;
  minute: number;
  label: string;
};

export const getStoreClock = (date = new Date()): StoreClock => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: STORE.timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0);
  const open = hour >= STORE.opensAt && hour < STORE.closesAt;
  return {
    open,
    hour,
    minute,
    label: open ? `Aberto até ${STORE.closesAt}h` : `Fechado agora · abre às ${STORE.opensAt}h`,
  };
};

export const isOpenInTimezone = (date = new Date()) => getStoreClock(date).open;
