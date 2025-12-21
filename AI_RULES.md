# AI_RULES.md

## Project Overview

This project is a **minimal, high-performance WebGL portfolio site** with a strong focus on:

- ultra-fast initial load,
- **CRT-style CSS → WebGL power-on transition**, and
- lazy-loaded cinematic 3D scenes.

The visual narrative is inspired by **old CRT displays**:
power-on → idle → scanline loader → scene.

The stack is intentionally minimal:

- **Vite**
- **TypeScript ES Modules**
- **Raw WebGL2 (CRT / preloaders)**
- **three.js + ore-three v5 (scenes)**

No frontend frameworks (React / Vue / etc.) are used.

---

## Core Goals

- Minimal initial payload (HTML + CSS + minimal JS).
- No `three` / `ore-three` on first paint.
- **CRT power-on is a time-based transition, not a loader.**
- Real asset loading happens **only after user interaction**.
- Visual continuity between:
  - HTML/CSS
  - WebGL CRT
  - WebGL scene
- Explicit lifecycle control (no hidden magic).
- Each WebGL system owns and destroys its own canvas.

---

## Project Structure (Authoritative)

```
src/
│
├─ preloader/
│   ├─ shaders/              # CRT loader fragment and vertex shaderers dir (CRT + scanline)
│   ├─ crt-bootstrap.ts      # CRT loader public API (worker / fallback)
│   ├─ crt-worker.ts         # OffscreenCanvas WebGL worker
│   ├─ preloader.ts          # Scanline loader logic
│   └─ shader-preload.ts     # Shader Preloader - imoports and compiles shaders (CRT + scanline) from shaders dir
│
├─ scenes/
│   └─ hero-layer.ts         # ore-three v5 BaseLayer (lazy-loaded)
│
├─ main.ts                   # App orchestration / state transitions
│
├─ index.html                # Minimal HTML
│
├─ vite.config.js
└─ package.json
```

This structure is **intentional and must not be flattened**.

---

## Application Phases (Strict)

The app has **four explicit phases**:

```
HTML / CSS
   ↓
CRT POWER-ON (time-based, ~20 frames)
   ↓
IDLE (button / UI)
   ↓
SCANLINE LOADER (progress-based)
   ↓
ore-three SCENE
```

Each phase has **different rules**.

---

## CRT Power-On Rules (IMPORTANT)

- CRT power-on is **NOT a loader**.
- It is a **fixed-duration, frame-based transition**.
- Duration is expressed in **frames**, not milliseconds.
- Typical value: **~20 frames**.

### Allowed

- Frame-based animation via `requestAnimationFrame`
- Linear progress `0 → 1`
- Shader handles easing internally

### Forbidden

❌ Fake loading  
❌ Timeouts / delays  
❌ Asset-dependent timing  
❌ Progress smoothing

---

## Scanline Loader Rules

- Scanline loader is **progress-driven**.
- Progress represents **real asset loading only**.
- Uses **smoothing / easing in JS**.
- Driven by:
  - dynamic imports
  - asset managers (future)

CRT power-on and scanline loader **must never share logic**.

---

## Preloader Rules (Raw WebGL)

- Preloader **must NOT import**:
  - `three`
  - `ore-three`
- Uses raw WebGL:
  - WebGL2 preferred
  - WebGL1 fallback allowed
- Rendering:
  - fullscreen triangle or quad
- Core uniforms:
  - `uProgress`
  - `uResolution`
  - optional `uMode`

### Lifecycle

On shutdown:

- stop RAF / worker loop
- delete shaders / programs / buffers
- release WebGL context
- hide or remove canvas

---

## Worker / OffscreenCanvas Rules

- If supported:
  - CRT runs in `crt-worker.ts` via `OffscreenCanvas`
- If not supported (Safari fallback):
  - main-thread WebGL is used
- API surface must be identical in both modes

Scenes must **never care** whether a worker is used.

---

## Canvas Lifecycle (CRITICAL)

- **Never reuse a WebGL context.**
- **Never share canvases between systems.**

Correct flow:

1. Create CRT canvas
2. Run CRT power-on / scanline loader
3. Destroy or hide CRT canvas
4. Create new canvas for ore-three scene

Each system owns its canvas **exclusively**.

---

## ore-three v5 Rules (Strict)

Only **ore-three v5** APIs are allowed.

### Forbidden v4 Concepts

❌ `Core`  
❌ `LayerManager`  
❌ `onUpdate`  
❌ `controller.start()`

---

### Controller

- `Controller` responsibilities:
  - time
  - pointer
  - layer scheduling
- `Controller`:
  - does NOT receive canvas
  - does NOT manage renderer directly

Example:

```js
const controller = new Controller({
  pointerEventElement: canvas,
});
controller.addLayer(layer);
```

---

### BaseLayer

- All scenes extend `BaseLayer`.
- Canvas is passed **only** via layer constructor:

```js
new HeroLayer({ canvas });
```

`BaseLayer` automatically provides:

- `this.scene`
- `this.camera`
- `this.renderer`
- `this.info.size`
- `this.commonUniforms`
- `this.time`

---

## Rendering Rules

- Rendering happens **only** inside:

```js
animate(deltaTime);
{
  this.renderer.render(this.scene, this.camera);
}
```

- `requestAnimationFrame` is **forbidden** in scenes.

---

## Scene Rules

Scene code must:

- ❌ never touch the DOM
- ❌ never create / destroy canvas
- ❌ never manage RAF
- ✅ only control Three.js objects
- ✅ rely on ore-three lifecycle

---

## Lazy Loading Rules

- `three` and `ore-three` must be imported dynamically.
- Lazy loading happens:
  - **after user interaction**
  - **after CRT power-on**

Example:

```js
await import('ore-three');
await import('./scenes/hero-layer.ts');
```

---

## Styling Rules

- CSS is allowed for:
  - layout
  - typography
  - UI
  - preload background
---

## Forbidden (Hard Rules)

❌ Importing `three` during preload  
❌ Importing `ore-three` during preload  
❌ Sharing WebGL contexts  
❌ Passing canvas to `Controller`  
❌ DOM access inside `BaseLayer`  
❌ Time-based loaders pretending to be progress

---

## Design Philosophy

- CRT power-on = **physical transition**
- Scanline loader = **informational loader**
- Scene = **cinematic layer**
- Explicit lifecycle over abstractions
- Minimal bytes first, visuals later
- CSS and WebGL must feel like **one system**

---

## Target

A fast, cinematic, progressive WebGL portfolio  
with **CRT-inspired transitions**, clean architecture  
and zero wasted complexity.
