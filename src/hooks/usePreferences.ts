import { useCallback, useEffect, useState } from "react";
import type { Appearance, Preferences, ViewMode } from "@/domain/model";
import { loadPreferences, savePreferences } from "@/storage/appState";
import { STORAGE_KEYS } from "@/storage/keys";
import { isSelfWrite, parseJson } from "@/storage/localStore";
import { parsePreferences } from "@/storage/parsers";
import { watchStorage } from "@/storage/watch";
import { applyAppearance } from "@/theme/azul";

export interface PreferencesStore {
  preferences: Preferences;
  setView: (view: ViewMode) => void;
  updateAppearance: (changes: Partial<Appearance>) => void;
}

export function usePreferences(): PreferencesStore {
  const [preferences, setPreferences] = useState(loadPreferences);

  useEffect(() => {
    applyAppearance(preferences, document.documentElement);
    savePreferences(preferences);
  }, [preferences]);

  useEffect(
    () =>
      watchStorage(STORAGE_KEYS.preferences, (raw) => {
        if (isSelfWrite(STORAGE_KEYS.preferences, raw)) return;
        const incoming = parseJson(raw, parsePreferences);
        if (incoming) setPreferences(incoming);
      }),
    [],
  );

  const setView = useCallback((view: ViewMode) => {
    setPreferences((current) => ({ ...current, view }));
  }, []);

  const updateAppearance = useCallback((changes: Partial<Appearance>) => {
    setPreferences((current) => ({ ...current, ...changes }));
  }, []);

  return { preferences, setView, updateAppearance };
}
