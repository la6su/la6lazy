import EventEmitter from 'wolfy87-eventemitter';
import { DOMUtils } from '../utils/dom';
import { AppState } from './app-state';
import { ProgressController } from './progress-controller';
import {
  LifecycleManager,
  LifecycleManagerConfig,
} from './lifecycle/lifecycle-manager';

/**
 * Main application controller - simplified facade using composition
 */
export class AppController {
  private appState: AppState;
  private progressController: ProgressController;
  private lifecycleManager: LifecycleManager;
  private globalEmitter: EventEmitter;

  // DOM elements
  private mainCanvas: HTMLCanvasElement;
  private crtCanvas: HTMLCanvasElement;
  private unlockerEl: HTMLElement;

  constructor(globalEmitter: EventEmitter) {
    this.globalEmitter = globalEmitter;
    this.appState = new AppState();
    this.progressController = new ProgressController();

    // Initialize DOM elements
    this.mainCanvas = DOMUtils.getElementById(
      'main-canvas',
      HTMLCanvasElement
    )!;
    this.crtCanvas = DOMUtils.getElementById('crt-canvas', HTMLCanvasElement)!;
    this.unlockerEl = DOMUtils.getElementById('unlocker')!;

    // Create configuration object
    const config: LifecycleManagerConfig = {
      events: {
        globalEmitter: this.globalEmitter,
      },
      state: {
        appState: this.appState,
        progressController: this.progressController,
      },
      ui: {
        mainCanvas: this.mainCanvas,
        crtCanvas: this.crtCanvas,
        unlockerEl: this.unlockerEl,
      },
    };

    // Initialize lifecycle manager with configuration
    this.lifecycleManager = new LifecycleManager(config);

    // Export for global access
    (window as any).appEmitter = globalEmitter;
    (window as any).appState = this.appState;
    (window as any).appController = this;
  }

  /**
   * Initialize the application
   */
  async initialize(): Promise<void> {
    return this.lifecycleManager.initialize();
  }

  /**
   * Switch to scene by name
   */
  async switchToScene(sceneName: string): Promise<void> {
    return this.lifecycleManager.switchToScene(sceneName);
  }

  /**
   * Get current scene name
   */
  getCurrentSceneName(): string | null {
    return this.lifecycleManager.getCurrentSceneName();
  }

  /**
   * Get app state
   */
  getAppState(): AppState {
    return this.appState;
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.lifecycleManager.dispose();
  }
}
