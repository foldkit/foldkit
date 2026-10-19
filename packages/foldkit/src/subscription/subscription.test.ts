import {
  Context,
  Effect,
  Equivalence,
  Option,
  Schema,
  Stream,
  pipe,
} from 'effect'
import { describe, expect, expectTypeOf, it } from 'vitest'

import { defineTaggedUnion } from '../schema/index.js'
import {
  type GatedDependencies,
  type Subscriptions,
  aggregate,
  lift,
  make,
  persistentEntry,
} from './subscription.js'

type ChildModel = Readonly<{
  isRunning: boolean
  label: string
}>

type ParentModel = Readonly<{
  isChildActive: boolean
  child: ChildModel
}>

type ParentMessage = Readonly<{
  _tag: 'GotChildMessage'
  message: string
}>

const toParentMessage = (message: string): ParentMessage => ({
  _tag: 'GotChildMessage',
  message,
})

const childFields = { isRunning: Schema.Boolean, label: Schema.String }

const ChildPresence = defineTaggedUnion({
  Initializing: {},
  SignedIn: { child: Schema.Struct(childFields) },
})
type ChildPresence = typeof ChildPresence.Type

const readChild = (model: ChildPresence) =>
  pipe(
    model,
    Option.liftPredicate(ChildPresence.isAnyOf(['SignedIn'])),
    Option.map(({ child }) => child),
  )

const makeChildSubscriptions = (projectedModels: Array<ChildModel>) =>
  make<ChildModel, string>()(entry => ({
    ticks: entry(childFields, {
      modelToDependencies: model => {
        projectedModels.push(model)
        return { isRunning: model.isRunning, label: model.label }
      },
      dependenciesToStream: ({ isRunning, label }) =>
        Stream.when(
          Stream.make(`${label}-1`, `${label}-2`),
          Effect.sync(() => isRunning),
        ),
    }),
  }))

const makeKeepAliveChildSubscriptions = () =>
  make<ChildModel, string>()(entry => ({
    ticks: entry(childFields, {
      modelToDependencies: model => ({
        isRunning: model.isRunning,
        label: model.label,
      }),
      keepAliveEquivalence: Equivalence.make(
        (left, right) => left.isRunning === right.isRunning,
      ),
      dependenciesToStream: (_dependencies, readDependencies) =>
        Stream.fromEffect(Effect.sync(() => readDependencies().label)),
    }),
  }))

const collect = (
  stream: Stream.Stream<ParentMessage>,
): Promise<Array<ParentMessage>> => Effect.runPromise(Stream.runCollect(stream))

