/**
 * Time sync store for linked zoom/pan across multiple charts
 */

import { create } from 'zustand';

interface TimeRange {
  from: number;
  to: number;
}

interface TimeSyncState {
  linked: boolean;
  range: TimeRange | null;
  setLinked: (linked: boolean) => void;
  setRange: (range: TimeRange | null) => void;
}

export const useTimeSync = create<TimeSyncState>((set) => ({
  linked: false,
  range: null,
  setLinked: (linked) => set({ linked }),
  setRange: (range) => set({ range }),
}));
