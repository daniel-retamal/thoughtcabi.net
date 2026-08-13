import type { IconName } from "@/icons/names";
import { isFolder, type Library, type LibraryLocation } from "@/domain/model";
import type { Container } from "./tree";

export interface Destination extends LibraryLocation {
  label: string;
  depth: number;
  icon: IconName;
}

export function destinationKey(destination: LibraryLocation): string {
  return `${destination.shelfId}/${destination.path.join("/")}`;
}

export function sameDestination(a: LibraryLocation | null, b: LibraryLocation | null): boolean {
  if (!a || !b) return false;
  return destinationKey(a) === destinationKey(b);
}

export function flattenDestinations(library: Library): Destination[] {
  const destinations: Destination[] = [];

  for (const shelf of library) {
    destinations.push({
      shelfId: shelf.id,
      path: [],
      label: shelf.name,
      depth: 0,
      icon: shelf.icon,
    });

    const walk = (container: Container, path: string[]): void => {
      for (const child of container.children) {
        if (!isFolder(child)) continue;
        const nextPath = [...path, child.id];
        destinations.push({
          shelfId: shelf.id,
          path: nextPath,
          label: child.name,
          depth: nextPath.length,
          icon: "folder",
        });
        walk(child, nextPath);
      }
    };

    walk(shelf, []);
  }

  return destinations;
}
