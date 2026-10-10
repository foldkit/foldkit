import {
  Context,
  Deferred,
  Effect,
  Equivalence,
  Layer,
  Option,
  Schema,
  Stream,
  pipe,
} from 'effect'
import { describe, expect, expectTypeOf, it } from 'vitest'

import { defineMessageUnion } from '../message/index.js'
import { defineTaggedUnion } from '../schema/index.js'
import {
  type GatedDependencies,
  type Handler,
  type Subscriptions,
  aggregate,
  lift,
  make,
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

const makeChildSubscriptions = (projectedModels: Array<ChildModel>) => {
  const subscriptions = make<ChildModel, string>()(entry => ({
    ticks: entry('ChildTicks', childFields, {
      messages: [Schema.String],
      modelToDependencies: model => {
        projectedModels.push(model)
        return { isRunning: model.isRunning, label: model.label }
      },
    }),
  }))
  const layer = subscriptions.ticks.toLayer(
    Effect.succeed(({ isRunning, label }) =>
      Stream.when(
        Stream.make(`${label}-1`, `${label}-2`),
        Effect.sync(() => isRunning),
      ),
    ),
  )

  return { layer, subscriptions }
}

const makeKeepAliveChildSubscriptions = () => {
  const subscriptions = make<ChildModel, string>()(entry => ({
    ticks: entry('KeepAliveChildTicks', childFields, {
      messages: [Schema.String],
      modelToDependencies: model => ({
        isRunning: model.isRunning,
        label: model.label,
      }),
      keepAliveEquivalence: Equivalence.make(
        (left, right) => left.isRunning === right.isRunning,
      ),
    }),
  }))
  const layer = subscriptions.ticks.toLayer(
    Effect.succeed((_dependencies, readDependencies) =>
      Stream.fromEffect(Effect.sync(() => readDependencies().label)),
    ),
  )

  return { layer, subscriptions }
}

const collect = <Message, R>(
  stream: Stream.Stream<Message, never, R>,
  layer: Layer.Layer<R>,
): Promise<Array<Message>> =>
  Effect.runPromise(Stream.runCollect(stream).pipe(Effect.provide(layer)))

describe('lift', () => {
  it('wraps every lifted entry and maps child Messages', async () => {
    const projectedModels: Array<ChildModel> = []
    const childSubscriptions = makeChildSubscriptions(projectedModels)
    const subscriptions = lift(childSubscriptions.subscriptions)<
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
        childSubscriptions.layer,
      ),
    ).toEqual([toParentMessage('a-1'), toParentMessage('a-2')])
  })

  it('skips child dependencies and stops the Stream when read returns None', async () => {
    const projectedModels: Array<ChildModel> = []
    const childSubscriptions = makeChildSubscriptions(projectedModels)
    const subscriptions = lift(childSubscriptions.subscriptions)<
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
        childSubscriptions.layer,
      ),
    ).toEqual([])
  })

  it('finalizes a running child Stream when read later returns None', async () => {
    const finalizations: Array<string> = []
    const acquired = Deferred.makeUnsafe<void>()
    const childSubscriptions = make<ChildModel, string>()(entry => ({
      ticks: entry('FinalizedChildTicks', childFields, {
        messages: [Schema.String],
        modelToDependencies: model => ({
          isRunning: model.isRunning,
          label: model.label,
        }),
      }),
    }))
    const childSubscriptionsLayer = childSubscriptions.ticks.toLayer(
      Effect.succeed(() =>
        Stream.fromEffect(
          Effect.sync(() => Deferred.doneUnsafe(acquired, Effect.void)),
        ).pipe(
          Stream.flatMap(() => Stream.never),
          Stream.ensuring(Effect.sync(() => finalizations.push('ticks'))),
        ),
      ),
    )
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
        Stream.make(present).pipe(
          Stream.concat(
            Stream.fromEffect(Deferred.await(acquired).pipe(Effect.as(absent))),
          ),
          Stream.switchMap(dependencies =>
            subscriptions.ticks.dependenciesToStream(
              dependencies,
              () => dependencies,
            ),
          ),
        ),
      ).pipe(Effect.provide(childSubscriptionsLayer)),
    )

    expect(finalizations).toEqual(['ticks'])
  })
})

