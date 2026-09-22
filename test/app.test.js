import test from "node:test";
import assert from "node:assert/strict";

import { getAppStatus } from "../src/app.js";

test("baseline app is ready for the first Requirement", () => {
  const result = getAppStatus();
  assert.equal(result.status, "READY");
  assert.match(result.purpose, /고전/);
});
