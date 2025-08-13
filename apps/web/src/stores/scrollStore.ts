import { create } from 'zustand';

interface ScrollPosition {
  [path: string]: number;
}

interface ScrollState {
  positions: ScrollPosition;
  savePosition: (_path: string, _position: number) => void;
  getPosition: (_path: string) => number;
  clearPosition: (_path: string) => void;
  clearAllPositions: () => void;
}

export const useScrollStore = create<ScrollState>((set, get) => ({
  positions: {},

  savePosition: (path: string, position: number) => {
    set(state => ({
      positions: {
        ...state.positions,
        [path]: position,
      },
    }));
  },

  getPosition: (path: string) => {
    return get().positions[path] || 0;
  },

  clearPosition: (path: string) => {
    set(state => {
      const newPositions = { ...state.positions };
      delete newPositions[path];
      return { positions: newPositions };
    });
  },

  clearAllPositions: () => {
    set({ positions: {} });
  },
}));
