/**
 * Memory monitoring utilities for WebGL applications
 */

interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

export class MemoryMonitor {
  private static instance: MemoryMonitor;
  private monitoring = false;
  private intervalId: number | null = null;
  private listeners: ((info: MemoryInfo) => void)[] = [];

  static getInstance(): MemoryMonitor {
    if (!MemoryMonitor.instance) {
      MemoryMonitor.instance = new MemoryMonitor();
    }
    return MemoryMonitor.instance;
  }

  /**
   * Check if memory monitoring is supported
   */
  static isSupported(): boolean {
    return 'memory' in performance;
  }

  /**
   * Get current memory information
   */
  getMemoryInfo(): MemoryInfo | null {
    if (!MemoryMonitor.isSupported()) return null;

    const mem = (performance as any).memory;
    return {
      usedJSHeapSize: mem.usedJSHeapSize,
      totalJSHeapSize: mem.totalJSHeapSize,
      jsHeapSizeLimit: mem.jsHeapSizeLimit,
    };
  }

  /**
   * Start memory monitoring
   */
  startMonitoring(intervalMs = 5000): void {
    if (this.monitoring || !MemoryMonitor.isSupported()) return;

    this.monitoring = true;
    this.intervalId = window.setInterval(() => {
      const info = this.getMemoryInfo();
      if (info) {
        this.listeners.forEach(listener => listener(info));

        // Log warning if memory usage is high (>80%)
        const usageRatio = info.usedJSHeapSize / info.jsHeapSizeLimit;
        if (usageRatio > 0.8) {
          console.warn(`High memory usage: ${(usageRatio * 100).toFixed(1)}%`);
        }
      }
    }, intervalMs);
  }

  /**
   * Stop memory monitoring
   */
  stopMonitoring(): void {
    if (!this.monitoring) return;

    this.monitoring = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Add memory info listener
   */
  onMemoryUpdate(listener: (info: MemoryInfo) => void): void {
    this.listeners.push(listener);
  }

  /**
   * Remove memory info listener
   */
  removeListener(listener: (info: MemoryInfo) => void): void {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  /**
   * Force garbage collection (if available)
   */
  forceGC(): void {
    if ('gc' in window) {
      (window as any).gc();
    }
  }

  /**
   * Get memory usage as percentage
   */
  getMemoryUsagePercent(): number | null {
    const info = this.getMemoryInfo();
    if (!info) return null;

    return (info.usedJSHeapSize / info.jsHeapSizeLimit) * 100;
  }
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * WebGL memory management utilities
 */
export class WebGLMemoryManager {
  private gl: WebGLRenderingContext | WebGL2RenderingContext;
  private textures: Set<WebGLTexture> = new Set();
  private buffers: Set<WebGLBuffer> = new Set();
  private framebuffers: Set<WebGLFramebuffer> = new Set();
  private renderbuffers: Set<WebGLRenderbuffer> = new Set();
  private programs: Set<WebGLProgram> = new Set();

  constructor(gl: WebGLRenderingContext | WebGL2RenderingContext) {
    this.gl = gl;
  }

  /**
   * Track a texture for cleanup
   */
  trackTexture(texture: WebGLTexture): void {
    if (texture) this.textures.add(texture);
  }

  /**
   * Track a buffer for cleanup
   */
  trackBuffer(buffer: WebGLBuffer): void {
    if (buffer) this.buffers.add(buffer);
  }

  /**
   * Track a framebuffer for cleanup
   */
  trackFramebuffer(fbo: WebGLFramebuffer): void {
    if (fbo) this.framebuffers.add(fbo);
  }

  /**
   * Track a renderbuffer for cleanup
   */
  trackRenderbuffer(rbo: WebGLRenderbuffer): void {
    if (rbo) this.renderbuffers.add(rbo);
  }

  /**
   * Track a program for cleanup
   */
  trackProgram(program: WebGLProgram): void {
    if (program) this.programs.add(program);
  }

  /**
   * Clean up all tracked resources
   */
  cleanup(): void {
    // Delete textures
    this.textures.forEach(texture => {
      this.gl.deleteTexture(texture);
    });
    this.textures.clear();

    // Delete buffers
    this.buffers.forEach(buffer => {
      this.gl.deleteBuffer(buffer);
    });
    this.buffers.clear();

    // Delete framebuffers
    this.framebuffers.forEach(fbo => {
      this.gl.deleteFramebuffer(fbo);
    });
    this.framebuffers.clear();

    // Delete renderbuffers
    this.renderbuffers.forEach(rbo => {
      this.gl.deleteRenderbuffer(rbo);
    });
    this.renderbuffers.clear();

    // Delete programs
    this.programs.forEach(program => {
      this.gl.deleteProgram(program);
    });
    this.programs.clear();
  }

  /**
   * Get memory usage info (approximate)
   */
  getMemoryInfo(): {
    textures: number;
    buffers: number;
    framebuffers: number;
    programs: number;
  } {
    return {
      textures: this.textures.size,
      buffers: this.buffers.size,
      framebuffers: this.framebuffers.size,
      programs: this.programs.size,
    };
  }
}
