import { describe, expect, it, vi } from "vitest";
import { RELAY, fetchViaRelay, relayEndpoints, relayedUrl } from "./relay";
import type { Fetcher } from "./fetchText";

describe("relayEndpoints", () => {
  it("uses the relay on this origin by default", () => {
    expect(relayEndpoints(undefined)).toEqual([RELAY]);
    expect(relayEndpoints("   ")).toEqual([RELAY]);
  });

  it("uses a configured relay instead, and only that one", () => {
    expect(relayEndpoints("https://relay.example.com/?url=")).toEqual([
      "https://relay.example.com/?url=",
    ]);
  });
});

describe("relayedUrl", () => {
  it("substitutes a placeholder when the endpoint has one", () => {
    expect(relayedUrl("https://r.example/get?u={url}&k=1", "https://example.com/a")).toBe(
      "https://r.example/get?u=https%3A%2F%2Fexample.com%2Fa&k=1",
    );
  });

  it("appends when the endpoint has no placeholder", () => {
    expect(relayedUrl("https://r.example/?url=", "https://example.com/a")).toBe(
      "https://r.example/?url=https%3A%2F%2Fexample.com%2Fa",
    );
  });
});

describe("fetchViaRelay", () => {
  const target = "https://example.com/a";
  const endpoints = ["https://first.example/?url=", "https://second.example/?url="];

  it("uses the first relay that answers", async () => {
    const fetcher = vi.fn<Fetcher>((input) =>
      Promise.resolve(
        input.startsWith("https://first.")
          ? new Response("", { status: 502 })
          : new Response("<html>ok</html>", { status: 200 }),
      ),
    );

    expect(await fetchViaRelay(fetcher, target, endpoints)).toBe("<html>ok</html>");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("does not call the second relay when the first works", async () => {
    const fetcher = vi.fn<Fetcher>(() => Promise.resolve(new Response("ok", { status: 200 })));
    await fetchViaRelay(fetcher, target, endpoints);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("returns null when every relay is down", async () => {
    const fetcher: Fetcher = () => Promise.resolve(new Response("", { status: 500 }));
    expect(await fetchViaRelay(fetcher, target, endpoints)).toBeNull();
  });

  it("returns null when there are no relays at all", async () => {
    const fetcher = vi.fn<Fetcher>(() => Promise.resolve(new Response("ok")));
    expect(await fetchViaRelay(fetcher, target, [])).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });
});
