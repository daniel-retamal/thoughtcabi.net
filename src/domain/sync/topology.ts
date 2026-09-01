import type { Destination, RemoteState } from "./types";

export type DestinationPatch = Partial<Omit<Destination, "id" | "provider" | "direction">>;

function demote(destination: Destination): Destination {
  return destination.direction === "two-way"
    ? { ...destination, direction: "mirror" }
    : destination;
}

export function homeOf(state: RemoteState): Destination | undefined {
  return state.destinations.find((destination) => destination.direction === "two-way");
}

export function mirrorsOf(state: RemoteState): Destination[] {
  return state.destinations.filter((destination) => destination.direction !== "two-way");
}

export function repairTopology(destinations: readonly Destination[]): Destination[] {
  let home: Destination | undefined;
  return destinations.map((destination) => {
    if (destination.direction !== "two-way") return destination;
    if (home) return demote(destination);
    home = destination;
    return destination;
  });
}

export function addDestination(state: RemoteState, destination: Destination): RemoteState {
  const others = state.destinations.filter((entry) => entry.id !== destination.id);
  const kept = destination.direction === "two-way" ? others.map(demote) : others;
  return { destinations: [...kept, destination] };
}

export function setHome(state: RemoteState, id: string): RemoteState {
  if (!state.destinations.some((destination) => destination.id === id)) return state;
  return {
    destinations: state.destinations.map((destination) =>
      destination.id === id ? { ...destination, direction: "two-way" } : demote(destination),
    ),
  };
}

export function updateDestination(
  state: RemoteState,
  id: string,
  patch: DestinationPatch,
): RemoteState {
  return {
    destinations: state.destinations.map((destination) =>
      destination.id === id ? { ...destination, ...patch } : destination,
    ),
  };
}

export function removeDestination(state: RemoteState, id: string): RemoteState {
  return { destinations: state.destinations.filter((destination) => destination.id !== id) };
}
