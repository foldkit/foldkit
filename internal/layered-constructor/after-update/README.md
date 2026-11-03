# Owned after-update research

This is an archived, unapproved prototype for [#1868](https://github.com/foldkit/foldkit/issues/1868). Its production source changes have been restored. No public API is installed by these files. Design approval is pending; the feature has not been closed or deferred.

## Artifacts

- `prototype.patch`: exact final source diff, including the additional inventory-callability validation described below. This last validation was added after the recorded checks and is **not yet verified**.
- `last-tested.patch`: preceding source diff used for the four passing runtime tests and inference investigation.
- `fixtures/afterUpdate.test.ts`: original focused source-test fixture, to be placed at the path recorded in `baseline.json` only when the prototype is explicitly resumed.
- `inference.ts` and `tsconfig.inference.json`: current-signature diagnostic matrix. These intentionally fail with the archived prototype; they are not part of a production gate.
- `UNAPPLIED-context-only-probe.txt`: rejected, unapplied inference proposal and automatic approval review reason. Do not apply or execute it without fresh authorization.
- `results/`: focused runtime receipt and exact diagnostic matrix.

The patch files preserve raw unified-diff context markers, including the space
on a blank context line. The local Git attributes treat those patches as data
for whitespace checking; ordinary source and documentation checks are unchanged.

The patch is based on the exact commit in `baseline.json`. Resume by reviewing/applying the patch and copying the fixture to its recorded original path. The fixture's imports are intentionally preserved for that original path. Current production sources do not contain `withAfter`, so running these archived fixtures directly against the restored source is not an acceptance test.

## What worked

The four focused runtime tests passed: deferred execution with the fully updated Model and preservation of the original OutMessage; one parent tail after a real routed child update and its parent fold; refusal of foreign plans and arbitrary native update wrappers; refusal of an erased competing OutMessage. The ordinary direct and curried calls in the first case behaved alike.

A standalone extracted producer, including a Definition-owned Step, passes the exact existing Step/channel validators. A direct inline Commands-helper producer also passes the diagnostic matrix.

## Typing limitation

The constrained provisional signature rejects valid inline focused fields, general Steps, `Update.combineSteps`, raw nested Model callbacks, and even an inline call to an extracted producer. It infers the broad contextual Step hint rather than the exact callback return. This does **not** meet the required portable inline authoring experience and must not ship in this form.

The only accepted inline form in the measured matrix was `() => Definition.makeCommandsStep(() => [RecordCount()])`. Passing a standalone extracted producer directly also succeeded. These observations are narrow; they do not establish generic-family or declaration portability.

The rejected follow-up would have removed only the contextual Step return hint while retaining both exact validators and the resolved silent-OutMessage check. Automatic approval review considered that change a risk of weakening validation. It was not applied, and no isolated retry was performed.

## Safety still to prove

The final archived patch additionally requires the returned Step to accept the current Composition graph, matching the graph input of ordinary update handlers. That small addition is unverified. The full proof still needs wrong Model, foreign graph, hidden child-policy OutMessage, input-only Command, and Service/evidence controls; optional/default/rest Context; strict emitted and relocated consumers; unchanged compiler ceilings. No emitted, generic-family, or compiler-performance success is claimed.

The hook covers update only. It does not wrap init or receive. There is no Runtime input queue or broad all-transition promise.
