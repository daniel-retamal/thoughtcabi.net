import type { MouseEvent } from "react";

export function stopPropagation(event: MouseEvent): void {
  event.stopPropagation();
}
