import EventEmitter from 'wolfy87-eventemitter';
import { AppPhase } from './core/app-state';
import { AppController } from './core/app-controller';

// Export for potential external use
(window as any).AppPhase = AppPhase;

// -----------------------------------------------------------------------------
// GLOBAL EVENT EMITTER
// -----------------------------------------------------------------------------
export const globalEmitter = new EventEmitter();

// -----------------------------------------------------------------------------
// APPLICATION CONTROLLER
// -----------------------------------------------------------------------------
const appController = new AppController(globalEmitter);

// -----------------------------------------------------------------------------
// PRELOAD MINIMUM (без визуального loader)
// -----------------------------------------------------------------------------
(async function preloadMinimal() {
  await import('./preloader/shader-preload');
  await import('./preloader/preloader');
})();

// -----------------------------------------------------------------------------
// START APPLICATION
// -----------------------------------------------------------------------------
await appController.initialize();
