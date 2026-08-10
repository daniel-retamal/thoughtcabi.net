import type { ReactNode } from "react";
import type { BrowseMode } from "@/state/useLibraryView";
import type { PrimerFact } from "@/components/feedback/EmptyPrimer";

export type EmptyStateCopy =
  | { kind: "plate"; title: string; text: string; primer: readonly PrimerFact[] | null }
  | { kind: "quiet"; title: string; text: ReactNode; clearable: boolean };

export interface EmptyStateContext {
  mode: BrowseMode;
  query: string;
  activeTag: string | null;
  channelName: string;
  inFolder: boolean;
  cabinetEmpty: boolean;
  onboarded: boolean;
}

function primerFacts(channelName: string): PrimerFact[] {
  return [
    { term: "Channels", text: `Shelves in the sidebar. Rename ${channelName} whenever you like.` },
    { term: "Folders", text: "Live inside a channel, made where you are standing." },
    { term: "Tags", text: "One color each, cutting across every channel." },
  ];
}

function firstLoad(channelName: string): EmptyStateCopy {
  return {
    kind: "plate",
    title: "Your cabinet is empty.",
    text: "Copy a link, then paste it anywhere on this page. It arrives as a card with the site's title and thumbnail.",
    primer: primerFacts(channelName),
  };
}

function emptied(channelName: string): EmptyStateCopy {
  return {
    kind: "plate",
    title: "Nothing saved.",
    text: `Paste a link to start filling ${channelName} again.`,
    primer: null,
  };
}

export function emptyStateFor(context: EmptyStateContext): EmptyStateCopy {
  if (context.mode === "searching") {
    return {
      kind: "quiet",
      title: `No matches for “${context.query}”.`,
      text: "Search covers titles, notes, domains and tags.",
      clearable: true,
    };
  }

  if (context.mode === "tagged") {
    return {
      kind: "quiet",
      title: `Nothing tagged ${context.activeTag ?? ""}.`,
      text: "Open any save and pick this tag in its editor.",
      clearable: false,
    };
  }

  if (context.cabinetEmpty) {
    return context.onboarded ? emptied(context.channelName) : firstLoad(context.channelName);
  }

  if (context.inFolder) {
    return {
      kind: "quiet",
      title: "This folder is empty.",
      text: "Drag saves into it, or paste a link while you're inside.",
      clearable: false,
    };
  }

  return {
    kind: "quiet",
    title: `Nothing in ${context.channelName} yet.`,
    text: (
      <>
        Paste a link with <kbd>Ctrl</kbd>
        <kbd>V</kbd>, or drag saves in from another channel.
      </>
    ),
    clearable: false,
  };
}
