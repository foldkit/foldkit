# Private runtime Effect-channel audit

## Changes

- Tightened `constructed/runtime.ts`'s private `RuntimeReturn.commands` from
  `Command<unknown, any, any>` to `Command<unknown, never, any>`. Checked init and
  update results carry unfailable Commands. Handler-construction failures stay
  on the acquired `EffectsLayer`; this does not erase them.
- Added one explicit eleven-file override for
  `effecttsgo/any-unknown-in-error-context` in `.oxlintrc.effect.json`. It follows
  the existing policy for native Runtime, application, Command/Mount dispatch,
  resource-provider and hydration glue. No global rule was disabled.
- Replaced active runtime errors and TSDoc referring to a prototype or spike
  with Block contract/construction/Binding terminology. The invalid child error
  now requires an original registered Block contract instead of recommending an
  unpublished adapter. Reserved names, guards, and substantive error phrases
  are preserved. Native JavaScript prototype operations were not changed.

No casts, providers, execution order, catches, public channel checks, or runtime
effects were added or changed.

## Why the remaining erasure is necessary

The original log contains 95 findings across these eleven files. They occur
after checked authoring values enter heterogeneous WeakMaps, dynamically keyed
Context services, or an overload's erased dispatch implementation. The exact
public contracts are checked before that boundary and retain the original
generic error and Service types. These runtime paths must still propagate any
particular caller's constructor, provider, or callback channels.

Arbitrary Effect errors need not share an `Error` superclass, and arbitrary
Service identifiers have no smaller closed union available to the dispatcher.
Changing these channels to `never`, inventing one common Service identifier, or
asserting a narrower Effect would hide requirements or change failure behavior.
Changing `any` to `unknown` alone would not recover the relationship lost at the
heterogeneous registry and would not resolve this rule.

| File                                        | Erased values and the precise boundary                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `runtime/rootBlock.ts`                      | The authenticated construction registry stores different graph Layers and their private readers. `RootConstructionError`, construction requirements, runtime requirements, and runtime Services still project from each original descriptor. Acquiring its registered Layer cannot truthfully be called unfailable or closed to Services. |
| `runtime/programConstruction.ts`            | Provider plans contain arbitrary early and late Layers. They are composed and built under one host lifetime/MemoMap. `programConstructionTypes.ts` retains distinct constructor/runtime requirements and conditional provider guarantees; the existing host error policy remains unchanged.                                               |
| `experimental/hybrid/hybrid.ts`             | The private constructor compiler executes different checked constructor recipes and reconnects heterogeneous children. The typed authoring surface carries the concrete constructor error/requirements; runtime graph assembly cannot name those parameters after dispatch.                                                               |
| `experimental/constructed/symbolic.ts`      | Yielding a Binding looks up its authenticated child-construction recipe. The child's actual constructor error/requirements must flow through the yielded Effect. Public Binding helpers keep those channels and exact placement/owner evidence.                                                                                           |
| `experimental/constructed/runtime.ts`       | The executable wrapper builds arbitrary checked handler Layers, captures their Context, and wraps Commands. Graph constructors and dependency providers also differ per descriptor. Only Command invocation errors could be narrowed safely; constructor and handler-Layer errors/requirements remain distinct.                           |
| `experimental/contracted/familyRuntime.ts`  | Family recipes and handler selections are recovered from authenticated private registries. Specialization can have caller-specific construction and handler-build channels. The family contract/recipe evidence and concrete getter checks remain in the typed family surface.                                                            |
| `experimental/contracted/runtime.ts`        | Checked contract completion compiles a constructor and selected handlers, then registers the actual executable. Runtime-selected graph providers and Context keys are heterogeneous. Original owner/Schema/host-declaration and acquisition checks remain intact.                                                                         |
| `experimental/layered/testing/withBlock.ts` | The implementation acquires different registered getters/default Layers and accepts synchronous callbacks or arbitrary Effects. `TestEffect` and the public overload preserve getter, Layer, and callback channels; the implementation must also reject Promise callbacks and retain scoped cleanup.                                      |
| `experimental/layered/testing/story.ts`     | The erased subject dispatcher invokes `withBlock` for different Block contracts. Its public overload retains the concrete `TestEffect` error/requirements and exact Model/Message/OutMessage contracts.                                                                                                                                   |
| `experimental/layered/testing/scene.ts`     | The same heterogeneous acquisition is combined with a checked default renderer, Inputs, Context, and optional routing. Public channels remain concrete; the runtime dispatch implementation cannot safely replace them with `never`.                                                                                                      |
| `experimental/server/server.ts`             | The rendering implementation resolves either a native root or an authenticated constructed root. Public render overloads retain constructor error/requirements plus `RenderError`; private resolution must preserve the actual constructor's channels. Server rendering still does not build handler Layers.                              |

## Rule scope

Only `any-unknown-in-error-context` is treated specially in this new override.
The other Effect rules remain active, including unsafe assertions, leaking
requirements, catches, Layer composition, and construction/lifetime checks.
The override lists the exact runtime files; it does not cover application code,
declaration fixtures, `programConstructionTypes.ts`, or the separate public
contract/authoring/effects/family validation modules.

This exception documents an implementation boundary. It does not authorize
erasing error or Service channels in a public authoring helper. Those contracts
remain covered by the normal source, rejected-wiring, emitted/relocated, and
runtime gates.

## Verification

- Full core source check passed: `/private/tmp/foldkit-erasure-source.log`.
- Focused Effect lint with `--deny-warnings` passed for all eleven files:
  `/private/tmp/foldkit-erasure-effect-lint.log`.
- Five focused constructor/contract/testing runtime files passed all 21 tests:
  `/private/tmp/foldkit-erasure-runtime.log`.
- Active non-test TypeScript under the constructed/contracted/hybrid/layered
  directories has no remaining `prototype` or `spike` wording.

The root agent owns the final full `lint:ci` and format run. No build, commit,
push, or publication was performed for this audit.
