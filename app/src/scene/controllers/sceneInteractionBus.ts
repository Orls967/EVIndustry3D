import type { SharedCameraPose } from "../components/CameraAndClipControllers";

export type HoverListener = (hoveredId: string | null) => void;

export interface HoverBus {
  getCurrent: () => string | null;
  setHovered: (id: string | null) => void;
  subscribe: (listener: HoverListener) => () => void;
}

export function createHoverBus(onChange?: HoverListener): HoverBus {
  let current: string | null = null;
  const listeners = new Set<HoverListener>();

  return {
    getCurrent: () => current,
    setHovered: (id: string | null) => {
      if (current === id) return;
      current = id;
      onChange?.(id);
      for (const fn of listeners) {
        fn(id);
      }
    },
    subscribe: (listener: HoverListener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export type CameraPoseListener = (pose: SharedCameraPose) => void;

export interface CameraSyncBus {
  broadcast: (pose: SharedCameraPose) => void;
  subscribe: (listener: CameraPoseListener) => () => void;
}

export function createCameraSyncBus(): CameraSyncBus {
  const listeners = new Set<CameraPoseListener>();
  return {
    broadcast: (pose: SharedCameraPose) => {
      for (const fn of listeners) {
        fn(pose);
      }
    },
    subscribe: (listener: CameraPoseListener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
