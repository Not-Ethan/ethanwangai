"use client";

import { createContext, useContext } from "react";

interface ZoomContextValue {
  currentPage: number;
  goToPage: (page: number) => void;
}

export const ZoomContext = createContext<ZoomContextValue>({
  currentPage: 0,
  goToPage: () => {},
});

export function useZoom() {
  return useContext(ZoomContext);
}
