import EventEmitter from 'wolfy87-eventemitter';
import { AppState, AppPhase } from '../app-state';
import { ProgressController } from '../progress-controller';
import { ErrorHandler } from '../services/error-handler';
import { MemoryMonitorService } from '../services/memory-monitor';

export interface LifecycleManagerOptions {
  globalEmitter: EventEmitter;
  appState: AppState;
  progressController: ProgressController;
  mainCanvas: HTMLCanvasElement;
  crtCanvas: HTMLCanvasElement;
  unlockerEl: HTMLElement;
}

/**
 * Orchestrates application lifecycle and initialization phases
 */
export class LifecycleManager {
  private globalEmitter: EventEmitter;
  private appState: AppState;
  private progressController: ProgressController;
  private mainCanvas: HTMLCanvasElement;
  private crtCanvas: HTMLCanvasElement;
  private unlockerEl: HTMLElement;

  private crt: any = null; // CRT loader from main.ts
  private controller: any = null; // ore-three Controller
  private sceneClasses: Record<string, any> = {};
  private currentSceneName: string | null = null;
  private errorHandler: ErrorHandler;
  private memoryMonitor: MemoryMonitorService;
  private loadingStarted = false;

  constructor(options: LifecycleManagerOptions) {
    this.globalEmitter = options.globalEmitter;
    this.appState = options.appState;
    this.progressController = options.progressController;
    this.mainCanvas = options.mainCanvas;
    this.crtCanvas = options.crtCanvas;
    this.unlockerEl = options.unlockerEl;

    // Initialize services
    this.errorHandler = new ErrorHandler({
      appState: this.appState,
      crtCanvas: this.crtCanvas,
      unlockerEl: this.unlockerEl
    });

    this.memoryMonitor = new MemoryMonitorService();
  }

  /**
   * Run the complete initialization pipeline
   */
  async initialize(): Promise<void> {
    try {
      // Phase 1: Use already initialized CRT from main.ts
      this.crt = (window as any).crt;

      // Phase 2: Initialize memory monitor early
      await this.initMemoryMonitor();

      // Phase 3: Show unlocker (CRT is already booted in main.ts)
      await this.initUnlocker();

    } catch (error) {
      console.error('Failed to initialize app:', error);
      this.errorHandler.handleCriticalError(error);
      throw error;
    }
  }





  /**
   * Initialize unlocker component
   */
  private async initUnlocker(): Promise<void> {
    const { createUnlocker } = await import('../../ui/unlocker');
    createUnlocker(this.unlockerEl, {
      onStart: async () => {
        if (this.loadingStarted) return;
        this.loadingStarted = true;

        // Start heavy initialization
        await this.initializeHeavy();
        this.appState.setPhase(AppPhase.SCANLINE_LOADER);
        if (this.crt) this.crt.setMode('scanline');
        await this.startSceneLoading();
      },
      onProgress: (p: number) => {
        if (this.crt) this.crt.setScanlinePhase(p);
      },
      onUnlock: () => {
        this.progressController.setTargetProgress(1);
        this.waitForSceneReady();
      },
    });
  }

  /**
   * Initialize memory monitoring
   */
  private async initMemoryMonitor(): Promise<void> {
    await this.memoryMonitor.initialize();
  }

  /**
   * Heavy initialization (called after unlock starts)
   */
  private async initializeHeavy(): Promise<void> {
    // Hide initial loader (шейдеры уже загружены)
    const { hideLoader } = await import('../../preloader/preloader');
    hideLoader();
  }

  /**
   * Start scene loading pipeline
   */
  private async startSceneLoading(): Promise<void> {
    // Load ore-three (static import for reliability)
    const { Controller } = await import('ore-three');
    this.progressController.setTargetProgress(0.3);

    this.controller = new Controller({
      pointerEventElement: this.mainCanvas,
    });

    // Load hero scene (initial scene)
    const heroModule = await this.loadWithProgress('../scenes/hero-layer', 0.7);
    const { HeroLayer } = heroModule;

    this.sceneClasses = {
      hero: HeroLayer,
      // demo will be loaded lazily on first access
    };

    // Load initial scene
    await this.switchToScene('hero');
    this.progressController.setTargetProgress(1);

    // Export for global access
    (window as any).controller = this.controller;
    (window as any).switchToScene = this.switchToScene.bind(this);
  }

  /**
   * Load module with progress tracking
   */
  private async loadWithProgress(modulePath: string, targetProgress: number): Promise<any> {
    const module = await import(modulePath);
    this.progressController.setTargetProgress(targetProgress);
    return module;
  }

  /**
   * Wait for scene to be ready and finish CRT
   */
  private waitForSceneReady(): void {
    const checkProgress = () => {
      if (this.progressController.getCurrentProgress() > 0.995) {
        if (this.crt) {
          this.crt.finish();
          this.crtCanvas.style.display = 'none';
        }
        this.appState.setPhase(AppPhase.SCENE);
      } else {
        requestAnimationFrame(checkProgress);
      }
    };
    checkProgress();
  }

  /**
   * Get current scene name
   */
  getCurrentSceneName(): string | null {
    return this.currentSceneName;
  }

  /**
   * Switch to scene
   */
  async switchToScene(sceneName: string): Promise<void> {
    if (!this.controller) return;

    // Check if scene class is loaded, load lazily if needed
    if (!this.sceneClasses[sceneName]) {
      console.warn(`Unknown scene: ${sceneName}`);
      return;
    }

    // Clean up current scene
    if (this.currentSceneName) {
      const currentLayer = this.controller.getLayer(this.currentSceneName);
      if (currentLayer && typeof currentLayer.dispose === 'function') {
        currentLayer.dispose();
      }
      this.controller.removeLayer(this.currentSceneName);
    }

    // Create new scene
    const SceneClass = this.sceneClasses[sceneName];
    if (SceneClass) {
      const scene = new SceneClass({
        name: sceneName,
        canvas: this.mainCanvas,
      });

      this.controller.addLayer(scene);
      this.currentSceneName = sceneName;
      this.globalEmitter.emit('sceneChanged', {
        sceneName,
        layer: scene,
      });
      console.log(`Switched to scene: ${sceneName}`);
    }
  }



  /**
   * Dispose all resources
   */
  dispose(): void {
    if (this.crt) {
      this.crt.destroy?.();
      this.crt = null;
    }

    if (this.controller) {
      this.controller.dispose();
      this.controller = null;
    }

    this.memoryMonitor.dispose();
    this.progressController.dispose();
  }
}
