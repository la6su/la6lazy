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
      // Dispose Three.js resources
      this.currentScene.scene.traverse((object: any) => {
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach((material: any) => material.dispose());
          } else {
            object.material.dispose();
          }
        }
        if (object.geometry) {
          object.geometry.dispose();
        }
      });

      // Clear scene
      while (this.currentScene.scene.children.length > 0) {
        this.currentScene.scene.remove(this.currentScene.scene.children[0]);
      }

      // Remove from controller
      this.controller.removeLayer(this.currentScene.name);
      this.currentScene = null;
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
}
