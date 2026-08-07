import { describe, expect, it, vi } from "vitest";
import { fetchJson, fetchText, parseJson, type Fetcher } from "./fetchText";

function serving(body: string, status = 200): Fetcher {
  return () => Promise.resolve(new Response(body, { status }));
}

describe("fetchText", () => {
  it("returns the body of a successful response", async () => {
    expect(await fetchText(serving("hello"), "https://example.com")).toBe("hello");
  });

  it("returns null for an error status", async () => {
    expect(await fetchText(serving("nope", 404), "https://example.com")).toBeNull();
    expect(await fetchText(serving("nope", 500), "https://example.com")).toBeNull();
  });

  it("returns null instead of throwing when the network fails", async () => {
    const failing: Fetcher = () => Promise.reject(new Error("offline"));
    expect(await fetchText(failing, "https://example.com")).toBeNull();
  });

  it("stops reading once the size cap is reached", async () => {
    const body = "x".repeat(5000);
    const text = await fetchText(serving(body), "https://example.com", { maxBytes: 100 });
    expect(text?.length).toBeLessThan(body.length);
  });

  it("aborts the request when it takes too long", async () => {
    const hanging: Fetcher = (_input, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
      });

    expect(await fetchText(hanging, "https://example.com", { timeoutMs: 5 })).toBeNull();
  });

  it("passes an abort signal so the timer can cancel the request", async () => {
    const fetcher = vi.fn(serving("ok"));
    await fetchText(fetcher, "https://example.com");
    expect(fetcher.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });
});

describe("fetchJson", () => {
  it("parses a json body", async () => {
    expect(await fetchJson(serving('{"a":1}'), "https://example.com")).toEqual({ a: 1 });
  });

  it("returns null for a body that is not json", async () => {
    expect(await fetchJson(serving("<html>"), "https://example.com")).toBeNull();
  });
});

describe("parseJson", () => {
  it("never throws", () => {
    expect(parseJson(null)).toBeNull();
    expect(parseJson("")).toBeNull();
    expect(parseJson("{oops")).toBeNull();
    expect(parseJson('{"a":1}')).toEqual({ a: 1 });
  });
});
