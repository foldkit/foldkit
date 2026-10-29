"""Strictly consume emitted scale declarations without repository source paths.

Usage: python3 verify-scale-consumer.py /path/to/experiment-root
The experiment root contains baseline/, candidate/, and evidence/*-scale-declarations/.
"""

from pathlib import Path
import argparse
import hashlib
import json
import shutil
import subprocess
import time


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def manifests(folder):
    return {
        str(path.relative_to(folder)): {"bytes": path.stat().st_size, "sha256": digest(path)}
        for path in sorted(folder.rglob("*.d.ts"))
    }


parser = argparse.ArgumentParser()
parser.add_argument("experiment")
parser.add_argument("--sides", nargs="+", default=["baseline", "candidate"])
parser.add_argument("--prefix", default="")
arguments = parser.parse_args()
experiment = Path(arguments.experiment).resolve()
artifacts = Path(__file__).resolve().parent
results = {}
for side in arguments.sides:
    checkout = experiment / side
    label = arguments.prefix + side
    emitted = experiment / "evidence" / (label + "-scale-declarations")
    package = checkout / "packages/foldkit"
    output = experiment / "evidence" / (label + "-scale-relocated")
    output.mkdir(exist_ok=True)
    before = {"emitted": manifests(emitted), "packageDist": manifests(package / "dist")}
    shutil.copytree(emitted, output / "type-performance", dirs_exist_ok=True)
    for relative in before["packageDist"]:
        target = output / "dist" / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(package / "dist" / relative, target)
    shutil.copyfile(package / "package.json", output / "package.json")
    shutil.copyfile(artifacts / "scale-consumer.ts", output / "consumer.ts")
    shutil.copyfile(artifacts / "scale-consumer.tsconfig.json", output / "tsconfig.json")
    dependencies = output / "node_modules"
    dependencies.mkdir(exist_ok=True)
    for name in ["effect", "parse5", "@effect/platform-browser"]:
        target = dependencies / name
        target.parent.mkdir(parents=True, exist_ok=True)
        if not target.exists():
            target.symlink_to((package / "node_modules" / name).resolve(), target_is_directory=True)
    command = [str(checkout / "node_modules/.bin/tsc"), "-p", "tsconfig.json", "--listFiles", "--extendedDiagnostics"]
    start = time.monotonic()
    completed = subprocess.run(command, cwd=output, text=True, capture_output=True, timeout=120)
    elapsed = time.monotonic() - start
    log = completed.stdout + completed.stderr
    (experiment / "evidence" / (label + "-scale-consumer.log")).write_text(log)
    files = [Path(line).resolve() for line in completed.stdout.splitlines() if line.startswith("/") and Path(line).exists()]
    required = [output / "type-performance" / path for path in before["emitted"]]
    for path in required:
        if path.resolve() not in files:
            raise RuntimeError(f"{side}: emitted fixture was not reached: {path.name}")
    loaded_source = [str(path) for path in files if path.suffix == ".ts" and not path.name.endswith(".d.ts") and path != (output / "consumer.ts").resolve()]
    if completed.returncode != 0 or loaded_source:
        raise RuntimeError(f"{side}: strict relocated consumption failed ({completed.returncode}); repository/source files: {loaded_source}\n{log[-9000:]}")
    after = {"emitted": manifests(emitted), "packageDist": manifests(package / "dist")}
    if before != after:
        raise RuntimeError(f"{side}: source evidence/declarations changed while checking")
    results[side] = {
        "exitCode": completed.returncode,
        "elapsedSeconds": round(elapsed, 3),
        "strict": True,
        "skipLibCheck": False,
        "sourcePathMappings": False,
        "reachableFixtureDeclarations": len(required),
        "reachableDeclarationFiles": sum(path.name.endswith(".d.ts") for path in files),
        "nonConsumerSourceFiles": loaded_source,
        "inputDeclarationsUnchanged": True,
        "fixtureDeclarations": before["emitted"],
        "packageDistDeclarationCount": len(before["packageDist"]),
    }
    print(side, "strict relocated consumption passed", round(elapsed, 3), "seconds", flush=True)

text = json.dumps(results, indent=2) + "\n"
(experiment / "evidence" / (arguments.prefix + "scale-consumer-results.json")).write_text(text)
print(text)
