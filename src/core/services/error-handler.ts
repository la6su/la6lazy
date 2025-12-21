import { AppState, AppPhase } from '../app-state';

export interface ErrorHandlerOptions {
  appState: AppState;
  crtCanvas: HTMLCanvasElement;
  unlockerEl: HTMLElement;
}

/**
 * Handles application errors and provides fallback UI
 */
export class ErrorHandler {
  private appState: AppState;
  private crtCanvas: HTMLCanvasElement;
  private unlockerEl: HTMLElement;

  constructor(options: ErrorHandlerOptions) {
    this.appState = options.appState;
    this.crtCanvas = options.crtCanvas;
    this.unlockerEl = options.unlockerEl;
  }

  /**
   * Handle critical application errors
   */
  handleCriticalError(error: any): void {
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
  showFallbackUI(error: any): void {
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
   * Test fallback UI (temporary method for testing)
   */
  testFallbackUI(): void {
    this.showFallbackUI({ message: 'Test WebGL error for UI testing' });
  }
}
