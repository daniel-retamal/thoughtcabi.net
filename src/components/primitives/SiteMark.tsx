import { useState, type ReactNode } from "react";
import type { Note } from "@/domain/model";
import { siteIconFor } from "@/domain/notes/buildNote";
import { MarkPlate, type MarkScale } from "./MarkPlate";

export interface SiteMarkProps {
  note: Note;
  scale: MarkScale;
  frame?: string;
  fallback?: ReactNode;
}

export function SiteMark({ note, scale, frame, fallback = null }: SiteMarkProps) {
  const [failed, setFailed] = useState(false);
  const source = siteIconFor(note);

  if (!source || failed) return fallback;

  const plate = <MarkPlate src={source} scale={scale} onError={() => setFailed(true)} />;

  return frame ? <div className={frame}>{plate}</div> : plate;
}
