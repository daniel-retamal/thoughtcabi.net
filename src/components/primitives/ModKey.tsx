import { modifierKeyLabel } from "@/lib/platform";

export function ModKey() {
  return <kbd>{modifierKeyLabel()}</kbd>;
}
