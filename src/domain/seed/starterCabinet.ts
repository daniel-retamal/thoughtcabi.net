import { createId } from "@/domain/ids";
import type { Cabinet } from "@/domain/model";

export function createStarterCabinet(shelfName: string): Cabinet {
  return {
    library: [{ id: createId("ch"), name: shelfName, icon: "bookmark", children: [] }],
    tags: [],
  };
}
