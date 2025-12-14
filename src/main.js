
const mainCanvas = document.getElementById('main-canvas');
const crtCanvas  = document.getElementById('crt-canvas');

import { createCRTLoader } from './preloader/crt-bootstrap.js';
const crt = await createCRTLoader({
    canvas: crtCanvas,
    dpr: window.devicePixelRatio,
});

const btn = document.getElementById('nextSlide');

// ---- ИМИТАЦИЯ РЕАЛЬНОЙ ЗАГРУЗКИ ----
(async function boot() {
    await delay(200);
    crt.setProgress(0.15);

    await delay(240);
    crt.setProgress(0.35);

    await delay(320);
    crt.setProgress(0.8);

    // тут позже будет ore-three import
    await delay(400);
    crt.setProgress(1.0);
})();

function delay(ms) {
    return new Promise(res => setTimeout(res, ms));
}

btn.addEventListener('click', async () => {
  btn.style.display = 'none';

  // останавливаем CRT
    crt.finish();

  // подгружаем v5 и слой
  const { Controller } = await import('ore-three');
  const { HeroLayer } = await import('./scenes/hero-layer.js');

  // Create controller
  const controller = new Controller({
    pointerEventElement: mainCanvas,
  });

  controller.addLayer(
    new HeroLayer({
      name: 'HeroLayer',
      canvas: mainCanvas,
    })
  );
    crtCanvas.style.display = 'none';
});
