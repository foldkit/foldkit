"""Prepare the exact initial scale workload and native request probe.

Run after installing dependencies/building public packages in a checkout of the
pinned commit. Apply initial-candidate.patch only to the candidate checkout.

Usage: python3 prepare-scale.py /path/to/checkout baseline|candidate
"""

from pathlib import Path
import hashlib
import json
import shutil
import subprocess
import sys


checkout = Path(sys.argv[1]).resolve()
side = sys.argv[2]
if side not in ["baseline", "candidate"]:
    raise SystemExit("side must be baseline or candidate")
artifacts = Path(__file__).resolve().parent
folder = checkout / "packages/foldkit/type-performance"
subprocess.run(["node", str(folder / "workspace-generate.ts"), "16"], cwd=checkout, check=True)
file = folder / "workspace-groups-16.ts"
source = file.read_text()
source = source.replace(
    "import { Array, Effect, Layer, Option, Schema } from 'effect'",
    "import { Array, Effect, Layer, Option, Record, Schema } from 'effect'",
)
if side == "baseline":
    source = "import { makeMapBinding } from 'foldkit/mapBinding'\n" + source
for number in range(1, 17):
    name = f"WorkspaceGroup{number:03d}"
    definition = f"TypePerformance{name}Definition"
    source = source.replace(
        f"  rows: Schema.Array({name}Row),",
        f"  rows: Schema.Array({name}Row),\n  editorsById: Schema.Record(Schema.String, EditorBlock.Model),",
    )
    call = f"makeMapBinding({definition}, EditorBlock," if side == "baseline" else f"{definition}.makeMapBinding(EditorBlock,"
    start = source.index(f"const {name}OpenEditor =")
    source = source[:start] + f"const {name}MapBinding = {call} {{ field: 'editorsById' }})\n" + source[start:]
    start = source.index(f"    {name}RowsBinding.withOutMessagePolicy({{")
    source = source[:start] + f"    {name}MapBinding.withOutMessagePolicy({{ fold: (_key, outMessage) => {name}FoldEditorOutMessage(outMessage) }}),\n" + source[start:]
    start = source.index(f"const {name}Init =")
    end = source.index(f"const {name}EffectsLayer", start)
    section = source[start:end]
    section = section.replace("model: {", "model: { editorsById: {},", 1)
    source = source[:start] + section + source[end:]
file.write_text(source)
application = folder / "workspace-composition-16.ts"
application.write_text(application.read_text() + "\nvoid ApplicationBlock.Message\n")
subprocess.run([str(checkout / "node_modules/.bin/oxfmt"), str(file), str(application)], cwd=checkout, check=True)

# Root diagnostics must check the complete application rather than just a child.
source = application.read_text()
source = "import { modifyFields } from 'foldkit/struct'\n" + source
if "import { defineMessageUnion } from 'foldkit/message'" not in source:
    source = source.replace(
        "import * as Block from 'foldkit/block'\n",
        "import * as Block from 'foldkit/block'\nimport { defineMessageUnion } from 'foldkit/message'\n",
    )
source = source.replace(
    "  maybeLastSavedIssueId: Schema.Option(Schema.String),",
    "  maybeLastSavedIssueId: Schema.Option(Schema.String),\n  title: Schema.String,",
)
source = source.replace(
    "const ApplicationMessage = Schema.Never",
    "const ApplicationMessage = defineMessageUnion({ UpdatedTitle: { value: Schema.String } })",
)
source = source.replace(
    "const update = ApplicationComposition.makeUpdate({})",
    "const update = ApplicationComposition.makeUpdate({ UpdatedTitle: (model, { value }) => ({ model: modifyFields(model, { title: () => value }) }) })",
)
source = source.replace(
    "model: { maybeLastSavedIssueId: Option.none() },",
    "model: { maybeLastSavedIssueId: Option.none(), title: '' },",
)
application.write_text(source)
config = json.loads((folder / "tsconfig.json").read_text())
config["files"] = ["workspace-composition-16.ts"]
(folder / "tsconfig.json").write_text(json.dumps(config, indent=2) + "\n")

driver = checkout / "packages/foldkit/scripts/profile-block-language-service.ts"
driver.write_text(driver.read_text().replace(
    "'examples/workspace/src/update/initializeActiveChildren.ts'",
    "'examples/workspace/src/update/initializeRouteChildren.ts'",
))
scale = driver.with_name("profile-map-binding-scale.ts")
shutil.copyfile(driver, scale)
subprocess.run(["git", "apply", "--unidiff-zero", str(artifacts / "scale-probe.patch")], cwd=checkout, check=True)

expected = json.loads((artifacts / "initial-manifest.json").read_text())["inputs"][side]
for relative in [
    "packages/foldkit/type-performance/workspace-groups-16.ts",
    "packages/foldkit/type-performance/workspace-composition-16.ts",
    "packages/foldkit/type-performance/tsconfig.json",
    "packages/foldkit/scripts/profile-block-language-service.ts",
    "packages/foldkit/scripts/profile-map-binding-scale.ts",
]:
    actual = hashlib.sha256((checkout / relative).read_bytes()).hexdigest()
    if actual != expected[relative]["sha256"]:
        raise RuntimeError(f"Prepared file differs from the recorded experiment: {relative}\n{actual}")
print(side, "exact workload/probe hashes verified")
