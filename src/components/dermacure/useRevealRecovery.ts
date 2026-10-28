import { useEffect } from "react";
/** Fail open only when a reveal is stuck in the viewport for >2s.
 * Does not reveal offscreen content or compete with normally completing Motion. */
export function useRevealRecovery() {
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof document.querySelectorAll !== "function"
    )
      return;
    const hiddenSince = new Map<HTMLElement, number>();
    const check = () => {
      const now = performance.now();
      document
        .querySelectorAll<HTMLElement>(".dc main [style]")
        .forEach((node) => {
          if (
            node.tagName === "IMG" ||
            node.tagName === "INPUT" ||
            !node.style.opacity ||
            Number(node.style.opacity) > 0.05
          ) {
            hiddenSince.delete(node);
            return;
          }
          const rect = node.getBoundingClientRect();
          if (
            rect.bottom <= 0 ||
            rect.top >= window.innerHeight ||
            !rect.height
          ) {
            hiddenSince.delete(node);
            return;
          }
          const start = hiddenSince.get(node);
          if (start === undefined) hiddenSince.set(node, now);
          else if (now - start > 2000) {
            node.classList.add("dc-reveal-recovered");
            hiddenSince.delete(node);
          }
        });
      for (const node of hiddenSince.keys())
        if (!node.isConnected) hiddenSince.delete(node);
    };
    const timer = window.setInterval(check, 500);
    return () => {
      window.clearInterval(timer);
      hiddenSince.clear();
    };
  }, []);
}
