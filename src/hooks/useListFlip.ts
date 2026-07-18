import { useLayoutEffect, useRef, type RefObject } from 'react';
import { COMPLETION_ANIM_MS } from '../store';

// FLIP hook for the completion animation (#53): whenever `pulse` changes
// (a completion hold released into the ✓ Erledigt block), rows — elements
// carrying [data-flip-id] inside the container — that changed their vertical
// position since the previous render glide there via a transform transition.
// The released task slides down into the block and the rows below slide up.
// All other re-renders (drag reorder, sort changes, …) only record positions,
// so nothing else starts animating.
export function useListFlip(containerRef: RefObject<HTMLElement | null>, pulse: number) {
  const prevPositions = useRef(new Map<string, number>());
  const prevPulse = useRef(pulse);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) {
      prevPositions.current = new Map();
      prevPulse.current = pulse;
      return;
    }
    const rows = Array.from(container.querySelectorAll<HTMLElement>('[data-flip-id]'));
    const next = new Map<string, number>();
    for (const el of rows) next.set(el.dataset.flipId!, el.getBoundingClientRect().top);

    const released = pulse !== prevPulse.current;
    prevPulse.current = pulse;

    if (released && !prefersReducedMotion()) {
      for (const el of rows) {
        const from = prevPositions.current.get(el.dataset.flipId!);
        const to = next.get(el.dataset.flipId!);
        if (from == null || to == null) continue;
        const delta = from - to;
        if (Math.abs(delta) < 1) continue;
        // Invert: park the row at its old position, then let it play to 0.
        el.style.transition = 'none';
        el.style.transform = `translateY(${delta}px)`;
        el.style.willChange = 'transform';
        requestAnimationFrame(() => {
          el.style.transition = `transform ${COMPLETION_ANIM_MS}ms ease`;
          el.style.transform = '';
          const done = () => {
            el.style.transition = '';
            el.style.willChange = '';
            el.removeEventListener('transitionend', done);
          };
          el.addEventListener('transitionend', done);
        });
      }
    }
    prevPositions.current = next;
  });
}

export const prefersReducedMotion = (): boolean =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Collapse a row out of a view that hides completed tasks (#53 AC2): pin the
// measured height, then transition height + opacity to 0 while the exit phase
// keeps the row mounted. Used as a ref callback — the dataset guard makes it
// idempotent across re-renders.
export const beginExitCollapse = (el: HTMLElement | null): void => {
  if (!el || el.dataset.exiting) return;
  el.dataset.exiting = '1';
  if (prefersReducedMotion()) return; // hard removal at phase end instead
  el.style.height = `${el.offsetHeight}px`;
  el.style.overflow = 'hidden';
  requestAnimationFrame(() => {
    el.style.transition = `height ${COMPLETION_ANIM_MS}ms ease, opacity ${COMPLETION_ANIM_MS}ms ease`;
    el.style.height = '0px';
    el.style.opacity = '0';
  });
};
