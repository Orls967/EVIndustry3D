export interface AdaptiveDprConfig {
  minDpr: number;
  maxDpr: number;
  step: number;
  windowFrames: number;
  declineThresholdMs: number;
  inclineThresholdMs: number;
  idleGapCutoffMs: number;
  maxChanges: number;
}

export const DEFAULT_ADAPTIVE_DPR_CONFIG: AdaptiveDprConfig = {
  minDpr: 1,
  maxDpr: 2,
  step: 0.25,
  windowFrames: 24,
  declineThresholdMs: 22,
  inclineThresholdMs: 17.5,
  idleGapCutoffMs: 120,
  maxChanges: 6,
};

/**
 * Demand-aware adaptive DPR state machine.
 * Filters out idle gaps (> idleGapCutoffMs) caused by frameloop="demand" pauses so
 * resting frames never falsely trigger a resolution drop.
 */
export class AdaptiveDprController {
  private currentDpr: number;
  private maxDpr: number;
  private minDpr: number;
  private readonly cfg: AdaptiveDprConfig;
  private lastFrameMs: number | null = null;
  private sumActiveMs = 0;
  private activeCount = 0;
  private inclineStreak = 0;
  private changes = 0;

  constructor(initialMaxDpr: number, config: Partial<AdaptiveDprConfig> = {}) {
    this.cfg = { ...DEFAULT_ADAPTIVE_DPR_CONFIG, ...config };
    this.minDpr = this.cfg.minDpr;
    this.maxDpr = Math.max(this.minDpr, initialMaxDpr);
    this.currentDpr = this.maxDpr;
  }

  getDpr(): number {
    return this.currentDpr;
  }

  setTargetMaxDpr(nextMaxDpr: number): number {
    this.maxDpr = Math.max(this.minDpr, nextMaxDpr);
    this.currentDpr = Math.min(Math.max(this.currentDpr, this.minDpr), this.maxDpr);
    this.resetWindow();
    this.changes = 0;
    return this.currentDpr;
  }

  resetWindow(): void {
    this.lastFrameMs = null;
    this.sumActiveMs = 0;
    this.activeCount = 0;
    this.inclineStreak = 0;
  }

  /**
   * Records a rendered frame timestamp (ms). Returns the new DPR if it changed, else null.
   */
  recordFrame(nowMs: number): number | null {
    if (this.lastFrameMs === null) {
      this.lastFrameMs = nowMs;
      return null;
    }

    const gap = nowMs - this.lastFrameMs;
    this.lastFrameMs = nowMs;

    // Ignore idle gaps from demand rendering or negative/zero deltas
    if (gap <= 0 || gap > this.cfg.idleGapCutoffMs) {
      return null;
    }

    if (this.changes >= this.cfg.maxChanges || this.maxDpr <= this.minDpr) {
      return null;
    }

    this.sumActiveMs += gap;
    this.activeCount += 1;

    if (this.activeCount < this.cfg.windowFrames) {
      return null;
    }

    const avgMs = this.sumActiveMs / this.activeCount;
    this.sumActiveMs = 0;
    this.activeCount = 0;

    if (avgMs > this.cfg.declineThresholdMs && this.currentDpr > this.minDpr) {
      this.inclineStreak = 0;
      const next = Math.max(this.minDpr, Number((this.currentDpr - this.cfg.step).toFixed(2)));
      if (next !== this.currentDpr) {
        this.currentDpr = next;
        this.changes += 1;
        return next;
      }
    } else if (avgMs < this.cfg.inclineThresholdMs && this.currentDpr < this.maxDpr) {
      this.inclineStreak += 1;
      if (this.inclineStreak >= 2) {
        this.inclineStreak = 0;
        const next = Math.min(this.maxDpr, Number((this.currentDpr + this.cfg.step).toFixed(2)));
        if (next !== this.currentDpr) {
          this.currentDpr = next;
          this.changes += 1;
          return next;
        }
      }
    } else {
      this.inclineStreak = 0;
    }

    return null;
  }
}
