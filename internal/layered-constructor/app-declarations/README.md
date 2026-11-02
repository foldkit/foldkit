# Actual application declarations

This gate uses the real Workspace, Job Application, and Website projects. It
keeps their configured source and tests, emits declarations into a fresh
`verification/run-*` directory, and checks exported application roots from
source-free copies. The application files receive no declaration annotations or
casts.

Run from the repository root after coordinating a stable core/UI build:

```sh
node internal/layered-constructor/app-declarations/verify.mjs
```

The runner performs both checks even when whole-project emission fails, records
their statuses separately, and exits unsuccessfully if either requirement fails.
For focused use, run `emit.mjs`, then `consume.mjs` with its printed verification
directory.

The emission config extends each actual app config. It changes only emission
options and uses the repository as `rootDir`, accommodating app sources, Vite
configs, tests, and the Website's shared script imports. Output mirrors those
paths. Its file and byte totals therefore describe the whole configured project,
not just the import closure of `ApplicationBlock`.

The consumer receives only emitted application trees and physical copies of
built Foldkit, UI, DevTools, Markdown, and Vite-plugin packages. Dependencies use
normal package imports and one Effect runtime. Its typecheck sets
`skipLibCheck: false`. Checks preserve nested Model fields, local Message
payloads, startup arguments, graph acquisition, and external program
requirements. Copied real root, Composition, update, and view declarations are changed to
`any` individually; precision assertions must detect each lost contract, then
pass after restoration. Canonical app and package declarations are never mutated.

## Current whole-project result

`verification/run-ly0B7l/summary.json` records a passing whole-project gate for
all three apps: 122 Job Application declarations, 205 Workspace declarations,
and 459 Website declarations. Every extracted Composition, init, update, and
view emits alongside the completed Block.

The final run includes union-child policy validation, the nameable Binding
member, exact-Definition construction authentication, and generic-family input
validation. The canonical framework build hash is identical before and after
emission. The preceding `run-FWRQRY` receipt retains its earlier scope.

The source-free consumer now imports those intermediate exports too. It checks
exact parent Models and startup inputs and requires copied `any` mutations of
the root, Composition, update, and view to fail before each restored pass. All
three strict consumers pass and resolve zero original app or framework files.
Completed root sizes remain 45,528 / 95,118 / 112,220 bytes. The full configured
output is intentionally measured separately from those bounded root headers.

Earlier failures and partial output are preserved below as historical evidence.
The current representation and parity controls are described in
[the boundary report](../emission-boundary/REPORT.md).

## Initial findings

`verification/run-IEqISQ` preserves the first complete three-project emission
attempt. All three whole-project checks failed. Actual intermediate Composition,
init, update, and view exports still reached TS7056. Additional failures identified
public type-name reachability and Website embedding checks.

Job Application's completed root nevertheless emitted a 45,528-byte header. Its
strict source-free root consumer and copied `any` control passed in
`verification/run-IEqISQ/consumer-VoWkD6`. That artifact is explicitly labeled
partial: a usable completed root does not imply that all implementation exports
emit. The remaining files in that run are partial output and their byte totals
must not be presented as successful whole-project declaration sizes.

## Verified public roots after nameability fixes

`verification/run-sC8mRv` follows a coordinated core/UI rebuild. The framework
hash is identical before and after emission. All missing type-name and ordinary
semantic errors are gone. Every actual completed root emits without an app
annotation:

| Actual application | Root header bytes | Strict relocated root |
| ------------------ | ----------------: | --------------------- |
| Workspace          |            95,118 | Passed                |
| Job Application    |            45,528 | Passed                |
| Website            |           112,220 | Passed                |

`verification/run-sC8mRv/consumer-SgCTPF/results.json` records those three strict
consumer checks, the copied root-to-`any` failure and restored pass. The compiler's
resolved-file lists contain zero original app or framework files. Exact Model
fields, Message payloads, startup inputs and external program requirements remain
usable from physical built-package copies.

**Whole-project emission still fails TS7056** in exported intermediate
Compositions, init, update, and view Plans. The Website also has UI page view
variants reaching the limit. Partial declaration output totals are recorded
separately and are not successful full-project size measurements. The public-root
success does not satisfy or conceal this broader failed gate. Both scripts keep a
failing exit status while that requirement remains unmet.

The nameability fixes are type-only public aliases for the existing Subscription
contract, Multi Listbox/Combobox contracts and validation Rules, plus an exported
nominal key for CoverLetter. They add no app builder annotations, wrappers or
behavior changes. The framework's intermediate serialization is investigated
separately. All initial failure artifacts remain intact.

The final `verification/run-jnAmOh` run follows the lightweight validation
contract split and Website view-input extraction. Its
`consumer-4jAqCb` checks all three public roots, zero reads from the original
trees, the failing precision control, and restored declarations. Root byte
counts are unchanged. The broader gate fails only the same intermediate TS7056
nodes: four in Job Application, five in Workspace and 38 in Website.

The InMessage follow-up repeats this gate in `verification/run-hNAsyL`.
All three public roots still pass strict source-free consumption and the copied
precision control in `consumer-y7aJ4m`. Root header sizes are unchanged.
Whole-project emission still fails at the same four, five, and 38 intermediate
nodes, all with TS7056; this remains a failed broader gate.
