import { useCallback, useEffect, useState } from "react";
import { applyAppearance, loadAppearance, saveAppearance, type Appearance } from "@/theme/azul";

export function useAppearance(): {
  appearance: Appearance;
  update: (changes: Partial<Appearance>) => void;
} {
  const [appearance, setAppearance] = useState(loadAppearance);

  useEffect(() => {
    applyAppearance(appearance, document.documentElement);
    saveAppearance(appearance);
  }, [appearance]);

  const update = useCallback((changes: Partial<Appearance>) => {
    setAppearance((current) => ({ ...current, ...changes }));
  }, []);

  return { appearance, update };
}
