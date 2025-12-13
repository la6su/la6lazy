import { startPreloader } from "./preloader/preloader.js";

const canvas = document.getElementById("canvas");
const btn = document.getElementById("nextSlide");

const preload = startPreloader(canvas);

btn.addEventListener("click", async () => {

    btn.style.display = "none";
    preload.stop();

    // очищаем canvas (WebGL reset)
    const container = document.getElementById("canvas-wrapper");

    container.innerHTML = "";
    const canvas = document.createElement("canvas");
    canvas.id = "canvas";
    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = container.clientWidth * pixelRatio;
    canvas.height = container.clientHeight * pixelRatio;
    canvas.style.width = container.clientWidth + 'px';
    canvas.style.height = container.clientHeight + 'px';
    container.appendChild(canvas);

    // подгружаем v5 и слой
    const { Controller } = await import("ore-three");
    const { HeroLayer } = await import("./scenes/hero-layer.js");

    // Create controller
    const controller = new Controller({
        pointerEventElement: canvas
    });

    controller.addLayer( new HeroLayer({
        name: 'HeroLayer',
        canvas: canvas,
    }));


});
