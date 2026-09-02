import type { RemoteProvider } from "../types";
import { folderProvider } from "./folder";

export function browserProviders(): readonly RemoteProvider[] {
  return [folderProvider()];
}
