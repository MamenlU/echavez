import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

export function ScrollManager() {
  const { pathname, hash } = useLocation();
  const firstLocationEffect = useRef(true);
  const previousPathname = useRef(pathname);

  useLayoutEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    // A hard refresh should always begin at the top, as requested.
    const resetToTop = () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    };

    resetToTop();
    const frame = window.requestAnimationFrame(resetToTop);
    const timer = window.setTimeout(resetToTop, 0);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (firstLocationEffect.current) {
      firstLocationEffect.current = false;
      previousPathname.current = pathname;
      return;
    }

    const pathnameChanged = previousPathname.current !== pathname;
    previousPathname.current = pathname;

    const scrollToHashTarget = (behavior: ScrollBehavior) => {
      if (pathname !== '/' || !hash) return false;

      const targetId = decodeURIComponent(hash.slice(1));
      const target = document.getElementById(targetId);

      if (!target) return false;

      target.scrollIntoView({ behavior, block: 'start' });
      return true;
    };

    if (pathnameChanged) {
      // Important: when navigating from Login/Register/Footer to
      // /#products, /#categories, or /#how-it-works, honor the hash
      // instead of forcing the new Storefront route to the hero.
      if (pathname === '/' && hash) {
        const frame = window.requestAnimationFrame(() => {
          if (!scrollToHashTarget('smooth')) {
            window.setTimeout(() => scrollToHashTarget('smooth'), 0);
          }
        });

        return () => window.cancelAnimationFrame(frame);
      }

      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      return;
    }

    // Same-page Storefront navigation keeps its intended section behavior.
    if (pathname === '/' && hash) {
      scrollToHashTarget('smooth');
      return;
    }

    if (pathname === '/' && !hash) {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    }
  }, [pathname, hash]);

  return null;
}
