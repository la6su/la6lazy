import { createCRTLoader } from './preloader/crt-bootstrap.js';
import { createUnlocker } from './ui/unlocker.js';

const mainCanvas = document.getElementById('main-canvas');
const crtCanvas  = document.getElementById('crt-canvas');
const btn        = document.getElementById('nextSlide');


// -----------------------------------------------------------------------------
// INIT CRT
// -----------------------------------------------------------------------------
const crt = await createCRTLoader({
    canvas: crtCanvas,
    dpr: window.devicePixelRatio,
});

// -----------------------------------------------------------------------------
// CRT POWER-ON (fixed duration ~120ms)
// -----------------------------------------------------------------------------
function playCRTPowerOn(frames = 20) {
    return new Promise(resolve => {
        let frame = 0;

        crt.setMode('boot');
        crt.setProgress(0);

        function tick() {
            frame++;
            const t = Math.min(1, frame / frames);

            // ВАЖНО: линейно, без easing
            crt.setProgress(t);

            if (frame < frames) {
                requestAnimationFrame(tick);
            } else {
                crt.setProgress(1);
                resolve();
            }
        }

        requestAnimationFrame(tick);
    });
}


// запускаем CRT сразу
await playCRTPowerOn(20);

// -----------------------------------------------------------------------------
// PROGRESS CONTROLLER (ТОЛЬКО для scanline-loader)
// -----------------------------------------------------------------------------
let visualProgress = 0;
let targetProgress = 0;
let rafId = null;

function setTargetProgress(v) {
    targetProgress = Math.min(1, Math.max(0, v));
    startSmoothing();
}

function startSmoothing() {
    if (rafId !== null) return;

    function tick() {
        visualProgress += (targetProgress - visualProgress) * 0.18;
        crt.setProgress(visualProgress);

        if (Math.abs(targetProgress - visualProgress) > 0.002) {
            rafId = requestAnimationFrame(tick);
        } else {
            visualProgress = targetProgress;
            crt.setProgress(visualProgress);
            rafId = null;
        }
    }

    rafId = requestAnimationFrame(tick);
}

// -----------------------------------------------------------------------------
// PRELOAD MINIMUM (без визуального loader)
// -----------------------------------------------------------------------------
(async function preloadMinimal() {
    // минимальный набор для готовности UI / CRT
    await import('./preloader/shader-preload.js');
    await import('./preloader/preloader.js');
})();
// -----------------------------------------------------------------------------
// NEXT SLIDE → REAL ASSET LOADING (scanline mode)
// -----------------------------------------------------------------------------

createUnlocker(
    document.getElementById('unlocker'),
    {
        onUnlock: async () => {

            // сбрасываем прогресс
            visualProgress = 0;
            targetProgress = 0;
            crt.setProgress(0);

            // -------- реальные шаги загрузки --------
            const { Controller } = await import('ore-three');
            setTargetProgress(0.3);

            const { HeroLayer } = await import('./scenes/hero-layer.js');
            setTargetProgress(0.7);

            const controller = new Controller({
                pointerEventElement: mainCanvas,
            });

            controller.addLayer(
                new HeroLayer({
                    name: 'HeroLayer',
                    canvas: mainCanvas,
                })
            );

            setTargetProgress(1);

            // закрываем CRT аккуратно
            setTimeout(() => {
                crt.finish();
                crtCanvas.style.display = 'none';
            }, 250);
            crt.setMode('scanline');
        }
    }
);
