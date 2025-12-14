import { createGLPreloader } from './shader-preload.js';

let preloader = null;

onmessage = (e) => {
    const data = e.data;

    if (data.type === 'init') {
        const { canvas, width, height, dpr } = data;

        canvas.width = width * dpr;
        canvas.height = height * dpr;

        preloader = createGLPreloader(canvas);
        preloader.setProgress(0.0);
    }

    if (data.type === 'progress' && preloader) {
        preloader.setProgress(data.value);
    }
    if
    (data.type === 'stop') {
        preloader?.stop();
        close();
    }
};