describe('lift', () => {
  it('wraps every lifted entry and maps child Messages', async () => {
    const projectedModels: Array<ChildModel> = []
    const subscriptions = lift(makeChildSubscriptions(projectedModels))<
      ParentModel,
      ParentMessage
    >({
      read: model => Option.some(model.child),
      toParentMessage,
    })

    const dependencies = subscriptions.ticks.modelToDependencies({
      isChildActive: false,
      child: { isRunning: true, label: 'a' },
    })

    expect(dependencies).toEqual({
      maybeDependencies: Option.some({ isRunning: true, label: 'a' }),
    })
    expect(
      await collect(
        subscriptions.ticks.dependenciesToStream(
          dependencies,
          () => dependencies,
        ),
      ),
    ).toEqual([toParentMessage('a-1'), toParentMessage('a-2')])
  })

  it('skips child dependencies and stops the Stream when read returns None', async () => {
    const projectedModels: Array<ChildModel> = []
    const subscriptions = lift(makeChildSubscriptions(projectedModels))<
      ChildPresence,
      ParentMessage
    >({
      read: readChild,
      toParentMessage,
    })

    const dependencies = subscriptions.ticks.modelToDependencies(
      ChildPresence.Initializing(),
    )

    expect(dependencies).toEqual({ maybeDependencies: Option.none() })
    expect(projectedModels).toEqual([])
    expect(
      await collect(
        subscriptions.ticks.dependenciesToStream(
          dependencies,
          () => dependencies,
        ),
      ),
    ).toEqual([])
  })

  it('finalizes a running child Stream when read later returns None', async () => {
    const finalizations: Array<string> = []
    const childSubscriptions = make<ChildModel, string>()(entry => ({
      ticks: entry(childFields, {
        modelToDependencies: model => ({
          isRunning: model.isRunning,
          label: model.label,
        }),
        dependenciesToStream: () =>
          Stream.never.pipe(
            Stream.ensuring(Effect.sync(() => finalizations.push('ticks'))),
          ),
      }),
    }))
    const subscriptions = lift(childSubscriptions)<
      ChildPresence,
      ParentMessage
    >({ read: readChild, toParentMessage })

    const present = subscriptions.ticks.modelToDependencies(
      ChildPresence.SignedIn({
        child: { isRunning: true, label: 'a' },
      }),
    )
    const absent = subscriptions.ticks.modelToDependencies(
      ChildPresence.Initializing(),
    )

    await Effect.runPromise(
      Stream.runDrain(
        Stream.fromIterable([present, absent]).pipe(
          Stream.switchMap(dependencies =>
            subscriptions.ticks.dependenciesToStream(
              dependencies,
              () => dependencies,
            ),
          ),
        ),
      ),
    )

    expect(finalizations).toEqual(['ticks'])
  })
})

describe('lift with a when gate', () => {
  const liftGated = (projectedModels: Array<ChildModel>) =>
    lift(makeChildSubscriptions(projectedModels))<ParentModel, ParentMessage>({
      read: model => Option.some(model.child),
      toParentMessage,
      when: model => model.isChildActive,
    })

  it('projects the child dependencies while the gate is open', async () => {
    const projectedModels: Array<ChildModel> = []
    const subscriptions = liftGated(projectedModels)

    const dependencies = subscriptions.ticks.modelToDependencies({
      isChildActive: true,
      child: { isRunning: true, label: 'a' },
    })

    expect(dependencies).toEqual({
      maybeDependencies: Option.some({ isRunning: true, label: 'a' }),
    })
    expect(projectedModels).toEqual([{ isRunning: true, label: 'a' }])
    expect(
      await collect(
        subscriptions.ticks.dependenciesToStream(
          dependencies,
          () => dependencies,
        ),
      ),
    ).toEqual([toParentMessage('a-1'), toParentMessage('a-2')])
  })

  it('checks the gate before it reads or projects the child Model', async () => {
    const projectedModels: Array<ChildModel> = []
    const readModels: Array<ParentModel> = []
    const subscriptions = lift(makeChildSubscriptions(projectedModels))<
      ParentModel,
      ParentMessage
    >({
      read: model => {
        readModels.push(model)
        return Option.some(model.child)
      },
      toParentMessage,
      when: model => model.isChildActive,
    })

    const dependencies = subscriptions.ticks.modelToDependencies({
      isChildActive: false,
      child: { isRunning: true, label: 'a' },
    })

    expect(dependencies).toEqual({ maybeDependencies: Option.none() })
    expect(readModels).toEqual([])
    expect(projectedModels).toEqual([])
    expect(
      await collect(
        subscriptions.ticks.dependenciesToStream(
          dependencies,
          () => dependencies,
        ),
      ),
    ).toEqual([])
  })

  it('holds the dependencies equal across child changes behind a closed gate', () => {
    const projectedModels: Array<ChildModel> = []
    const subscriptions = liftGated(projectedModels)

    const isEquivalent = Schema.toEquivalence(
      subscriptions.ticks.dependenciesSchema,
    )

    const closed = subscriptions.ticks.modelToDependencies({
      isChildActive: false,
      child: { isRunning: true, label: 'a' },
    })
    const closedAfterChildChange = subscriptions.ticks.modelToDependencies({
      isChildActive: false,
      child: { isRunning: false, label: 'b' },
    })
    const open = subscriptions.ticks.modelToDependencies({
      isChildActive: true,
      child: { isRunning: true, label: 'a' },
    })
    const openAfterChildChange = subscriptions.ticks.modelToDependencies({
      isChildActive: true,
      child: { isRunning: true, label: 'b' },
    })

    expect(isEquivalent(closed, closedAfterChildChange)).toBe(true)
    expect(isEquivalent(closed, open)).toBe(false)
    expect(isEquivalent(open, openAfterChildChange)).toBe(false)
  })

  it('uses starting dependencies while a keepAlive Stream observes child absence', async () => {
    const subscriptions = lift(makeKeepAliveChildSubscriptions())<
      ParentModel,
      ParentMessage
    >({
      read: model =>
        model.isChildActive ? Option.some(model.child) : Option.none(),
      toParentMessage,
    })

    const open = subscriptions.ticks.modelToDependencies({
      isChildActive: true,
      child: { isRunning: true, label: 'a' },
    })
    const openAfterLabelChange = subscriptions.ticks.modelToDependencies({
      isChildActive: true,
      child: { isRunning: true, label: 'b' },
    })
    const closed = subscriptions.ticks.modelToDependencies({
      isChildActive: false,
      child: { isRunning: true, label: 'a' },
    })

    const entry = subscriptions.ticks
    if (entry.keepAliveEquivalence === undefined) {
      throw new Error(
        'expected the lifted entry to keep its keepAliveEquivalence',
      )
    }

    expect(entry.keepAliveEquivalence(open, openAfterLabelChange)).toBe(true)
    expect(entry.keepAliveEquivalence(open, closed)).toBe(false)
    expect(entry.keepAliveEquivalence(closed, closed)).toBe(true)

    expect(
      await collect(
        entry.dependenciesToStream(open, () => openAfterLabelChange),
      ),
    ).toEqual([toParentMessage('b')])
    expect(
      await collect(entry.dependenciesToStream(open, () => closed)),
    ).toEqual([toParentMessage('a')])
  })
})

