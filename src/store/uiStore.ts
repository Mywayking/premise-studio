"use client";
import { create } from "zustand";

interface UIState {
  leftPanelOpen: boolean; rightPanelOpen: boolean;
  isMobile: boolean; isTablet: boolean;
  leftDrawerOpen: boolean; rightDrawerOpen: boolean;
  annotationMode: boolean;
  toggleLeftPanel: () => void; toggleRightPanel: () => void;
  setBreakpoint: (m: boolean, t: boolean) => void;
  toggleLeftDrawer: () => void; toggleRightDrawer: () => void;
  setAnnotationMode: (m: boolean) => void; closeAllDrawers: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  leftPanelOpen: true, rightPanelOpen: true, isMobile: false, isTablet: false,
  leftDrawerOpen: false, rightDrawerOpen: false, annotationMode: false,
  toggleLeftPanel: () => set((s) => ({ leftPanelOpen: !s.leftPanelOpen })),
  toggleRightPanel: () => set((s) => ({ rightPanelOpen: !s.rightPanelOpen })),
  setBreakpoint: (m, t) => set({ isMobile: m, isTablet: t }),
  toggleLeftDrawer: () => set((s) => ({ leftDrawerOpen: !s.leftDrawerOpen, rightDrawerOpen: false })),
  toggleRightDrawer: () => set((s) => ({ rightDrawerOpen: !s.rightDrawerOpen, leftDrawerOpen: false })),
  setAnnotationMode: (m) => set({ annotationMode: m }),
  closeAllDrawers: () => set({ leftDrawerOpen: false, rightDrawerOpen: false }),
}));
