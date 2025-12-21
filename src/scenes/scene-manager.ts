import { Controller, BaseLayer } from 'ore-three';
import { globalEmitter } from '../main';

export interface SceneConfig {
  name: string;
  layerClass: new (param: any) => BaseLayer;
  assets?: string[];
  priority?: number;
}



export class SceneManager {
  private controller: Controller;
  private currentScenes: Map<string, BaseLayer> = new Map();
  private availableScenes: Map<string, SceneConfig> = new Map();
  private canvas: HTMLCanvasElement;

  constructor(controller: Controller, canvas: HTMLCanvasElement) {
    this.controller = controller;
    this.canvas = canvas;

    // Listen for scene change events
    globalEmitter.on('changeScene', this.handleSceneChange.bind(this));
  }

  /**
   * Register a scene configuration
   */
  registerScene(config: SceneConfig): void {
    this.availableScenes.set(config.name, config);
    console.log(`Scene registered: ${config.name}`);
  }

  /**
   * Load and activate a scene
   */
  async loadScene(sceneName: string): Promise<void> {
    const config = this.availableScenes.get(sceneName);
    if (!config) {
      throw new Error(`Scene '${sceneName}' not registered`);
    }

    try {
      // Load scene assets if specified
      if (config.assets && config.assets.length > 0) {
        await this.loadSceneAssets(config.assets);
      }

      // Create and add layer
      const layer = new config.layerClass({
        name: config.name,
        canvas: this.canvas,
      });

      this.controller.addLayer(layer);
      this.currentScenes.set(sceneName, layer);

      console.log(`Scene loaded: ${sceneName}`);

      // Emit scene loaded event
      globalEmitter.emit('sceneLoaded', { sceneName, layer });

    } catch (error) {
      console.error(`Failed to load scene '${sceneName}':`, error);
      throw error;
    }
  }

  /**
   * Unload a scene
   */
  unloadScene(sceneName: string): void {
    const layer = this.currentScenes.get(sceneName);
    if (layer) {
      this.controller.removeLayer(sceneName); // Try removing by name first
      this.currentScenes.delete(sceneName);
      console.log(`Scene unloaded: ${sceneName}`);

      // Emit scene unloaded event
      globalEmitter.emit('sceneUnloaded', { sceneName });
    }
  }

  /**
   * Switch to a different scene
   */
  async switchScene(newSceneName: string): Promise<void> {
    // Unload all current scenes
    for (const sceneName of this.currentScenes.keys()) {
      this.unloadScene(sceneName);
    }

    // Load new scene
    await this.loadScene(newSceneName);
  }

  /**
   * Get current active scenes
   */
  getCurrentScenes(): string[] {
    return Array.from(this.currentScenes.keys());
  }

  /**
   * Get available scenes
   */
  getAvailableScenes(): string[] {
    return Array.from(this.availableScenes.keys());
  }

  /**
   * Check if scene is loaded
   */
  isSceneLoaded(sceneName: string): boolean {
    return this.currentScenes.has(sceneName);
  }

  /**
   * Load assets for a scene
   */
  private async loadSceneAssets(assetUrls: string[]): Promise<void> {
    // This will be enhanced with AssetManager integration
    const promises = assetUrls.map(url => {
      if (url.endsWith('.js') || url.endsWith('.ts')) {
        return import(/* @vite-ignore */ url);
      } else {
        // For other assets, we'll implement proper loading later
        return Promise.resolve();
      }
    });

    await Promise.all(promises);
  }

  /**
   * Handle scene change events
   */
  private handleSceneChange(data: { sceneName: string }): void {
    this.switchScene(data.sceneName).catch(error => {
      console.error('Failed to switch scene:', error);
    });
  }

  /**
   * Cleanup all scenes
   */
  destroy(): void {
    for (const sceneName of this.currentScenes.keys()) {
      this.unloadScene(sceneName);
    }
    globalEmitter.removeListener('changeScene', this.handleSceneChange.bind(this));
  }
}
