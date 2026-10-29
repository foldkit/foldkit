import {
  Context,
  Data,
  Effect,
  Exit,
  Layer,
  Option,
  Schema,
  Scope,
} from 'effect'
import { describe, expect, expectTypeOf, it } from 'vitest'

import type { ValidateConstructionRequirements } from '../block/scope.js'
import * as Command from '../command/index.js'
import {
  type Handler,
  type HandlerOf,
  type ManagedResource,
  type ServiceOf,
  type ServicesOf,
  type Value,
  aggregate,
  lift,
  make,
  tag,
} from './managedResource.js'

// A child Block owns a session resource and mounts/unmounts.

type ChildModel = Readonly<{ maybeToken: Option.Option<string> }>

type ChildMessage = Readonly<{
  tag: 'AcquiredSession' | 'ReleasedSession' | 'FailedSession'
}>

const childMessage = (tag: ChildMessage['tag']): ChildMessage => ({ tag })

const ConstructionManagedResourceCommand = Command.define(
  'ConstructionManagedResourceCommand',
  { messages: [Schema.String] },
)

const SessionResource = tag<Readonly<{ token: string }>>()('SessionResource')

const sessionSchema = Schema.Option(Schema.Struct({ token: Schema.String }))
type sessionSchema = typeof sessionSchema.Type
const annotatedSessionSchema: Schema.Schema<sessionSchema> = sessionSchema
const idRequirementsSchema = Schema.Struct({ id: Schema.String })
type idRequirementsSchema = typeof idRequirementsSchema.Type
const tokenRequirementsSchema = Schema.Struct({ token: Schema.String })
type tokenRequirementsSchema = typeof tokenRequirementsSchema.Type
const unionSessionSchema = Schema.Union([
  Schema.Option(idRequirementsSchema),
  Schema.Option(tokenRequirementsSchema),
])
type unionSessionSchema = typeof unionSessionSchema.Type

const childManagedResources = make<ChildModel, ChildMessage>()(entry => ({
  session: entry('ManageChildSession', sessionSchema, {
    resource: SessionResource,
    modelToMaybeRequirements: model =>
      Option.map(model.maybeToken, token => ({ token })),
    onAcquired: () => childMessage('AcquiredSession'),
    onReleased: () => childMessage('ReleasedSession'),
    onAcquireError: () => childMessage('FailedSession'),
  }),
}))
const ManageChildSessionLayer = childManagedResources.session.toLayer(
  Effect.succeed({
    acquire: ({ token }) => Effect.succeed({ token }),
    release: () => Effect.void,
  }),
)

class Prefix extends Context.Service<Prefix, { readonly value: string }>()(
  'ManagedResourceHandlerTestPrefix',
) {}

class Suffix extends Context.Service<Suffix, { readonly value: string }>()(
  'ManagedResourceHandlerTestSuffix',
) {}

class BuildCount extends Context.Service<
  BuildCount,
  { readonly increment: () => void }
>()('ManagedResourceHandlerTestBuildCount') {}

class AcquireFailure extends Data.TaggedError('AcquireFailure')<{}> {}

class ReleaseFailure extends Data.TaggedError('ReleaseFailure')<{}> {}

class BuildGate extends Context.Service<
  BuildGate,
  { readonly isFailure: boolean }
>()('ManagedResourceHandlerTestBuildGate') {}

const LayeredSessionResource = tag<string>()('LayeredSessionResource')

const contextualSessionSchema = Schema.Option(
  Schema.Struct({
    id: Schema.String,
    maybeCount: Schema.Option(Schema.Number),
    label: Schema.optional(Schema.String),
  }),
)
type contextualSessionSchema = typeof contextualSessionSchema.Type

const layeredManagedResources = make<ChildModel, ChildMessage>()(entry => ({
  session: entry('ManageSession', sessionSchema, {
    resource: LayeredSessionResource,
    modelToMaybeRequirements: model =>
      Option.map(model.maybeToken, token => ({ token })),
    onAcquired: () => childMessage('AcquiredSession'),
    onReleased: () => childMessage('ReleasedSession'),
    onAcquireError: () => childMessage('FailedSession'),
  }),
}))

