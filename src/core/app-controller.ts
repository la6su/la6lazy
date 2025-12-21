import EventEmitter from 'wolfy87-eventemitter';
import { createCRTLoader } from '../preloader/crt-bootstrap';
import { createUnlocker } from '../ui/unlocker';
import { DOMUtils } from '../utils/dom';
import { MemoryMonitor } from '../utils/memory';
import { WebGLErrorBoundary } from '../utils/error-boundary';
import { AppState, AppPhase } from './app-state';
import { ProgressController } from './progress-controller';


/**
 * Main application controller managing the entire lifecycle
 */
export class AppController {
  private appState: AppState;
  private progressController: ProgressController;
  private controller: any = null; // ore-three Controller
  private sceneClasses: Record<string, any> = {};
  private currentSceneName: string | null = null;
  private crt: Awaited<ReturnType<typeof createCRTLoader>> | null = null;
  private globalEmitter: EventEmitter;

  // DOM elements
  private mainCanvas!: HTMLCanvasElement;
  private crtCanvas!: HTMLCanvasElement;
  private unlockerEl!: HTMLElement;

  // State
  private loadingStarted = false;

  constructor(globalEmitter: EventEmitter) {
    this.globalEmitter = globalEmitter;
    this.appState = new AppState();
    this.progressController = new ProgressController();

    // Initialize error boundary
    const errorBoundary = WebGLErrorBoundary.getInstance();
    errorBoundary.addHandler((error) => {
      console.error('Application error:', error);
      this.handleCriticalError(error);
    });

    // Check WebGL support early
    if (!WebGLErrorBoundary.isWebGLSupported()) {
      errorBoundary.handleError(
        'WebGL is not supported in this browser',
        'WebGL Support Check',
        false
      );
      return;
    }

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
    (window as any).appController = this;
  }

  /**
   * Initialize the application
   */
  async initialize(): Promise<void> {
    try {
      // Hide initial loader (теперь шейдеры загружены)
      import('../preloader/preloader').then(({ hideLoader }) => hideLoader());

      // Initialize CRT and play power-on animation
      await this.initCRT();
      await this.playCRTPowerOn();

      // Now show unlocker
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
   * Heavy initialization (scene loading) - called after unlock
   */
  private async initializeHeavy(): Promise<void> {
    try {
      // Preload preloader wrapper if needed (шейдеры уже загружены)
      await import('../preloader/preloader');
    } catch (error) {
      console.error('Failed to initialize heavy app:', error);
      throw error;
    }
  }

  /**
   * Initialize unlocker component
   */
  private initUnlocker(): void {
    createUnlocker(this.unlockerEl, {
      onStart: async () => {
        if (this.loadingStarted) return;
        this.loadingStarted = true;

        // Start scene loading preparation
        await this.initializeHeavy();

        // Now start scene loading
        this.appState.setPhase(AppPhase.SCANLINE_LOADER);
        if (this.crt) this.crt.setMode('scanline');
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
   * Load module with progress tracking
   */
  private async loadWithProgress(modulePath: string, targetProgress: number): Promise<any> {
    const module = await import(modulePath);
    this.progressController.setTargetProgress(targetProgress);
    return module;
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
   * Switch to scene by name
   */
  async switchToScene(sceneName: string): Promise<void> {
    if (!this.controller) return;

    // Check if scene class is loaded, load lazily if needed
    if (!this.sceneClasses[sceneName]) {
      if (sceneName === 'demo') {
        // Lazy load demo scene
        const demoModule = await import('../scenes/demo-layer');
        this.sceneClasses[sceneName] = demoModule.DemoLayer;
      } else {
        console.warn(`Unknown scene: ${sceneName}`);
        return;
      }
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
   * Get current scene name
   */
  getCurrentSceneName(): string | null {
    return this.currentSceneName;
  }

  /**
   * Get app state
   */
  getAppState(): AppState {
    return this.appState;
  }

  /**
   * Test fallback UI (temporary method for testing)
   */
  testFallbackUI(): void {
    this.showFallbackUI({ message: 'Test WebGL error for UI testing' });
  }

  /**
   * Handle critical application errors
   */
  private handleCriticalError(error: any): void {
    // Set error state
    this.appState.setPhase(AppPhase.HTML_CSS); // Fallback to basic state

    // Hide loading elements
    if (this.crtCanvas) {
      this.crtCanvas.style.display = 'none';
    }
    if (this.unlockerEl) {
      this.unlockerEl.style.display = 'none';
    }

    // Show fallback content or error message
    this.showFallbackUI(error);
  }

  /**
   * Show fallback UI when WebGL fails
   */
  private showFallbackUI(error: any): void {
    const fallback = document.createElement('div');
    fallback.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: #000;
      color: #0f0;
      font-family: monospace;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      z-index: 1000;
      padding: 20px;
      box-sizing: border-box;
      text-align: center;
    `;

    fallback.innerHTML = `
      <h1>NOT SUPPORTED</h1>
      <p>WebGL initialization failed.</p>
      <p>Error: ${error.message || 'Unknown error'}</p>
      <p>Please check your browser compatibility or try refreshing the page.</p>
      <button onclick="location.reload()" style="
        padding: 10px 20px;
        background: #0f0;
        color: #000;
        border: none;
        border-radius: 0;
        cursor: pointer;
        margin-top: 20px;
        font-family: monospace;
      ">Retry</button>
    `;

    document.body.appendChild(fallback);
  }

  /**
   * Dispose resources
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

    this.progressController.dispose();
  }
}
