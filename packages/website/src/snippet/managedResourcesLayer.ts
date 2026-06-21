import { Context, Effect, Layer, Option, Schema as S } from 'effect'
import { ManagedResource } from 'foldkit'

// A heavy engine whose init and teardown are packaged as an Effect Layer.
interface ChessEngine {
  readonly bestMove: (fen: string) => Effect.Effect<string>
}

class ChessEngineService extends Context.Service<
  ChessEngineService,
  ChessEngine
>()('ChessEngineService') {}

declare const engineLayer: Layer.Layer<ChessEngineService>

// 1. The Managed Resource holds the bare service value, with no wrapper.
const Engine = ManagedResource.tag<ChessEngine>()('ChessEngine')

// 2. acquire runs with the resource-lifetime Scope in its context, so
//    Layer.build registers the Layer's finalizers on it. They tear down when
//    the resource is released or re-acquired.
const managedResources = ManagedResource.make<Model, Message>()(entry => ({
  engine: entry(S.Option(S.Struct({ slug: S.String })), {
    resource: Engine,
    modelToMaybeRequirements: model =>
      Option.map(model.maybeAnalysisSlug, slug => ({ slug })),
    acquire: () =>
      Layer.build(engineLayer).pipe(
        Effect.map(context => Context.get(context, ChessEngineService)),
      ),
    // The scope closes on release, so the Layer finalizers run automatically.
    release: () => Effect.void,
    onAcquired: () => StartedEngine(),
    onReleased: () => StoppedEngine(),
    onAcquireError: error => FailedStartEngine({ error: String(error) }),
  }),
}))
