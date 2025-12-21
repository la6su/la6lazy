import { Texture, TextureLoader, CubeTextureLoader, AudioLoader, FontLoader } from 'three';
import EventEmitter from 'wolfy87-eventemitter';

export interface AssetConfig {
  url: string;
  type: 'texture' | 'cubeTexture' | 'audio' | 'font' | 'json' | 'text';
  name: string;
  options?: any;
}

export interface Asset {
  name: string;
  url: string;
  type: string;
  data: any;
  loaded: boolean;
  error?: string;
}

export class AssetManager extends EventEmitter {
  private static instance: AssetManager;
  private cache: Map<string, Asset> = new Map();
  private loaders: Map<string, any> = new Map();
  private loadingPromises: Map<string, Promise<any>> = new Map();

  private textureLoader: TextureLoader;
  private cubeTextureLoader: CubeTextureLoader;
  private audioLoader: AudioLoader;
  private fontLoader: FontLoader;

  constructor() {
    super();

    // Initialize loaders
    this.textureLoader = new TextureLoader();
    this.cubeTextureLoader = new CubeTextureLoader();
    this.audioLoader = new AudioLoader();
    this.fontLoader = new FontLoader();
  }

  static getInstance(): AssetManager {
    if (!AssetManager.instance) {
      AssetManager.instance = new AssetManager();
    }
    return AssetManager.instance;
  }

  /**
   * Load a single asset
   */
  async loadAsset(config: AssetConfig): Promise<any> {
    const cacheKey = config.name;

    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      if (cached.loaded) {
        return cached.data;
      } else if (cached.error) {
        throw new Error(cached.error);
      }
    }

    // Check if already loading
    if (this.loadingPromises.has(cacheKey)) {
      return this.loadingPromises.get(cacheKey);
    }

    // Create loading promise
    const loadingPromise = this.performLoad(config);
    this.loadingPromises.set(cacheKey, loadingPromise);

    try {
      const result = await loadingPromise;
      this.loadingPromises.delete(cacheKey);
      return result;
    } catch (error) {
      this.loadingPromises.delete(cacheKey);
      throw error;
    }
  }

  /**
   * Load multiple assets
   */
  async loadAssets(configs: AssetConfig[]): Promise<any[]> {
    const promises = configs.map(config => this.loadAsset(config));
    return Promise.all(promises);
  }

  /**
   * Perform the actual loading
   */
  private async performLoad(config: AssetConfig): Promise<any> {
    const asset: Asset = {
      name: config.name,
      url: config.url,
      type: config.type,
      data: null,
      loaded: false,
    };

    this.cache.set(config.name, asset);

    try {
      let data: any;

      switch (config.type) {
        case 'texture':
          data = await new Promise<Texture>((resolve, reject) => {
            this.textureLoader.load(
              config.url,
              resolve,
              undefined,
              reject
            );
          });
          break;

        case 'cubeTexture':
          data = await new Promise<Texture>((resolve, reject) => {
            this.cubeTextureLoader.load(
              config.url,
              resolve,
              undefined,
              reject
            );
          });
          break;

        case 'audio':
          data = await new Promise<AudioBuffer>((resolve, reject) => {
            this.audioLoader.load(
              config.url,
              resolve,
              undefined,
              reject
            );
          });
          break;

        case 'font':
          data = await new Promise<any>((resolve, reject) => {
            this.fontLoader.load(
              config.url,
              resolve,
              undefined,
              reject
            );
          });
          break;

        case 'json':
          const response = await fetch(config.url);
          data = await response.json();
          break;

        case 'text':
          const textResponse = await fetch(config.url);
          data = await textResponse.text();
          break;

        default:
          throw new Error(`Unknown asset type: ${config.type}`);
      }

      asset.data = data;
      asset.loaded = true;

      this.emit('assetLoaded', asset);
      return data;

    } catch (error) {
      asset.error = (error as Error).message;
      this.emit('assetError', { asset, error });
      throw error;
    }
  }

  /**
   * Get cached asset
   */
  getAsset(name: string): any | null {
    const asset = this.cache.get(name);
    return asset && asset.loaded ? asset.data : null;
  }

  /**
   * Check if asset is loaded
   */
  isLoaded(name: string): boolean {
    const asset = this.cache.get(name);
    return asset ? asset.loaded : false;
  }

  /**
   * Get loading progress (0-1)
   */
  getLoadingProgress(): number {
    if (this.cache.size === 0) return 1;

    const loaded = Array.from(this.cache.values()).filter(asset => asset.loaded).length;
    return loaded / this.cache.size;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.loadingPromises.clear();
    this.emit('cacheCleared');
  }

  /**
   * Get cache info
   */
  getCacheInfo(): { total: number; loaded: number; loading: number; errors: number } {
    const assets = Array.from(this.cache.values());
    return {
      total: assets.length,
      loaded: assets.filter(a => a.loaded).length,
      loading: this.loadingPromises.size,
      errors: assets.filter(a => a.error).length,
    };
  }