const attachedManagedResources = make<ChildModel, ChildMessage>()(entry => ({
  session: entry('AttachedManageSession', sessionSchema, {
    resource: LayeredSessionResource,
    modelToMaybeRequirements: model =>
      Option.map(model.maybeToken, token => ({ token })),
    onAcquired: () => childMessage('AcquiredSession'),
    onReleased: () => childMessage('ReleasedSession'),
    onAcquireError: () => childMessage('FailedSession'),
    handler: function* () {
      yield* Effect.scope
      const { isFailure } = yield* BuildGate

      if (isFailure) {
        return yield* Effect.fail(new AcquireFailure())
      }

      return {
        acquire: ({ token }) =>
          Effect.gen(function* () {
            yield* Effect.scope
            const { value } = yield* Prefix
            return `${value}${token}`
          }),
        release: value =>
          Effect.gen(function* () {
            yield* Effect.scope
            const { value: suffix } = yield* Suffix
            yield* Effect.sync(() => value + suffix)
          }),
      }
    },
  }),
  failedSession: entry('FailedAttachedManageSession', sessionSchema, {
    resource: LayeredSessionResource,
    modelToMaybeRequirements: model =>
      Option.map(model.maybeToken, token => ({ token })),
    onAcquired: () => childMessage('AcquiredSession'),
    onReleased: () => childMessage('ReleasedSession'),
    onAcquireError: () => childMessage('FailedSession'),
    handler: function* () {
      yield* Effect.scope
      yield* BuildGate
      return yield* Effect.fail(new AcquireFailure())
    },
  }),
  contextualSession: entry(
    'ContextualAttachedManageSession',
    contextualSessionSchema,
    {
      resource: LayeredSessionResource,
      modelToMaybeRequirements: model =>
        Option.map(model.maybeToken, id => ({
          id,
          maybeCount: Option.none(),
        })),
      onAcquired: value => {
        const exactValue: string = value
        // @ts-expect-error onAcquired receives the ManagedResource's exact value type.
        value.doesNotExist()
        void exactValue
        return childMessage('AcquiredSession')
      },
      onReleased: () => childMessage('ReleasedSession'),
      onAcquireError: () => childMessage('FailedSession'),
      handler: function* () {
        yield* Effect.void
        return {
          acquire: ({ id, maybeCount, label }) => {
            const exactId: string = id
            const exactCount: Option.Option<number> = maybeCount
            const exactLabel: string | undefined = label
            // @ts-expect-error A required Schema.String field has no arbitrary members.
            id.doesNotExist()
            // @ts-expect-error A Schema.Option field retains its Option value type.
            maybeCount.doesNotExist()
            // @ts-expect-error An optional Schema.String field retains its string value type.
            label?.doesNotExist()
            return Effect.succeed(
              `${exactId}:${Option.isSome(exactCount)}:${exactLabel ?? ''}`,
            )
          },
          release: value => {
            const exactValue: string = value
            // @ts-expect-error Release receives the ManagedResource's exact value type.
            value.doesNotExist()
            return Effect.sync(() => {
              void exactValue
            })
          },
        }
      },
    },
  ),
}))

