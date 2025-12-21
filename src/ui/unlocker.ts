import { DOMUtils } from '../utils/dom';

export function createUnlocker(
  el: HTMLElement,
  {
    onStart,
    onProgress,
    onUnlock,
  }: {
    onStart?: () => void;
    onProgress?: (p: number) => void;
    onUnlock?: () => void;
  }
) {
  const thumb = DOMUtils.querySelector('.thumb', el, HTMLElement);
  const fill = DOMUtils.querySelector('.fill', el, HTMLElement);
  const track = DOMUtils.querySelector('.track', el, HTMLElement);

  if (!thumb || !fill || !track)
    throw new Error('Unlocker elements not found');

  let dragging = false;
  let startX = 0;
  let progress = 0;
  let started = false;

  const max = track.clientWidth - thumb.clientWidth;

  // Unified drag start handler
  const startDrag = (pageX: number) => {
    dragging = true;
    startX = pageX;
    if (!started) {
      started = true;
      onStart?.();
    }
  };

  // Unified move handler
  const handleMove = (_pageX: number) => {
    if (!dragging) return;

    const dx = _pageX - startX;
    progress = Math.min(1, Math.max(0, dx / max));

    thumb.style.transform = `translateX(${progress * max}px)`;
    fill.style.width = `${progress * 100}%`;

    onProgress?.(progress);
  };

  // Unified end handler
  const handleEnd = () => {
    if (!dragging) return;
    dragging = false;

    if (progress > 0.95) {
      onUnlock?.();
      el.remove();
    } else {
      progress = 0;
      thumb.style.transform = '';
      fill.style.width = '0%';
      onProgress?.(0);
    }
  };

  // Pointer events
  thumb.addEventListener('pointerdown', (e: PointerEvent) => {
    e.preventDefault();
    startDrag(e.pageX);
    try {
      thumb.setPointerCapture(e.pointerId);
    } catch {
      // setPointerCapture may not work on some mobile devices
    }
  });

  const handlePointerMove = (_e: PointerEvent) => {
    _e.preventDefault();
    handleMove(_e.pageX);
  };

  const handlePointerUp = (_e: PointerEvent) => handleEnd();

  window.addEventListener('pointermove', handlePointerMove);
  window.addEventListener('pointerup', handlePointerUp);

  // Touch events as fallback for better mobile support
  thumb.addEventListener(
    'touchstart',
    (e: TouchEvent) => {
      e.preventDefault();
      startDrag(e.touches[0].pageX);
    },
    { passive: false }
  );

  const handleTouchMove = (_e: TouchEvent) => {
    _e.preventDefault();
    handleMove(_e.touches[0].pageX);
  };

  const handleTouchEnd = (_e: TouchEvent) => handleEnd();

  window.addEventListener('touchmove', handleTouchMove, { passive: false });
  window.addEventListener('touchend', handleTouchEnd);
}
