import type { IconName } from "@/icons/names";
import { isFolder, type Library, type LibraryLocation } from "@/domain/model";
import type { Container } from "./tree";

export interface Destination extends LibraryLocation {
  label: string;
  depth: number;
  icon: IconName;
}

export function destinationKey(destination: LibraryLocation): string {
  return `${destination.channelId}/${destination.path.join("/")}`;
}

export function sameDestination(a: LibraryLocation | null, b: LibraryLocation | null): boolean {
  if (!a || !b) return false;
  return destinationKey(a) === destinationKey(b);
}

export function flattenDestinations(library: Library): Destination[] {
  const destinations: Destination[] = [];

  for (const channel of library) {
    destinations.push({
      channelId: channel.id,
      path: [],
      label: channel.name,
      depth: 0,
      icon: channel.icon,
    });

    const walk = (container: Container, path: string[]): void => {
      for (const child of container.children) {
        if (!isFolder(child)) continue;
        const nextPath = [...path, child.id];
        destinations.push({
          channelId: channel.id,
          path: nextPath,
          label: child.name,
          depth: nextPath.length,
          icon: "folder",
        });
        walk(child, nextPath);
      }
    };

    walk(channel, []);
  }

  return destinations;
}