if (false) {
  childManagedResources.session.toLayer(
    // @ts-expect-error Command handlers are unavailable while constructing a ManagedResource handler.
    Effect.gen(function* () {
      yield* ConstructionManagedResourceCommand().effect
      return {
        acquire: ({ token }) => Effect.succeed({ token }),
        release: () => Effect.void,
      }
    }),
  )

  make<ChildModel, ChildMessage>()(entry => ({
    guarded: entry('AttachedConstructionManagedResource', sessionSchema, {
      resource: SessionResource,
      modelToMaybeRequirements: model =>
        Option.map(model.maybeToken, token => ({ token })),
      onAcquired: () => childMessage('AcquiredSession'),
      onReleased: () => childMessage('ReleasedSession'),
      onAcquireError: () => childMessage('FailedSession'),
      // @ts-expect-error Attached ManagedResource handlers have the same construction requirement guard.
      handler: function* () {
        yield* ConstructionManagedResourceCommand().effect
        return {
          acquire: ({ token }) => Effect.succeed({ token }),
          release: () => Effect.void,
        }
      },
    }),
  }))

  const schemaFallbackEntries = make<ChildModel, ChildMessage>()(entry => ({
    annotatedHost: entry('AnnotatedSessionHost', annotatedSessionSchema, {
      resource: LayeredSessionResource,
      modelToMaybeRequirements: model =>
        Option.map(model.maybeToken, token => ({ token })),
      onAcquired: () => childMessage('AcquiredSession'),
      onReleased: () => childMessage('ReleasedSession'),
      onAcquireError: () => childMessage('FailedSession'),
    }),
    annotatedAttached: entry(
      'AnnotatedAttachedSession',
      annotatedSessionSchema,
      {
        resource: LayeredSessionResource,
        modelToMaybeRequirements: model =>
          Option.map(model.maybeToken, token => ({ token })),
        onAcquired: () => childMessage('AcquiredSession'),
        onReleased: () => childMessage('ReleasedSession'),
        onAcquireError: () => childMessage('FailedSession'),
        handler: function* () {
          return {
            acquire: ({ token }) => Effect.succeed(token),
            release: () => Effect.void,
          }
        },
      },
    ),
    unionHost: entry('UnionSessionHost', unionSessionSchema, {
      resource: LayeredSessionResource,
      modelToMaybeRequirements: model =>
        Option.map(model.maybeToken, token => ({ token })),
      onAcquired: () => childMessage('AcquiredSession'),
      onReleased: () => childMessage('ReleasedSession'),
      onAcquireError: () => childMessage('FailedSession'),
    }),
    unionAttached: entry('UnionAttachedSession', unionSessionSchema, {
      resource: LayeredSessionResource,
      modelToMaybeRequirements: model =>
        Option.map(model.maybeToken, token => ({ token })),
      onAcquired: () => childMessage('AcquiredSession'),
      onReleased: () => childMessage('ReleasedSession'),
      onAcquireError: () => childMessage('FailedSession'),
      handler: function* () {
        return {
          acquire: requirements =>
            Effect.succeed(
              'id' in requirements ? requirements.id : requirements.token,
            ),
          release: () => Effect.void,
        }
      },
    }),
  }))

  schemaFallbackEntries.annotatedHost.toLayer(
    Effect.succeed({
      acquire: ({ token }: tokenRequirementsSchema) => Effect.succeed(token),
      release: () => Effect.void,
    }),
  )
  schemaFallbackEntries.unionHost.toLayer(
    Effect.succeed({
      acquire: (requirements: idRequirementsSchema | tokenRequirementsSchema) =>
        Effect.succeed(
          'id' in requirements ? requirements.id : requirements.token,
        ),
      release: () => Effect.void,
    }),
  )

  layeredManagedResources.session.toLayer({
    // @ts-expect-error toLayer accepts an Effect that constructs the lifecycle handler.
    acquire: ({ token }: { readonly token: string }) => Effect.succeed(token),
    release: () => Effect.void,
  })

  layeredManagedResources.session.toLayer(
    // @ts-expect-error A ManagedResource handler must define release.
    Effect.succeed({
      acquire: ({ token }) => Effect.succeed(token),
    }),
  )

  make<ChildModel, ChildMessage>()(entry => ({
    missingRelease: entry('MissingReleaseSession', sessionSchema, {
      resource: LayeredSessionResource,
      modelToMaybeRequirements: model =>
        Option.map(model.maybeToken, token => ({ token })),
      onAcquired: () => childMessage('AcquiredSession'),
      onReleased: () => childMessage('ReleasedSession'),
      onAcquireError: () => childMessage('FailedSession'),
      // @ts-expect-error An attached lifecycle handler must define release.
      handler: function* () {
        return {
          acquire: ({ token }) => Effect.succeed(token),
        }
      },
    }),
    wrongValue: entry('WrongValueSession', sessionSchema, {
      resource: LayeredSessionResource,
      modelToMaybeRequirements: model =>
        Option.map(model.maybeToken, token => ({ token })),
      onAcquired: () => childMessage('AcquiredSession'),
      onReleased: () => childMessage('ReleasedSession'),
      onAcquireError: () => childMessage('FailedSession'),
      // @ts-expect-error Acquire must produce the ManagedResource's exact value type.
      handler: function* () {
        return {
          acquire: () => Effect.succeed(123),
          release: () => Effect.void,
        }
      },
    }),
  }))

  make<ChildModel, ChildMessage>()(entry => {
    const narrowAcquireConfig = {
      resource: LayeredSessionResource,
      modelToMaybeRequirements: (model: ChildModel) =>
        Option.map(model.maybeToken, token => ({ token })),
      onAcquired: () => childMessage('AcquiredSession'),
      onReleased: () => childMessage('ReleasedSession'),
      onAcquireError: () => childMessage('FailedSession'),
    }
    const narrowAcquireHandler = function* () {
      return {
        acquire: ({ token }: Readonly<{ token: 'only' }>) =>
          Effect.succeed(token),
        release: (_value: string) => Effect.void,
      }
    }

    const narrowReleaseConfig = {
      resource: LayeredSessionResource,
      modelToMaybeRequirements: (model: ChildModel) =>
        Option.map(model.maybeToken, token => ({ token })),
      onAcquired: () => childMessage('AcquiredSession'),
      onReleased: () => childMessage('ReleasedSession'),
      onAcquireError: () => childMessage('FailedSession'),
    }
    const narrowReleaseHandler = function* () {
      return {
        acquire: ({ token }: Readonly<{ token: string }>) =>
          Effect.succeed<'one' | 'two'>(token === 'one' ? 'one' : 'two'),
        release: (_value: 'one') => Effect.void,
      }
    }

    const unionAcquire =
      globalThis.Math.random() > 0.5
        ? ({ token }: Readonly<{ token: 'only' }>) => Effect.succeed(token)
        : ({ token }: Readonly<{ token: string }>) => Effect.succeed(token)
    const unionAcquireHandler = function* () {
      return {
        acquire: unionAcquire,
        release: (_value: string) => Effect.void,
      }
    }

    return {
      narrowAcquire: entry('NarrowAcquireSession', sessionSchema, {
        ...narrowAcquireConfig,
        // @ts-expect-error Acquire must accept every value allowed by the requirements schema.
        handler: narrowAcquireHandler,
      }),
      narrowRelease: entry('NarrowReleaseSession', sessionSchema, {
        ...narrowReleaseConfig,
        // @ts-expect-error Release must accept every value acquire can publish.
        handler: narrowReleaseHandler,
      }),
      unionAcquire: entry('UnionAcquireSession', sessionSchema, {
        ...narrowAcquireConfig,
        // @ts-expect-error Every member of an acquire union must accept all requirements.
        handler: unionAcquireHandler,
      }),
    }
  })

  make<Readonly<{ id: 'One' | 'Two' }>, ChildMessage>()(entry => {
    const unionInputConfig = {
      resource: LayeredSessionResource,
      modelToMaybeRequirements: (model: Readonly<{ id: 'One' | 'Two' }>) =>
        model.id,
      onAcquired: () => childMessage('AcquiredSession'),
      onReleased: () => childMessage('ReleasedSession'),
      onAcquireError: () => childMessage('FailedSession'),
    }
    const unionInputHandler = function* () {
      return {
        acquire: (id: 'One') => Effect.succeed(id),
        release: (_value: string) => Effect.void,
      }
    }

    return {
      unionInput: entry('UnionInputSession', Schema.Literals(['One', 'Two']), {
        ...unionInputConfig,
        // @ts-expect-error Acquire must accept every variant allowed by the requirements schema.
        handler: unionInputHandler,
      }),
    }
  })

  make<ChildModel, ChildMessage>()(entry => {
    const genericEntry = <
      Fields extends Schema.Struct.Fields,
      Resource extends ManagedResource<any, any>,
      AcquireRequirements,
      ReleaseRequirements,
      Yielded extends Effect.Effect<unknown, unknown, unknown>,
    >(
      fields: Fields,
      resource: Resource,
      modelToRequirements: (model: ChildModel) => Schema.Struct.Type<Fields>,
      handler: (() => Generator<
        Yielded,
        Readonly<{
          acquire: (
            requirements: Schema.Struct.Type<Fields>,
          ) => Effect.Effect<Value<Resource>, unknown, AcquireRequirements>
          release: (
            value: Value<Resource>,
          ) => Effect.Effect<void, unknown, ReleaseRequirements>
        }>,
        unknown
      >) &
        ValidateConstructionRequirements<Effect.Services<Yielded>>,
    ) =>
      entry('GenericManagedResource', Schema.Struct(fields), {
        resource,
        modelToMaybeRequirements: modelToRequirements,
        onAcquired: () => childMessage('AcquiredSession'),
        onReleased: () => childMessage('ReleasedSession'),
        onAcquireError: () => childMessage('FailedSession'),
        handler,
      })

    void genericEntry
    return {}
  })

  const inlineConfig = {
    resource: LayeredSessionResource,
    modelToMaybeRequirements: (model: ChildModel) =>
      Option.map(model.maybeToken, token => ({ token })),
    onAcquired: () => childMessage('AcquiredSession'),
    onReleased: () => childMessage('ReleasedSession'),
    onAcquireError: () => childMessage('FailedSession'),
    acquire: ({ token }: { readonly token: string }) => Effect.succeed(token),
    release: () => Effect.void,
  }
  make<ChildModel, ChildMessage>()(entry => ({
    inline: entry(
      'InlineManagedResource',
      sessionSchema,
      // @ts-expect-error ManagedResource lifecycle implementations belong in handler Layers.
      inlineConfig,
    ),
  }))
}

