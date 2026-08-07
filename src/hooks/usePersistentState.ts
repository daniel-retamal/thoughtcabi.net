import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

export function usePersistentState<T>(
  load: () => T,
  save: (value: T) => void,
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState(load);

  useEffect(() => {
    save(value);
  }, [value, save]);

  return [value, setValue];
}
