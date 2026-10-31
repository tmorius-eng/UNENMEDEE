import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { describe, it } from "node:test";

import { ESLint } from "eslint";

/**
 * package.json overrides minimatch to ^11.0.3 for every dependent (GHSA-g3hv-75wg-m249: every
 * release before 11.0.1 is affected, with no backport). Crawlee and ESLint use the API v11 keeps
 * (`Minimatch`, named `minimatch`); a few lint rules from eslint-config-next's plugins call the
 * old v3 default export and would throw if they ever ran. This pins both facts.
 */
const OLD_API_RULES = [
  "react/jsx-pascal-case",
  "react/forbid-component-props",
  "react/no-danger",
  "react/jsx-handler-names",
  "react/no-unstable-nested-components",
  "import/order",
  "import/no-restricted-paths",
  "import/no-unassigned-import",
  "jsx-a11y/label-has-associated-control",
  "jsx-a11y/control-has-associated-label",
];

describe("minimatch override", () => {
  it("resolves to the patched release with the API Crawlee and ESLint use", () => {
    const require = createRequire(import.meta.url);
    const mm = require("minimatch") as typeof import("minimatch");
    const version = (require("minimatch/package.json") as { version: string }).version;
    assert.ok(Number(version.split(".")[0]) >= 11, version);
    assert.equal(new mm.Minimatch("https://example.gov.mn/**/news/*", { nocase: true }).match("https://EXAMPLE.gov.mn/mn/news/12"), true);
    assert.equal(mm.minimatch("src/a.ts", "**/*.ts", { dot: true }), true);
  });

  it("no enabled lint rule reaches the old v3 call that minimatch 11 no longer offers", async () => {
    const config = (await new ESLint().calculateConfigForFile("src/app/page.tsx")) as { rules: Record<string, unknown> };
    const on = OLD_API_RULES.filter((r) => {
      const v = config.rules[r];
      const level = Array.isArray(v) ? v[0] : v;
      return level !== undefined && level !== 0 && level !== "off";
    });
    assert.deepEqual(on, [], "enable these only after their plugin moves off the minimatch v3 API (or drop the override)");
  });
});
