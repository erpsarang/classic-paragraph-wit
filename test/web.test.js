import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { classics } from "../src/classics.js";
import { getRecommendation } from "../src/recommendation.js";
import { getRecommendation as appRecommendation } from "../src/app.js";
import { initWeb } from "../src/web.js";

const fieldIds = ["classic-title", "classic-author", "classic-paragraph", "classic-wit"];

function createDocument() {
  function createElement(tagName) {
    const listeners = new Map();
    const attributes = new Map();
    return {
      tagName: tagName.toUpperCase(),
      id: "",
      textContent: "",
      lang: "",
      href: "",
      disabled: false,
      children: [],
      parentElement: null,
      set innerHTML(value) {
        assert.fail("Recommendation content must be assigned as text");
      },
      setAttribute(name, value) {
        attributes.set(name, String(value));
      },
      getAttribute(name) {
        return attributes.get(name) ?? null;
      },
      append(...children) {
        for (const child of children) {
          child.parentElement = this;
          this.children.push(child);
        }
      },
      insertAdjacentElement(position, element) {
        assert.ok(this.parentElement);
        assert.ok(["beforebegin", "afterend"].includes(position));
        const siblings = this.parentElement.children;
        const index = siblings.indexOf(this);
        element.parentElement = this.parentElement;
        siblings.splice(index + (position === "afterend" ? 1 : 0), 0, element);
        return element;
      },
      addEventListener(type, callback) {
        listeners.set(type, callback);
      },
      click() {
        if (!this.disabled) listeners.get("click")?.();
      },
    };
  }
  const main = createElement("main");
  const article = createElement("article");
  article.id = "recommendation";
  main.append(article);
  for (const id of fieldIds) {
    const element = createElement(id === "classic-paragraph" ? "blockquote" : "p");
    element.id = id;
    article.append(element);
  }
  const button = createElement("button");
  button.id = "next-recommendation";
  button.disabled = true;
  main.append(button);

  function findById(element, id) {
    if (element.id === id) return element;
    for (const child of element.children) {
      const found = findById(child, id);
      if (found) return found;
    }
    return null;
  }
  return { createElement, getElementById: (id) => findById(main, id) };
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
  assert.equal(document.getElementById("classic-source-location").textContent, classic.source.location);
  assert.equal(document.getElementById("classic-source-link").href, classic.source.url);
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
  const viewedIds = new Set([classics[0].id]);
  let previous = classics[0];
  for (let index = 0; index < classics.length * 3; index += 1) {
    const expected = viewedIds.size < classics.length
      ? classics.find((classic) => !viewedIds.has(classic.id))
      : classics.find((classic) => classic.id !== previous.id);
    button.click();
    assertRendered(document, expected);
    assert.notEqual(expected.id, previous.id);
    if (index < classics.length - 1) {
      assert.equal(viewedIds.has(expected.id), false);
    }
    viewedIds.add(expected.id);
    previous = expected;
  }
  assert.equal(viewedIds.size, classics.length);
});

test("previous button is accessible and history navigation restores all fields without random draws", () => {
  const document = createDocument();
  let calls = 0;
  initWeb(document, () => { calls += 1; return 0; });
  const previous = document.getElementById("previous-recommendation");
  const next = document.getElementById("next-recommendation");
  assert.equal(previous.tagName, "BUTTON");
  assert.equal(previous.type, "button");
  assert.equal(previous.textContent, "이전 추천");
  assert.equal(previous.getAttribute("aria-controls"), "recommendation");
  assert.equal(previous.parentElement, next.parentElement);
  const siblings = next.parentElement.children;
  assert.equal(siblings[siblings.indexOf(next) + 1], previous);
  assert.equal(previous.disabled, true);
  previous.click();
  assertRendered(document, classics[0]);
  assert.equal(calls, 1);

  next.click();
  assertRendered(document, classics[1]);
  assert.equal(previous.disabled, false);
  assert.equal(calls, 2);
  previous.click();
  assertRendered(document, classics[0]);
  assert.equal(previous.disabled, true);
  previous.click();
  assertRendered(document, classics[0]);
  assert.equal(calls, 2);

  // Clear every rendered field so restoration must assign each one again.
  for (const id of [...fieldIds, "classic-source-location"]) {
    document.getElementById(id).textContent = "stale";
  }
  document.getElementById("classic-paragraph").lang = "stale";
  document.getElementById("classic-source-link").href = "stale";
  next.click();
  assertRendered(document, classics[1]);
  assert.equal(previous.disabled, false);
  assert.equal(calls, 2);
  next.click();
  assertRendered(document, classics[2]);
  assert.equal(calls, 3);
});

