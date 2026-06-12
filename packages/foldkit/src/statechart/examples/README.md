# Statechart Examples

Five scenarios where the transition table earns its keep over a hand-written
`update` branch. The connection machine in `../statechart.test.ts` is the
canonical demo; these are the cases that motivated the spike's
recommendation. Each example is a self-contained test file (so it
typechecks, runs, and stays out of the build output) paired with a short
analysis.

Run them with `npx vitest run src/statechart/examples`.

| Example                   | Claim                                                                                    | Files                               |
| ------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------- |
| Stale async pruning       | Stale completions are dropped by topology, and generation checks collapse into one guard | `staleAsyncPruning.test.ts` / `.md` |
| Drag gesture recognition  | Adversarial pointer-event orderings become a fully decided state-by-event matrix         | `dragGesture.test.ts` / `.md`       |
| Resumable upload protocol | Spec legality is the table, and edge Commands form an assertable request sequence        | `resumableUpload.test.ts` / `.md`   |
| Per-row sync              | One definition amortizes across every instance, with Commands routed back per row        | `rowSync.test.ts` / `.md`           |
| Checkout wizard           | The generated diagram is the review artifact, and analysis catches orphaned steps        | `checkoutWizard.test.ts` / `.md`    |

The shared traits, in rough order of strength:

1. The (state, message) matrix is dense with combinations that must be
   rejected, and rejection should be observable (`Ignored`), not accidental.
2. Messages arrive from sources the app does not control (network, pointer
   hardware, timers) in orders the happy path never exercises.
3. One machine is instantiated many times, so the definition's fixed cost
   amortizes and its analysis certifies every instance.
4. The flow itself is a communication artifact that non-engineers review,
   so the generated Mermaid diagram replaces a drifting hand-drawn one.