// A parent embeds the child as an Option and holds its own local resource.

type ParentModel = Readonly<{ maybeChild: Option.Option<ChildModel> }>

type ParentMessage =
  | Readonly<{ tag: 'GotChild'; message: ChildMessage }>
  | Readonly<{ tag: 'Pinged' }>

const gotChild = (message: ChildMessage): ParentMessage => ({
  tag: 'GotChild',
  message,
})

const pinged = (): ParentMessage => ({ tag: 'Pinged' })

const PingResource = tag<number>()('PingResource')

const parentLocalManagedResources = make<ParentModel, ParentMessage>()(
  entry => ({
    ping: entry('ManagePing', Schema.Option(Schema.Null), {
      resource: PingResource,
      modelToMaybeRequirements: () => Option.some(null),
      onAcquired: pinged,
      onReleased: pinged,
      onAcquireError: pinged,
    }),
  }),
)
const ManagePingLayer = parentLocalManagedResources.ping.toLayer(
  Effect.succeed({
    acquire: () => Effect.succeed(1),
    release: () => Effect.void,
  }),
)

const liftedManagedResources = lift(childManagedResources)<
  ParentModel,
  ParentMessage
>({
  read: model => model.maybeChild,
  toParentMessage: gotChild,
})

const liftedLayeredManagedResources = lift(layeredManagedResources)<
  ParentModel,
  ParentMessage
>({
  read: model => model.maybeChild,
  toParentMessage: gotChild,
})

