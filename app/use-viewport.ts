import {useEffect} from "react";

// Match the compact layout on phones in both orientations.
export const compactQuery = "(max-width: 767px), (max-height: 540px) and (max-width: 1100px)";

export function useViewport() {
  useEffect(() => {
    const root = document.documentElement;
    const update = () => {
      const height = window.visualViewport?.height ?? window.innerHeight;
      root.style.setProperty("--viewport-height", `${height}px`);
      root.dataset.keyboardOpen = String(window.innerHeight - height > 160);
    };
    update();
    window.addEventListener("resize", update);
    window.visualViewport?.addEventListener("resize", update);
    return () => {
      window.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("resize", update);
      root.style.removeProperty("--viewport-height");
      delete root.dataset.keyboardOpen;
    };
  }, []);
}
