# November 8 preview feedback

The read-only GitHub refresh found a new [pilot report from Filip](https://github.com/foldkit/foldkit/pull/1655#issuecomment-6721308446), targeting published preview `54f8bcd4`. The current follow-up starts at `a0b182c819`. Main remains `a471adb24d`; #1922 had no newer technical review. No external response was posted.

## Supplied Models in connected combinations

The reported `Update.combineSteps(modifiedModel, steps)` failure reproduces on current source. When a Step returns a deferred operation, the old resolver restarts the sequence from the enclosing handler's Model. That discards changes already supplied to the combination. The published preview contains the same faulty restart branch; this investigation has not run a separate older installed package.

The correction retains the invocation's initial Model. It preserves the existing resolved restart, sequential Model changes, accumulated Commands, registered child execution and OutMessage rejection. The data-first and applied data-last forms share that boundary.

The new lower-level checks fail before the correction: a supplied count of 10, followed by three increments, produces 4 instead of 13 when the enclosing Model has count 1. The public Block regression also covers parent changes, a child InMessage, nested combinations, unchanged input Models and exact parent/child Command order and arguments.

The first complete core run exposes an older test that caches a data-first result through erased calls and expects it to rebase later. That expectation conflicts with retaining an explicitly supplied Model. The test now caches an unapplied data-last Step and installs it directly as the handler. It still keeps the previously produced keyed operation inside that Step, checks membership after removal, and verifies that no stale reset runs. Reusable Steps receive each invocation's Model; applied results retain their supplied Model.

The realistic regression also exposes a narrower inference limitation: an inline `Layer.merge` alongside the connected update is rejected by record completion. Naming only `EffectsLayer` makes the ordinary record pass, with init and update still inline and no annotations, type arguments or casts. Naming init or update alone does not help. The tested connection projections and completion signatures do not solve that inline case while preserving validation. No signature or validator change is adopted. The regression follows the existing named-EffectsLayer convention; the inline merged-Layer case remains open. Providing a descendant Command handler from the parent is not a valid workaround.

The [frozen inference comparison](preview-feedback-20261108/measurements/inference-archive.json) retains both TypeScript 7 fixtures, exact source/tool inputs, stdout and statuses. The inline form fails with TS2769; naming EffectsLayer passes. Two failed temporary-copy preparations remain setup failures. The exploratory encoding matrix is separate from that final two-fixture comparison, and no universal TypeScript limitation or performance improvement is claimed.

## Other parts of the report

- Active migration guidance now distinguishes exact repository verification at Effect 4.1.0 from the supported `~4.1.0` peer range. It does not claim every patch has been tested.
- Manifest and third-party constraint reconciliation remain the first upgrade steps. Manual removal of affected lockfile records is labelled as the reporter's un-reproduced fallback. Preserve the original evidence, unrelated records, `npm ci` and one-runtime checks.
- Active guidance shows the existing explicit local-Message operation declaration. This is documentation of a supported path, not a new operation API.
- A Mount-specific custom Scene view failure was not reproduced. Existing source coverage accepts a concrete Mount-capable builder. A mismatch in the complete dispatch Message remains a separate contract error; an exact failing source is still needed to establish the reported defect.
- Application test imports can select original child Commands from their structural modules. Public UI components already expose their intended `test` namespaces. There is no newly established framework export defect.
- Opaque completion diagnostics, complete-dispatch type discovery, retained test construction requirements and duplicate-package identity remain review topics. This checkpoint does not count them as fixed or approved deferrals.

The new RadioGroup contribution [#1924](https://github.com/foldkit/foldkit/pull/1924) concerns ordinary arrow-key behavior, rather than Blocks/Layers. It is recorded separately from this preview work. #1650's latest reply adds no new technical scope.

## Verification and holds

The [verification receipts](preview-feedback-20261108/measurements/receipts.json) pin selected raw logs, their compressed storage and the four final source files. The first complete core failure remains separate from the final passing run. These are selected verification receipts, not a complete archive of draft fixture checks or performance evidence.

All 4,369 core tests pass, with one skipped, and the complete core source typecheck passes after naming EffectsLayer. Restoring the original seed-loss branch makes exactly five new regression cases fail while all sixteen existing focused cases pass. The fix is restored. The migration snippet compiles against the built public surface, and the Website build passes. Exact-commit review, the normal push gate and remote checks still apply before pushing the completed fix. Rendering, editor latency, immediate operation-output precision, the inline Layer inference case and Website readiness remain open. Publication, a new Daybreak transfer and a main merge remain held.