describe('make', () => {
  it('inlines the positional requirements schema on each entry', () => {
    expect(childManagedResources.session.schema).toBe(sessionSchema)
  })

  it('exposes the resource tag for service-union inference', () => {
    expect(childManagedResources.session.resource).toBe(SessionResource)
    expectTypeOf(
      childManagedResources.session.acquire({ token: 'abc' }),
    ).toEqualTypeOf<
      Effect.Effect<
        Readonly<{ token: string }>,
        unknown,
        Scope.Scope | HandlerOf<typeof childManagedResources.session>
      >
    >()
    expectTypeOf(ManageChildSessionLayer).toEqualTypeOf<
      Layer.Layer<HandlerOf<typeof childManagedResources.session>>
    >()
    expectTypeOf(ManagePingLayer).toEqualTypeOf<
      Layer.Layer<HandlerOf<typeof parentLocalManagedResources.ping>>
    >()
  })

  it('carries a named lifecycle Handler and the Layer dependencies', () => {
    const layer = layeredManagedResources.session.toLayer(
      Effect.succeed({
        acquire: ({ token }) =>
          Effect.map(Prefix, ({ value }) => value + token),
        release: value =>
          Effect.asVoid(
            Effect.map(Suffix, ({ value: suffix }) => value + suffix),
          ),
      }),
    )

    expectTypeOf(
      layeredManagedResources.session.acquire({ token: 'abc' }),
    ).toEqualTypeOf<
      Effect.Effect<
        string,
        unknown,
        HandlerOf<typeof layeredManagedResources.session> | Scope.Scope
      >
    >()
    // @ts-expect-error A Handler annotation must include its params and value contract.
    expectTypeOf<Handler<'ManageSession'>>()
    expectTypeOf<
      HandlerOf<typeof layeredManagedResources.session>
    >().toEqualTypeOf<
      Handler<'ManageSession', Readonly<{ token: string }>, string>
    >()
    expectTypeOf(layer).toEqualTypeOf<
      Layer.Layer<
        HandlerOf<typeof layeredManagedResources.session>,
        never,
        Prefix | Suffix
      >
    >()
    expect(layeredManagedResources.session.name).toBe('ManageSession')
  })

  it('extracts a Handler whose resource value is never', () => {
    type UnavailableHandler = Handler<'ManageUnavailable', null, never>
    type UnavailableEntry = Readonly<{
      acquire: () => Effect.Effect<never, never, UnavailableHandler>
    }>

    expectTypeOf<
      HandlerOf<UnavailableEntry>
    >().toEqualTypeOf<UnavailableHandler>()
  })

  it('preserves additional evidence on an extracted Handler requirement', () => {
    type ExtendedHandler = Handler<'ManageExtended', null, string> &
      Readonly<{ handlerEvidence: 'extended' }>
    type ExtendedEntry = Readonly<{
      acquire: () => Effect.Effect<string, never, ExtendedHandler | Prefix>
    }>

    expectTypeOf<HandlerOf<ExtendedEntry>>().toEqualTypeOf<ExtendedHandler>()
  })

  it('rejects a same-name Layer with different params and value', () => {
    const NumberResource = tag<number>()('NumberResource')
    const incompatible = make<ChildModel, ChildMessage>()(entry => ({
      session: entry(
        'ManageSession',
        Schema.Option(Schema.Struct({ count: Schema.Number })),
        {
          resource: NumberResource,
          modelToMaybeRequirements: () => Option.some({ count: 1 }),
          onAcquired: () => childMessage('AcquiredSession'),
          onReleased: () => childMessage('ReleasedSession'),
          onAcquireError: () => childMessage('FailedSession'),
        },
      ),
    }))
    const incompatibleLayer = incompatible.session.toLayer(
      Effect.succeed({
        acquire: ({ count }) => Effect.succeed(count),
        release: () => Effect.void,
      }),
    )

    if (false) {
      const provideSession = <E, R>(
        _layer: Layer.Layer<
          HandlerOf<typeof layeredManagedResources.session>,
          E,
          R
        >,
      ) => undefined

      // @ts-expect-error A same-name handler with a different params and value contract cannot provide this ManagedResource.
      provideSession(incompatibleLayer)
    }
  })

  it('attaches a precise lifecycle Layer and keeps host contracts bare', async () => {
    expectTypeOf(attachedManagedResources.session.layer).toEqualTypeOf<
      Layer.Layer<
        HandlerOf<typeof attachedManagedResources.session>,
        AcquireFailure,
        BuildGate | Prefix | Suffix
      >
    >()
    expectTypeOf(attachedManagedResources.failedSession.layer).toEqualTypeOf<
      Layer.Layer<
        HandlerOf<typeof attachedManagedResources.failedSession>,
        AcquireFailure,
        BuildGate
      >
    >()
    expectTypeOf(
      attachedManagedResources.contextualSession.layer,
    ).toEqualTypeOf<
      Layer.Layer<HandlerOf<typeof attachedManagedResources.contextualSession>>
    >()
    expectTypeOf(
      attachedManagedResources.session.onAcquired,
    ).parameters.toEqualTypeOf<[]>()
    expect('layer' in layeredManagedResources.session).toBe(false)
    expect('handler' in attachedManagedResources.session).toBe(false)

    const handlerLayer = Layer.provide(
      attachedManagedResources.session.layer,
      Layer.mergeAll(
        Layer.succeed(BuildGate, { isFailure: false }),
        Layer.succeed(Prefix, { value: 'construction:' }),
        Layer.succeed(Suffix, { value: ':construction' }),
      ),
    )
    const value = await Effect.runPromise(
      Effect.scoped(
        attachedManagedResources.session
          .acquire({ token: 'abc' })
          .pipe(
            Effect.provide(handlerLayer),
            Effect.provideService(Prefix, { value: 'invocation:' }),
            Effect.provideService(Suffix, { value: ':invocation' }),
          ),
      ),
    )

    expect(value).toBe('invocation:abc')

    if (false) {
      // @ts-expect-error A host contract exposes toLayer but has no attached layer.
      layeredManagedResources.session.layer
    }
  })

  it('infers fallible lifecycle handlers from an Effect supplied object', () => {
    const layer = layeredManagedResources.session.toLayer(
      Effect.succeed({
        acquire: ({ token }) =>
          Effect.try({
            try: () => token,
            catch: () => new AcquireFailure(),
          }),
        release: () =>
          Effect.try({
            try: () => undefined,
            catch: () => new ReleaseFailure(),
          }),
      }),
    )

    expectTypeOf(layer).toEqualTypeOf<
      Layer.Layer<HandlerOf<typeof layeredManagedResources.session>>
    >()
  })

  it('infers lifecycle requirements from an Effect supplied handler', () => {
    const layer = layeredManagedResources.session.toLayer(
      Effect.map(BuildCount, () => ({
        acquire: () =>
          Effect.callback<string, AcquireFailure, Prefix>(resume => {
            resume(Effect.fail(new AcquireFailure()))
            return Effect.asVoid(Prefix)
          }),
        release: () =>
          Effect.callback<void, ReleaseFailure, Suffix>(resume => {
            resume(Effect.fail(new ReleaseFailure()))
            return Effect.asVoid(Suffix)
          }),
      })),
    )

    expectTypeOf(layer).toEqualTypeOf<
      Layer.Layer<
        HandlerOf<typeof layeredManagedResources.session>,
        never,
        BuildCount | Prefix | Suffix
      >
    >()
  })

  it('uses invocation context for both acquire and release', async () => {
    const released: Array<string> = []
    const layer = layeredManagedResources.session.toLayer(
      Effect.succeed({
        acquire: ({ token }) =>
          Effect.map(Prefix, ({ value }) => value + token),
        release: value =>
          Effect.flatMap(Suffix, ({ value: suffix }) =>
            Effect.sync(() => released.push(value + suffix)),
          ),
      }),
    )

    const result = await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const value = yield* layeredManagedResources.session.acquire({
            token: 'abc',
          })
          yield* layeredManagedResources.session.release(value)
          return value
        }).pipe(
          Effect.provideService(Prefix, { value: 'invocation:' }),
          Effect.provideService(Suffix, { value: ':invocation' }),
          Effect.provide(
            Layer.provideMerge(
              layer,
              Layer.mergeAll(
                Layer.succeed(Prefix, { value: 'construction:' }),
                Layer.succeed(Suffix, { value: ':construction' }),
              ),
            ),
          ),
        ),
      ),
    )

    expect(result).toBe('invocation:abc')
    expect(released).toEqual(['invocation:abc:invocation'])
  })

  it('rejects a handler Layer from another ManagedResource definition with the same name', async () => {
    const other = make<ChildModel, ChildMessage>()(entry => ({
      session: entry('ManageSession', sessionSchema, {
        resource: LayeredSessionResource,
        modelToMaybeRequirements: model =>
          Option.map(model.maybeToken, token => ({ token })),
        onAcquired: () => childMessage('AcquiredSession'),
        onReleased: () => childMessage('ReleasedSession'),
        onAcquireError: () => childMessage('FailedSession'),
      }),
    }))
    const otherLayer = other.session.toLayer(
      Effect.succeed({
        acquire: ({ token }) => Effect.succeed(token),
        release: () => Effect.void,
      }),
    )

    await expect(
      Effect.runPromise(
        Effect.scoped(
          layeredManagedResources.session
            .acquire({ token: 'abc' })
            .pipe(Effect.provide(otherLayer)),
        ),
      ),
    ).rejects.toThrow('belongs to another definition with the same name')
  })

  it('uses the resource lifetime Scope for lifecycle finalizers', async () => {
    const finalizations: Array<string> = []
    const layer = layeredManagedResources.session.toLayer(
      Effect.succeed({
        acquire: ({ token }) =>
          Effect.gen(function* () {
            yield* Effect.addFinalizer(() =>
              Effect.sync(() => finalizations.push('acquire')),
            )
            return token
          }),
        release: () =>
          Effect.addFinalizer(() =>
            Effect.sync(() => finalizations.push('release')),
          ),
      }),
    )
    const constructionScope = await Effect.runPromise(Scope.make())
    const handlerContext = await Effect.runPromise(
      Layer.buildWithScope(layer, constructionScope),
    )

    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const value = yield* layeredManagedResources.session.acquire({
            token: 'abc',
          })
          yield* layeredManagedResources.session.release(value)
        }).pipe(Effect.provide(handlerContext)),
      ),
    )

    expect(finalizations).toEqual(['release', 'acquire'])

    await Effect.runPromise(Scope.close(constructionScope, Exit.void))
  })

  it('builds an Effect supplied lifecycle once and defers its handlers', async () => {
    let builds = 0
    let acquisitions = 0
    const layer = layeredManagedResources.session.toLayer(
      Effect.map(BuildCount, ({ increment }) => {
        increment()
        return {
          acquire: ({ token }: { readonly token: string }) =>
            Effect.sync(() => {
              acquisitions += 1
              return token
            }),
          release: () => Effect.void,
        }
      }),
    )

    await Effect.runPromise(
      Effect.scoped(
        Effect.all([
          layeredManagedResources.session.acquire({ token: 'first' }),
          layeredManagedResources.session.acquire({ token: 'second' }),
        ]).pipe(
          Effect.provide(layer),
          Effect.provideService(BuildCount, {
            increment: () => {
              builds += 1
            },
          }),
        ),
      ),
    )

    expect(builds).toBe(1)
    expect(acquisitions).toBe(2)
  })
})

