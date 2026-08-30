import { useCallback, useEffect, useState } from "react";
import type { Appearance, Locale, Preferences, SidebarMode, ViewMode } from "@/domain/model";
import { loadPreferences, savePreferences } from "@/storage/appState";
import { STORAGE_KEYS } from "@/storage/keys";
import { isSelfWrite, parseJson } from "@/storage/localStore";
import { parsePreferences } from "@/storage/parsers";
import { watchStorage } from "@/storage/watch";
import type { SidebarSize } from "@/lib/sidebarWidth";
import { applyAppearance } from "@/theme/colors";

export interface PreferencesStore {
  preferences: Preferences;
  setView: (view: ViewMode) => void;
  setSidebar: (sidebar: SidebarMode) => void;
  setSidebarSize: (size: SidebarSize) => void;
  setLanguage: (language: Locale) => void;
  updateAppearance: (changes: Partial<Appearance>) => void;
  markOnboarded: () => void;
}

export function usePreferences(): PreferencesStore {
  const [preferences, setPreferences] = useState(loadPreferences);

  useEffect(() => {
    applyAppearance(preferences, document.documentElement);
    document.documentElement.setAttribute("data-sidebar", preferences.sidebar);
    document.documentElement.setAttribute("lang", preferences.language);
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

  const setSidebar = useCallback((sidebar: SidebarMode) => {
    setPreferences((current) => ({ ...current, sidebar }));
  }, []);

  const setSidebarSize = useCallback((size: SidebarSize) => {
    setPreferences((current) => ({ ...current, sidebar: size.mode, sidebarWidth: size.width }));
  }, []);

  const updateAppearance = useCallback((changes: Partial<Appearance>) => {
    setPreferences((current) => ({ ...current, ...changes }));
  }, []);

  const setLanguage = useCallback((language: Locale) => {
    setPreferences((current) => ({ ...current, language }));
  }, []);

  const markOnboarded = useCallback(() => {
    setPreferences((current) => ({ ...current, onboarded: true }));
  }, []);

  return {
    preferences,
    setView,
    setSidebar,
    setSidebarSize,
    setLanguage,
    updateAppearance,
    markOnboarded,
  };
}
