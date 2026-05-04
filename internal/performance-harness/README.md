# Foldkit performance harness

Internal Vite + Foldkit app for reproducing and verifying fixes to runtime hot-path performance regressions. Not a Foldkit example. Not published. Not listed in the website grid or in `create-foldkit-app`.

## Use

```sh
pnpm --filter @foldkit/performance-harness dev
```

DevTools is enabled. Open the panel, then exercise scenarios. The `Tick` button dispatches a small Message whose handling cost should be imperceptible. The other buttons load large payloads or Models so subsequent `Tick` dispatches will hang on whatever runtime path is regressing.

## Adding scenarios

Add a scenario whenever a runtime hot-path regression is discovered. Name it after the concern it isolates, not the bug that surfaced it. Keep the harness deliberately ugly: layout and copy don't matter. What matters is that the symptom is reproducible in one click.

Scenarios currently covered:

- **Large Message payload**: walks captured Message bodies in the DevTools store. Reproduced the Effect 4 `Equal.equals` regression on `S.Unknown`.
- **Large Model array**: walks the Model array via Schema-derived equivalence on every dispatch.

Future candidates: deep Submodel nesting, high-frequency dispatch loops, large view trees.
