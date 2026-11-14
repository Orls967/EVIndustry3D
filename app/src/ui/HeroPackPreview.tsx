import React, { Suspense, useEffect, useState } from "react";
import { PackSchematicPoster } from "./PackSchematicPoster";

const LazyHeroCanvas = React.lazy(() =>
  import("../scene/PackCanvas").then((mod) => ({ default: mod.PackCanvas }))
);

function canShowIdleLiveHero(): boolean {
  if (typeof window === "undefined") return false;
  if (window.innerWidth < 1024) return false;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return false;
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * Landing Hero visual (01 §3.5):
 * 1) Renders static rendered 3D model still first on all devices.
 * 2) On idle desktop (with WebGL & !reduced-motion), upgrades seamlessly to rotating C3 preview
 *    with a visible Pause/Static still toggle. Never loads WebGL on mobile.
 */
export function HeroPackPreview(): React.ReactElement {
  const [liveMode, setLiveMode] = useState(false);

  useEffect(() => {
    if (!canShowIdleLiveHero()) return;
    let cancelled = false;
    const activate = () => {
      if (!cancelled) setLiveMode(true);
    };
    const w = window as unknown as {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (typeof w.requestIdleCallback === "function") {
      const id = w.requestIdleCallback(activate, { timeout: 1400 });
      return () => {
        cancelled = true;
        w.cancelIdleCallback?.(id);
      };
    }
    const timer = window.setTimeout(activate, 1000);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  if (!liveMode) {
    return (
      <PackSchematicPoster
        architecture="LFP_BLADE"
        mode="exploded"
        caption="Generic LFP Blade Pack (120s1p), exploded CAD view — open Simulator for interactive 3D orbit, picking, and cutaway."
      />
    );
  }

  return (
    <figure className="panel-card" style={{ margin: 0, padding: "var(--space-3)", background: "var(--color-bg-base)" }}>
      <div style={{ height: "320px" }}>
        <Suspense
          fallback={
            <PackSchematicPoster
              architecture="LFP_BLADE"
              mode="exploded"
              caption="Loading interactive 3D preview…"
            />
          }
        >
          <LazyHeroCanvas
            architecture="LFP_BLADE"
            compactHero
            onHeroExitToStill={() => setLiveMode(false)}
          />
        </Suspense>
      </div>
      <figcaption style={{ marginTop: "var(--space-2)", fontSize: "12px", color: "var(--color-text-muted)" }}>
        Generic LFP Blade Pack (120s1p), exploded 3D preview — click Pause rotation or open Simulator for full controls.
      </figcaption>
    </figure>
  );
}

