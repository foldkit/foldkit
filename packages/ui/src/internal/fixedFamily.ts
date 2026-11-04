import { Context, Effect, Layer, Option } from 'effect'
import * as BlockFamily from 'foldkit/internal/block'

/** @internal Retains one authenticated executable under a closed family provider. */
export const makeFixedFamilyLayer = <
  Implementation,
  Error,
  Requirements,
  ReaderError,
  ReaderRequirements,
  Proof,
  Facts,
>(
  block: object,
  implementation: Layer.Layer<Implementation, Error, Requirements>,
  readExecutable: Effect.Effect<object, ReaderError, ReaderRequirements>,
  proof: Context.Service<Proof, Readonly<{ executable: object }>>,
  facts: Context.Service<Facts, Readonly<Record<never, never>>>,
) => {
  const captures = new WeakSet<object>()
  const captureExecutable = (executable: object) => {
    const capture = Object.freeze({ executable })

    captures.add(capture)

    return capture
  }
  const capturedExecutable = Effect.map(
    Effect.serviceOption(proof),
    maybeCapture =>
      Option.map(maybeCapture, capture => {
        if (!captures.has(capture)) {
          throw new Error(
            '[foldkit] A fixed family requires its original captured provider.',
          )
        }

        return capture.executable
      }),
  )

  BlockFamily.registerFixedProviderGuard(block, capturedExecutable)

  return Layer.mergeAll(
    implementation,
    Layer.provide(
      Layer.effect(proof, Effect.map(readExecutable, captureExecutable)),
      implementation,
    ),
    Layer.succeed(facts, {}),
  )
}