type ChildDependencies = Readonly<{
  isRunning: boolean
  label: string
}>

const makeTwoEntryChildSubscriptions = () =>
  make<ChildModel, string>()(entry => ({
    ticks: entry(childFields, {
      modelToDependencies: model => ({
        isRunning: model.isRunning,
        label: model.label,
      }),
      dependenciesToStream: ({ label }) => Stream.make(`ticks-${label}`),
    }),
    pulses: entry(childFields, {
      modelToDependencies: model => ({
        isRunning: model.isRunning,
        label: model.label,
      }),
      dependenciesToStream: ({ label }) => Stream.make(`pulses-${label}`),
    }),
  }))

describe('lift with a per-entry when gate', () => {
  const liftPerEntry = () =>
    lift(makeTwoEntryChildSubscriptions())({
      read: (model: ParentModel) => Option.some(model.child),
      toParentMessage: (message: string): ParentMessage =>
        toParentMessage(message),
      when: { ticks: (model: ParentModel) => model.isChildActive },
    })

  it('gates the named entry and wraps an omitted entry through read', async () => {
    const subscriptions = liftPerEntry()

    const closedModel: ParentModel = {
      isChildActive: false,
      child: { isRunning: true, label: 'a' },
    }

    const gatedDependencies =
      subscriptions.ticks.modelToDependencies(closedModel)
    const omittedDependencies =
      subscriptions.pulses.modelToDependencies(closedModel)

    expect(gatedDependencies).toEqual({ maybeDependencies: Option.none() })
    expect(omittedDependencies).toEqual({
      maybeDependencies: Option.some({ isRunning: true, label: 'a' }),
    })

    expect(
      await collect(
        subscriptions.ticks.dependenciesToStream(
          gatedDependencies,
          () => gatedDependencies,
        ),
      ),
    ).toEqual([])
    expect(
      await collect(
        subscriptions.pulses.dependenciesToStream(
          omittedDependencies,
          () => omittedDependencies,
        ),
      ),
    ).toEqual([toParentMessage('pulses-a')])
  })

  it('stops named and omitted entries while the child is absent', async () => {
    const subscriptions = lift(makeTwoEntryChildSubscriptions())<
      ChildPresence,
      ParentMessage
    >({
      read: readChild,
      toParentMessage,
      when: { ticks: () => true },
    })
    const model = ChildPresence.Initializing()
    const tickDependencies = subscriptions.ticks.modelToDependencies(model)
    const pulseDependencies = subscriptions.pulses.modelToDependencies(model)

    expect(tickDependencies).toEqual({ maybeDependencies: Option.none() })
    expect(pulseDependencies).toEqual({ maybeDependencies: Option.none() })
    expect(
      await collect(
        subscriptions.ticks.dependenciesToStream(
          tickDependencies,
          () => tickDependencies,
        ),
      ),
    ).toEqual([])
    expect(
      await collect(
        subscriptions.pulses.dependenciesToStream(
          pulseDependencies,
          () => pulseDependencies,
        ),
      ),
    ).toEqual([])
  })

  it('types every lifted entry with its gated dependencies', () => {
    const subscriptions = liftPerEntry()

    expectTypeOf(subscriptions.ticks.modelToDependencies).returns.toEqualTypeOf<
      GatedDependencies<ChildDependencies>
    >()
    expectTypeOf(
      subscriptions.pulses.modelToDependencies,
    ).returns.toEqualTypeOf<GatedDependencies<ChildDependencies>>()
  })
})

