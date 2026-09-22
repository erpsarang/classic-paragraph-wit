import test from "node:test";
import assert from "node:assert/strict";
import { classics } from "../src/classics.js";
import { initWeb } from "../src/web.js";

class Element {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.id = "";
    this.textContent = "";
    this.lang = "";
    this.href = "";
    this.target = "";
    this.disabled = false;
    this.children = [];
    this.parentElement = null;
    this.listeners = new Map();
  }

  append(...elements) {
    for (const element of elements) {
      element.parentElement = this;
      this.children.push(element);
    }
  }

  insertAdjacentElement(position, element) {
    assert.equal(position, "afterend");
    assert.ok(this.parentElement);
    const siblings = this.parentElement.children;
    element.parentElement = this.parentElement;
    siblings.splice(siblings.indexOf(this) + 1, 0, element);
    return element;
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  click() {
    if (!this.disabled) {
      for (const listener of this.listeners.get("click") ?? []) {
        listener({ type: "click", target: this });
      }
    }
  }
}

function descendants(element) {
  return element.children.flatMap((child) => [child, ...descendants(child)]);
}

function createDocument() {
  const root = new Element("main");
  for (const [id, tagName] of [
    ["classic-title", "h2"],
    ["classic-author", "p"],
    ["classic-paragraph", "blockquote"],
    ["classic-wit", "p"],
    ["next-recommendation", "button"]
  ]) {
    const element = new Element(tagName);
    element.id = id;
    root.append(element);
  }
  const document = {
    createElement: (tagName) => new Element(tagName),
    getElementById: (id) => descendants(root).find((element) => element.id === id) ?? null
  };
  document.getElementById("next-recommendation").disabled = true;
  return { document, root };
}

 test("출처는 최초 추천, 세 작품 순회 및 순회 이후에도 중복 없이 갱신된다", () => {
  const { document, root } = createDocument();
  initWeb(document, () => 0);

  const paragraph = document.getElementById("classic-paragraph");
  const button = document.getElementById("next-recommendation");
  const source = document.getElementById("classic-source");
  const location = document.getElementById("classic-source-location");
  const link = document.getElementById("classic-source-link");
  assert.ok(source);
  assert.ok(location);
  assert.ok(link);
  assert.equal(button.disabled, false);

  function assertRecommendation(expected) {
    assert.equal(document.getElementById("classic-title").textContent, expected.title);
    assert.equal(document.getElementById("classic-author").textContent, expected.author);
    assert.equal(paragraph.textContent, expected.paragraph);
    assert.equal(paragraph.lang, "en");
    assert.equal(document.getElementById("classic-wit").textContent, expected.wit);
    assert.equal(location.textContent, expected.source.location);
    assert.equal(link.tagName, "A");
    assert.equal(link.href, expected.source.url);
    assert.equal(link.textContent, "영어 원문 읽기 · Project Gutenberg");
    assert.equal(link.target, "");
    assert.equal(root.children[root.children.indexOf(paragraph) + 1], source);
    assert.deepEqual(source.children, [location, link]);
    for (const element of [source, location, link]) {
      assert.equal(document.getElementById(element.id), element);
      assert.equal(descendants(root).filter((node) => node.id === element.id).length, 1);
    }
    assert.equal(descendants(root).filter((node) => node.tagName === "A").length, 1);
  }

  assertRecommendation(classics[0]);
  for (const expected of [classics[1], classics[2], classics[0], classics[1]]) {
    button.click();
    assertRecommendation(expected);
  }
});
