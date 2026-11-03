# UI leaf contracts

The FileDrop, HoverIntent, DragAndDrop and Tooltip production modules now expose
passive public Block contracts and ordinary implementation Layers. Their
implementations remain private. Handler constructors and transition algorithms
remain unchanged. Tooltip remains a flat leaf.

The original nine test files retain all146 scenarios. Two added DragAndDrop
regressions check an unrelated original child contract and reuse of one bound
helper across independently acquired graphs. Tests acquire the public contract
under `it.layer(layer, { buildPerTest: true })`; no handler mocks are needed.

## Shared framework seams

`view.mounts` lists registered Mount Definitions deliberately published through
callback attributes. It preserves the original native Handler requirements,
checks local registration at completion, and verifies the original references at
runtime. Private Mounts need no public declaration. Tooltip publishes its
AnchorTooltip through this channel and declares the effect through its original
Namespace before defining its contract.

Binding Command matchers retain immutable provenance from an acquired Binding to
its passive declaration. They compare that declaration and the exact occurrence
key without selecting a global current graph. The original native Binding path
continues to use object identity.

Each public subpath reexports its unique identity as a **type only**, allowing
inferred downstream declarations to name its contract. This does not add a key
value to the runtime namespace. Named public Block interfaces contain declared
contracts without implementation types.

## Verification

From the repository root with the built core package available:

```sh
node internal/layered-constructor/ui-leaves/verify.mjs
```

The verifier builds the four production leaf entrypoints and DatePicker into an isolated
package, then checks a four-child parent and a DatePicker parent through the actual package exports. It
runs source and runtime checks, emits declarations, and typechecks a relocated
consumer with `skipLibCheck: false`. Only built package files are available to the
relocated consumer.

The same proof checks whole-variant contract Bindings and extracted descriptor
OutMessage forwarding, including exact Model variants, init arguments, delivery
Context, parent ownership, payloads, exhaustive cases and parent OutMessages.
DatePicker retains all47 original Story and Scene scenarios and initializes
Calendar and Popover through their implementation Layers.

Seven copied-package mutations must fail:

- Missing exact whole-variant Model validation.
- Missing the requirement that a forward actually forwards a variant.
- Missing original child descriptor authentication.

- Missing published-Mount registration validation.
- Erased callback Mount authority.
- Missing Binding declaration provenance.
- Missing original Mount reference validation.

Restored source and runtime checks must pass. No mutation changes canonical
sources or build artifacts. Generated packages and logs stay under ignored
`verification/`.

The first four-leaf green result is
`verification/run-pvaX6w/results.json` on Node22.22.3. The production leaf tests
passed148/148, focused source checks passed, and touched-file lint passed. A
complete UI build and the repository compiler gates remain integration checks
owned by the lead.
