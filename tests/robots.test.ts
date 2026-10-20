import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DomainThrottle, parseRobots } from "@/lib/scraper/robots";

describe("parseRobots", () => {
  it("allows everything for empty or HTML robots files (SPA shells)", () => {
    assert.equal(parseRobots("").isAllowed("/anything"), true);
    assert.equal(parseRobots("<!DOCTYPE html><html><body>app</body></html>").isAllowed("/admin"), true);
  });

  it("merges all `*` groups and applies longest-match with Allow winning ties", () => {
    // Real-world shape from mecc.gov.mn (two `User-agent: *` groups).
    const policy = parseRobots(`User-agent: Googlebot
Disallow: /nogooglebot/

User-agent: *
Disallow: /*&*
Disallow: /*?page=*
Disallow: /*.*

User-agent: *
Allow: /
Sitemap: /public/sitemap.xml`);
    assert.equal(policy.isAllowed("/posts/some-news-slug"), true);
    assert.equal(policy.isAllowed("/posts?page=2"), false);
    assert.equal(policy.isAllowed("/file.pdf"), false);
    assert.equal(policy.isAllowed("/nogooglebot/x"), true, "Googlebot-only rule must not apply to us");
    assert.deepEqual(policy.sitemaps, ["/public/sitemap.xml"]);
  });

  it("supports WordPress-style rules and $ anchors", () => {
    const policy = parseRobots(`User-agent: *
Disallow: /wp-admin/
Allow: /wp-admin/admin-ajax.php
Disallow: /*.json$`);
    assert.equal(policy.isAllowed("/wp-admin/options.php"), false);
    assert.equal(policy.isAllowed("/wp-admin/admin-ajax.php"), true);
    assert.equal(policy.isAllowed("/data.json"), false);
    assert.equal(policy.isAllowed("/data.json?x=1"), true);
    assert.equal(policy.isAllowed("/2026/10/19/news/"), true);
  });

  it("prefers a group naming our bot and reads Crawl-delay", () => {
    const policy = parseRobots(`User-agent: *
Disallow: /

User-agent: IlTodBot
Disallow: /private
Crawl-delay: 12`);
    assert.equal(policy.isAllowed("/news/1"), true);
    assert.equal(policy.isAllowed("/private/x"), false);
    assert.equal(policy.crawlDelayMs, 12_000);
  });

  it("treats an empty Disallow as allow-all", () => {
    assert.equal(parseRobots("User-agent: *\nDisallow:").isAllowed("/x"), true);
  });
});

describe("DomainThrottle", () => {
  it("spaces requests to the same host by the minimum delay", async () => {
    const throttle = new DomainThrottle(60);
    const start = Date.now();
    await throttle.wait("a.gov.mn");
    await throttle.wait("a.gov.mn");
    await throttle.wait("b.gov.mn"); // different host: no wait
    const elapsed = Date.now() - start;
    assert.ok(elapsed >= 55 && elapsed < 200, `elapsed ${elapsed}ms`);
  });
});
