import EventEmitter from 'wolfy87-eventemitter';
import { AppState, AppPhase } from '../app-state';
import { ProgressController } from '../progress-controller';
import { ErrorHandler } from '../services/error-handler';
import { MemoryMonitorService } from '../services/memory-monitor';
import type { Controller } from 'ore-three';

/**
 * Scene registry for dynamic loading
 */
const SCENE_REGISTRY: Record<string, { path: string; className: string }> = {
  hero: { path: '../../scenes/hero-layer', className: 'HeroLayer' },
  demo: { path: '../../scenes/demo-layer', className: 'DemoLayer' },
};

/**
 * Configuration interfaces for better organization
 */
export interface EventsConfig {
  globalEmitter: EventEmitter;
}

export interface StateConfig {
  appState: AppState;
  progressController: ProgressController;
}

export interface UIConfig {
  mainCanvas: HTMLCanvasElement;
  crtCanvas: HTMLCanvasElement;
  unlockerEl: HTMLElement;
}

export interface LifecycleManagerConfig {
  events: EventsConfig;
  state: StateConfig;
  ui: UIConfig;
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

  private crt: {
    setMode: (mode: string) => void;
    setScanlinePhase: (phase: number) => void;
    finish: () => void;
    destroy?: () => void;
  } | null = null;

  private controller: Controller | null = null;
  private sceneClasses: Record<string, new (param: any) => any> = {};
  private layerCache: Map<string, any> = new Map();
  private currentSceneName: string | null = null;
  private errorHandler: ErrorHandler;
  private memoryMonitor: MemoryMonitorService;
  private loadingStarted = false;

  constructor(config: LifecycleManagerConfig) {
    // Extract configuration groups
    const { events, state, ui } = config;

    this.globalEmitter = events.globalEmitter;
    this.appState = state.appState;
    this.progressController = state.progressController;
    this.mainCanvas = ui.mainCanvas;
    this.crtCanvas = ui.crtCanvas;
    this.unlockerEl = ui.unlockerEl;

    // Initialize services
    this.errorHandler = new ErrorHandler({
      appState: this.appState,
      crtCanvas: this.crtCanvas,
      unlockerEl: this.unlockerEl,
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
    // Create ore-three controller
    const { Controller } = await import('ore-three');
    this.controller = new Controller({ pointerEventElement: this.mainCanvas });
    this.progressController.setTargetProgress(0.3);

    // Load scene modules
    await this.loadSceneModules(['hero']);

    // Initialize initial scene
    await this.createAndInitializeScene('hero');

    // Finalize
    this.progressController.setTargetProgress(1);
    (window as any).controller = this.controller;
    (window as any).switchToScene = this.switchToScene.bind(this);
  }

  /**
   * Load scene modules
   */
  private async loadSceneModules(sceneNames: string[]): Promise<void> {
    const totalScenes = sceneNames.length;

    for (let i = 0; i < totalScenes; i++) {
      const sceneName = sceneNames[i];
      const sceneConfig = SCENE_REGISTRY[sceneName];

      if (!sceneConfig) {
        throw new Error(`Unknown scene: ${sceneName}`);
      }

      const module = await import(sceneConfig.path);
      this.sceneClasses[sceneName] = module[sceneConfig.className];

      // Update progress incrementally
      this.progressController.setTargetProgress(
        0.3 + (0.4 * (i + 1)) / totalScenes
      );
    }
  }

  /**
   * Create and initialize scene
   */
  private async createAndInitializeScene(sceneName: string): Promise<any> {
    // Check cache first
    if (this.layerCache.has(sceneName)) {
      const cachedScene = this.layerCache.get(sceneName);
      this.controller!.addLayer(cachedScene);
      return cachedScene;
    }

    const SceneClass = this.sceneClasses[sceneName];
    if (!SceneClass) {
      throw new Error(`Scene class not found: ${sceneName}`);
    }

    const scene = new SceneClass({ name: sceneName, canvas: this.mainCanvas });
    this.layerCache.set(sceneName, scene);
    this.controller!.addLayer(scene);
    return scene;
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

    // Check if scene class exists
    if (!this.sceneClasses[sceneName]) {
      console.warn(`Unknown scene: ${sceneName}`);
      return;
    }

    // Clean up current scene
    if (this.currentSceneName) {
      this.controller.removeLayer(this.currentSceneName);
    }

    // Create and initialize new scene
    const scene = await this.createAndInitializeScene(sceneName);

    this.currentSceneName = sceneName;
    this.globalEmitter.emit('sceneChanged', { sceneName, layer: scene });
    console.log(`Switched to scene: ${sceneName}`);
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
