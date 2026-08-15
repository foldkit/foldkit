import { Effect, Equivalence, Option, Schema, Stream } from 'effect'
import { describe, expect, expectTypeOf, it } from 'vitest'

import { type GatedDependencies, lift, make } from './subscription.js'

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
  it('projects the child Model and wraps the child Messages', async () => {
    const projectedModels: Array<ChildModel> = []
    const subscriptions = lift(makeChildSubscriptions(projectedModels))<
      ParentModel,
      ParentMessage
    >({
      toChildModel: model => model.child,
      toParentMessage,
    })

    const dependencies = subscriptions.ticks.modelToDependencies({
      isChildActive: false,
      child: { isRunning: true, label: 'a' },
    })

    expect(dependencies).toEqual({ isRunning: true, label: 'a' })
    expect(
      await collect(
        subscriptions.ticks.dependenciesToStream(
          dependencies,
          () => dependencies,
        ),
      ),
    ).toEqual([toParentMessage('a-1'), toParentMessage('a-2')])
  })
})

describe('lift with a when gate', () => {
  const liftGated = (projectedModels: Array<ChildModel>) =>
    lift(makeChildSubscriptions(projectedModels))<ParentModel, ParentMessage>({
      toChildModel: model => model.child,
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

  it('leaves the child projection unrun while the gate is closed', async () => {
    const projectedModels: Array<ChildModel> = []
    const subscriptions = liftGated(projectedModels)

    const dependencies = subscriptions.ticks.modelToDependencies({
      isChildActive: false,
      child: { isRunning: true, label: 'a' },
    })

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

  it('keeps a keepAliveEquivalence entry alive through the gate', async () => {
    const subscriptions = lift(makeKeepAliveChildSubscriptions())<
      ParentModel,
      ParentMessage
    >({
      toChildModel: model => model.child,
      toParentMessage,
      when: model => model.isChildActive,
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
      toChildModel: (model: ParentModel) => model.child,
      toParentMessage: (message: string): ParentMessage =>
        toParentMessage(message),
      when: { ticks: (model: ParentModel) => model.isChildActive },
    })

  it('gates the named entry and leaves the rest plain', async () => {
    const subscriptions = liftPerEntry()

    const closedModel: ParentModel = {
      isChildActive: false,
      child: { isRunning: true, label: 'a' },
    }

    const gatedDependencies =
      subscriptions.ticks.modelToDependencies(closedModel)
    const plainDependencies =
      subscriptions.pulses.modelToDependencies(closedModel)

    expect(gatedDependencies).toEqual({ maybeDependencies: Option.none() })
    expect(plainDependencies).toEqual({ isRunning: true, label: 'a' })

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
          plainDependencies,
          () => plainDependencies,
        ),
      ),
    ).toEqual([toParentMessage('pulses-a')])
  })

  it('types the named entry as gated and the rest as the child dependencies', () => {
    const subscriptions = liftPerEntry()

    expectTypeOf(subscriptions.ticks.modelToDependencies).returns.toEqualTypeOf<
      GatedDependencies<ChildDependencies>
    >()
    expectTypeOf(
      subscriptions.pulses.modelToDependencies,
    ).returns.toEqualTypeOf<ChildDependencies>()
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
      toChildModel: model => model.child,
      toParentMessage,
      when: model => model.isChildActive,
    })

    return lift(parentSubscriptions)<GrandparentModel, GrandparentMessage>({
      toChildModel: model => model.parent,
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
      toChildModel: model => model.child,
      toParentMessage,
      when: model => model.isChildActive,
    })

    const subscriptions = lift(parentSubscriptions)<
      GrandparentModel,
      GrandparentMessage
    >({
      toChildModel: model => model.parent,
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
      toChildModel: (model: ParentModel) => model.child,
      toParentMessage: (message: string): ParentMessage =>
        toParentMessage(message),
      when: { ticks: (model: ParentModel) => model.isChildActive },
    })

    const subscriptions = lift(parentSubscriptions)<
      GrandparentModel,
      GrandparentMessage
    >({
      toChildModel: model => model.parent,
      toParentMessage: toGrandparentMessage,
      when: model => model.isParentActive,
    })

    expect(subscriptions.ticks.modelToDependencies(openModel)).toEqual({
      maybeDependencies: Option.some({
        maybeDependencies: Option.some({ isRunning: true, label: 'a' }),
      }),
    })
    expect(subscriptions.pulses.modelToDependencies(openModel)).toEqual({
      maybeDependencies: Option.some({ isRunning: true, label: 'a' }),
    })
    expect(subscriptions.ticks.modelToDependencies(innerClosedModel)).toEqual({
      maybeDependencies: Option.some({ maybeDependencies: Option.none() }),
    })
    expect(subscriptions.pulses.modelToDependencies(innerClosedModel)).toEqual({
      maybeDependencies: Option.some({ isRunning: true, label: 'a' }),
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