type GrandparentModel = Readonly<{
  isParentActive: boolean
  parent: ParentModel
}>

type GrandparentMessage = Readonly<{
  _tag: 'GotParentMessage'
  message: ParentMessage
}>

const toGrandparentMessage = (message: ParentMessage): GrandparentMessage => ({
  _tag: 'GotParentMessage',
  message,
})

const collectGrandparent = (
  stream: Stream.Stream<GrandparentMessage>,
): Promise<Array<GrandparentMessage>> =>
  Effect.runPromise(Stream.runCollect(stream))

describe('lift over lift', () => {
  const liftTwice = (projectedModels: Array<ChildModel>) => {
    const parentSubscriptions = lift(makeChildSubscriptions(projectedModels))<
      ParentModel,
      ParentMessage
    >({
      read: model => Option.some(model.child),
      toParentMessage,
      when: model => model.isChildActive,
    })

    return lift(parentSubscriptions)<GrandparentModel, GrandparentMessage>({
      read: model => Option.some(model.parent),
      toParentMessage: toGrandparentMessage,
      when: model => model.isParentActive,
    })
  }

  const openModel: GrandparentModel = {
    isParentActive: true,
    parent: { isChildActive: true, child: { isRunning: true, label: 'a' } },
  }

  const innerClosedModel: GrandparentModel = {
    isParentActive: true,
    parent: { isChildActive: false, child: { isRunning: true, label: 'a' } },
  }

  const outerClosedModel: GrandparentModel = {
    isParentActive: false,
    parent: { isChildActive: true, child: { isRunning: true, label: 'a' } },
  }

  it('nests the gates and wraps the Messages through both levels', async () => {
    const projectedModels: Array<ChildModel> = []
    const subscriptions = liftTwice(projectedModels)

    const dependencies = subscriptions.ticks.modelToDependencies(openModel)

    expect(dependencies).toEqual({
      maybeDependencies: Option.some({
        maybeDependencies: Option.some({ isRunning: true, label: 'a' }),
      }),
    })
    expect(projectedModels).toEqual([{ isRunning: true, label: 'a' }])
    expect(
      await collectGrandparent(
        subscriptions.ticks.dependenciesToStream(
          dependencies,
          () => dependencies,
        ),
      ),
    ).toEqual([
      toGrandparentMessage(toParentMessage('a-1')),
      toGrandparentMessage(toParentMessage('a-2')),
    ])
  })

  it('stops at the outer gate without running the inner projection', async () => {
    const projectedModels: Array<ChildModel> = []
    const subscriptions = liftTwice(projectedModels)

    const dependencies =
      subscriptions.ticks.modelToDependencies(outerClosedModel)

    expect(dependencies).toEqual({ maybeDependencies: Option.none() })
    expect(projectedModels).toEqual([])
    expect(
      await collectGrandparent(
        subscriptions.ticks.dependenciesToStream(
          dependencies,
          () => dependencies,
        ),
      ),
    ).toEqual([])
  })

  it('stops at the inner gate with the outer gate open', async () => {
    const projectedModels: Array<ChildModel> = []
    const subscriptions = liftTwice(projectedModels)

    const dependencies =
      subscriptions.ticks.modelToDependencies(innerClosedModel)

    expect(dependencies).toEqual({
      maybeDependencies: Option.some({ maybeDependencies: Option.none() }),
    })
    expect(projectedModels).toEqual([])
    expect(
      await collectGrandparent(
        subscriptions.ticks.dependenciesToStream(
          dependencies,
          () => dependencies,
        ),
      ),
    ).toEqual([])
  })

  it('preserves keepAliveEquivalence through both gated wrappings', async () => {
    const parentSubscriptions = lift(makeKeepAliveChildSubscriptions())<
      ParentModel,
      ParentMessage
    >({
      read: model => Option.some(model.child),
      toParentMessage,
      when: model => model.isChildActive,
    })

    const subscriptions = lift(parentSubscriptions)<
      GrandparentModel,
      GrandparentMessage
    >({
      read: model => Option.some(model.parent),
      toParentMessage: toGrandparentMessage,
      when: model => model.isParentActive,
    })

    const entry = subscriptions.ticks
    if (entry.keepAliveEquivalence === undefined) {
      throw new Error(
        'expected the twice lifted entry to keep its keepAliveEquivalence',
      )
    }

    const open = entry.modelToDependencies(openModel)
    const openAfterLabelChange = entry.modelToDependencies({
      isParentActive: true,
      parent: { isChildActive: true, child: { isRunning: true, label: 'b' } },
    })
    const innerClosed = entry.modelToDependencies(innerClosedModel)
    const outerClosed = entry.modelToDependencies(outerClosedModel)

    expect(entry.keepAliveEquivalence(open, openAfterLabelChange)).toBe(true)
    expect(entry.keepAliveEquivalence(open, innerClosed)).toBe(false)
    expect(entry.keepAliveEquivalence(open, outerClosed)).toBe(false)
    expect(entry.keepAliveEquivalence(innerClosed, outerClosed)).toBe(false)
    expect(entry.keepAliveEquivalence(outerClosed, outerClosed)).toBe(true)

    expect(
      await collectGrandparent(
        entry.dependenciesToStream(open, () => openAfterLabelChange),
      ),
    ).toEqual([toGrandparentMessage(toParentMessage('b'))])
    expect(
      await collectGrandparent(
        entry.dependenciesToStream(open, () => outerClosed),
      ),
    ).toEqual([toGrandparentMessage(toParentMessage('a'))])
  })

  it('carries a per-entry gate through an outer whole record gate', async () => {
    const parentSubscriptions = lift(makeTwoEntryChildSubscriptions())({
      read: (model: ParentModel) => Option.some(model.child),
      toParentMessage: (message: string): ParentMessage =>
        toParentMessage(message),
      when: { ticks: (model: ParentModel) => model.isChildActive },
    })

    const subscriptions = lift(parentSubscriptions)<
      GrandparentModel,
      GrandparentMessage
    >({
      read: model => Option.some(model.parent),
      toParentMessage: toGrandparentMessage,
      when: model => model.isParentActive,
    })

    expect(subscriptions.ticks.modelToDependencies(openModel)).toEqual({
      maybeDependencies: Option.some({
        maybeDependencies: Option.some({ isRunning: true, label: 'a' }),
      }),
    })
    expect(subscriptions.pulses.modelToDependencies(openModel)).toEqual({
      maybeDependencies: Option.some({
        maybeDependencies: Option.some({ isRunning: true, label: 'a' }),
      }),
    })
    expect(subscriptions.ticks.modelToDependencies(innerClosedModel)).toEqual({
      maybeDependencies: Option.some({ maybeDependencies: Option.none() }),
    })
    expect(subscriptions.pulses.modelToDependencies(innerClosedModel)).toEqual({
      maybeDependencies: Option.some({
        maybeDependencies: Option.some({ isRunning: true, label: 'a' }),
      }),
    })
    expect(subscriptions.pulses.modelToDependencies(outerClosedModel)).toEqual({
      maybeDependencies: Option.none(),
    })

    const pulses = subscriptions.pulses.modelToDependencies(openModel)
    expect(
      await collectGrandparent(
        subscriptions.pulses.dependenciesToStream(pulses, () => pulses),
      ),
    ).toEqual([toGrandparentMessage(toParentMessage('pulses-a'))])
  })
})

