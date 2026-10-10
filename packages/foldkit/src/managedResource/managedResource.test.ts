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

import {
  type Handler,
  type ManagedResource,
  type ServiceOf,
  type ServicesOf,
  type Value,
  aggregate,
  lift,
  make,
  tag,
} from './managedResource.js'

// A child Submodel owns a session resource and mounts/unmounts.

type ChildModel = Readonly<{ maybeToken: Option.Option<string> }>

type ChildMessage = Readonly<{
  tag: 'AcquiredSession' | 'ReleasedSession' | 'FailedSession'
}>

const childMessage = (tag: ChildMessage['tag']): ChildMessage => ({ tag })

const SessionResource = tag<Readonly<{ token: string }>>()('SessionResource')

const sessionSchema = Schema.Option(Schema.Struct({ token: Schema.String }))
const annotatedSessionSchema: Schema.Schema<typeof sessionSchema.Type> =
  sessionSchema
const idRequirementsSchema = Schema.Struct({ id: Schema.String })
const tokenRequirementsSchema = Schema.Struct({ token: Schema.String })
const unionSessionSchema = Schema.Union([
  Schema.Option(idRequirementsSchema),
  Schema.Option(tokenRequirementsSchema),
])

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
  session: entry(
    'AttachedManageSession',
    sessionSchema,
    {
      resource: LayeredSessionResource,
      modelToMaybeRequirements: model =>
        Option.map(model.maybeToken, token => ({ token })),
      onAcquired: () => childMessage('AcquiredSession'),
      onReleased: () => childMessage('ReleasedSession'),
      onAcquireError: () => childMessage('FailedSession'),
    },
    Effect.gen(function* () {
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
    }),
  ),
  failedSession: entry(
    'FailedAttachedManageSession',
    sessionSchema,
    {
      resource: LayeredSessionResource,
      modelToMaybeRequirements: model =>
        Option.map(model.maybeToken, token => ({ token })),
      onAcquired: () => childMessage('AcquiredSession'),
      onReleased: () => childMessage('ReleasedSession'),
      onAcquireError: () => childMessage('FailedSession'),
    },
    Effect.gen(function* () {
      yield* Effect.scope
      yield* BuildGate
      return yield* Effect.fail(new AcquireFailure())
    }),
  ),
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
    },
    Effect.succeed({
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
    }),
  ),
}))

