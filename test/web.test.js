import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { classics } from "../src/classics.js";
import { getRecommendation } from "../src/recommendation.js";
import { getRecommendation as appRecommendation } from "../src/app.js";
import { initWeb } from "../src/web.js";

const fieldIds = ["classic-title", "classic-author", "classic-paragraph", "classic-wit"];

function createDocument() {
  const elements = new Map();
  for (const id of [...fieldIds, "next-recommendation"]) {
    const listeners = new Map();
    elements.set(id, {
      textContent: "",
      lang: "",
      disabled: id === "next-recommendation",
      set innerHTML(value) {
        assert.fail("Recommendation content must be assigned as text");
      },
      addEventListener(type, callback) {
        listeners.set(type, callback);
      },
      click() {
        if (!this.disabled) listeners.get("click")?.();
      },
    });
  }
  return { getElementById: (id) => elements.get(id) };
}

function assertRendered(document, classic) {
  for (const [id, key] of [
    ["classic-title", "title"],
    ["classic-author", "author"],
    ["classic-paragraph", "paragraph"],
    ["classic-wit", "wit"],
  ]) {
    assert.equal(document.getElementById(id).textContent, classic[key]);
  }
  assert.equal(document.getElementById("classic-paragraph").lang, classic.source.language);
}

test("shared recommendation preserves the original API and selection boundaries", () => {
  assert.equal(appRecommendation, getRecommendation);
  assert.equal(getRecommendation(() => 0), classics[0]);
  assert.equal(getRecommendation(() => 1 - Number.EPSILON), classics.at(-1));
  assert.equal(getRecommendation(() => 0, "unknown-id"), classics[0]);
  assert.ok(classics.includes(getRecommendation()));
});

test("previous work is excluded with one random draw, including at selection boundaries", () => {
  for (const previous of classics) {
    const candidates = classics.filter((classic) => classic.id !== previous.id);
    for (const value of [0, 1 - Number.EPSILON]) {
      let calls = 0;
      const selected = getRecommendation(() => { calls += 1; return value; }, previous.id);
      assert.equal(calls, 1);
      assert.notEqual(selected.id, previous.id);
      assert.equal(selected, value === 0 ? candidates[0] : candidates.at(-1));
    }
  }
});

test("initial render and repeated button clicks show complete, different recommendations", () => {
  const document = createDocument();
  initWeb(document, () => 0);
  assertRendered(document, classics[0]);
  const button = document.getElementById("next-recommendation");
  assert.equal(button.disabled, false);
  let previous = classics[0];
  for (let index = 0; index < 4; index += 1) {
    button.click();
    const expected = classics.find((classic) => classic.id !== previous.id);
    assertRendered(document, expected);
    previous = expected;
  }
});

test("static entry point connects native modules and accessible mobile markup", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /<html\b[^>]*lang="ko"/);
  assert.match(html, /<meta\b[^>]*name="viewport"[^>]*content="width=device-width, initial-scale=1"/);
  assert.match(html, /<script\b[^>]*type="module"[^>]*src="\.\/src\/web\.js"/);
  for (const id of [...fieldIds, "next-recommendation", "recommendation"]) {
    assert.equal(html.match(new RegExp(`\\bid="${id}"`, "g"))?.length, 1);
  }
  assert.match(html, /<article\b[^>]*aria-live="polite"[^>]*aria-atomic="true"/);
  assert.match(html, /<button\b[^>]*type="button"[^>]*aria-controls="recommendation"[^>]*>다른 고전 추천<\/button>/);
  const web = await readFile(new URL("../src/web.js", import.meta.url), "utf8");
  const recommendation = await readFile(new URL("../src/recommendation.js", import.meta.url), "utf8");
  assert.match(web, /from "\.\/recommendation\.js"/);
  assert.match(recommendation, /from "\.\/classics\.js"/);
  assert.doesNotMatch(web + recommendation, /node:|from ["'][^"']*app\.js["']/);
});
