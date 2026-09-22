import test from "node:test";
import assert from "node:assert/strict";

import { getAppStatus, getRecommendation, runApp } from "../src/app.js";
import { classics } from "../src/classics.js";

test("baseline app is ready for the first Requirement", () => {
  const result = getAppStatus();
  assert.equal(result.status, "READY");
  assert.match(result.purpose, /고전/);
});

test("each request selects one classic from the recommendation data", () => {
  assert.equal(getRecommendation(() => 0), classics[0]);
  assert.equal(getRecommendation(() => 1 - Number.EPSILON), classics.at(-1));
  assert.ok(classics.includes(getRecommendation()));
});

test("starting the app displays exactly one complete recommendation", (t) => {
  const output = t.mock.method(console, "log", () => {});
  runApp();
  assert.equal(output.mock.callCount(), 1);
  const [text] = output.mock.calls[0].arguments;
  const selected = classics.filter((classic) => text.includes(classic.title));
  assert.equal(selected.length, 1);
  const classic = selected[0];
  assert.equal(text, [
    `작품명: ${classic.title}`,
    `저자: ${classic.author}`,
    `추천 문단: ${classic.paragraph}`,
    `위트: ${classic.wit}`,
  ].join("\n\n"));
});
