import EventEmitter from 'wolfy87-eventemitter';
import { createCRTLoader } from '../preloader/crt-bootstrap';
import { createUnlocker } from '../ui/unlocker';
import { DOMUtils } from '../utils/dom';
import { MemoryMonitor } from '../utils/memory';
import { AppState, AppPhase } from './app-state';
import { ProgressController } from './progress-controller';
import { SceneManager } from '../scenes/scene-manager';

/**
 * Main application controller managing the entire lifecycle
 */
export class AppController {
  private appState: AppState;
  private progressController: ProgressController;
  private sceneManager: SceneManager | null = null;
  private crt: Awaited<ReturnType<typeof createCRTLoader>> | null = null;
  private globalEmitter: EventEmitter;

  // DOM elements
  private mainCanvas: HTMLCanvasElement;
  private crtCanvas: HTMLCanvasElement;
  private unlockerEl: HTMLElement;

  // State
  private loadingStarted = false;

  constructor(globalEmitter: EventEmitter) {
    this.globalEmitter = globalEmitter;
    this.appState = new AppState();
    this.progressController = new ProgressController();

    // Initialize DOM elements
    this.mainCanvas = DOMUtils.getElementById('main-canvas', HTMLCanvasElement)!;
    this.crtCanvas = DOMUtils.getElementById('crt-canvas', HTMLCanvasElement)!;
    this.unlockerEl = DOMUtils.getElementById('unlocker')!;

    // Set up progress callback
    this.progressController.setProgressUpdateCallback(progress => {
      if (this.crt) this.crt.setProgress(progress);
    });

    // Export for global access
    (window as any).appEmitter = globalEmitter;
    (window as any).appState = this.appState;
  }

  /**
   * Initialize the application
   */
  async initialize(): Promise<void> {
    try {
      await this.initCRT();
      await this.playCRTPowerOn();
      this.initUnlocker();
      this.initMemoryMonitor();
    } catch (error) {
      console.error('Failed to initialize app:', error);
      throw error;
    }
  }

  /**
   * Initialize CRT loader
   */
  private async initCRT(): Promise<void> {
    try {
      this.crt = await createCRTLoader({
        canvas: this.crtCanvas,
        dpr: window.devicePixelRatio,
      });
    } catch (error) {
      console.error('Failed to initialize CRT loader:', error);
      // Graceful degradation
      this.crtCanvas.style.display = 'none';
      this.crt = null;
    }
  }

  /**
   * Play CRT power-on animation
   */
  private async playCRTPowerOn(frames = 20): Promise<void> {
    if (!this.crt) return;

    this.appState.setPhase(AppPhase.CRT_POWER_ON);

    let frame = 0;

    this.crt.setMode('boot');
    this.crt.setProgress(0);

    return new Promise<void>(resolve => {
      const tick = () => {
        frame++;
        this.crt!.setProgress(Math.min(1, frame / frames));

        if (frame < frames) {
          requestAnimationFrame(tick);
        } else {
          this.appState.setPhase(AppPhase.IDLE);
          resolve();
        }
      };
      requestAnimationFrame(tick);
    });
  }

  /**
   * Initialize unlocker component
   */
  private initUnlocker(): void {
    createUnlocker(this.unlockerEl, {
      onStart: () => {
        if (this.loadingStarted) return;
        this.loadingStarted = true;
        this.appState.setPhase(AppPhase.SCANLINE_LOADER);

        if (this.crt) this.crt.setMode('scanline');

        // Start scene loading
        void this.startSceneLoading();
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
   * Start scene loading pipeline
   */
  private async startSceneLoading(): Promise<void> {
    const { Controller } = await import('ore-three');

    this.progressController.setTargetProgress(0.3);

    const controller = new Controller({
      pointerEventElement: this.mainCanvas,
    });

    this.progressController.setTargetProgress(0.5);

    // Initialize scene manager
    this.sceneManager = new SceneManager(controller, this.mainCanvas, this.globalEmitter);

    // Register scenes
    const { HeroLayer } = await import('../scenes/hero-layer');
    const { DemoLayer } = await import('../scenes/demo-layer');

    this.sceneManager.registerScenes({
      hero: HeroLayer,
      demo: DemoLayer,
    });

    this.progressController.setTargetProgress(0.8);

    // Load initial scene
    await this.sceneManager.switchToScene('hero');

    this.progressController.setTargetProgress(1);

    // Export for global access
    (window as any).sceneManager = this.sceneManager;
    (window as any).switchToScene = this.sceneManager.switchToScene.bind(this.sceneManager);
  }

  /**
   * Initialize memory monitoring
   */
  private initMemoryMonitor(): void {
    if (MemoryMonitor.isSupported()) {
      const memoryMonitor = MemoryMonitor.getInstance();
      memoryMonitor.startMonitoring(10000);

      memoryMonitor.onMemoryUpdate(info => {
        console.log(
          `Memory: ${info.usedJSHeapSize / 1024 / 1024 | 0}MB / ${info.jsHeapSizeLimit / 1024 / 1024 | 0}MB`
        );
      });

      (window as any).memoryMonitor = memoryMonitor;
    }
  }

  /**
   * Get app state
   */
  getAppState(): AppState {
    return this.appState;
  }

  /**
   * Get scene manager
   */
  getSceneManager(): SceneManager | null {
    return this.sceneManager;
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    if (this.crt) {
      this.crt.destroy?.();
      this.crt = null;
    }

    if (this.sceneManager) {
      // Dispose logic will be improved in next step
      this.sceneManager = null;
    }

    this.progressController.dispose();
  }
}