describe('lift', () => {
  it('keeps the optional reader and resource service types', () => {
    const liftChild = lift(childManagedResources)<ParentModel, ParentMessage>
    const resources = liftChild({
      read: model => model.maybeChild,
      toParentMessage: gotChild,
    })

    expectTypeOf<Parameters<typeof liftChild>>().toMatchTypeOf<
      [Readonly<{ read: (model: ParentModel) => Option.Option<ChildModel> }>]
    >()
    expectTypeOf<ServicesOf<typeof resources>>().toEqualTypeOf<
      ServiceOf<typeof SessionResource>
    >()
  })

  it('releases when the child is unmounted', () => {
    const maybeRequirements =
      liftedManagedResources.session.modelToMaybeRequirements({
        maybeChild: Option.none(),
      })

    expect(Option.isNone(maybeRequirements)).toBe(true)
  })

  it('acquires with the child requirements when the child is mounted', () => {
    const maybeRequirements =
      liftedManagedResources.session.modelToMaybeRequirements({
        maybeChild: Option.some({ maybeToken: Option.some('abc') }),
      })

    expect(Option.getOrNull(maybeRequirements)).toStrictEqual({ token: 'abc' })
  })

  it('releases when the mounted child reports no requirements', () => {
    const maybeRequirements =
      liftedManagedResources.session.modelToMaybeRequirements({
        maybeChild: Option.some({ maybeToken: Option.none() }),
      })

    expect(Option.isNone(maybeRequirements)).toBe(true)
  })

  it('wraps each result message through toParentMessage', () => {
    const { onAcquired, onReleased, onAcquireError } =
      liftedManagedResources.session

    expect(onAcquired()).toStrictEqual(
      gotChild(childMessage('AcquiredSession')),
    )
    expect(onReleased()).toStrictEqual(
      gotChild(childMessage('ReleasedSession')),
    )
    expect(onAcquireError(new Error('boom'))).toStrictEqual(
      gotChild(childMessage('FailedSession')),
    )
  })

  it('preserves the child requirements schema', () => {
    expect(liftedManagedResources.session.schema).toBe(sessionSchema)
  })

  it('preserves a layered entry lifecycle identity', () => {
    expect(liftedLayeredManagedResources.session.name).toBe('ManageSession')
    expect(liftedLayeredManagedResources.session.toLayer).toBe(
      layeredManagedResources.session.toLayer,
    )
    expectTypeOf(
      liftedLayeredManagedResources.session.acquire({ token: 'abc' }),
    ).toEqualTypeOf<
      Effect.Effect<
        string,
        unknown,
        HandlerOf<typeof layeredManagedResources.session> | Scope.Scope
      >
    >()
    expectTypeOf<
      HandlerOf<typeof liftedLayeredManagedResources.session>
    >().toEqualTypeOf<HandlerOf<typeof layeredManagedResources.session>>()
  })

  it('preserves an attached Layer through lift', () => {
    const resources = lift(attachedManagedResources)<
      ParentModel,
      ParentMessage
    >({
      read: model => model.maybeChild,
      toParentMessage: gotChild,
    })

    expect(resources.session.layer).toBe(attachedManagedResources.session.layer)
    expectTypeOf(resources.session.layer).toEqualTypeOf(
      attachedManagedResources.session.layer,
    )
  })
})

