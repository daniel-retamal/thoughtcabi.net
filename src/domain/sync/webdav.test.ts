import { describe, expect, it } from "vitest";
import {
  davHead,
  davNames,
  etagValue,
  fileUrl,
  ifMatchValue,
  isMixedContent,
  nameFromHref,
  urlIn,
  webdavLabel,
  webdavTargetFrom,
  webdavUrlFrom,
} from "./webdav";

const NEXTCLOUD = "https://cloud.example.test/remote.php/dav/files/dan/";

describe("reading the address somebody pasted", () => {
  it("takes a collection and puts the cabinet inside it", () => {
    expect(webdavTargetFrom({ url: NEXTCLOUD })).toEqual({
      collection: NEXTCLOUD,
      name: "thoughtcabinet.json",
    });
  });

  it("adds the slash a collection was written without", () => {
    expect(webdavTargetFrom({ url: "https://cloud.example.test/dav" })?.collection).toBe(
      "https://cloud.example.test/dav/",
    );
  });

  it("takes a file when the address names one", () => {
    expect(webdavTargetFrom({ url: `${NEXTCLOUD}cabinet.json` })).toEqual({
      collection: NEXTCLOUD,
      name: "cabinet.json",
    });
  });

  it("assumes https for an address written without a scheme", () => {
    expect(webdavTargetFrom({ url: "cloud.example.test/dav" })?.collection).toBe(
      "https://cloud.example.test/dav/",
    );
  });

  it("keeps http when it was asked for, so mixed content can be reported rather than hidden", () => {
    expect(webdavTargetFrom({ url: "http://nas.local/dav" })?.collection).toBe(
      "http://nas.local/dav/",
    );
  });

  it("drops a query and a fragment", () => {
    expect(webdavTargetFrom({ url: `${NEXTCLOUD}?view=grid#top` })?.collection).toBe(NEXTCLOUD);
  });

  it("refuses anything that is not a web address", () => {
    expect(webdavTargetFrom({ url: "" })).toBeNull();
    expect(webdavTargetFrom({ url: "   " })).toBeNull();
    expect(webdavTargetFrom({ url: "ftp://nas.local/dav" })).toBeNull();
    expect(webdavUrlFrom("javascript:alert(1)")).toBeNull();
  });

  it("builds the file's address and a sibling's beside it", () => {
    const target = webdavTargetFrom({ url: NEXTCLOUD });

    expect(fileUrl(target!)).toBe(`${NEXTCLOUD}thoughtcabinet.json`);
    expect(urlIn(target!, "thoughtcabinet-conflict.json")).toBe(
      `${NEXTCLOUD}thoughtcabinet-conflict.json`,
    );
  });

  it("names the destination by host and the folder it sits in", () => {
    expect(webdavLabel({ collection: NEXTCLOUD, name: "thoughtcabinet.json" })).toBe(
      "cloud.example.test/dan",
    );
    expect(webdavLabel({ collection: "https://nas.local/", name: "x.json" })).toBe("nas.local");
  });
});

describe("the mixed content check, which needs no request", () => {
  const plain = { collection: "http://nas.local/dav/", name: "thoughtcabinet.json" };
  const secure = { collection: "https://nas.local/dav/", name: "thoughtcabinet.json" };

  it("catches an http server asked for from an https page", () => {
    expect(isMixedContent("https:", plain)).toBe(true);
  });

  it("leaves an http server alone when the page is http too", () => {
    expect(isMixedContent("http:", plain)).toBe(false);
  });

  it("leaves an https server alone", () => {
    expect(isMixedContent("https:", secure)).toBe(false);
  });
});

describe("revisions", () => {
  it("keeps an etag exactly as the server wrote it", () => {
    expect(etagValue('"abc123"')).toBe('"abc123"');
    expect(etagValue('W/"abc123"')).toBe('W/"abc123"');
    expect(etagValue('  \n"abc" ')).toBe('"abc"');
  });

  it("treats a missing or blank etag as no revision at all", () => {
    expect(etagValue(null)).toBeNull();
    expect(etagValue("   ")).toBeNull();
  });

  it("sends an etag back the way it arrived, and quotes one that arrived bare", () => {
    expect(ifMatchValue('"abc"')).toBe('"abc"');
    expect(ifMatchValue('W/"abc"')).toBe('W/"abc"');
    expect(ifMatchValue("abc")).toBe('"abc"');
  });

  it("reads a head out of a multistatus", () => {
    expect(
      davHead([
        {
          href: `${NEXTCLOUD}thoughtcabinet.json`,
          etag: '"abc"',
          modified: "Wed, 03 Sep 2026 10:00:00 GMT",
        },
      ]),
    ).toEqual({ revision: '"abc"', modifiedAt: Date.parse("Wed, 03 Sep 2026 10:00:00 GMT") });
  });

  it("answers null when nothing in the multistatus carries an etag", () => {
    expect(davHead([{ href: NEXTCLOUD, etag: null, modified: null }])).toBeNull();
  });

  it("carries a missing date through as no date", () => {
    expect(davHead([{ href: NEXTCLOUD, etag: '"abc"', modified: "not a date" }])).toEqual({
      revision: '"abc"',
      modifiedAt: null,
    });
  });
});

describe("listing what is beside the cabinet", () => {
  const item = (href: string) => ({ href, etag: '"x"', modified: null });

  it("takes the names of direct children and nothing else", () => {
    const names = davNames(
      [
        item("/remote.php/dav/files/dan/"),
        item("/remote.php/dav/files/dan/thoughtcabinet.json"),
        item("/remote.php/dav/files/dan/notes/"),
        item("/remote.php/dav/files/dan/notes/deep.json"),
      ],
      NEXTCLOUD,
    );

    expect(names).toEqual(["thoughtcabinet.json"]);
  });

  it("reads an href written as a full address", () => {
    expect(davNames([item(`${NEXTCLOUD}thoughtcabinet.json`)], NEXTCLOUD)).toEqual([
      "thoughtcabinet.json",
    ]);
  });

  it("decodes a name the server escaped", () => {
    expect(nameFromHref(`${NEXTCLOUD}caf%C3%A9%20%E2%98%95.json`, NEXTCLOUD)).toBe("café ☕.json");
  });

  it("ignores anything outside the collection", () => {
    expect(nameFromHref("/remote.php/dav/files/other/x.json", NEXTCLOUD)).toBeNull();
  });
});
