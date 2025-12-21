/**
 * Application state management
 */

export enum AppPhase {
  HTML_CSS = 'html-css',
  CRT_POWER_ON = 'crt-power-on',
  IDLE = 'idle',
  SCANLINE_LOADER = 'scanline-loader',
  SCENE = 'scene',
}

export class AppState {
  private currentPhase: AppPhase = AppPhase.HTML_CSS;
  private listeners: ((phase: AppPhase) => void)[] = [];

  getCurrentPhase(): AppPhase {
    return this.currentPhase;
  }

  setPhase(phase: AppPhase): void {
    if (this.currentPhase !== phase) {
      console.log(`App phase transition: ${this.currentPhase} → ${phase}`);
      this.currentPhase = phase;
      this.listeners.forEach(listener => listener(phase));
    }
  }

  onPhaseChange(listener: (phase: AppPhase) => void): void {
    this.listeners.push(listener);
  }

  removeListener(listener: (phase: AppPhase) => void): void {
    this.listeners = this.listeners.filter(l => l !== listener);
  }
}
