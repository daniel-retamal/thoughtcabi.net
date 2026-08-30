import type { ReactNode } from "react";
import type { BrowseMode } from "@/state/useLibraryView";
import type { Copy } from "@/i18n/copy";
import { format } from "@/i18n/format";
import type { PrimerFact } from "@/components/feedback/EmptyPrimer";
import { ModKey } from "@/components/primitives/ModKey";

export type EmptyStateCopy =
  | { kind: "plate"; title: string; text: string; primer: readonly PrimerFact[] | null }
  | { kind: "quiet"; title: string; text: ReactNode; clearable: boolean };

export interface EmptyStateContext {
  mode: BrowseMode;
  query: string;
  activeTag: string | null;
  shelfName: string;
  inFolder: boolean;
  cabinetEmpty: boolean;
  onboarded: boolean;
}

function primerFacts(shelfName: string, copy: Copy): PrimerFact[] {
  return [
    {
      term: copy.empty.primerShelvesTerm,
      text: format(copy.empty.primerShelvesText, { shelf: shelfName }),
    },
    { term: copy.empty.primerFoldersTerm, text: copy.empty.primerFoldersText },
    { term: copy.empty.primerTagsTerm, text: copy.empty.primerTagsText },
  ];
}

function firstLoad(shelfName: string, copy: Copy): EmptyStateCopy {
  return {
    kind: "plate",
    title: copy.empty.firstLoadTitle,
    text: copy.empty.firstLoadText,
    primer: primerFacts(shelfName, copy),
  };
}

function emptied(shelfName: string, copy: Copy): EmptyStateCopy {
  return {
    kind: "plate",
    title: copy.empty.emptiedTitle,
    text: format(copy.empty.emptiedText, { shelf: shelfName }),
    primer: null,
  };
}

export function emptyStateFor(context: EmptyStateContext, copy: Copy): EmptyStateCopy {
  if (context.mode === "searching") {
    return {
      kind: "quiet",
      title: format(copy.empty.searchingTitle, { query: context.query }),
      text: copy.empty.searchingText,
      clearable: true,
    };
  }

  if (context.mode === "tagged") {
    return {
      kind: "quiet",
      title: format(copy.empty.taggedTitle, { tag: context.activeTag ?? "" }),
      text: copy.empty.taggedText,
      clearable: false,
    };
  }

  if (context.cabinetEmpty) {
    return context.onboarded
      ? emptied(context.shelfName, copy)
      : firstLoad(context.shelfName, copy);
  }

  if (context.inFolder) {
    return {
      kind: "quiet",
      title: copy.empty.inFolderTitle,
      text: copy.empty.inFolderText,
      clearable: false,
    };
  }

  return {
    kind: "quiet",
    title: format(copy.empty.shelfTitle, { shelf: context.shelfName }),
    text: (
      <>
        {copy.empty.shelfTextBefore}
        <ModKey />
        <kbd>V</kbd>
        {copy.empty.shelfTextAfter}
      </>
    ),
    clearable: false,
  };
}
