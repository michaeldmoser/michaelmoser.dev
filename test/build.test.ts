import { describe, it, expect, beforeAll } from "vitest";
import { register } from "tsx/esm/api";

interface BuildResult {
  url: string;
  inputPath: string;
  outputPath: string;
  content: string;
}

let results: BuildResult[];

beforeAll(async () => {
  register();
  const { default: Eleventy } = await import("@11ty/eleventy");
  results = await new Eleventy("src", "_site", {
    configPath: "eleventy.config.ts",
  }).toJSON();
}, 60_000);

describe("site build", () => {
  it("renders the index page as a full HTML document with the markdown body as unescaped HTML inside main", () => {
    const index = results.find((result) => result.url === "/");

    expect(index).toBeDefined();
    const html = index?.content ?? "";
    expect(html.toLowerCase()).toContain("<!doctype html>");
    const main = html.match(/<main>([\s\S]*)<\/main>/);
    expect(main).not.toBeNull();
    expect(main?.[1]).toContain("<h1");
    expect(main?.[1]).not.toContain("&lt;h1");
  });

  it("keeps a literal {{ page.url }} in the markdown verbatim instead of rendering it", () => {
    const index = results.find((result) => result.url === "/");

    expect(index).toBeDefined();
    expect(index?.content).toContain("<code>{{ page.url }}</code>");
  });
});
