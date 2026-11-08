import {useEffect} from "react";

let openDialogs = 0;
let restore: (() => void) | undefined;

export function useModalScrollLock() {
  useEffect(() => {
    if (openDialogs++ === 0) {
      const {body} = document;
      const scrollY = window.scrollY;
      const original = body.getAttribute("style");
      const scrollbar = window.innerWidth - document.documentElement.clientWidth;
      Object.assign(body.style, {
        position: "fixed", top: `-${scrollY}px`, width: "100%", overflow: "hidden",
        paddingRight: `${scrollbar}px`,
      });
      restore = () => {
        if (original === null) body.removeAttribute("style");
        else body.setAttribute("style", original);
        window.scrollTo({top: scrollY, behavior: "instant"});
      };
    }
    return () => {
      if (--openDialogs === 0) {
        restore?.();
        restore = undefined;
      }
    };
  }, []);
}
