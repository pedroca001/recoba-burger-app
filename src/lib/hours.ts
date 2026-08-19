export type StoreClock = {
  open: boolean;
  hour: number;
  minute: number;
  label: string;
};

export const getStoreClock = (date = new Date()): StoreClock => {
  return {
    open: true,
    hour: date.getHours(),
    minute: date.getMinutes(),
    label: "Aberto para pedidos",
  };
};

export const isOpenInTimezone = () => true;