test("reappearing works retain separate positions through backward and forward traversal", () => {
  const document = createDocument();
  let calls = 0;
  initWeb(document, () => { calls += 1; return 0; });
  const next = document.getElementById("next-recommendation");
  const previous = document.getElementById("previous-recommendation");
  const sequence = [...classics, classics[0], classics[1], classics[0]];
  for (const expected of sequence.slice(1)) {
    next.click();
    assertRendered(document, expected);
  }
  assert.equal(calls, sequence.length);
  for (let index = sequence.length - 2; index >= 0; index -= 1) {
    previous.click();
    assertRendered(document, sequence[index]);
    assert.equal(previous.disabled, index === 0);
    assert.equal(calls, sequence.length);
  }
  previous.click();
  assertRendered(document, sequence[0]);
  for (const expected of sequence.slice(1)) {
    next.click();
    assertRendered(document, expected);
    assert.equal(previous.disabled, false);
    assert.equal(calls, sequence.length);
  }
  next.click();
  assertRendered(document, classics[1]);
  assert.equal(calls, sequence.length + 1);
});

test("optional history prioritizes unread works without mutation and preserves candidate order", () => {
  const histories = [
    new Set(),
    new Set(["unknown-id"]),
    new Set([classics[0].id]),
    new Set(classics.slice(0, -1).map((classic) => classic.id)),
    new Set(classics.map((classic) => classic.id)),
  ];
  for (const previousId of [undefined, "unknown-id", ...classics.map((classic) => classic.id)]) {
    for (const viewedIds of histories) {
      const before = [...viewedIds];
      const alternatives = classics.filter((classic) => classic.id !== previousId);
      const unread = alternatives.filter((classic) => !viewedIds.has(classic.id));
      const expected = unread.length > 0 ? unread : alternatives;
      for (let index = 0; index < expected.length; index += 1) {
        for (const value of [index / expected.length, (index + 1) / expected.length - Number.EPSILON]) {
          let calls = 0;
          const selected = getRecommendation(() => { calls += 1; return value; }, previousId, viewedIds);
          assert.equal(selected, expected[index]);
          assert.equal(calls, 1);
          assert.deepEqual([...viewedIds], before);
        }
      }
    }
  }
});

test("each visit has independent history including the initial recommendation", () => {
  const first = createDocument();
  initWeb(first, () => 0);
  assertRendered(first, classics[0]);
  first.getElementById("next-recommendation").click();
  assertRendered(first, classics[1]);

  const second = createDocument();
  initWeb(second, () => 0);
  assertRendered(second, classics[0]);
  first.getElementById("next-recommendation").click();
  assertRendered(first, classics[2]);
  assertRendered(second, classics[0]);
  second.getElementById("next-recommendation").click();
  assertRendered(second, classics[1]);
  assertRendered(first, classics[2]);

  first.getElementById("previous-recommendation").click();
  assertRendered(first, classics[1]);
  second.getElementById("previous-recommendation").click();
  assertRendered(second, classics[0]);
  assert.equal(second.getElementById("previous-recommendation").disabled, true);
  assert.equal(first.getElementById("previous-recommendation").disabled, false);
  first.getElementById("next-recommendation").click();
  assertRendered(first, classics[2]);
  assertRendered(second, classics[0]);

  const revisit = createDocument();
  let calls = 0;
  initWeb(revisit, () => { calls += 1; return 0; });
  assertRendered(revisit, classics[0]);
  assert.equal(revisit.getElementById("previous-recommendation").disabled, true);
  revisit.getElementById("previous-recommendation").click();
  assert.equal(calls, 1);
  revisit.getElementById("next-recommendation").click();
  assertRendered(revisit, classics[1]);
  assert.equal(calls, 2);
  assertRendered(first, classics[2]);
  assertRendered(second, classics[0]);
});

test("at least three unique works provide complete original-text source metadata and Korean wit", () => {
  assert.ok(classics.length >= 3);
  assert.equal(new Set(classics.map((classic) => classic.id)).size, classics.length);
  assert.equal(new Set(classics.map((classic) => classic.paragraph)).size, classics.length);
  assert.equal(new Set(classics.map((classic) => classic.wit)).size, classics.length);
  for (const classic of classics) {
    for (const key of ["id", "title", "author", "paragraph", "wit"]) {
      assert.equal(typeof classic[key], "string");
      assert.ok(classic[key].trim().length > 0);
    }
    assert.match(classic.wit, /[가-힣]/);
    for (const key of ["url", "edition", "location", "language", "jurisdiction", "publicDomainBasis"]) {
      assert.equal(typeof classic.source[key], "string");
      assert.ok(classic.source[key].trim().length > 0);
    }
    assert.equal(new URL(classic.source.url).protocol, "https:");
    assert.equal(classic.source.language, "en");
    assert.equal(classic.source.jurisdiction, "대한민국");
    assert.match(classic.source.publicDomainBasis, /original text copyright has expired/);
    assert.match(classic.source.publicDomainBasis, /No translation is used/);
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
