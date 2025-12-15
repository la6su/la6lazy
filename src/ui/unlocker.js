/**
 * createUnlocker - интерактивный слайдер для разблокировки загрузки
 * Поддерживает pointer events (мышь + touch)
 * @param {HTMLElement} el - контейнер слайдера
 * @param {Object} callbacks - колбэки { onStart, onProgress, onUnlock }
 */
export function createUnlocker(el, { onStart, onProgress, onUnlock }) {
  const thumb = el.querySelector('.thumb');
  const fill = el.querySelector('.fill');
  const track = el.querySelector('.track');

  if (!thumb || !fill || !track) {
    console.error('Unlocker: missing required elements (.thumb, .fill, .track)');
    return;
  }

  let dragging = false;
  let startX = 0;
  let currentX = 0;
  let progress = 0;
  let started = false;
  let max = 0;

  const updateMax = () => {
    max = Math.max(0, track.clientWidth - thumb.clientWidth);
  };

  const updateProgress = (clientX) => {
    const dx = clientX - startX;
    progress = Math.min(1, Math.max(0, dx / max));

    thumb.style.transform = `translateX(${progress * max}px)`;
    fill.style.width = `${progress * 100}%`;

    onProgress?.(progress);
  };

  const reset = () => {
    progress = 0;
    thumb.style.transform = '';
    fill.style.width = '0%';
    onProgress?.(0);
  };

  // Обновляем max при resize
  const resizeObserver = new ResizeObserver(updateMax);
  resizeObserver.observe(track);
  updateMax();

  const handlePointerDown = (e) => {
    dragging = true;
    startX = e.clientX;
    currentX = e.clientX;

    try {
      thumb.setPointerCapture(e.pointerId);
    } catch (error) {
      console.warn('Pointer capture not supported:', error);
    }

    el.setAttribute('data-dragging', 'true');

    if (!started) {
      started = true;
      onStart?.();
    }

    e.preventDefault();
  };

  const handlePointerMove = (e) => {
    if (!dragging) return;

    currentX = e.clientX;
    updateProgress(currentX);

    e.preventDefault();
  };

  const handlePointerUp = (e) => {
    if (!dragging) return;

    dragging = false;
    el.removeAttribute('data-dragging');

    try {
      thumb.releasePointerCapture(e.pointerId);
    } catch (error) {
      // Ignore if not supported
    }

    if (progress > 0.95) {
      onUnlock?.();
      el.remove();
      resizeObserver.disconnect();
    } else {
      reset();
    }

    e.preventDefault();
  };

  const handlePointerCancel = (e) => {
    if (!dragging) return;

    dragging = false;
    el.removeAttribute('data-dragging');
    reset();

    try {
      thumb.releasePointerCapture(e.pointerId);
    } catch (error) {
      // Ignore if not supported
    }
  };

  // Event listeners
  thumb.addEventListener('pointerdown', handlePointerDown);
  window.addEventListener('pointermove', handlePointerMove);
  window.addEventListener('pointerup', handlePointerUp);
  window.addEventListener('pointercancel', handlePointerCancel);

  // Touch-specific: prevent scrolling while dragging
  thumb.addEventListener('touchstart', (e) => {
    if (dragging) {
      e.preventDefault();
    }
  }, { passive: false });

  // Cleanup function (for future use)
  return {
    destroy: () => {
      resizeObserver.disconnect();
      thumb.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerCancel);
    }
  };
}
