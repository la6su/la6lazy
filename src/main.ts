import EventEmitter from 'wolfy87-eventemitter';
import { AppPhase } from './core/app-state';

// Export for potential external use
(window as any).AppPhase = AppPhase;

// -----------------------------------------------------------------------------
// GLOBAL EVENT EMITTER
// -----------------------------------------------------------------------------
export const globalEmitter = new EventEmitter();

// -----------------------------------------------------------------------------
// PRELOAD MINIMUM (только шейдеры для CRT)
// -----------------------------------------------------------------------------
(async function preloadMinimal() {
  await import('./preloader/shaders');
})();

// -----------------------------------------------------------------------------
// LAZY LOAD APPLICATION CONTROLLER
// -----------------------------------------------------------------------------
const { AppController } = await import('./core/app-controller');
const appController = new AppController(globalEmitter);

// -----------------------------------------------------------------------------
// START APPLICATION
// -----------------------------------------------------------------------------
await appController.initialize();