describe('lift with a when gate', () => {
  const liftGated = (projectedModels: Array<ChildModel>) =>
    makeChildSubscriptions(projectedModels)

  it('projects the child dependencies while the gate is open', async () => {
    const projectedModels: Array<ChildModel> = []
    const childSubscriptions = liftGated(projectedModels)
    const subscriptions = lift(childSubscriptions.subscriptions)<
      ParentModel,
      ParentMessage
    >({
      read: model => Option.some(model.child),
      toParentMessage,
      when: model => model.isChildActive,
    })

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
        childSubscriptions.layer,
      ),
    ).toEqual([toParentMessage('a-1'), toParentMessage('a-2')])
  })

  it('checks the gate before it reads or projects the child Model', async () => {
    const projectedModels: Array<ChildModel> = []
    const readModels: Array<ParentModel> = []
    const childSubscriptions = makeChildSubscriptions(projectedModels)
    const subscriptions = lift(childSubscriptions.subscriptions)<
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
        childSubscriptions.layer,
      ),
    ).toEqual([])
  })

  it('holds the dependencies equal across child changes behind a closed gate', () => {
    const projectedModels: Array<ChildModel> = []
    const childSubscriptions = liftGated(projectedModels)
    const subscriptions = lift(childSubscriptions.subscriptions)<
      ParentModel,
      ParentMessage
    >({
      read: model => Option.some(model.child),
      toParentMessage,
      when: model => model.isChildActive,
    })

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
    const childSubscriptions = makeKeepAliveChildSubscriptions()
    const subscriptions = lift(childSubscriptions.subscriptions)<
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
        childSubscriptions.layer,
      ),
    ).toEqual([toParentMessage('b')])
    expect(
      await collect(
        entry.dependenciesToStream(open, () => closed),
        childSubscriptions.layer,
      ),
    ).toEqual([toParentMessage('a')])
  })
})

type ChildDependencies = Readonly<{
  isRunning: boolean
  label: string
}>

const makeTwoEntryChildSubscriptions = () => {
  const subscriptions = make<ChildModel, string>()(entry => ({
    ticks: entry('ChildTicks', childFields, {
      messages: [Schema.String],
      modelToDependencies: model => ({
        isRunning: model.isRunning,
        label: model.label,
      }),
    }),
    pulses: entry('ChildPulses', childFields, {
      messages: [Schema.String],
      modelToDependencies: model => ({
        isRunning: model.isRunning,
        label: model.label,
      }),
    }),
  }))
  const layer = Layer.mergeAll(
    subscriptions.ticks.toLayer(
      Effect.succeed(({ label }) => Stream.make(`ticks-${label}`)),
    ),
    subscriptions.pulses.toLayer(
      Effect.succeed(({ label }) => Stream.make(`pulses-${label}`)),
    ),
  )

  return { layer, subscriptions }
}

