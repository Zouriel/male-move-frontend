import { DestroyRef, Signal, effect, inject, signal, untracked } from '@angular/core';

const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/** Runs `step(progress)` from 0 to 1 over `ms` with an ease-out curve; jumps to 1 under reduced motion. Returns a cancel function. */
export function tween(ms: number, step: (progress: number) => void): () => void {
  if (reduced() || typeof requestAnimationFrame !== 'function') { step(1); return () => {}; }
  const start = performance.now();
  let frame = requestAnimationFrame(function tick(now) {
    const t = Math.min(1, (now - start) / ms);
    step(easeOut(t));
    if (t < 1) frame = requestAnimationFrame(tick);
  });
  return () => cancelAnimationFrame(frame);
}

/** A number that counts up (or down) to `target` whenever it changes. Call in an injection context. */
export function countUp(target: () => number | null, ms = 700): Signal<number | null> {
  const value = signal<number | null>(null);
  let cancel = () => {};
  inject(DestroyRef).onDestroy(() => cancel());
  effect(() => {
    const to = target();
    untracked(() => {
      cancel();
      if (to === null) { value.set(null); return; }
      const from = value() ?? 0;
      cancel = tween(ms, (p) => value.set(from + (to - from) * p));
    });
  });
  return value;
}
