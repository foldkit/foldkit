# Portable fold result contracts

The canonical change is type-only. `MakeDescriptorOutMessageFold` now returns a named, portable result contract. The native `MakeOutMessageFold` signature, runtime helper, validation, Commands and policies are unchanged.

Each encoded row retains the original case tag, the entire case Step's graph requirement, and one output branch. Reconstitution groups by the original case tag before creating its callable Step. A conditional output therefore remains one callable returning a union; a handler that returns a union of Steps retains the native grouping as well.

The shared parent Model is omitted only when it is exactly the output Model. Literal/refined Models remain explicit. Extra fields, Command collection types, registration property value/presence/modifiers, and required FoldContext survive. Registration properties use named interfaces instead of introducing a public raw symbol. Commands are reconstructed as native arrays only when exact type equality proves that representation; tuple/custom collections use the original type.

`BindingSpecs` additionally compacts an exact readonly helper-only policy. The helper itself must equal the original normalized callable. Augmented helpers, mutable policy records, forwarding policies and custom folds retain their original type.

## Precision verification

Run from the isolated repository after building the core package:

```sh
FOLDKIT_FOLD_REVIEW_CURRENT=1 node internal/layered-constructor/emission-boundary/review-folds.mjs
FOLDKIT_FOLD_REVIEW_CURRENT=1 FOLDKIT_FOLD_REVIEW_TYPESCRIPT=6 node internal/layered-constructor/emission-boundary/review-folds.mjs
```

The runner copies the built package physically. The relocated consumer contains only emitted declarations, consuming tests and copied dependencies; neither accepted source fixture is present there. All checks use `strict` and `skipLibCheck: false`.

| Compiler            | Final receipt                                   | Results                                        |
| ------------------- | ----------------------------------------------- | ---------------------------------------------- |
| TypeScript 7.1 beta | `/private/tmp/fold-normalization-review-IFpChi` | Source, emission, relocation and restored pass |
| TypeScript 6.0.3    | `/private/tmp/fold-normalization-review-4FljRe` | Source, emission, relocation and restored pass |

Both runs prove bidirectional callable compatibility against the native helper and preserve exact payloads, parent context, Model refinement, graph requirements, registered results, silent/emitting branches, readonly fields and optional fields. They check all three policy fallback forms above.

Three independent mutations on copied declarations fail as intended:

- Splitting each conditional output into separate callable Steps fails callable parity.
- Removing graph requirements fails callable parity and makes the expected graph rejection unused.
- Removing the exact helper guard fails augmented-helper fallback parity.

The ordinary core declaration driver now includes the `descriptor-fold` group. The native `outmessage-fold` group remains unchanged. Scoped formatting, standard lint and Effect lint passed. No rendering or runtime performance claim follows from these type-only checks.

## Review findings that affected the implementation

A nested output-data alias still serialized the original Model/Cases in multi-case folds. Flat mutable internal rows followed by the public readonly tuple materialization avoid that alias retention while preserving callable grouping.

Source checking alone missed an optional-field serialization difference. Encoding and decoding Command properties through `Required<Value>[Key]` preserves `commands?: never`, optional collections and explicit `undefined` after emission. A constrained readonly-projection helper also simplified incorrectly; the final generic property-key projection preserves the Model field's actual readonly modifier.

The type-only reexport of `RegistrationEvidenceTypeId` did not resolve inferred anonymous computed-key nameability. It was not added. The named result and Command registration facets fix that concrete issue without exposing runtime authority or changing evidence.