describe('lift with a per-entry when gate', () => {
  const liftPerEntry = () => makeTwoEntryChildSubscriptions()

  it('gates the named entry and wraps an omitted entry through read', async () => {
    const childSubscriptions = liftPerEntry()
    const subscriptions = lift(childSubscriptions.subscriptions)({
      read: (model: ParentModel) => Option.some(model.child),
      toParentMessage: (message: string): ParentMessage =>
        toParentMessage(message),
      when: { ticks: (model: ParentModel) => model.isChildActive },
    })

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
        childSubscriptions.layer,
      ),
    ).toEqual([])
    expect(
      await collect(
        subscriptions.pulses.dependenciesToStream(
          omittedDependencies,
          () => omittedDependencies,
        ),
        childSubscriptions.layer,
      ),
    ).toEqual([toParentMessage('pulses-a')])
  })

  it('stops named and omitted entries while the child is absent', async () => {
    const childSubscriptions = makeTwoEntryChildSubscriptions()
    const subscriptions = lift(childSubscriptions.subscriptions)<
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
        childSubscriptions.layer,
      ),
    ).toEqual([])
    expect(
      await collect(
        subscriptions.pulses.dependenciesToStream(
          pulseDependencies,
          () => pulseDependencies,
        ),
        childSubscriptions.layer,
      ),
    ).toEqual([])
  })

  it('types every lifted entry with its gated dependencies', () => {
    const childSubscriptions = liftPerEntry()
    const subscriptions = lift(childSubscriptions.subscriptions)({
      read: (model: ParentModel) => Option.some(model.child),
      toParentMessage,
    })

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

describe('lift over lift', () => {
  const liftTwice = (projectedModels: Array<ChildModel>) => {
    const childSubscriptions = makeChildSubscriptions(projectedModels)
    const parentSubscriptions = lift(childSubscriptions.subscriptions)<
      ParentModel,
      ParentMessage
    >({
      read: model => Option.some(model.child),
      toParentMessage,
      when: model => model.isChildActive,
    })

    return {
      layer: childSubscriptions.layer,
      subscriptions: lift(parentSubscriptions)<
        GrandparentModel,
        GrandparentMessage
      >({
        read: model => Option.some(model.parent),
        toParentMessage: toGrandparentMessage,
        when: model => model.isParentActive,
      }),
    }
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
    const lifted = liftTwice(projectedModels)
    const { subscriptions } = lifted

    const dependencies = subscriptions.ticks.modelToDependencies(openModel)

    expect(dependencies).toEqual({
      maybeDependencies: Option.some({
        maybeDependencies: Option.some({ isRunning: true, label: 'a' }),
      }),
    })
    expect(projectedModels).toEqual([{ isRunning: true, label: 'a' }])
    expect(
      await collect(
        subscriptions.ticks.dependenciesToStream(
          dependencies,
          () => dependencies,
        ),
        lifted.layer,
      ),
    ).toEqual([
      toGrandparentMessage(toParentMessage('a-1')),
      toGrandparentMessage(toParentMessage('a-2')),
    ])
  })

  it('stops at the outer gate without running the inner projection', async () => {
    const projectedModels: Array<ChildModel> = []
    const lifted = liftTwice(projectedModels)
    const { subscriptions } = lifted

    const dependencies =
      subscriptions.ticks.modelToDependencies(outerClosedModel)

    expect(dependencies).toEqual({ maybeDependencies: Option.none() })
    expect(projectedModels).toEqual([])
    expect(
      await collect(
        subscriptions.ticks.dependenciesToStream(
          dependencies,
          () => dependencies,
        ),
        lifted.layer,
      ),
    ).toEqual([])
  })

  it('stops at the inner gate with the outer gate open', async () => {
    const projectedModels: Array<ChildModel> = []
    const lifted = liftTwice(projectedModels)
    const { subscriptions } = lifted

    const dependencies =
      subscriptions.ticks.modelToDependencies(innerClosedModel)

    expect(dependencies).toEqual({
      maybeDependencies: Option.some({ maybeDependencies: Option.none() }),
    })
    expect(projectedModels).toEqual([])
    expect(
      await collect(
        subscriptions.ticks.dependenciesToStream(
          dependencies,
          () => dependencies,
        ),
        lifted.layer,
      ),
    ).toEqual([])
  })

  it('preserves keepAliveEquivalence through both gated wrappings', async () => {
    const childSubscriptions = makeKeepAliveChildSubscriptions()
    const parentSubscriptions = lift(childSubscriptions.subscriptions)<
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
      await collect(
        entry.dependenciesToStream(open, () => openAfterLabelChange),
        childSubscriptions.layer,
      ),
    ).toEqual([toGrandparentMessage(toParentMessage('b'))])
    expect(
      await collect(
        entry.dependenciesToStream(open, () => outerClosed),
        childSubscriptions.layer,
      ),
    ).toEqual([toGrandparentMessage(toParentMessage('a'))])
  })

  it('carries a per-entry gate through an outer whole record gate', async () => {
    const childSubscriptions = makeTwoEntryChildSubscriptions()
    const parentSubscriptions = lift(childSubscriptions.subscriptions)({
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
      await collect(
        subscriptions.pulses.dependenciesToStream(pulses, () => pulses),
        childSubscriptions.layer,
      ),
    ).toEqual([toGrandparentMessage(toParentMessage('pulses-a'))])
  })
})

type StreamMessage<AnyStream> =
  AnyStream extends Stream.Stream<infer Message, any, any> ? Message : never

type StreamServices<AnyStream> =
  AnyStream extends Stream.Stream<any, any, infer Services> ? Services : never

describe('Layer-backed entries', () => {
  const HandlerMessage = defineMessageUnion({
    ObservedTick: {},
    IgnoredTick: {},
  })
  type HandlerMessage = typeof HandlerMessage.Type

  const contracted = make<ChildModel, HandlerMessage>()(entry => ({
    observed: entry('ObservedTicks', {
      messages: [HandlerMessage.ObservedTick],
    }),
    observedWhileRunning: entry('ObservedRunningTicks', childFields, {
      messages: [HandlerMessage.ObservedTick],
      modelToDependencies: model => ({
        isRunning: model.isRunning,
        label: model.label,
      }),
    }),
    silent: entry('SilentWatch', { messages: [] }),
  }))

  it('preserves declared Message schemas through lift and aggregate', () => {
    const lifted = lift(contracted)<
      ParentModel,
      Readonly<{ _tag: 'GotObserved'; message: HandlerMessage }>
    >({
      read: model => Option.some(model.child),
      toParentMessage: message => ({ _tag: 'GotObserved', message }),
    })
    const combined = aggregate(lifted)

    expect(combined.observed.messages).toBe(contracted.observed.messages)
    expect(combined.silent.messages).toBe(contracted.silent.messages)
    expectTypeOf(contracted.observed.messages).toEqualTypeOf<
      readonly [typeof HandlerMessage.ObservedTick]
    >()
    expectTypeOf(contracted.silent.messages).toEqualTypeOf<readonly []>()
    expectTypeOf(contracted.observedWhileRunning.messages).toEqualTypeOf<
      readonly [typeof HandlerMessage.ObservedTick]
    >()
    expectTypeOf(combined.observed.toLayer).toEqualTypeOf(
      contracted.observed.toLayer,
    )
  })

  if (false) {
    contracted.observed.toLayer(
      Effect.succeed(() => Stream.succeed(HandlerMessage.ObservedTick())),
    )
    contracted.observedWhileRunning.toLayer(
      Effect.succeed(() => Stream.succeed(HandlerMessage.ObservedTick())),
    )
    contracted.silent.toLayer(Effect.succeed(() => Stream.empty))
    contracted.observed.toLayer<never, never, never>(
      // @ts-expect-error toLayer accepts an Effect that constructs the handler.
      () => Stream.succeed(HandlerMessage.ObservedTick()),
    )

    contracted.observed.toLayer(
      // @ts-expect-error An undeclared Message cannot be emitted by this Subscription.
      Effect.succeed(() => Stream.succeed(HandlerMessage.IgnoredTick())),
    )
    contracted.observedWhileRunning.toLayer(
      // @ts-expect-error A dependency-bearing handler has the same declared output limit.
      Effect.succeed(() => Stream.succeed(HandlerMessage.IgnoredTick())),
    )
    contracted.silent.toLayer(
      // @ts-expect-error Silent Subscriptions cannot emit Messages.
      Effect.succeed(() => Stream.succeed(HandlerMessage.ObservedTick())),
    )

    const lifted = lift(contracted)<
      ParentModel,
      Readonly<{ _tag: 'GotObserved'; message: HandlerMessage }>
    >({
      read: model => Option.some(model.child),
      toParentMessage: message => ({ _tag: 'GotObserved', message }),
    })
    lifted.observed.toLayer(
      Effect.succeed(() => Stream.succeed(HandlerMessage.ObservedTick())),
    )
    lifted.observed.toLayer(
      // @ts-expect-error The lifted handler still emits the child Message.
      Effect.succeed(() =>
        Stream.succeed({
          _tag: 'GotObserved',
          message: HandlerMessage.ObservedTick(),
        }),
      ),
    )

    const combined = aggregate(lifted)
    combined.observed.toLayer(
      Effect.succeed(() => Stream.succeed(HandlerMessage.ObservedTick())),
    )
    combined.observed.toLayer(
      // @ts-expect-error Aggregation retains the declared child Message contract.
      Effect.succeed(() => Stream.succeed(HandlerMessage.IgnoredTick())),
    )

    const optionalDependencies = make<ChildModel, HandlerMessage>()(entry => ({
      observed: entry(
        'ObservedOptionalTicks',
        { maybeLabel: Schema.Option(Schema.String) },
        {
          messages: [HandlerMessage.ObservedTick],
          modelToDependencies: model => ({
            maybeLabel: Option.some(model.label),
          }),
        },
      ),
    }))
    expectTypeOf(
      optionalDependencies.observed.dependenciesToStream,
    ).parameters.toEqualTypeOf<
      [Readonly<{ maybeLabel: Option.Option<string> }>]
    >()
    optionalDependencies.observed.toLayer(
      Effect.succeed(({ maybeLabel }) =>
        Stream.succeed(
          Option.match(maybeLabel, {
            onNone: () => HandlerMessage.ObservedTick(),
            onSome: () => HandlerMessage.ObservedTick(),
          }),
        ),
      ),
    )

    make<ChildModel, HandlerMessage>()(entry => ({
      // @ts-expect-error A declared schema must produce a Message in the enclosing union.
      wrong: entry('Wrong', { messages: [Schema.Number] }),
    }))

    const inlineCallbacks = {
      messages: [HandlerMessage.ObservedTick],
      modelToDependencies: (model: ChildModel) => ({
        isRunning: model.isRunning,
      }),
      dependenciesToStream: () => Stream.succeed(HandlerMessage.ObservedTick()),
    }
    make<ChildModel, HandlerMessage>()(entry => {
      entry(
        'InlineSubscription',
        { isRunning: Schema.Boolean },
        // @ts-expect-error Subscription implementations belong in handler Layers.
        inlineCallbacks,
      )
      return {}
    })
  }

  class Prefix extends Context.Service<Prefix, { readonly value: string }>()(
    'SubscriptionHandlerTestPrefix',
  ) {}

  class Suffix extends Context.Service<Suffix, { readonly value: string }>()(
    'SubscriptionHandlerTestSuffix',
  ) {}

  const subscriptions = make<ChildModel, string>()(entry => ({
    registrationKey: entry('LabelValues', childFields, {
      messages: [Schema.String],
      modelToDependencies: model => ({
        isRunning: model.isRunning,
        label: model.label,
      }),
    }),
    latestLabel: entry('LatestLabelValues', childFields, {
      messages: [Schema.String],
      modelToDependencies: model => ({
        isRunning: model.isRunning,
        label: model.label,
      }),
      keepAliveEquivalence: Equivalence.make(
        (left, right) => left.isRunning === right.isRunning,
      ),
    }),
  }))

  it('runs a named Stream without local Model dependencies', async () => {
    const persistent = make<ChildModel, string>()(entry => ({
      heartbeat: entry('HeartbeatTicks', { messages: [Schema.String] }),
    }))
    const layer = persistent.heartbeat.toLayer(
      Effect.succeed(() => Stream.succeed('tick')),
    )
    const dependencies = persistent.heartbeat.modelToDependencies({
      isRunning: true,
      label: 'first',
    })
    const nextDependencies = persistent.heartbeat.modelToDependencies({
      isRunning: false,
      label: 'second',
    })

    expect(persistent.heartbeat.name).toBe('HeartbeatTicks')
    expect(persistent.heartbeat.messages).toEqual([Schema.String])
    expect(dependencies).toEqual({})
    expect(nextDependencies).toEqual(dependencies)
    expectTypeOf(layer).toEqualTypeOf<Layer.Layer<Handler<'HeartbeatTicks'>>>()

    const result = await Effect.runPromise(
      Stream.runCollect(
        persistent.heartbeat.dependenciesToStream(dependencies),
      ).pipe(Effect.provide(layer)),
    )

    expect(result).toEqual(['tick'])
  })

  it('separates the registration key from the handler name and carries its requirements', () => {
    const layer = subscriptions.registrationKey.toLayer(
      Effect.succeed(({ label }) =>
        Stream.fromEffect(
          Effect.map(Prefix, ({ value }) => `${value}${label}`),
        ),
      ),
    )

    expect(Object.keys(subscriptions)).toEqual([
      'registrationKey',
      'latestLabel',
    ])
    expect(subscriptions.registrationKey.name).toBe('LabelValues')
    expectTypeOf(layer).toEqualTypeOf<
      Layer.Layer<Handler<'LabelValues'>, never, Prefix>
    >()
    expectTypeOf<
      StreamServices<
        ReturnType<typeof subscriptions.registrationKey.dependenciesToStream>
      >
    >().toEqualTypeOf<Handler<'LabelValues'>>()

    const constructedLayer = subscriptions.registrationKey.toLayer(
      Effect.map(
        Suffix,
        () =>
          ({ label }: ChildDependencies) =>
            Stream.fromEffect(
              Effect.map(Prefix, ({ value }) => `${value}${label}`),
            ),
      ),
    )
    expectTypeOf(constructedLayer).toEqualTypeOf<
      Layer.Layer<Handler<'LabelValues'>, never, Prefix | Suffix>
    >()
  })

  it('uses invocation context over the context captured by the handler Layer', async () => {
    const layer = subscriptions.registrationKey.toLayer(
      Effect.succeed(({ label }) =>
        Stream.fromEffect(
          Effect.map(Prefix, ({ value }) => `${value}${label}`),
        ),
      ),
    )
    const handlerLayer = Layer.provide(
      layer,
      Layer.succeed(Prefix, { value: 'construction:' }),
    )
    const dependencies = subscriptions.registrationKey.modelToDependencies({
      isRunning: true,
      label: 'hello',
    })

    const result = await Effect.runPromise(
      Stream.runCollect(
        subscriptions.registrationKey.dependenciesToStream(dependencies),
      ).pipe(
        Effect.provideService(Prefix, { value: 'invocation:' }),
        Effect.provide(handlerLayer),
      ),
    )

    expect(result).toEqual(['invocation:hello'])
  })

  it('rejects a handler Layer from another Subscription definition with the same name', async () => {
    const other = make<ChildModel, string>()(entry => ({
      registrationKey: entry('LabelValues', childFields, {
        messages: [Schema.String],
        modelToDependencies: model => ({
          isRunning: model.isRunning,
          label: model.label,
        }),
      }),
    }))
    const otherLayer = other.registrationKey.toLayer(
      Effect.succeed(() => Stream.succeed('wrong')),
    )
    const dependencies = subscriptions.registrationKey.modelToDependencies({
      isRunning: true,
      label: 'hello',
    })

    await expect(
      Effect.runPromise(
        Stream.runCollect(
          subscriptions.registrationKey.dependenciesToStream(dependencies),
        ).pipe(Effect.provide(otherLayer)),
      ),
    ).rejects.toThrow('belongs to another definition with the same name')
  })

  it('builds an Effect supplied handler once for multiple Stream executions', async () => {
    let builds = 0
    const layer = subscriptions.registrationKey.toLayer(
      Effect.map(Suffix, () => {
        builds += 1
        return ({ label }: ChildDependencies) => Stream.succeed(label)
      }),
    )
    const handlerLayer = Layer.provide(
      layer,
      Layer.succeed(Suffix, { value: 'unused' }),
    )
    const first = subscriptions.registrationKey.modelToDependencies({
      isRunning: true,
      label: 'first',
    })
    const second = subscriptions.registrationKey.modelToDependencies({
      isRunning: true,
      label: 'second',
    })

    const result = await Effect.runPromise(
      Effect.all([
        Stream.runCollect(
          subscriptions.registrationKey.dependenciesToStream(first),
        ),
        Stream.runCollect(
          subscriptions.registrationKey.dependenciesToStream(second),
        ),
      ]).pipe(Effect.provide(handlerLayer)),
    )

    expect(builds).toBe(1)
    expect(result).toEqual([['first'], ['second']])
  })

  it('passes current dependencies to a keep-alive handler', async () => {
    const layer = subscriptions.latestLabel.toLayer(
      Effect.succeed((_dependencies, readDependencies) =>
        Stream.sync(() => readDependencies().label),
      ),
    )
    const initial = subscriptions.latestLabel.modelToDependencies({
      isRunning: true,
      label: 'initial',
    })
    const current = subscriptions.latestLabel.modelToDependencies({
      isRunning: true,
      label: 'current',
    })

    const result = await Effect.runPromise(
      Stream.runCollect(
        subscriptions.latestLabel.dependenciesToStream(initial, () => current),
      ).pipe(Effect.provide(layer)),
    )

    expect(result).toEqual(['current'])
  })

  it('preserves the handler Layer constructor through lift', () => {
    const lifted = lift(subscriptions)<ParentModel, ParentMessage>({
      read: model => Option.some(model.child),
      toParentMessage,
    })

    expect(lifted.registrationKey.toLayer).toBe(
      subscriptions.registrationKey.toLayer,
    )
    expect(lifted.registrationKey.name).toBe('LabelValues')
    expect(lifted.registrationKey.messages).toBe(
      subscriptions.registrationKey.messages,
    )
    expectTypeOf(lifted.registrationKey.toLayer).toEqualTypeOf(
      subscriptions.registrationKey.toLayer,
    )
  })

  it('preserves the handler Layer constructor through aggregate', () => {
    const combined = aggregate(subscriptions)

    expect(combined.registrationKey.toLayer).toBe(
      subscriptions.registrationKey.toLayer,
    )
    expect(combined.registrationKey.messages).toBe(
      subscriptions.registrationKey.messages,
    )
    expectTypeOf(combined.registrationKey.toLayer).toEqualTypeOf(
      subscriptions.registrationKey.toLayer,
    )
  })
})

describe('lift types', () => {
  it('keeps the optional reader, handler requirement, and keepAlive dependencies', () => {
    class Clock extends Context.Service<Clock, { readonly now: number }>()(
      'LiftedSubscriptionClock',
    ) {}

    const childSubscriptions = make<ChildModel, string>()(entry => ({
      ticks: entry('LiftedTicks', childFields, {
        messages: [Schema.String],
        modelToDependencies: model => ({
          isRunning: model.isRunning,
          label: model.label,
        }),
        keepAliveEquivalence: Equivalence.make(
          (left, right) => left.isRunning === right.isRunning,
        ),
      }),
    }))
    const LiftedTicksLayer = childSubscriptions.ticks.toLayer(
      Effect.map(
        Clock,
        () => (_dependencies, readDependencies) =>
          Stream.succeed(readDependencies().label),
      ),
    )
    const liftChild = lift(childSubscriptions)<ParentModel, ParentMessage>
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
    >().toEqualTypeOf<Handler<'LiftedTicks'>>()
    expectTypeOf(LiftedTicksLayer).toEqualTypeOf<
      Layer.Layer<Handler<'LiftedTicks'>, never, Clock>
    >()
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

  const ThemeMessageSchema = Schema.Struct({
    _tag: Schema.Literal('ChangedTheme'),
    isDark: Schema.Boolean,
  })
  const ViewportMessageSchema = Schema.Struct({
    _tag: Schema.Literal('ResizedViewport'),
    width: Schema.Number,
  })

  const themeSubscriptions = make<ThemeModel, ThemeMessage>()(entry => ({
    systemTheme: entry(
      'SystemTheme',
      { isDark: Schema.Boolean },
      {
        messages: [ThemeMessageSchema],
        modelToDependencies: model => ({ isDark: model.isDark }),
      },
    ),
    scroll: entry(
      'ScrollTheme',
      { isDark: Schema.Boolean },
      {
        messages: [ThemeMessageSchema],
        modelToDependencies: model => ({ isDark: model.isDark }),
        keepAliveEquivalence: Equivalence.make<{ readonly isDark: boolean }>(
          (left, right) => left.isDark === right.isDark,
        ),
      },
    ),
  }))
  const SystemThemeLayer = themeSubscriptions.systemTheme.toLayer(
    Effect.succeed(({ isDark }) =>
      Stream.succeed<ThemeMessage>({ _tag: 'ChangedTheme', isDark }),
    ),
  )
  const ScrollThemeLayer = themeSubscriptions.scroll.toLayer(
    Effect.succeed((_dependencies, readDependencies) =>
      Stream.succeed<ThemeMessage>({
        _tag: 'ChangedTheme',
        isDark: readDependencies().isDark,
      }),
    ),
  )

  const viewportSubscriptions = make<ThemeModel, ViewportMessage>()(entry => ({
    viewportWidth: entry('ViewportWidth', {
      messages: [ViewportMessageSchema],
    }),
  }))
  const ViewportWidthLayer = viewportSubscriptions.viewportWidth.toLayer(
    Effect.succeed(() =>
      Stream.succeed<ViewportMessage>({ _tag: 'ResizedViewport', width: 0 }),
    ),
  )

  const clockSubscriptions = make<ThemeModel, ViewportMessage>()(entry => ({
    clockTick: entry(
      'ClockTick',
      {},
      {
        messages: [ViewportMessageSchema],
        modelToDependencies: () => ({}),
      },
    ),
  }))
  const ClockTickLayer = clockSubscriptions.clockTick.toLayer(
    Effect.map(
      Clock,
      ({ now }) =>
        () =>
          Stream.succeed<ViewportMessage>({
            _tag: 'ResizedViewport',
            width: now,
          }),
    ),
  )

  const focusSubscriptions = make<ThemeModel, ThemeMessage>()(entry => ({
    windowFocus: entry(
      'WindowFocus',
      { isDark: Schema.Boolean },
      {
        messages: [ThemeMessageSchema],
        modelToDependencies: model => ({ isDark: model.isDark }),
      },
    ),
  }))

  const incompatibleModelSubscriptions = make<
    IncompatibleModel,
    ThemeMessage
  >()(entry => ({
    unrelated: entry(
      'UnrelatedTheme',
      {},
      {
        messages: [ThemeMessageSchema],
        modelToDependencies: () => ({}),
      },
    ),
  }))

  const childSubscriptions = makeChildSubscriptions([])
  const gatedChildSubscriptions = lift(childSubscriptions.subscriptions)({
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
          'ApplicationTheme',
          { isDark: Schema.Boolean },
          {
            messages: [ThemeMessageSchema],
            modelToDependencies: model => ({ isDark: model.isDark }),
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

    const curried = aggregate<ThemeModel, ThemeMessage | ViewportMessage>()(
      themeSubscriptions,
      viewportSubscriptions,
      clockSubscriptions,
    )

    expectTypeOf<keyof typeof curried>().toEqualTypeOf<
      'systemTheme' | 'scroll' | 'viewportWidth' | 'clockTick'
    >()

    expectTypeOf<
      StreamServices<
        ReturnType<typeof curried.systemTheme.dependenciesToStream>
      >
    >().toEqualTypeOf<Handler<'SystemTheme'>>()

    expectTypeOf<
      StreamServices<ReturnType<typeof curried.clockTick.dependenciesToStream>>
    >().toEqualTypeOf<Handler<'ClockTick'>>()

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
      Subscriptions<ThemeModel, ThemeMessage | ViewportMessage, Handler<string>>
    >()

    expectTypeOf<
      StreamServices<
        ReturnType<typeof combined.systemTheme.dependenciesToStream>
      >
    >().toEqualTypeOf<Handler<'SystemTheme'>>()

    expectTypeOf<
      StreamServices<ReturnType<typeof combined.clockTick.dependenciesToStream>>
    >().toEqualTypeOf<Handler<'ClockTick'>>()

    expectTypeOf(ClockTickLayer).toEqualTypeOf<
      Layer.Layer<Handler<'ClockTick'>, never, Clock>
    >()
    expectTypeOf(SystemThemeLayer).toEqualTypeOf<
      Layer.Layer<Handler<'SystemTheme'>>
    >()
    expectTypeOf(ScrollThemeLayer).toEqualTypeOf<
      Layer.Layer<Handler<'ScrollTheme'>>
    >()
    expectTypeOf(ViewportWidthLayer).toEqualTypeOf<
      Layer.Layer<Handler<'ViewportWidth'>>
    >()

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
