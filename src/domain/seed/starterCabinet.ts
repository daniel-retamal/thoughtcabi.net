import { createId } from "@/domain/ids";
import type { Cabinet } from "@/domain/model";

export function createStarterCabinet(): Cabinet {
  return {
    library: [{ id: createId("ch"), name: "Saved", icon: "bookmark", children: [] }],
    tags: [],
  };
}
