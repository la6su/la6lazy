/**
 * Error boundary utilities for WebGL applications
 */

export interface ErrorInfo {
  message: string;
  stack?: string;
  context?: string;
  recoverable: boolean;
}

export type ErrorHandler = (error: ErrorInfo) => void;

/**
 * Global error boundary for WebGL applications
 */
export class WebGLErrorBoundary {
  private static instance: WebGLErrorBoundary;
  private handlers: ErrorHandler[] = [];
  private webGLErrors: ErrorInfo[] = [];

  static getInstance(): WebGLErrorBoundary {
    if (!WebGLErrorBoundary.instance) {
      WebGLErrorBoundary.instance = new WebGLErrorBoundary();
    }
    return WebGLErrorBoundary.instance;
  }

  /**
   * Add error handler
   */
  addHandler(handler: ErrorHandler): void {
    this.handlers.push(handler);
  }

  /**
   * Remove error handler
   */
  removeHandler(handler: ErrorHandler): void {
    this.handlers = this.handlers.filter(h => h !== handler);
  }

  /**
   * Handle error
   */
  handleError(error: Error | string, context?: string, recoverable = true): void {
    const errorInfo: ErrorInfo = {
      message: typeof error === 'string' ? error : error.message,
      stack: typeof error === 'object' ? error.stack : undefined,
      context,
      recoverable,
    };

    this.webGLErrors.push(errorInfo);

    // Log to console
    console.error(`WebGL Error${context ? ` in ${context}` : ''}:`, errorInfo.message);
    if (errorInfo.stack) {
      console.error(errorInfo.stack);
    }

    // Notify handlers
    this.handlers.forEach(handler => {
      try {
        handler(errorInfo);
      } catch (handlerError) {
        console.error('Error in error handler:', handlerError);
      }
    });

    // If not recoverable, we might want to show user-friendly message
    if (!recoverable) {
      this.showUserError(errorInfo);
    }
  }

  /**
   * Check if WebGL is supported
   */
  static isWebGLSupported(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return !!(
        window.WebGLRenderingContext &&
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
      );
    } catch (e) {
      return false;
    }
  }

  /**
   * Check if WebGL2 is supported
   */
  static isWebGL2Supported(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return !!(window.WebGL2RenderingContext && canvas.getContext('webgl2'));
    } catch (e) {
      return false;
    }
  }

  /**
   * Get WebGL context safely
   */
  static getWebGLContext(
    canvas: HTMLCanvasElement,
    options: WebGLContextAttributes = {}
  ): WebGLRenderingContext | WebGL2RenderingContext | null {
    const defaultOptions: WebGLContextAttributes = {
      alpha: false,
      antialias: true,
      depth: true,
      stencil: false,
      premultipliedAlpha: false,
      ...options,
    };

    // Try WebGL2 first
    if (WebGLErrorBoundary.isWebGL2Supported()) {
      try {
        const gl = canvas.getContext('webgl2', defaultOptions) as WebGL2RenderingContext;
        if (gl) return gl;
      } catch (e) {
        console.warn('WebGL2 context creation failed, falling back to WebGL1');
      }
    }

    // Fallback to WebGL1
    if (WebGLErrorBoundary.isWebGLSupported()) {
      try {
        const gl = canvas.getContext('webgl', defaultOptions) as WebGLRenderingContext;
        if (gl) return gl;
      } catch (e) {
        console.error('WebGL context creation failed');
      }
    }

    return null;
  }

  /**
   * Show user-friendly error message
   */
  private showUserError(error: ErrorInfo): void {
    // Create error overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.9);
      color: #ff4444;
      font-family: monospace;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      padding: 20px;
      box-sizing: border-box;
    `;

    overlay.innerHTML = `
      <h2>WebGL Error</h2>
      <p>Sorry, there was a problem with the graphics rendering.</p>
      <p><strong>Error:</strong> ${error.message}</p>
      <p>Please try refreshing the page or check your browser compatibility.</p>
      <button onclick="location.reload()" style="
        padding: 10px 20px;
        background: #ff4444;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        margin-top: 20px;
      ">Refresh Page</button>
    `;

    document.body.appendChild(overlay);
  }

  /**
   * Get recent errors
   */
  getRecentErrors(count = 10): ErrorInfo[] {
    return this.webGLErrors.slice(-count);
  }

  /**
   * Clear error history
   */
  clearErrors(): void {
    this.webGLErrors = [];
  }
}

/**
 * Safe wrapper for WebGL operations
 */
export function safeWebGLOperation<T>(
  operation: () => T,
  context: string,
  fallback?: T
): T | undefined {
  try {
    return operation();
  } catch (error) {
    WebGLErrorBoundary.getInstance().handleError(
      error as Error,
      context,
      false
    );
    return fallback;
  }
}

/**
 * Async safe wrapper for WebGL operations
 */
export async function safeAsyncWebGLOperation<T>(
  operation: () => Promise<T>,
  context: string,
  fallback?: T
): Promise<T | undefined> {
  try {
    return await operation();
  } catch (error) {
    WebGLErrorBoundary.getInstance().handleError(
      error as Error,
      context,
      false
    );
    return fallback;
  }
}
