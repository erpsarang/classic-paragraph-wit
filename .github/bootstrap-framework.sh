#!/usr/bin/env bash
set -euo pipefail

SOURCE_REPO="https://github.com/erpsarang/self-improvement-mvp.git"
SOURCE_SHA="611a28c7f1c8786d0c9091f18c4f8ed622c1ab5c"
SOURCE_ROOT="/tmp/framework-source"

rm -rf "$SOURCE_ROOT"
git clone --no-checkout "$SOURCE_REPO" "$SOURCE_ROOT"
git -C "$SOURCE_ROOT" checkout --detach "$SOURCE_SHA"
test "$(git -C "$SOURCE_ROOT" rev-parse HEAD)" = "$SOURCE_SHA"

python3 <<'PY'
import hashlib
import json
import pathlib
import shutil

source_root = pathlib.Path("/tmp/framework-source")
target_root = pathlib.Path.cwd()
source_sha = "611a28c7f1c8786d0c9091f18c4f8ed622c1ab5c"

ownership = json.loads(
    (source_root / "policy/framework-distribution-ownership.v1.json").read_text(encoding="utf-8")
)
if ownership.get("sourceRepository") != "erpsarang/self-improvement-mvp":
    raise SystemExit("Unexpected canonical source repository")
entries = ownership.get("entries")
if not isinstance(entries, list) or len(entries) != 70:
    raise SystemExit("Expected exactly 70 Framework ownership entries")

non_workflow = [e for e in entries if not e["targetPath"].startswith(".github/workflows/")]
workflow = [e for e in entries if e["targetPath"].startswith(".github/workflows/")]
if len(non_workflow) != 55 or len(workflow) != 15:
    raise SystemExit(f"Unexpected ownership split: non-workflow={len(non_workflow)} workflow={len(workflow)}")

for entry in non_workflow:
    src = source_root / entry["sourcePath"]
    dst = target_root / entry["targetPath"]
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(src, dst)

(target_root / "README.md").write_text(
    f"""# classic-paragraph-wit

유명한 고전의 한 문단을 추천하고, 그 문단에서 이어지는 짤막한 인생의 위트를 전하는 App입니다.

현재는 **Framework bootstrap baseline**만 준비되어 있습니다. 실제 추천 기능은 첫 Requirement부터 AI Development Framework를 통해 구현합니다.

## Framework baseline

- canonical: `erpsarang/self-improvement-mvp`
- source SHA: `{source_sha}`
- final merge: Human-only
- Auto Merge: 사용하지 않음

## App baseline

```bash
npm test
npm run build
```
""",
    encoding="utf-8",
)

package = {
    "name": "classic-paragraph-wit",
    "version": "0.0.0",
    "private": True,
    "type": "module",
    "scripts": {"test": "node --test", "build": "node --check src/app.js"},
}
(target_root / "package.json").write_text(
    json.dumps(package, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
)
lock = {
    "name": "classic-paragraph-wit",
    "version": "0.0.0",
    "lockfileVersion": 3,
    "requires": True,
    "packages": {"": {"name": "classic-paragraph-wit", "version": "0.0.0"}},
}
(target_root / "package-lock.json").write_text(
    json.dumps(lock, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
)

(target_root / "src").mkdir(parents=True, exist_ok=True)
(target_root / "src/app.js").write_text(
    """export function getAppStatus() {
  return {
    status: "READY",
    purpose: "유명한 고전의 한 문단을 추천하고 짤막한 인생의 위트를 전한다.",
  };
}
""",
    encoding="utf-8",
)
(target_root / "test").mkdir(parents=True, exist_ok=True)
(target_root / "test/app.test.js").write_text(
    """import test from "node:test";
import assert from "node:assert/strict";

import { getAppStatus } from "../src/app.js";

test("baseline app is ready for the first Requirement", () => {
  const result = getAppStatus();
  assert.equal(result.status, "READY");
  assert.match(result.purpose, /고전/);
});
""",
    encoding="utf-8",
)

def digest(p: pathlib.Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()

mismatches = []
for entry in non_workflow:
    src = source_root / entry["sourcePath"]
    dst = target_root / entry["targetPath"]
    if not dst.exists() or digest(src) != digest(dst):
        mismatches.append(entry["targetPath"])
if mismatches:
    raise SystemExit("Framework exact-copy mismatch: " + ", ".join(mismatches))

app_files = {"README.md", "package.json", "package-lock.json", "src/app.js", "test/app.test.js"}
framework_targets = {entry["targetPath"] for entry in entries}
collisions = sorted(app_files & framework_targets)
if collisions:
    raise SystemExit("App/Framework collision: " + ", ".join(collisions))

print(f"Framework non-workflow exact match: {len(non_workflow)}/{len(non_workflow)}")
print("Workflow files reserved for trusted GitHub connector: 15")
print("App/Framework collision: 0")
PY

npm test
npm run build

rm -f .github/bootstrap-framework.sh

git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
git add -A
git commit -m "chore: bootstrap Framework non-workflow files and App baseline"
git push origin HEAD:main
