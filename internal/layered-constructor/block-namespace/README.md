# Canonical Block authoring namespace

This checkpoint exposes independent-contract authoring through `foldkit/block`
and the root `Block` namespace. Existing native authoring stays available for
unchanged compiler fixtures and earlier experiments.

## Public spelling

- `Block.makeDefinition(id, { key, Model, Message, Init, ... })` returns the
  independent Definition with `contract` and `makeBlock`.
- Schema-only configurations retain the native Definition and assembly API.
- `Block.makeNamespace(id).makeDefinition(...)` accepts both shapes. An
  independent declaration uses that namespace's original native owner, so
  Commands and Mounts declared before specialized Schemas retain their identity.
- `Block.makeFamilyDefinition(namespace, config)` establishes parametric contracts
  under that original shared owner. The standalone function also retains its
  string-id form. The Namespace stays a lightweight authoring value.
- `Block.ViewBuilderFor` accepts either Composition without widening its graph.
- Named public contract, Binding, input, effects and executable types are
  available through the canonical Block namespace. The native type aliases keep
  their existing meanings.

Prebound configurations follow the same selection rules as inline values.
Missing `key` or `Init`, forged keys, broad or union keys, and broad independent
namespace ids reject. A mutable prebound object can widen a symbol property;
`Object.freeze` preserves the exact identity without a cast.

## Verification

Run from the repository root after building core:

```sh
node internal/layered-constructor/block-namespace/verify.mjs
node internal/layered-constructor/testing-public/verify.mjs
node internal/layered-constructor/testing/verify.mjs
node packages/foldkit/scripts/check-block-type-performance.ts
node packages/foldkit/scripts/check-emitted-declarations.ts
```

`verify.mjs` copies the package and checks source, six runtime cases, declaration
emission, and a physically relocated declaration consumer with `skipLibCheck:
false`. Its six copied-package controls remove native discrimination, remove
the independent ViewBuilder path, misroute incomplete configurations, and lose
the original shared namespace owner, lose the standalone family owner, and
remove nominal namespace authentication. Every control must fail for its intended
reason before restored checks pass. Original source and built files are never
mutated by those controls.

The source controls check canonical owner, Model, Message, field helper, Binding
helper, and OutMessage-fold contracts, including extracted helpers from emitting
and non-emitting Definitions. They use only published entrypoints. The obsolete
comparison against an earlier research Definition encoding was removed when its
package subpath was retired. Private dispatch tags remain readable without
allowing forged deliveries.

Latest successful namespace artifacts:
`verification/run-NJwT8R`; summary: `/private/tmp/foldkit-namespace-canonical-verify.log`.
Canonical testing: `testing-public.log`; scoped testing: `scoped-testing.log`.
The latter retains all 27 scoped Story/Scene tests and their lifetime controls.

## Compiler boundaries

The unchanged seven-case gate passes; see `compiler-budgets.log`.

| Fixture                 | Instantiations |   Types |     Existing maxima |
| ----------------------- | -------------: | ------: | ------------------: |
| Machine search          |         81,802 |  18,091 |     83,700 / 18,800 |
| Workspace, eight groups |      4,262,517 | 277,981 | 4,515,010 / 299,721 |
| Wide Subscriptions      |        547,955 |  24,233 |    548,740 / 24,583 |

Two structural implementation changes keep the canonical surface within those
ceilings:

1. A named Definition interface forwards the existing fixed helper members.
   Conditional Schema and symbol members retain the original type projection.
   This defers the full helper graph until a member is used.
2. The passive `InitStep` and `init` primitive belongs to shared simulation
   internals, alongside the machinery used by both core Story and Scene. Those
   modules reexport the one function; the earlier experimental path reexports
   it too. Root and subpath helper identities stay equal.

Copied-declaration diagnosis found that a raw overload intersection with the
expanded Definition exceeded the Machine ceiling. A separate static factory
signature or callable interface did not help. Duplicate independent initializer
exports through the two root testing namespaces exceeded the Workspace ceiling.
Named test-facade interfaces did not help. Shared primitive ownership passed both
gates. No import-order directives, fixture edits or budget increases were used.

`diagnose.mjs` preserves the exploratory copied-declaration experiments and
their per-case logs under `compiler-diagnosis/`. Its historical comparison cases
depend on their recorded earlier checkpoint copies. The acceptance verifier and
official compiler gate above are self-contained against the current build.

## Query migration boundary

None of the seven performance fixture sources directly calls Query. The active
native Query declaration consumers are `query-block` and `query-policy`
acceptance, rejection and emitted-consumer files under
`packages/foldkit/declaration-tests/`. A deliberate production Query factory
migration must update those active consumers to acquired descriptors, retain
their exact channel and rejection checks, and preserve the seven performance
sources and budgets. Pure transition tests can retain an explicitly internal
native implementation seam; the public factory should not gain a silent legacy
overload.

## Shared family owner and handler recipes

The shared-family source and relocated consumer exercise the standalone namespace
argument without application annotations or a second owner. Runtime construction
and a real original Mount confirm the shared identity. Erased forged namespace
objects reject before authoring a family. The three active namespace-family
call sites, Combobox Single, Combobox Multi, and the generic factory documentation
snippet, now use this spelling.

The latest seven-fixture gate is recorded in
`../view-composition/compiler-budgets-final.log`; the earlier table above remains
its recorded checkpoint. The complete current emitted-declaration gate is
`../view-composition/canonical-emitted-final.log`.

`host-probe/handler.ts` is a focused source witness for explicit handler recipes
on an ordinary independent Block. The original Command omits `handler`; its
original `toLayer` recipe becomes the completed Block's `EffectsLayer`, with
KeyValueStore declared as an ordinary runtime Service. Pending native
`hostHandlers` plus later descriptor reselection is not supported on ordinary
independent descriptors. The family selector and the existing native completion
path retain their distinct host-handler contracts. The source witness keeps both
unsupported ordinary forms rejected and records its typecheck in
`host-probe/source.log`.
