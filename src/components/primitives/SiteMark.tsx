import { useState, type ReactNode } from "react";
import type { Note } from "@/domain/model";
import { siteIconFor } from "@/domain/notes/buildNote";
import { imageOutcomeOf, rememberBrokenImage } from "@/lib/imageOutcomes";
import { MarkPlate, type MarkScale } from "./MarkPlate";

export interface SiteMarkProps {
  note: Note;
  scale: MarkScale;
  frame?: string;
  fallback?: ReactNode;
}

interface SiteMarkState {
  source: string;
  broken: boolean;
}

function recall(source: string): SiteMarkState {
  return { source, broken: imageOutcomeOf(source) === "broken" };
}

export function SiteMark({ note, scale, frame, fallback = null }: SiteMarkProps) {
  const source = siteIconFor(note);
  const [state, setState] = useState<SiteMarkState>(() => recall(source));

  if (state.source !== source) {
    setState(recall(source));
    return null;
  }

  if (!source || state.broken) return fallback;

  const giveUp = (): void => {
    rememberBrokenImage(source);
    setState({ source, broken: true });
  };

  const plate = <MarkPlate src={source} scale={scale} onError={giveUp} />;

  return frame ? <div className={frame}>{plate}</div> : plate;
}
