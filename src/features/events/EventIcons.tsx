// Three small line icons for the event blocks, drawn here (24px grid, 1.75 stroke, round caps) so they match each other.
const base = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.75, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true, focusable: false } as const;

export const CalendarIcon = () => (
  <svg {...base}><rect x="3.5" y="5" width="17" height="15.5" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4" /></svg>
);
export const PinIcon = () => (
  <svg {...base}><path d="M12 21s-6.5-5.6-6.5-11A6.5 6.5 0 0 1 12 3.5 6.5 6.5 0 0 1 18.5 10c0 5.4-6.5 11-6.5 11Z" /><circle cx="12" cy="10" r="2.4" /></svg>
);
export const ArrowIcon = () => (
  <svg {...base} width={18} height={18}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);
