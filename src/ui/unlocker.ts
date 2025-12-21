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
  const thumbEl = el.querySelector('.thumb');
  const fillEl = el.querySelector('.fill');
  const trackEl = el.querySelector('.track');

  if (!thumbEl || !fillEl || !trackEl)
    throw new Error('Unlocker elements not found');

  const thumb = thumbEl as HTMLElement;
  const fill = fillEl as HTMLElement;
  const track = trackEl as HTMLElement;

  let dragging = false;
  let startX = 0;
  let progress = 0;
  let started = false;

  const max = track.clientWidth - thumb.clientWidth;

  thumb.addEventListener('pointerdown', (e: PointerEvent) => {
    e.preventDefault();
    dragging = true;
    startX = e.pageX; // Используем pageX для точности
    try {
      thumb.setPointerCapture(e.pointerId);
    } catch (error) {
      // setPointerCapture может не работать на некоторых мобильных
    }

    if (!started) {
      started = true;
      onStart?.(); // 🔥 КЛЮЧЕВОЕ
    }
  });

  const handlePointerMove = (e: PointerEvent) => {
    if (!dragging) return;
    e.preventDefault(); // Предотвращаем скролл

    const dx = e.pageX - startX;
    progress = Math.min(1, Math.max(0, dx / max));

    thumb.style.transform = `translateX(${progress * max}px)`;
    fill.style.width = `${progress * 100}%`;

    onProgress?.(progress); // 🔥
  };

  const handlePointerUp = () => {
    if (!dragging) return;
    dragging = false;

    if (progress > 0.95) {
      onUnlock?.();
      el.remove();
      // Убираем слушатели после удаления элемента
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    } else {
      progress = 0;
      thumb.style.transform = '';
      fill.style.width = '0%';
      onProgress?.(0);
    }
  };

  window.addEventListener('pointermove', handlePointerMove);
  window.addEventListener('pointerup', handlePointerUp);

  // Добавляем touch события как fallback для лучшей мобильной поддержки
  thumb.addEventListener('touchstart', (e: TouchEvent) => {
    e.preventDefault();
    dragging = true;
    startX = e.touches[0].pageX;

    if (!started) {
      started = true;
      onStart?.();
    }
  }, { passive: false });

  const handleTouchMove = (e: TouchEvent) => {
    if (!dragging) return;
    e.preventDefault();

    const dx = e.touches[0].pageX - startX;
    progress = Math.min(1, Math.max(0, dx / max));

    thumb.style.transform = `translateX(${progress * max}px)`;
    fill.style.width = `${progress * 100}%`;

    onProgress?.(progress);
  };

  const handleTouchEnd = () => {
    if (!dragging) return;
    dragging = false;

    if (progress > 0.95) {
      onUnlock?.();
      el.remove();
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    } else {
      progress = 0;
      thumb.style.transform = '';
      fill.style.width = '0%';
      onProgress?.(0);
    }
  };

  window.addEventListener('touchmove', handleTouchMove, { passive: false });
  window.addEventListener('touchend', handleTouchEnd);
}
