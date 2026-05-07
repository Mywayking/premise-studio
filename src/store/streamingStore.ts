"use client";
import { create } from "zustand";
import type { StreamingState, ErrorCode } from "@/types";

interface StreamingStateStore {
  state: StreamingState; errorCode: ErrorCode | null; errorMessage: string | null;
  abortController: AbortController | null; buffer: string;
  startStreaming: () => AbortController; appendToken: (t: string) => void;
  complete: () => void; timeout: () => void;
  setError: (code: ErrorCode, msg: string) => void; abort: () => void; reset: () => void;
}

export const useStreamingStore = create<StreamingStateStore>((set, get) => ({
  state: "idle", errorCode: null, errorMessage: null, abortController: null, buffer: "",
  startStreaming: () => {
    const ctrl = new AbortController();
    set({ state: "streaming", abortController: ctrl, errorCode: null, errorMessage: null, buffer: "" });
    return ctrl;
  },
  appendToken: (t) => set((s) => ({ buffer: s.buffer + t })),
  complete: () => set({ state: "completed", abortController: null }),
  timeout: () => set({ state: "timeout", errorCode: "TIMEOUT", errorMessage: "AI 响应超时，点击重试", abortController: null }),
  setError: (code, msg) => set({ state: "error", errorCode: code, errorMessage: msg, abortController: null }),
  abort: () => { get().abortController?.abort(); set({ state: "aborted", abortController: null }); },
  reset: () => set({ state: "idle", errorCode: null, errorMessage: null, abortController: null, buffer: "" }),
}));
