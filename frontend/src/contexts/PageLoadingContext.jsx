import React, { createContext, useContext, useLayoutEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ScreenLoader } from '../components/ui/ScreenLoader';

const MIN_VISIBLE_MS = 450;
const PageLoadingContext = createContext(null);

export function PageLoadingProvider({ children }) {
  const location = useLocation();
  const pages = useRef(new Map());
  const hideTimer = useRef(null);
  const shownAt = useRef(Date.now());
  const pathRef = useRef(location.pathname);
  const [overlay, setOverlay] = useState(true);
  const [tick, setTick] = useState(0);
  const bumpRef = useRef(() => {});
  bumpRef.current = () => setTick((count) => count + 1);

  if (pathRef.current !== location.pathname) {
    pathRef.current = location.pathname;
    shownAt.current = Date.now();
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    if (!overlay) setOverlay(true);
  }

  const api = useRef(null);
  if (!api.current) {
    api.current = {
      mount(id, ready) {
        pages.current.set(id, ready);
        bumpRef.current();
      },
      unmount(id) {
        pages.current.delete(id);
        bumpRef.current();
      },
    };
  }

  useLayoutEffect(() => {
    const settled = pages.current.size === 0 || [...pages.current.values()].every(Boolean);
    if (!settled) {
      if (hideTimer.current) {
        clearTimeout(hideTimer.current);
        hideTimer.current = null;
      }
      if (!overlay) setOverlay(true);
      return;
    }
    if (hideTimer.current || !overlay) return;
    const wait = Math.max(0, MIN_VISIBLE_MS - (Date.now() - shownAt.current));
    hideTimer.current = setTimeout(() => {
      hideTimer.current = null;
      setOverlay(false);
    }, wait);
  }, [tick, overlay, location.pathname]);

  return (
    <PageLoadingContext.Provider value={api.current}>
      {children}
      {overlay ? <ScreenLoader /> : null}
    </PageLoadingContext.Provider>
  );
}

export function usePageReady(isReady) {
  const api = useContext(PageLoadingContext);
  const id = useRef(null);
  if (id.current == null) id.current = Symbol('page');

  useLayoutEffect(() => {
    if (!api) return undefined;
    api.mount(id.current, isReady);
    return () => api.unmount(id.current);
  }, [api, isReady]);
}
