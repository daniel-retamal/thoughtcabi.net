import type { RemoteProvider } from "../types";
import { driveProvider } from "./drive";
import { folderProvider } from "./folder";
import { githubProvider } from "./github";

export function browserProviders(): readonly RemoteProvider[] {
  return [folderProvider(), githubProvider(), driveProvider()];
}
