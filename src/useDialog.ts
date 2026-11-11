import { useEffect, useLayoutEffect, useRef } from "react";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Makes an element a proper pop-up while `open`: focus moves into it, Escape calls onClose, Tab stays inside, and
 *  closing gives focus back to what had it before (the button that opened the dialog). Put the returned ref on the
 *  role="dialog" element, with tabIndex={-1}. */
export function useDialog<T extends HTMLElement = HTMLDivElement>(open: boolean, onClose: () => void) {
  const ref = useRef<T>(null);
  const close = useRef(onClose);
  // The latest onClose, saved once the render is committed (never during render), before any key can reach it.
  useLayoutEffect(() => {
    close.current = onClose;
  });

  useEffect(() => {
    const el = ref.current;
    if (!open || !el) return;
    const before = document.activeElement as HTMLElement | null;
    const focusable = () => [...el.querySelectorAll<HTMLElement>(FOCUSABLE)];
    (focusable()[0] ?? el).focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close.current();
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusable();
      if (!items.length) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || !el.contains(document.activeElement))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || !el.contains(document.activeElement))) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (before?.isConnected) before.focus();
    };
  }, [open]);

  return ref;
}
