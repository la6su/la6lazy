import { Controller } from 'ore-three';
import EventEmitter from 'wolfy87-eventemitter';

export interface SceneConfig {
  name: string;
  layerClass: new (param: any) => any;
}

/**
 * Simplified scene manager using ore-three Controller directly
 */
export class SceneManager {
  private controller: Controller;
  private canvas: HTMLCanvasElement;
  private emitter: EventEmitter;
  private sceneClasses: Record<string, any> = {};
  private currentScene: any = null;

  constructor(
    controller: Controller,
    canvas: HTMLCanvasElement,
    emitter: EventEmitter
  ) {
    this.controller = controller;
    this.canvas = canvas;
    this.emitter = emitter;
  }

  /**
   * Register scene classes
   */
  registerScenes(scenes: Record<string, any>): void {
    this.sceneClasses = { ...this.sceneClasses, ...scenes };
  }

  /**
   * Switch to scene by name
   */
  async switchToScene(sceneName: string): Promise<void> {
    // Clean up current scene
    if (this.currentScene) {
      await this.disposeCurrentScene();
    }

    // Create new scene
    const SceneClass = this.sceneClasses[sceneName];
    if (SceneClass) {
      this.currentScene = new SceneClass({
        name: sceneName,
        canvas: this.canvas,
      });

      this.controller.addLayer(this.currentScene);
      this.emitter.emit('sceneChanged', {
        sceneName,
        layer: this.currentScene,
      });
      console.log(`Switched to scene: ${sceneName}`);
    }
  }

  /**
   * Get current scene name
   */
  getCurrentSceneName(): string | null {
    return this.currentScene?.name || null;
  }

  /**
   * Get available scene names
   */
  getAvailableScenes(): string[] {
    return Object.keys(this.sceneClasses);
  }

  /**
   * Dispose current scene resources properly
   */
  private async disposeCurrentScene(): Promise<void> {
    if (!this.currentScene) return;

    try {
      // Stop animations and rendering
      if (this.currentScene.renderer) {
        this.currentScene.renderer.clear();
      }

      // Dispose Three.js resources recursively
      this.disposeThreeJSObject(this.currentScene.scene);

      // Clear scene children
      while (this.currentScene.scene.children.length > 0) {
        this.currentScene.scene.remove(this.currentScene.scene.children[0]);
      }

      // Remove from controller
      this.controller.removeLayer(this.currentScene.name);

      // Clear references
      this.currentScene = null;

      console.log('Current scene disposed successfully');
    } catch (error) {
      console.error('Error disposing current scene:', error);
      // Force cleanup even if dispose fails
      this.currentScene = null;
    }
  }

  /**
   * Recursively dispose Three.js objects and their resources
   */
  private disposeThreeJSObject(object: any): void {
    if (!object) return;

    // Dispose geometry
    if (object.geometry) {
      object.geometry.dispose();
    }

    // Dispose materials (handle both single and array)
    if (object.material) {
      if (Array.isArray(object.material)) {
        object.material.forEach((material: any) => {
          this.disposeMaterial(material);
        });
      } else {
        this.disposeMaterial(object.material);
      }
    }

    // Dispose textures (if any direct texture references)
    if (object.texture) {
      object.texture.dispose();
    }

    // Recursively dispose children
    if (object.children) {
      for (let i = object.children.length - 1; i >= 0; i--) {
        const child = object.children[i];
        this.disposeThreeJSObject(child);
        object.remove(child);
      }
    }

    // Dispose specific object types
    if (object.dispose && typeof object.dispose === 'function') {
      object.dispose();
    }
  }

  /**
   * Dispose material and its textures
   */
  private disposeMaterial(material: any): void {
    if (!material) return;

    // Dispose textures
    if (material.map) material.map.dispose();
    if (material.normalMap) material.normalMap.dispose();
    if (material.roughnessMap) material.roughnessMap.dispose();
    if (material.metalnessMap) material.metalnessMap.dispose();
    if (material.emissiveMap) material.emissiveMap.dispose();
    if (material.aoMap) material.aoMap.dispose();
    if (material.alphaMap) material.alphaMap.dispose();
    if (material.bumpMap) material.bumpMap.dispose();
    if (material.displacementMap) material.displacementMap.dispose();
    if (material.envMap) material.envMap.dispose();

    // Dispose material itself
    material.dispose();
  }

  /**
   * Dispose all resources
   */
  dispose(): void {
    if (this.currentScene) {
      this.disposeCurrentScene();
    }

    // Clear scene classes registry
    this.sceneClasses = {};

    console.log('SceneManager disposed');
  }
}
