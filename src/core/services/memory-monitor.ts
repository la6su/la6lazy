/**
 * Manages memory monitoring for the application
 */
export class MemoryMonitorService {
  private monitor: any = null;

  /**
   * Initialize memory monitoring
   */
  async initialize(): Promise<void> {
    const { MemoryMonitor } = await import('../../utils/memory');
    if (MemoryMonitor.isSupported()) {
      const memoryMonitor = MemoryMonitor.getInstance();
      memoryMonitor.startMonitoring(10000);

      memoryMonitor.onMemoryUpdate((info: any) => {
        console.log(
          `Memory: ${info.usedJSHeapSize / 1024 / 1024 | 0}MB / ${info.jsHeapSizeLimit / 1024 / 1024 | 0}MB`
        );
      });

      this.monitor = memoryMonitor;

      // Export for global access
      (window as any).memoryMonitor = memoryMonitor;
    }
  }

  /**
   * Dispose memory monitor
   */
  dispose(): void {
    if (this.monitor) {
      this.monitor.stopMonitoring?.();
      this.monitor = null;
    }
  }
}
