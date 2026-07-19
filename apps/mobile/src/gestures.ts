import { useRef, useState } from 'react';

// Swipe a bottom sheet down to dismiss. Only engages when the sheet is scrolled
// to the top, so it never fights normal vertical scrolling. Returns touch
// handlers + a live transform style for drag feedback.
export function useSwipeDown(onClose: () => void, threshold = 110) {
  const start = useRef<{ y: number; atTop: boolean } | null>(null);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);

  const onTouchStart = (e: React.TouchEvent) => {
    const el = e.currentTarget as HTMLElement;
    start.current = { y: e.touches[0].clientY, atTop: el.scrollTop <= 0 };
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!start.current?.atTop) return;
    const dy = e.touches[0].clientY - start.current.y;
    if (dy > 0) {
      setDragging(true);
      setDragY(dy);
    }
  };
  const onTouchEnd = () => {
    if (dragY > threshold) onClose();
    setDragging(false);
    setDragY(0);
    start.current = null;
  };

  return {
    handlers: { onTouchStart, onTouchMove, onTouchEnd },
    style: {
      transform: dragY ? `translateY(${dragY}px)` : undefined,
      transition: dragging ? 'none' : 'transform 0.2s ease',
    } as React.CSSProperties,
  };
}

export type PullState = 'idle' | 'pulling' | 'ready' | 'refreshing' | 'done' | 'error';

// Pull-to-refresh (#63) for the main list container. Only engages when the list
// is scrolled to the very top AND the drag is dominantly vertical, so it never
// fights normal scrolling or the horizontal back/forward swipe. The pull
// distance is damped (feels like rubber) and capped.
export function usePullToRefresh(onRefresh: () => Promise<unknown>, threshold = 70) {
  const start = useRef<{ y: number; x: number; atTop: boolean } | null>(null);
  const [pull, setPull] = useState(0);
  const [state, setState] = useState<PullState>('idle');
  const busy = useRef(false);

  const reset = (next: PullState, delay = 1200) => {
    setPull(0);
    setState(next);
    if (next !== 'idle') window.setTimeout(() => setState('idle'), delay);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (busy.current) return;
    const el = e.currentTarget as HTMLElement;
    start.current = { y: e.touches[0].clientY, x: e.touches[0].clientX, atTop: el.scrollTop <= 0 };
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const s = start.current;
    if (!s?.atTop || busy.current) return;
    const dy = e.touches[0].clientY - s.y;
    const dx = e.touches[0].clientX - s.x;
    // Downward and clearly vertical only — otherwise leave it to scroll/swipe.
    if (dy <= 0 || Math.abs(dx) > Math.abs(dy)) return;
    const damped = Math.min(dy / 2.2, threshold * 1.6);
    setPull(damped);
    setState(damped >= threshold ? 'ready' : 'pulling');
  };

  const onTouchEnd = () => {
    const wasReady = state === 'ready';
    start.current = null;
    if (busy.current) return;
    if (!wasReady) {
      reset('idle');
      return;
    }
    busy.current = true;
    setState('refreshing');
    setPull(threshold * 0.7); // keep the indicator visible while loading
    void Promise.resolve(onRefresh())
      .then(() => reset('done'))
      .catch(() => reset('error', 2500))
      .finally(() => {
        busy.current = false;
      });
  };

  return {
    handlers: { onTouchStart, onTouchMove, onTouchEnd },
    pull,
    state,
    // Content follows the finger; snaps back with a short transition.
    style: {
      transform: pull ? `translateY(${pull}px)` : undefined,
      transition: state === 'pulling' || state === 'ready' ? 'none' : 'transform 0.25s ease',
    } as React.CSSProperties,
  };
}

// Horizontal swipe → browser-like back/forward. Left→right = back, right→left =
// forward. Requires a dominant horizontal movement so vertical scroll is safe.
export function useHorizontalSwipe(onBack: () => void, onForward: () => void) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const s = start.current;
    start.current = null;
    if (!s) return;
    const dx = e.changedTouches[0].clientX - s.x;
    const dy = e.changedTouches[0].clientY - s.y;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 2) {
      if (dx > 0) onBack();
      else onForward();
    }
  };
  return { onTouchStart, onTouchEnd };
}
