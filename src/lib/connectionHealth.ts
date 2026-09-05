/**
 * Global Connection Health Monitor
 * 
 * Provides centralized network, API gateway, and HMR connection tracking.
 * Gracefully traps WebSocket / network promise rejections and surfaces clear,
 * actionable user feedback in the UI instead of unhandled error dialogs.
 */

export type ConnectionStatus = 'connected' | 'checking' | 'degraded' | 'disconnected';

export interface ServerHealthInfo {
  status: string;
  timestamp: string;
  service: string;
  uptime?: number;
  version?: string;
  environment?: string;
  hmrEnabled?: boolean;
}

export interface ConnectionHealthState {
  status: ConnectionStatus;
  isOnline: boolean;
  latencyMs: number | null;
  lastChecked: Date | null;
  lastSuccess: Date | null;
  interruptionReason: string | null;
  reconnectCountdown: number | null;
  reconnectAttempts: number;
  isHmrConnected: boolean;
  serverInfo: ServerHealthInfo | null;
}

type HealthListener = (state: ConnectionHealthState) => void;

class ConnectionHealthManager {
  private state: ConnectionHealthState = {
    status: 'connected',
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    latencyMs: null,
    lastChecked: null,
    lastSuccess: null,
    interruptionReason: null,
    reconnectCountdown: null,
    reconnectAttempts: 0,
    isHmrConnected: true,
    serverInfo: null,
  };

  private listeners = new Set<HealthListener>();
  private checkIntervalTimer: any = null;
  private countdownTimer: any = null;
  private isChecking = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initGlobalHandlers();
      this.initViteHmrHandlers();
      // Run initial check after slight mount delay
      setTimeout(() => {
        this.checkHealth();
      }, 500);
      this.startPeriodicChecks();
    }
  }

  private initGlobalHandlers() {
    // 1. Browser online/offline events
    window.addEventListener('online', () => {
      this.updateState({
        isOnline: true,
        interruptionReason: null,
      });
      this.checkHealth();
    });

    window.addEventListener('offline', () => {
      this.updateState({
        isOnline: false,
        status: 'disconnected',
        interruptionReason: 'No internet connection detected on this device',
      });
      this.startCountdown(5);
    });

    // 2. Global unhandled rejection trap for real network failures
    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason;
      const message = (reason && (reason.message || String(reason))) || '';
      
      // Benign Vite dev-server WebSocket noise in container iframe environments
      const isDevWebSocketIssue = 
        message.includes('WebSocket') ||
        message.includes('closed without opened') ||
        message.includes('[vite]');

      if (isDevWebSocketIssue) {
        event.preventDefault();
        return;
      }

      const isNetworkIssue = 
        message.includes('Failed to fetch') ||
        message.includes('NetworkError') ||
        message.includes('Load failed');

      if (isNetworkIssue) {
        // Prevent default browser red screen / error overlay
        event.preventDefault();
        
        this.updateState({
          status: this.state.isOnline ? 'degraded' : 'disconnected',
          interruptionReason: 'API request timed out or network offline',
        });

        // Trigger a non-blocking recovery check if not already running
        if (!this.isChecking) {
          this.startCountdown(4);
        }
      }
    });

    // 3. Document visibility change - check health when tab becomes visible again
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.checkHealth();
      }
    });
  }

  private initViteHmrHandlers() {
    try {
      const hot = (import.meta as any).hot;
      if (hot) {
        hot.on('vite:ws:disconnect', () => {
          this.updateState({
            isHmrConnected: false,
          });
        });

        hot.on('vite:ws:connect', () => {
          this.updateState({
            isHmrConnected: true,
          });
        });

        hot.on('vite:error', () => {
          this.updateState({
            isHmrConnected: false,
          });
        });
      }
    } catch {
      // HMR not available or production environment
    }
  }

  private startPeriodicChecks() {
    if (this.checkIntervalTimer) clearInterval(this.checkIntervalTimer);
    // Periodic check every 25 seconds
    this.checkIntervalTimer = setInterval(() => {
      if (document.visibilityState === 'visible' && !this.isChecking) {
        this.checkHealth();
      }
    }, 25000);
  }

  private startCountdown(seconds: number) {
    if (this.countdownTimer) clearInterval(this.countdownTimer);
    let remaining = seconds;
    this.updateState({ reconnectCountdown: remaining });

    this.countdownTimer = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(this.countdownTimer);
        this.countdownTimer = null;
        this.updateState({ reconnectCountdown: null });
        this.checkHealth();
      } else {
        this.updateState({ reconnectCountdown: remaining });
      }
    }, 1000);
  }

  /**
   * Ping /api/health and measure round-trip latency
   */
  public async checkHealth(): Promise<boolean> {
    if (this.isChecking) return false;
    this.isChecking = true;

    if (this.state.status === 'connected') {
      this.updateState({ status: 'checking' });
    }

    const start = performance.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    try {
      const res = await fetch('/api/health?t=' + Date.now(), {
        signal: controller.signal,
        cache: 'no-store',
        headers: { 'Accept': 'application/json' }
      });

      clearTimeout(timeoutId);
      const elapsed = Math.round(performance.now() - start);

      if (res.ok) {
        let serverInfo: ServerHealthInfo | null = null;
        try {
          serverInfo = await res.json();
        } catch {
          // ignore parsing error
        }

        if (this.countdownTimer) {
          clearInterval(this.countdownTimer);
          this.countdownTimer = null;
        }

        this.updateState({
          status: 'connected',
          isOnline: true,
          latencyMs: elapsed,
          lastChecked: new Date(),
          lastSuccess: new Date(),
          interruptionReason: null,
          reconnectCountdown: null,
          reconnectAttempts: 0,
          serverInfo: serverInfo || this.state.serverInfo,
        });

        this.isChecking = false;
        return true;
      } else {
        throw new Error(`Server returned HTTP ${res.status}`);
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      const isAbort = err.name === 'AbortError';
      const reason = isAbort 
        ? 'Server request timed out (>6s)' 
        : (err.message || 'Unable to connect to server API');

      const nextAttempts = this.state.reconnectAttempts + 1;
      const nextDelay = Math.min(15, 3 + nextAttempts * 2);

      this.updateState({
        status: typeof navigator !== 'undefined' && !navigator.onLine ? 'disconnected' : 'degraded',
        isOnline: typeof navigator !== 'undefined' ? navigator.onLine : false,
        latencyMs: null,
        lastChecked: new Date(),
        interruptionReason: reason,
        reconnectAttempts: nextAttempts,
      });

      this.isChecking = false;
      this.startCountdown(nextDelay);
      return false;
    }
  }

  public subscribe(listener: HealthListener): () => void {
    this.listeners.add(listener);
    // Immediately emit current state
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getState(): ConnectionHealthState {
    return this.state;
  }

  private updateState(partial: Partial<ConnectionHealthState>) {
    this.state = { ...this.state, ...partial };
    this.listeners.forEach((listener) => {
      try {
        listener(this.state);
      } catch (err) {
        console.error('[ConnectionHealthManager] listener error:', err);
      }
    });
  }
}

// Global Singleton Instance
export const connectionHealth = new ConnectionHealthManager();
