/**
 * Progress controller for smooth loading animations
 */

export class ProgressController {
  private visualProgress = 0;
  private targetProgress = 0;
  private rafId: number | null = null;
  private onProgressUpdate?: (progress: number) => void;

  setProgressUpdateCallback(callback: (progress: number) => void): void {
    this.onProgressUpdate = callback;
  }

  /**
   * Set target progress (0-1)
   */
  setTargetProgress(value: number): void {
    this.targetProgress = Math.min(1, Math.max(0, value));
    this.startProgressSmoothing();
  }

  /**
   * Get current visual progress
   */
  getCurrentProgress(): number {
    return this.visualProgress;
  }

  /**
   * Force set progress immediately (no smoothing)
   */
  setProgressImmediate(value: number): void {
    this.visualProgress = this.targetProgress = Math.min(1, Math.max(0, value));
    if (this.onProgressUpdate) {
      this.onProgressUpdate(this.visualProgress);
    }
  }

  /**
   * Start smooth progress interpolation
   */
  private startProgressSmoothing(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
    }

    const tick = () => {
      this.visualProgress += (this.targetProgress - this.visualProgress) * 0.18;

      if (this.onProgressUpdate) {
        this.onProgressUpdate(this.visualProgress);
      }

      if (Math.abs(this.targetProgress - this.visualProgress) > 0.002) {
        this.rafId = requestAnimationFrame(tick);
      } else {
        this.visualProgress = this.targetProgress;
        if (this.onProgressUpdate) {
          this.onProgressUpdate(this.visualProgress);
        }
        this.rafId = null;
      }
    };

    this.rafId = requestAnimationFrame(tick);
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}