type StreamMessage<AnyStream> =
  AnyStream extends Stream.Stream<infer Message, any, any> ? Message : never

type StreamServices<AnyStream> =
  AnyStream extends Stream.Stream<any, any, infer Services> ? Services : never

describe('lift types', () => {
  it('keeps the optional reader, services, and keepAlive dependencies', () => {
    class Clock extends Context.Service<Clock, { readonly now: number }>()(
      'LiftedSubscriptionClock',
    ) {}

    const liftChild = lift(
      make<ChildModel, string, Clock>()(entry => ({
        ticks: entry(childFields, {
          modelToDependencies: model => ({
            isRunning: model.isRunning,
            label: model.label,
          }),
          keepAliveEquivalence: Equivalence.make(
            (left, right) => left.isRunning === right.isRunning,
          ),
          dependenciesToStream: (_dependencies, readDependencies) =>
            Stream.fromEffect(
              Effect.gen(function* () {
                yield* Clock
                return readDependencies().label
              }),
            ),
        }),
      })),
    )<ParentModel, ParentMessage>
    const subscriptions = liftChild({
      read: model =>
        model.isChildActive ? Option.some(model.child) : Option.none(),
      toParentMessage,
    })

    expectTypeOf<Parameters<typeof liftChild>>().toMatchTypeOf<
      [Readonly<{ read: (model: ParentModel) => Option.Option<ChildModel> }>]
    >()
    expectTypeOf(subscriptions.ticks.keepAliveEquivalence).toEqualTypeOf<
      Equivalence.Equivalence<GatedDependencies<ChildDependencies>> | undefined
    >()
    expectTypeOf<
      StreamServices<
        ReturnType<typeof subscriptions.ticks.dependenciesToStream>
      >
    >().toEqualTypeOf<Clock>()
  })
})

