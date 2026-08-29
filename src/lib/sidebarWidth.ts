import type { SidebarMode } from "@/domain/model";

export const SIDEBAR_MIN_WIDTH = 242;
export const SIDEBAR_MAX_WIDTH = 380;

export interface SidebarSize {
  mode: SidebarMode;
  width: number;
}

export function collapseBelowFrom(logoLeft: number, logoRight: number): number {
  if (!Number.isFinite(logoLeft) || !Number.isFinite(logoRight)) return SIDEBAR_MIN_WIDTH;
  if (logoLeft < 0 || logoRight <= logoLeft) return SIDEBAR_MIN_WIDTH;
  return Math.ceil(logoRight + logoLeft);
}

export function sidebarSizeFor(proposed: number, collapseBelow: number, kept: number): SidebarSize {
  if (!Number.isFinite(proposed) || proposed < collapseBelow) return { mode: "rail", width: kept };
  return { mode: "wide", width: Math.min(SIDEBAR_MAX_WIDTH, Math.round(proposed)) };
}

export function toStoredWidth(value: number): number {
  return Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, Math.round(value)));
}
