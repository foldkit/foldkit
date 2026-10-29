# Mount removal during setup | October 29, 2026

## Report and repair

[EduSantosBrito's report on #1853](https://github.com/foldkit/foldkit/pull/1853#issuecomment-6502029067)
identifies a separate lifecycle defect from the Effect 4.1 dependency upgrade.
The closed contribution's head is
`99f6ea6f96fc94db90364df978ba603035732429`.

The preview checkpoint `6b89fb631bd8fad8d65c1b4357e8a9878011106c` reproduces
the defect. Mount setup can synchronously remove its host through a DOM patch
before Foldkit registers the running fiber and cleanup. The acquired resource
then leaks, and a Message can escape after removal.

The repair registers cleanup, element state, Block occurrence tracking and
DevTools tracking inside `Effect.withFiber`, before acquisition begins. A
replacement still waits for the preceding Mount's cleanup and its occurrence's
start barrier. Started notifications occur when acquisition actually starts;
the lifecycle also guards dispatch after removal. Internal tracking accepts
Effect's erased fiber handle without changing the public authoring contracts.

## Verification

- The new regression removes the host through a reentrant Snabbdom patch.
  Before the repair, it observes zero cleanup calls and a post-removal Message.
  After the repair, cleanup runs exactly once and immediate and later completion
  attempts produce no Messages.
- Five affected core lifecycle suites pass: 62 tests, including replacement,
  Block teardown, view state and Composition execution. The full UI suite passes
  all 1,336 tests.
- Core and UI source/emitted-declaration checks and all seven unchanged compiler
  ceilings pass. These checks do not measure editor latency or rendering speed.
- All 53 workspace package typechecks, affected base/Effect lint and formatting
  pass. Website API generation retains its existing external-link warnings.
- Fresh packed public types, shared-Schema workspace execution, one physical
  Effect 4.1.0 installation and the existing three-browser SSR/hydration gate
  pass. The browser fixtures do not contain Mounts; the focused core test is
  the evidence for synchronous setup removal.

Removing only the explicit dispatch-active guard does not fail the new
regression: Effect interruption also suppresses its cooperative producer.
The regression establishes registration ordering and the observed cleanup and
delivery contract, without independently proving the dispatch guard's necessity.

Source/artifact hashes, before/after logs and verifier receipts are under
`/private/tmp/foldkit-preview-feedback-20261029-1421`, prefixed `mount1853-`.
The earlier Effect integration receipt retains its original checkpoint.

## Integration boundary

This repair belongs to the isolated preview follow-up. It is not evidence that
Foldkit main or the published preview already contains the fix. PR #1850 stays
draft while final review and CI run. The published Ready snapshot is unchanged;
publication requires the user's approval. No contributor reply was posted.