type IncompatibleModel = Readonly<{ unrelated: string }>

const IncompatibleResource = tag<string>()('IncompatibleResource')

const incompatibleModelManagedResources = make<
  IncompatibleModel,
  ParentMessage
>()(entry => ({
  incompatible: entry('ManageIncompatible', Schema.Option(Schema.Null), {
    resource: IncompatibleResource,
    modelToMaybeRequirements: () => Option.some(null),
    onAcquired: pinged,
    onReleased: pinged,
    onAcquireError: pinged,
  }),
}))

describe('aggregate', () => {
  it('combines records into one keyed by resource name', () => {
    const combined = aggregate(
      liftedManagedResources,
      parentLocalManagedResources,
    )

    expect(Object.keys(combined).sort()).toStrictEqual(['ping', 'session'])
  })

  it('preserves an attached Layer through aggregate', () => {
    const combined = aggregate(attachedManagedResources)

    expect(combined.session.layer).toBe(attachedManagedResources.session.layer)
    expectTypeOf(combined.session.layer).toEqualTypeOf(
      attachedManagedResources.session.layer,
    )
  })

  it('throws on a duplicate key across records', () => {
    expect(() =>
      aggregate(parentLocalManagedResources, parentLocalManagedResources),
    ).toThrow('duplicate key "ping"')
  })

  it('still throws on a duplicate key through the curried form', () => {
    expect(() =>
      aggregate<ParentModel, ParentMessage>()(
        parentLocalManagedResources,
        parentLocalManagedResources,
      ),
    ).toThrow('duplicate key "ping"')
  })

  it('preserves __proto__ as an ordinary resource name', () => {
    const prototypeResources = {
      ['__proto__']: parentLocalManagedResources.ping,
    }
    const combined = aggregate(prototypeResources)

    expect(Object.hasOwn(combined, '__proto__')).toBe(true)
    expect(combined.__proto__).toBe(parentLocalManagedResources.ping)
    expect(() => aggregate(prototypeResources, prototypeResources)).toThrow(
      'duplicate key "__proto__"',
    )
  })

  it('preserves a numeric resource name', () => {
    const numericResources = { 0: parentLocalManagedResources.ping }
    const combined = aggregate(numericResources)

    expect(Object.keys(combined)).toStrictEqual(['0'])
    expect(combined['0']).toBe(parentLocalManagedResources.ping)
  })

  // NOTE: `pnpm typecheck` is the assertion for the block below, not vitest.
  if (false) {
    type ApplicationModel = ParentModel & Readonly<{ name: string }>

    const applicationManagedResources = make<ApplicationModel, ParentMessage>()(
      entry => ({
        applicationPing: entry(
          'ManageApplicationPing',
          Schema.Option(Schema.Null),
          {
            resource: PingResource,
            modelToMaybeRequirements: () => Option.some(null),
            onAcquired: pinged,
            onReleased: pinged,
            onAcquireError: pinged,
          },
        ),
      }),
    )

    const numericResources = { 0: parentLocalManagedResources.ping }
    const withNumericName = aggregate(numericResources)

    expectTypeOf<keyof typeof withNumericName>().toEqualTypeOf<'0'>()

    const combined = aggregate(
      liftedManagedResources,
      parentLocalManagedResources,
    )

    expectTypeOf<keyof typeof combined>().toEqualTypeOf<'session' | 'ping'>()

    expectTypeOf<ServicesOf<typeof combined>>().toEqualTypeOf<
      ServiceOf<typeof SessionResource> | ServiceOf<typeof PingResource>
    >()

    expectTypeOf(
      combined.session.modelToMaybeRequirements,
    ).parameters.toEqualTypeOf<[ParentModel]>()

    expectTypeOf(
      combined.session.modelToMaybeRequirements,
    ).returns.toEqualTypeOf<Option.Option<Readonly<{ token: string }>>>()

    expectTypeOf(combined.ping.release).parameters.toEqualTypeOf<[number]>()

    expectTypeOf(
      combined.session.onReleased,
    ).returns.toEqualTypeOf<ParentMessage>()

    expectTypeOf(combined.session.onAcquired).parameters.toEqualTypeOf<[]>()

    const nested = aggregate(combined, parentLocalManagedResources)

    expectTypeOf<keyof typeof nested>().toEqualTypeOf<'session' | 'ping'>()

    const fullAndSlice = aggregate(
      applicationManagedResources,
      parentLocalManagedResources,
    )
    const nestedFullAndSlice = aggregate(fullAndSlice, liftedManagedResources)

    expectTypeOf(
      nestedFullAndSlice.applicationPing.modelToMaybeRequirements,
    ).parameters.toEqualTypeOf<[ApplicationModel]>()

    aggregate(
      parentLocalManagedResources,
      // @ts-expect-error incompatibleModelManagedResources uses another Model
      incompatibleModelManagedResources,
    )

    aggregate<ParentModel, ParentMessage>()(
      parentLocalManagedResources,
      // @ts-expect-error the curried form rejects it the same way
      incompatibleModelManagedResources,
    )
  }
})
