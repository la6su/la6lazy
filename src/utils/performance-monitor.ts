import EventEmitter from 'wolfy87-eventemitter';

/**
 * Performance monitoring utilities
 */
export interface PerformanceMetrics {
  fps: number;
  frameTime: number; // ms
  memoryUsage?: {
    used: number;
    total: number;
    limit: number;
  };
  loadingTime?: number;
}

/**
 * FPS and performance monitor
 */
export class PerformanceMonitor extends EventEmitter {
  private static instance: PerformanceMonitor;
  private rafId: number | null = null;
  private lastTime = 0;
  private frameCount = 0;
  private fps = 0;
  private frameTime = 0;
  private isMonitoring = false;
  private metrics: PerformanceMetrics = {
    fps: 0,
    frameTime: 0,
  };

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Start performance monitoring
   */
  startMonitoring(updateInterval = 1000): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.lastTime = performance.now();

    const updateMetrics = () => {
      const now = performance.now();
      const deltaTime = now - this.lastTime;

      if (deltaTime >= updateInterval) {
        this.fps = Math.round((this.frameCount * 1000) / deltaTime);
        this.frameTime = deltaTime / this.frameCount;

        this.updateMetrics();
        this.emit('metricsUpdate', this.metrics);

        // Reset counters
        this.frameCount = 0;
        this.lastTime = now;
      }

      if (this.isMonitoring) {
        this.rafId = requestAnimationFrame(updateMetrics);
      }
    };

    // Count frames
    const countFrame = () => {
      this.frameCount++;
      if (this.isMonitoring) {
        this.rafId = requestAnimationFrame(countFrame);
      }
    };

    countFrame();
    updateMetrics();
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    this.isMonitoring = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  /**
   * Update current metrics
   */
  private updateMetrics(): void {
    this.metrics.fps = this.fps;
    this.metrics.frameTime = this.frameTime;

    // Memory info (if available)
    if ('memory' in performance) {
      const mem = (performance as any).memory;
      this.metrics.memoryUsage = {
        used: mem.usedJSHeapSize,
        total: mem.totalJSHeapSize,
        limit: mem.jsHeapSizeLimit,
      };
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Measure loading time
   */
  startLoadingTimer(): () => number {
    const startTime = performance.now();
    return () => performance.now() - startTime;
  }

  /**
   * Check if WebGL context is performant
   */
  static isWebGLPerformant(canvas: HTMLCanvasElement): boolean {
    try {
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) return false;

      // Check for basic WebGL features
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      if (!ext) return false;

      // Check renderer
      const renderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
      const vendor = gl.getParameter(ext.UNMASKED_VENDOR_WEBGL);

      // Basic checks for known performant renderers
      const performantVendors = ['nvidia', 'amd', 'intel'];
      const performantRenderers = ['geforce', 'radeon', 'intel'];

      const vendorLower = vendor.toLowerCase();
      const rendererLower = renderer.toLowerCase();

      return performantVendors.some(v => vendorLower.includes(v)) ||
             performantRenderers.some(r => rendererLower.includes(r));
    } catch (e) {
      return false;
    }
  }
}

/**
 * Performance utilities
 */
export const performanceUtils = {
  /**
   * Measure function execution time
   */
  measureExecutionTime<T>(fn: () => T, label?: string): T {
    const start = performance.now();
    const result = fn();
    const end = performance.now();

    const duration = end - start;
    if (label) {
      console.log(`${label} took ${duration.toFixed(2)}ms`);
    }

    return result;
  },

  /**
   * Async measure function execution time
   */
  async measureAsyncExecutionTime<T>(fn: () => Promise<T>, label?: string): Promise<T> {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();

    const duration = end - start;
    if (label) {
      console.log(`${label} took ${duration.toFixed(2)}ms`);
    }

    return result;
  },

  /**
   * Create performance marker
   */
  mark(label: string): void {
    if ('mark' in performance) {
      performance.mark(label);
    }
  },

  /**
   * Measure between marks
   */
  measure(startMark: string, endMark: string, label?: string): void {
    if ('measure' in performance) {
      try {
        performance.measure(label || `${startMark}-to-${endMark}`, startMark, endMark);
      } catch (e) {
        console.warn('Performance measure failed:', e);
      }
    }
  },
};