describe('aggregate', () => {
  type ThemeModel = Readonly<{ isDark: boolean }>

  type ThemeMessage = Readonly<{ _tag: 'ChangedTheme'; isDark: boolean }>

  type ViewportMessage = Readonly<{ _tag: 'ResizedViewport'; width: number }>

  type IncompatibleModel = Readonly<{ unrelated: string }>

  class Clock extends Context.Service<Clock, { readonly now: number }>()(
    'Clock',
  ) {}

  const themeSubscriptions = make<ThemeModel, ThemeMessage>()(entry => ({
    systemTheme: entry(
      { isDark: Schema.Boolean },
      {
        modelToDependencies: model => ({ isDark: model.isDark }),
        dependenciesToStream: ({ isDark }) =>
          Stream.succeed<ThemeMessage>({ _tag: 'ChangedTheme', isDark }),
      },
    ),
    scroll: entry(
      { isDark: Schema.Boolean },
      {
        modelToDependencies: model => ({ isDark: model.isDark }),
        keepAliveEquivalence: Equivalence.make<{ readonly isDark: boolean }>(
          (left, right) => left.isDark === right.isDark,
        ),
        dependenciesToStream: (_dependencies, readDependencies) =>
          Stream.succeed<ThemeMessage>({
            _tag: 'ChangedTheme',
            isDark: readDependencies().isDark,
          }),
      },
    ),
  }))

  const viewportSubscriptions = make<ThemeModel, ViewportMessage>()(() => ({
    viewportWidth: persistentEntry(
      Stream.succeed<ViewportMessage>({ _tag: 'ResizedViewport', width: 0 }),
    ),
  }))

  const clockSubscriptions = make<ThemeModel, ViewportMessage, Clock>()(
    entry => ({
      clockTick: entry(
        {},
        {
          modelToDependencies: () => ({}),
          dependenciesToStream: () =>
            Stream.fromEffect(
              Effect.map(
                Effect.gen(function* () {
                  return yield* Clock
                }),
                ({ now }): ViewportMessage => ({
                  _tag: 'ResizedViewport',
                  width: now,
                }),
              ),
            ),
        },
      ),
    }),
  )

  const focusSubscriptions = make<ThemeModel, ThemeMessage>()(entry => ({
    windowFocus: entry(
      { isDark: Schema.Boolean },
      {
        modelToDependencies: model => ({ isDark: model.isDark }),
        dependenciesToStream: ({ isDark }) =>
          Stream.succeed<ThemeMessage>({ _tag: 'ChangedTheme', isDark }),
      },
    ),
  }))

  const incompatibleModelSubscriptions = make<
    IncompatibleModel,
    ThemeMessage
  >()(entry => ({
    unrelated: entry(
      {},
      {
        modelToDependencies: () => ({}),
        dependenciesToStream: () =>
          Stream.succeed<ThemeMessage>({ _tag: 'ChangedTheme', isDark: false }),
      },
    ),
  }))

  const gatedChildSubscriptions = lift(makeChildSubscriptions([]))({
    read: (model: ParentModel) => Option.some(model.child),
    toParentMessage: (message: string): ParentMessage =>
      toParentMessage(message),
    when: { ticks: (model: ParentModel) => model.isChildActive },
  })

  it('combines records into one keyed by entry name', () => {
    const combined = aggregate(themeSubscriptions, viewportSubscriptions)

    expect(Object.keys(combined).sort()).toStrictEqual([
      'scroll',
      'systemTheme',
      'viewportWidth',
    ])
  })

  it('throws on a duplicate key across records', () => {
    expect(() => aggregate(themeSubscriptions, themeSubscriptions)).toThrow(
      'duplicate key "systemTheme"',
    )
  })

  it('still throws on a duplicate key through the curried form', () => {
    expect(() =>
      aggregate<ThemeModel, ThemeMessage>()(
        themeSubscriptions,
        themeSubscriptions,
      ),
    ).toThrow('duplicate key "systemTheme"')
  })

  it('preserves __proto__ as an ordinary entry name', () => {
    const prototypeSubscriptions = {
      ['__proto__']: themeSubscriptions.systemTheme,
    }
    const combined = aggregate(prototypeSubscriptions)

    expect(Object.hasOwn(combined, '__proto__')).toBe(true)
    expect(combined.__proto__).toBe(themeSubscriptions.systemTheme)
    expect(() =>
      aggregate(prototypeSubscriptions, prototypeSubscriptions),
    ).toThrow('duplicate key "__proto__"')
  })

  it('preserves a numeric entry name', () => {
    const numericSubscriptions = { 0: themeSubscriptions.systemTheme }
    const combined = aggregate(numericSubscriptions)

    expect(Object.keys(combined)).toStrictEqual(['0'])
    expect(combined['0']).toBe(themeSubscriptions.systemTheme)
  })

  // NOTE: `pnpm typecheck` is the assertion for the block below, not vitest.
  if (false) {
    type ApplicationModel = ThemeModel & Readonly<{ name: string }>

    const applicationSubscriptions = make<ApplicationModel, ThemeMessage>()(
      entry => ({
        applicationTheme: entry(
          { isDark: Schema.Boolean },
          {
            modelToDependencies: model => ({ isDark: model.isDark }),
            dependenciesToStream: ({ isDark }) =>
              Stream.succeed<ThemeMessage>({ _tag: 'ChangedTheme', isDark }),
          },
        ),
      }),
    )

    const numericSubscriptions = { 0: themeSubscriptions.systemTheme }
    const withNumericName = aggregate(numericSubscriptions)

    expectTypeOf<keyof typeof withNumericName>().toEqualTypeOf<'0'>()

    const combined = aggregate(
      themeSubscriptions,
      viewportSubscriptions,
      clockSubscriptions,
    )

    expectTypeOf<keyof typeof combined>().toEqualTypeOf<
      'systemTheme' | 'scroll' | 'viewportWidth' | 'clockTick'
    >()

    expectTypeOf(
      combined.systemTheme.modelToDependencies,
    ).parameters.toEqualTypeOf<[ThemeModel]>()

    expectTypeOf<
      StreamMessage<
        ReturnType<typeof combined.systemTheme.dependenciesToStream>
      >
    >().toEqualTypeOf<ThemeMessage>()

    expectTypeOf(combined).toExtend<
      Subscriptions<ThemeModel, ThemeMessage | ViewportMessage, Clock>
    >()

    expectTypeOf<
      StreamServices<
        ReturnType<typeof combined.systemTheme.dependenciesToStream>
      >
    >().toEqualTypeOf<never>()

    expectTypeOf<
      StreamServices<ReturnType<typeof combined.clockTick.dependenciesToStream>>
    >().toEqualTypeOf<Clock>()

    expectTypeOf(combined.scroll.keepAliveEquivalence).toEqualTypeOf<
      Equivalence.Equivalence<Readonly<{ isDark: boolean }>>
    >()

    expectTypeOf(combined.scroll.dependenciesToStream).parameters.toEqualTypeOf<
      [Readonly<{ isDark: boolean }>, () => Readonly<{ isDark: boolean }>]
    >()

    expectTypeOf(
      combined.systemTheme.dependenciesToStream,
    ).parameters.toEqualTypeOf<[Readonly<{ isDark: boolean }>]>()

    expectTypeOf(
      combined.viewportWidth.modelToDependencies,
    ).returns.toEqualTypeOf<Record<string, never>>()

    const streamFirst = aggregate(viewportSubscriptions, themeSubscriptions)

    expectTypeOf(
      streamFirst.systemTheme.modelToDependencies,
    ).parameters.toEqualTypeOf<[ThemeModel]>()

    const withLifted = aggregate(gatedChildSubscriptions)

    expectTypeOf(withLifted.ticks.modelToDependencies).returns.toEqualTypeOf<
      GatedDependencies<Readonly<{ isRunning: boolean; label: string }>>
    >()

    const nested = aggregate(combined, focusSubscriptions)

    expectTypeOf<keyof typeof nested>().toEqualTypeOf<
      'systemTheme' | 'scroll' | 'viewportWidth' | 'clockTick' | 'windowFocus'
    >()

    const fullAndSlice = aggregate(applicationSubscriptions, themeSubscriptions)
    const nestedFullAndSlice = aggregate(fullAndSlice, viewportSubscriptions)

    expectTypeOf(
      nestedFullAndSlice.applicationTheme.modelToDependencies,
    ).parameters.toEqualTypeOf<[ApplicationModel]>()

    aggregate(
      themeSubscriptions,
      // @ts-expect-error incompatibleModelSubscriptions uses another Model
      incompatibleModelSubscriptions,
    )

    aggregate<ThemeModel, ThemeMessage>()(
      themeSubscriptions,
      // @ts-expect-error the curried form rejects it the same way
      incompatibleModelSubscriptions,
    )
  }
})
