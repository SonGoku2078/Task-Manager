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
