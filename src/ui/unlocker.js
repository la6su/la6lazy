export function createUnlocker(el, { onStart, onProgress, onUnlock }) {
  const thumb = el.querySelector('.thumb');
  const fill = el.querySelector('.fill');
  const track = el.querySelector('.track');

  let dragging = false;
  let startX = 0;
  let progress = 0;
  let started = false;

  const max = track.clientWidth - thumb.clientWidth;

  thumb.addEventListener('pointerdown', e => {
    dragging = true;
    startX = e.clientX;
    thumb.setPointerCapture(e.pointerId);

    if (!started) {
      started = true;
      onStart?.(); // 🔥 КЛЮЧЕВОЕ
    }
  });

  window.addEventListener('pointermove', e => {
    if (!dragging) return;

    const dx = e.clientX - startX;
    progress = Math.min(1, Math.max(0, dx / max));

    thumb.style.transform = `translateX(${progress * max}px)`;
    fill.style.width = `${progress * 100}%`;

    onProgress?.(progress); // 🔥
  });

  window.addEventListener('pointerup', () => {
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
  });
}
