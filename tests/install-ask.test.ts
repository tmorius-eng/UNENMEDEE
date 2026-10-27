import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { askDelay, DISMISS_KEY, FIRST_DELAY_MS, INSTALLED_KEY, parseAskState, REASK_MS, STEPS_KEY, STEPS_REASK_MS } from "@/lib/install-ask";

const NOW = 1_800_000_000_000;
const state = (o: Partial<{ dismissedAt: number; stepsAt: number; installed: boolean }> = {}) => ({ dismissedAt: 0, stepsAt: 0, installed: false, ...o });

describe("install strip timing", () => {
  it("asks shortly after the first load", () => {
    assert.equal(askDelay(state(), NOW), FIRST_DELAY_MS);
  });

  it("asks again 5 minutes after a ✕, not before", () => {
    assert.equal(askDelay(state({ dismissedAt: NOW }), NOW), REASK_MS);
    assert.equal(askDelay(state({ dismissedAt: NOW - REASK_MS + 1_000 }), NOW), FIRST_DELAY_MS);
    assert.equal(askDelay(state({ dismissedAt: NOW - 60_000 }), NOW), REASK_MS - 60_000);
    assert.equal(askDelay(state({ dismissedAt: NOW - REASK_MS * 3 }), NOW), FIRST_DELAY_MS);
  });

  it("waits a day after an iPhone reader opened the steps", () => {
    assert.equal(askDelay(state({ stepsAt: NOW, dismissedAt: NOW }), NOW), STEPS_REASK_MS);
    assert.equal(askDelay(state({ stepsAt: NOW - STEPS_REASK_MS }), NOW), FIRST_DELAY_MS);
  });

  it("never asks once the reader said it is installed", () => {
    assert.equal(askDelay(state({ installed: true }), NOW), null);
    assert.equal(askDelay(state({ installed: true, dismissedAt: NOW - REASK_MS * 10 }), NOW), null);
  });

  it("reads storage defensively", () => {
    const store: Record<string, string> = { [DISMISS_KEY]: "abc", [STEPS_KEY]: "-5", [INSTALLED_KEY]: "1" };
    assert.deepEqual(parseAskState((k) => store[k] ?? null), { dismissedAt: 0, stepsAt: 0, installed: true });
    assert.deepEqual(parseAskState(() => null), { dismissedAt: 0, stepsAt: 0, installed: false });
  });
});
