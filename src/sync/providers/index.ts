import type { RemoteProvider } from "../types";
import { folderProvider } from "./folder";
import { githubProvider } from "./github";

export function browserProviders(): readonly RemoteProvider[] {
  return [folderProvider(), githubProvider()];
}