if (false) {
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
      },
      Effect.succeed({
        acquire: ({ token }) => Effect.succeed(token),
        release: () => Effect.void,
      }),
    ),
    unionHost: entry('UnionSessionHost', unionSessionSchema, {
      resource: LayeredSessionResource,
      modelToMaybeRequirements: model =>
        Option.map(model.maybeToken, token => ({ token })),
      onAcquired: () => childMessage('AcquiredSession'),
      onReleased: () => childMessage('ReleasedSession'),
      onAcquireError: () => childMessage('FailedSession'),
    }),
    unionAttached: entry(
      'UnionAttachedSession',
      unionSessionSchema,
      {
        resource: LayeredSessionResource,
        modelToMaybeRequirements: model =>
          Option.map(model.maybeToken, token => ({ token })),
        onAcquired: () => childMessage('AcquiredSession'),
        onReleased: () => childMessage('ReleasedSession'),
        onAcquireError: () => childMessage('FailedSession'),
      },
      Effect.succeed({
        acquire: requirements =>
          Effect.succeed(
            'id' in requirements ? requirements.id : requirements.token,
          ),
        release: () => Effect.void,
      }),
    ),
  }))

  schemaFallbackEntries.annotatedHost.toLayer(
    Effect.succeed({
      acquire: ({ token }: typeof tokenRequirementsSchema.Type) =>
        Effect.succeed(token),
      release: () => Effect.void,
    }),
  )
  schemaFallbackEntries.unionHost.toLayer(
    Effect.succeed({
      acquire: (
        requirements:
          | typeof idRequirementsSchema.Type
          | typeof tokenRequirementsSchema.Type,
      ) =>
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

  make<ChildModel, ChildMessage>()(entry => {
    const narrowAcquireConfig = {
      resource: LayeredSessionResource,
      modelToMaybeRequirements: (model: ChildModel) =>
        Option.map(model.maybeToken, token => ({ token })),
      onAcquired: () => childMessage('AcquiredSession'),
      onReleased: () => childMessage('ReleasedSession'),
      onAcquireError: () => childMessage('FailedSession'),
    }
    const narrowAcquireHandler = Effect.succeed({
      acquire: ({ token }: Readonly<{ token: 'only' }>) =>
        Effect.succeed(token),
      release: (_value: string) => Effect.void,
    })

    const narrowReleaseConfig = {
      resource: LayeredSessionResource,
      modelToMaybeRequirements: (model: ChildModel) =>
        Option.map(model.maybeToken, token => ({ token })),
      onAcquired: () => childMessage('AcquiredSession'),
      onReleased: () => childMessage('ReleasedSession'),
      onAcquireError: () => childMessage('FailedSession'),
    }
    const narrowReleaseHandler = Effect.succeed({
      acquire: ({ token }: Readonly<{ token: string }>) =>
        Effect.succeed<'one' | 'two'>(token === 'one' ? 'one' : 'two'),
      release: (_value: 'one') => Effect.void,
    })

    const unionAcquire =
      globalThis.Math.random() > 0.5
        ? ({ token }: Readonly<{ token: 'only' }>) => Effect.succeed(token)
        : ({ token }: Readonly<{ token: string }>) => Effect.succeed(token)
    const unionAcquireHandler = Effect.succeed({
      acquire: unionAcquire,
      release: (_value: string) => Effect.void,
    })

    return {
      narrowAcquire: entry(
        'NarrowAcquireSession',
        sessionSchema,
        narrowAcquireConfig,
        // @ts-expect-error Acquire must accept every value allowed by the requirements schema.
        narrowAcquireHandler,
      ),
      narrowRelease: entry(
        'NarrowReleaseSession',
        sessionSchema,
        narrowReleaseConfig,
        // @ts-expect-error Release must accept every value acquire can publish.
        narrowReleaseHandler,
      ),
      unionAcquire: entry(
        'UnionAcquireSession',
        sessionSchema,
        narrowAcquireConfig,
        // @ts-expect-error Every member of an acquire union must accept all requirements.
        unionAcquireHandler,
      ),
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
    const unionInputHandler = Effect.succeed({
      acquire: (id: 'One') => Effect.succeed(id),
      release: (_value: string) => Effect.void,
    })

    return {
      unionInput: entry(
        'UnionInputSession',
        Schema.Literals(['One', 'Two']),
        unionInputConfig,
        // @ts-expect-error Acquire must accept every variant allowed by the requirements schema.
        unionInputHandler,
      ),
    }
  })

  make<ChildModel, ChildMessage>()(entry => {
    const genericEntry = <
      Fields extends Schema.Struct.Fields,
      Resource extends ManagedResource<any, any>,
      AcquireRequirements,
      ReleaseRequirements,
      BuildError,
      BuildRequirements,
    >(
      fields: Fields,
      resource: Resource,
      modelToRequirements: (model: ChildModel) => Schema.Struct.Type<Fields>,
      handler: Effect.Effect<
        Readonly<{
          acquire: (
            requirements: Schema.Struct.Type<Fields>,
          ) => Effect.Effect<Value<Resource>, unknown, AcquireRequirements>
          release: (
            value: Value<Resource>,
          ) => Effect.Effect<void, unknown, ReleaseRequirements>
        }>,
        BuildError,
        BuildRequirements
      >,
    ) =>
      entry(
        'GenericManagedResource',
        Schema.Struct(fields),
        {
          resource,
          modelToMaybeRequirements: modelToRequirements,
          onAcquired: () => childMessage('AcquiredSession'),
          onReleased: () => childMessage('ReleasedSession'),
          onAcquireError: () => childMessage('FailedSession'),
        },
        handler,
      )

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
        Scope.Scope | Handler<'ManageChildSession'>
      >
    >()
    expectTypeOf(ManageChildSessionLayer).toEqualTypeOf<
      Layer.Layer<Handler<'ManageChildSession'>>
    >()
    expectTypeOf(ManagePingLayer).toEqualTypeOf<
      Layer.Layer<Handler<'ManagePing'>>
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
      Effect.Effect<string, unknown, Handler<'ManageSession'> | Scope.Scope>
    >()
    expectTypeOf(layer).toEqualTypeOf<
      Layer.Layer<Handler<'ManageSession'>, never, Prefix | Suffix>
    >()
    expect(layeredManagedResources.session.name).toBe('ManageSession')
  })

  it('attaches a precise lifecycle Layer and keeps host contracts bare', async () => {
    expectTypeOf(attachedManagedResources.session.layer).toEqualTypeOf<
      Layer.Layer<
        Handler<'AttachedManageSession'>,
        AcquireFailure,
        BuildGate | Prefix | Suffix
      >
    >()
    expectTypeOf(attachedManagedResources.failedSession.layer).toEqualTypeOf<
      Layer.Layer<
        Handler<'FailedAttachedManageSession'>,
        AcquireFailure,
        BuildGate
      >
    >()
    expectTypeOf(
      attachedManagedResources.contextualSession.layer,
    ).toEqualTypeOf<Layer.Layer<Handler<'ContextualAttachedManageSession'>>>()
    expectTypeOf(
      attachedManagedResources.session.onAcquired,
    ).parameters.toEqualTypeOf<[]>()
    expect('layer' in layeredManagedResources.session).toBe(false)

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

    expectTypeOf(layer).toEqualTypeOf<Layer.Layer<Handler<'ManageSession'>>>()
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
      Layer.Layer<Handler<'ManageSession'>, never, BuildCount | Prefix | Suffix>
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
      Effect.Effect<string, unknown, Handler<'ManageSession'> | Scope.Scope>
    >()
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
