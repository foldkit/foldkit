import { Context, Effect, Option, Schema } from 'effect'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'

import * as Command from '../../command/public.js'
import { defineMessageUnion, defineTaggedUnion } from '../../schema/index.js'
import { modifyFields } from '../../struct/index.js'
import * as Update from '../../update/index.js'
import { type GuardInput, makeDefinition } from './definition.js'
import { fold } from './machine.js'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? (<Value>() => Value extends Right ? 1 : 2) extends <
        Value,
      >() => Value extends Left ? 1 : 2
      ? true
      : false
    : false

const State = defineTaggedUnion({
  Idle: { value: Schema.Number },
  Loading: { value: Schema.Number },
  Ready: { value: Schema.Number },
  Error: { value: Schema.Number, reason: Schema.String },
  Done: { value: Schema.Number },
  Paused: {},
})
type State = typeof State.Type

const Message = defineMessageUnion({
  ClickedStart: {},
  ClickedShared: {},
  ClickedNext: {},
  ClickedMissing: {},
  CompletedWork: {},
  ClickedOutside: {},
})
type Message = typeof Message.Type

const ContextSchema = Schema.Struct({
  allow: Schema.Boolean,
  offset: Schema.Number,
})
type ContextSchema = typeof ContextSchema.Type
type ContextValue = typeof ContextSchema.Type

class WorkService extends Context.Service<
  WorkService,
  { readonly id: 'work' }
>()('MachineDefinitionTestWorkService') {}

class AuditService extends Context.Service<
  AuditService,
  { readonly id: 'audit' }
>()('MachineDefinitionTestAuditService') {}

const Work = Command.define('Work', {
  messages: [Message.CompletedWork],
  handler: function* () {
    return () => Effect.map(WorkService, () => Message.CompletedWork())
  },
})

const Audit = Command.define('Audit', {
  messages: [Message.CompletedWork],
  handler: function* () {
    return () => Effect.map(AuditService, () => Message.CompletedWork())
  },
})

type WorkRequirements = Command.HandlerOf<typeof Work>
type AuditRequirements = Command.HandlerOf<typeof Audit>
type BothRequirements = WorkRequirements | AuditRequirements

const ContextDefinition = makeDefinition({
  State,
  Message,
  Context: ContextSchema,
})
const {
  makeGuard: makeContextGuard,
  makeHandler: makeContextHandler,
  makeSharedTransitions: makeContextSharedTransitions,
  to: contextTo,
  when: contextWhen,
} = ContextDefinition
const Definition = makeDefinition({ State, Message })
const { ignore, makeGuard, makeMachine, when } = Definition

describe('Machine.makeDefinition', () => {
  it('infers inline, extracted, and selected shared inputs', () => {
    const extractedGuard = makeContextGuard(
      { from: 'Idle', on: 'ClickedStart' },
      ({ state, message, context }) => {
        expectTypeOf(state).toEqualTypeOf<typeof State.Idle.Type>()
        expectTypeOf(message).toEqualTypeOf<typeof Message.ClickedStart.Type>()
        expectTypeOf(context).toEqualTypeOf<ContextValue>()
        return Option.some(state.value + context.offset)
      },
    )
    const extractedHandler = makeContextHandler(
      extractedGuard,
      ({ state, message, context, guardValue }) => {
        expectTypeOf(state).toEqualTypeOf<typeof State.Idle.Type>()
        expectTypeOf(message).toEqualTypeOf<typeof Message.ClickedStart.Type>()
        expectTypeOf(context).toEqualTypeOf<ContextValue>()
        expectTypeOf(guardValue).toEqualTypeOf<number>()
        return { model: State.Loading({ value: state.value + guardValue }) }
      },
    )
    const selectorHandler = makeContextHandler(
      { from: 'Loading', on: 'ClickedNext' },
      ({ state, message, context }) => {
        expectTypeOf(state).toEqualTypeOf<typeof State.Loading.Type>()
        expectTypeOf(message).toEqualTypeOf<typeof Message.ClickedNext.Type>()
        expectTypeOf(context).toEqualTypeOf<ContextValue>()
        return { model: State.Ready({ value: state.value + context.offset }) }
      },
    )

    const transitions = ContextDefinition.makeTransitions('Ready', {
      on: {
        CompletedWork: contextTo('Done', ({ state, message, context }) => {
          expectTypeOf(state).toEqualTypeOf<typeof State.Ready.Type>()
          expectTypeOf(message).toEqualTypeOf<
            typeof Message.CompletedWork.Type
          >()
          expectTypeOf(context).toEqualTypeOf<ContextValue>()
          return { model: State.Done({ value: state.value + context.offset }) }
        }),
      },
    })

    const shared = makeContextSharedTransitions(['Idle', 'Error'], {
      on: {
        ClickedShared: contextTo('Ready', ({ state, message, context }) => {
          expectTypeOf(state).toEqualTypeOf<
            typeof State.Idle.Type | typeof State.Error.Type
          >()
          expectTypeOf(message).toEqualTypeOf<
            typeof Message.ClickedShared.Type
          >()
          expectTypeOf(context).toEqualTypeOf<ContextValue>()
          return { model: State.Ready({ value: state.value + context.offset }) }
        }),
      },
    })

    const machine = ContextDefinition.makeMachine({
      initial: State.Idle({ value: 1 }),
      shared: [shared],
      states: {
        Idle: {
          on: {
            ClickedStart: [
              contextWhen(extractedGuard, 'Loading', extractedHandler),
            ],
          },
        },
        Loading: {
          on: {
            ClickedNext: contextTo('Ready', selectorHandler),
          },
        },
        Ready: transitions,
      },
    })

    expect(
      machine.transition(State.Idle({ value: 3 }), Message.ClickedStart(), {
        allow: true,
        offset: 4,
      }).model,
    ).toEqual(State.Loading({ value: 10 }))
    expect(
      machine.transition(
        State.Error({ value: 5, reason: 'retry' }),
        Message.ClickedShared(),
        {
          allow: true,
          offset: 2,
        },
      ).model,
    ).toEqual(State.Ready({ value: 7 }))
    expect(
      machine.transition(State.Loading({ value: 5 }), Message.ClickedNext(), {
        allow: true,
        offset: 2,
      }).model,
    ).toEqual(State.Ready({ value: 7 }))
  })

  it('normalizes no-argument and context-only guard producers to selected inputs', () => {
    const noArgumentGuard = makeContextGuard(
      { from: 'Idle', on: 'ClickedStart' },
      () => Option.some('accepted'),
    )
    const contextOnlyGuard = makeContextGuard(
      { from: 'Ready', on: 'ClickedNext' },
      ({ context }) => context.allow,
    )

    type ExpectedNoArgumentInput = GuardInput<
      typeof State.Idle.Type,
      typeof Message.ClickedStart.Type,
      ContextValue
    >
    type ExpectedContextOnlyInput = GuardInput<
      typeof State.Ready.Type,
      typeof Message.ClickedNext.Type,
      ContextValue
    >
    type NoArgumentInput = Parameters<typeof noArgumentGuard>[0]
    type ContextOnlyInput = Parameters<typeof contextOnlyGuard>[0]
    expectTypeOf<
      Equal<NoArgumentInput, ExpectedNoArgumentInput>
    >().toEqualTypeOf<true>()
    expectTypeOf<
      Equal<ContextOnlyInput, ExpectedContextOnlyInput>
    >().toEqualTypeOf<true>()
    expectTypeOf<NoArgumentInput['state']>().toEqualTypeOf<
      typeof State.Idle.Type
    >()
    expectTypeOf<NoArgumentInput['message']>().toEqualTypeOf<
      typeof Message.ClickedStart.Type
    >()
    expectTypeOf<NoArgumentInput['context']>().toEqualTypeOf<ContextValue>()
    expectTypeOf<keyof NoArgumentInput>().toEqualTypeOf<
      'state' | 'message' | 'context'
    >()
    expectTypeOf<NoArgumentInput>().toMatchTypeOf<ExpectedNoArgumentInput>()
    expectTypeOf<ExpectedNoArgumentInput>().toMatchTypeOf<NoArgumentInput>()
    expectTypeOf<ContextOnlyInput['state']>().toEqualTypeOf<
      typeof State.Ready.Type
    >()
    expectTypeOf<ContextOnlyInput['message']>().toEqualTypeOf<
      typeof Message.ClickedNext.Type
    >()
  })

  it('infers void and mixed guard values', () => {
    const booleanDefinition = makeDefinition({ State, Message })
    const booleanMachine = booleanDefinition.makeMachine({
      initial: State.Idle({ value: 0 }),
      states: {
        Idle: {
          on: {
            ClickedStart: [
              booleanDefinition.when(
                ({ state }) => state.value > 0,
                'Ready',
                ({ guardValue }) => {
                  expectTypeOf(guardValue).toEqualTypeOf<void>()
                  return { model: State.Ready({ value: 1 }) }
                },
              ),
            ],
          },
        },
      },
    })

    const mixedMachine = booleanDefinition.makeMachine({
      initial: State.Idle({ value: 0 }),
      states: {
        Idle: {
          on: {
            ClickedStart: [
              booleanDefinition.when(
                ({ state }) =>
                  state.value > 0 ? Option.some(state.value) : false,
                'Ready',
                ({ guardValue }) => {
                  const guardValueCanBeNumber: typeof guardValue = 1
                  const guardValueCanBeVoid: typeof guardValue = undefined
                  void guardValueCanBeNumber
                  void guardValueCanBeVoid
                  // @ts-expect-error mixed boolean and Option guards reject unrelated values
                  const guardValueRejectsString: typeof guardValue = 'invalid'
                  void guardValueRejectsString
                  return { model: State.Ready({ value: guardValue ?? 1 }) }
                },
              ),
            ],
          },
        },
      },
    })

    expect(
      booleanMachine.step(State.Idle({ value: 1 }), Message.ClickedStart())
        ._tag,
    ).toBe('Transitioned')
    expect(
      mixedMachine.step(State.Idle({ value: 2 }), Message.ClickedStart())._tag,
    ).toBe('Transitioned')

    if (false) {
      // A context-free Machine accepts exactly state and Message.
      booleanMachine.transition(
        State.Idle({ value: 0 }),
        Message.ClickedStart(),
        // @ts-expect-error Context is not accepted by this Machine.
        {
          allow: true,
          offset: 1,
        },
      )
    }
  })

  it('keeps construction passive and evaluates only the selected guard once', () => {
    const maybeFirst = vi.fn(() => Option.none<number>())
    const maybeSecond = vi.fn(() => Option.some(42))
    const firstGuard = makeGuard(
      { from: 'Idle', on: 'ClickedStart' },
      maybeFirst,
    )
    const secondGuard = makeGuard(
      { from: 'Idle', on: 'ClickedStart' },
      maybeSecond,
    )
    const firstHandler = vi.fn(() => ({ model: State.Ready({ value: 0 }) }))
    const secondHandler = vi.fn(({ guardValue }: { guardValue: number }) => ({
      model: State.Ready({ value: guardValue }),
      commands: [Work()],
    }))

    const machine = makeMachine({
      initial: State.Idle({ value: 0 }),
      states: {
        Idle: {
          on: {
            ClickedStart: [
              when(firstGuard, 'Ready', firstHandler),
              when(secondGuard, 'Ready', secondHandler),
              ignore(),
            ],
          },
        },
      },
    })

    expect(maybeFirst).not.toHaveBeenCalled()
    expect(maybeSecond).not.toHaveBeenCalled()
    expect(firstHandler).not.toHaveBeenCalled()
    expect(secondHandler).not.toHaveBeenCalled()

    const result = machine.step(
      State.Idle({ value: 0 }),
      Message.ClickedStart(),
    )
    expect(result).toMatchObject({ _tag: 'Transitioned', target: 'Ready' })
    expect(maybeFirst).toHaveBeenCalledTimes(1)
    expect(maybeSecond).toHaveBeenCalledTimes(1)
    expect(firstHandler).not.toHaveBeenCalled()
    expect(secondHandler).toHaveBeenCalledTimes(1)
  })

  it('preserves Commands and their complete requirements across local, shared, and fallback Edges', () => {
    const commandDefinition = makeDefinition({ State, Message })
    const {
      makeMachine: makeCommandMachine,
      makeSharedTransitions: makeCommandSharedTransitions,
      otherwise: otherwiseCommand,
      to: toCommand,
      when: whenCommand,
    } = commandDefinition
    const shared = makeCommandSharedTransitions(['Idle', 'Error'], {
      on: {
        ClickedShared: toCommand('Ready', () => ({
          model: State.Ready({ value: 1 }),
          commands: [Audit()],
        })),
      },
    })

    const machine = makeCommandMachine({
      initial: State.Idle({ value: 0 }),
      shared: [shared],
      states: {
        Idle: {
          on: {
            ClickedStart: [
              whenCommand(
                () => false,
                'Ready',
                () => ({
                  model: State.Ready({ value: 1 }),
                  commands: [Work()],
                }),
              ),
              otherwiseCommand(
                toCommand('Loading', () => ({
                  model: State.Loading({ value: 2 }),
                  commands: [Audit()],
                })),
              ),
            ],
          },
        },
        Loading: {
          on: {
            ClickedNext: toCommand('Ready', () => ({
              model: State.Ready({ value: 3 }),
              commands: [Work()],
            })),
          },
        },
        Ready: {
          on: {
            CompletedWork: toCommand('Done', () => ({
              model: State.Done({ value: 4 }),
              commands: [Audit()],
            })),
          },
        },
      },
    })

    const first = machine.transition(
      State.Idle({ value: 0 }),
      Message.ClickedStart(),
    )
    const second = machine.transition(first.model, Message.ClickedNext())
    const third = machine.transition(second.model, Message.CompletedWork())
    const sharedResult = machine.transition(
      State.Error({ value: 0, reason: 'x' }),
      Message.ClickedShared(),
    )
    const stepped = machine.step(
      State.Loading({ value: 0 }),
      Message.ClickedNext(),
    )
    const commands = fold({
      machine,
      read: (model: Readonly<{ state: State }>) => Option.some(model.state),
      write: (model, state) => modifyFields(model, { state: () => state }),
    })(Message.ClickedShared())({ state: State.Idle({ value: 0 }) })

    expectTypeOf<
      Equal<Update.RequirementsOf<() => typeof first>, BothRequirements>
    >().toEqualTypeOf<true>()
    expectTypeOf<
      Equal<Update.RequirementsOf<() => typeof second>, BothRequirements>
    >().toEqualTypeOf<true>()
    expectTypeOf<
      Equal<Update.RequirementsOf<() => typeof third>, BothRequirements>
    >().toEqualTypeOf<true>()
    expectTypeOf<
      Equal<Update.RequirementsOf<() => typeof sharedResult>, BothRequirements>
    >().toEqualTypeOf<true>()
    expectTypeOf<
      Equal<Update.RequirementsOf<() => typeof stepped>, BothRequirements>
    >().toEqualTypeOf<true>()
    expectTypeOf<
      Equal<Update.RequirementsOf<() => typeof commands>, BothRequirements>
    >().toEqualTypeOf<true>()
    expect(first.commands?.map(command => command.name)).toEqual(['Audit'])
    expect(second.commands?.map(command => command.name)).toEqual(['Work'])
    expect(third.commands?.map(command => command.name)).toEqual(['Audit'])
    expect(sharedResult.commands?.map(command => command.name)).toEqual([
      'Audit',
    ])
    expect(stepped).toMatchObject({
      _tag: 'Transitioned',
      commands: [{ name: 'Work' }],
    })
    expect(commands.commands?.map(command => command.name)).toEqual(['Audit'])
  })

  it('reports all ignored outcomes, shared overrides, graph data, and Mermaid output consistently', () => {
    const graphDefinition = makeDefinition({ State, Message })
    const {
      ignore: ignoreGraph,
      makeMachine: makeGraphMachine,
      makeSharedTransitions: makeGraphSharedTransitions,
      otherwise: otherwiseGraph,
      to: toGraph,
      when: whenGraph,
    } = graphDefinition
    const machine = makeGraphMachine({
      initial: State.Idle({ value: 0 }),
      shared: [
        makeGraphSharedTransitions(['Idle', 'Error'], {
          on: {
            ClickedShared: toGraph('Ready', ({ state }) => ({
              model: State.Ready({ value: state.value + 1 }),
            })),
          },
        }),
      ],
      states: {
        Idle: {
          on: {
            ClickedStart: [
              whenGraph(
                () => false,
                'Ready',
                () => ({ model: State.Ready({ value: 1 }) }),
              ),
            ],
            ClickedNext: [
              whenGraph(
                () => false,
                'Ready',
                () => ({ model: State.Ready({ value: 1 }) }),
              ),
              ignoreGraph(),
              otherwiseGraph(
                toGraph('Done', () => ({ model: State.Done({ value: 1 }) })),
              ),
            ],
          },
        },
        Error: {
          on: {
            ClickedShared: toGraph('Done', ({ state }) => ({
              model: State.Done({ value: state.value }),
            })),
          },
        },
        Ready: {
          on: {
            CompletedWork: toGraph('Done', ({ state }) => ({
              model: State.Done({ value: state.value }),
            })),
          },
        },
      },
    })

    expect(
      machine.step(State.Idle({ value: 0 }), Message.ClickedOutside()),
    ).toMatchObject({ _tag: 'Ignored', reason: 'OutOfAlphabet' })
    expect(
      machine.step(State.Ready({ value: 0 }), Message.ClickedStart()),
    ).toMatchObject({ _tag: 'Ignored', reason: 'NotApplicable' })
    expect(
      machine.step(State.Idle({ value: 0 }), Message.ClickedStart()),
    ).toMatchObject({ _tag: 'Ignored', reason: 'GuardsFellThrough' })
    expect(
      machine.step(State.Idle({ value: 0 }), Message.ClickedNext()),
    ).toMatchObject({ _tag: 'Ignored', reason: 'ExplicitlyIgnored' })
    expect(
      machine.transition(
        State.Error({ value: 4, reason: 'retry' }),
        Message.ClickedShared(),
      ).model,
    ).toEqual(State.Done({ value: 4 }))
    expect(machine.edges).toEqual([
      {
        from: 'Idle',
        messageTag: 'ClickedStart',
        target: 'Ready',
        guard: { _tag: 'When', position: 0 },
      },
      {
        from: 'Idle',
        messageTag: 'ClickedNext',
        target: 'Ready',
        guard: { _tag: 'When', position: 0 },
      },
      {
        from: 'Idle',
        messageTag: 'ClickedNext',
        target: 'Done',
        guard: { _tag: 'Otherwise', position: 2 },
      },
      {
        from: 'Idle',
        messageTag: 'ClickedShared',
        target: 'Ready',
        guard: { _tag: 'Unguarded' },
      },
      {
        from: 'Error',
        messageTag: 'ClickedShared',
        target: 'Done',
        guard: { _tag: 'Unguarded' },
      },
      {
        from: 'Ready',
        messageTag: 'CompletedWork',
        target: 'Done',
        guard: { _tag: 'Unguarded' },
      },
    ])
    expect(machine.reachableFrom('Idle')).toEqual(
      new Set(['Idle', 'Ready', 'Done']),
    )
    expect(machine.unreachableStates()).toEqual(['Loading', 'Error', 'Paused'])
    expect(machine.deadTransitions()).toEqual([
      {
        edge: {
          from: 'Error',
          messageTag: 'ClickedShared',
          target: 'Done',
          guard: { _tag: 'Unguarded' },
        },
        reason: 'UnreachableSource',
      },
      {
        edge: {
          from: 'Idle',
          messageTag: 'ClickedNext',
          target: 'Done',
          guard: { _tag: 'Otherwise', position: 2 },
        },
        reason: 'ShadowedByIgnore',
      },
    ])
    expect(machine.toMermaid()).toContain(
      'Idle --> Ready: ClickedStart [when 1]',
    )

    expect(() =>
      makeGraphMachine({
        initial: State.Idle({ value: 0 }),
        shared: [
          makeGraphSharedTransitions(['Idle', 'Error'], {
            on: {
              ClickedShared: toGraph('Ready', () => ({
                model: State.Ready({ value: 1 }),
              })),
            },
          }),
          makeGraphSharedTransitions(['Idle'], {
            on: {
              ClickedShared: toGraph('Done', () => ({
                model: State.Done({ value: 1 }),
              })),
            },
          }),
        ],
        states: {},
      }),
    ).toThrow('shared transitions overlap')
  })

  it('reads Context per transition and skips Context and writes when fold read returns None', () => {
    const contextGuard = makeContextGuard(
      { from: 'Idle', on: 'ClickedStart' },
      ({ context }) => context.allow,
    )
    const machine = ContextDefinition.makeMachine({
      initial: State.Idle({ value: 0 }),
      states: {
        Idle: {
          on: {
            ClickedStart: [
              contextWhen(contextGuard, 'Ready', ({ state, context }) => ({
                model: State.Ready({ value: state.value + context.offset }),
              })),
            ],
          },
        },
      },
    })
    type Parent = Readonly<{ state: State } & ContextValue>
    const read = vi.fn((model: Parent) => Option.some(model.state))
    const write = vi.fn((model: Parent, state: State) =>
      modifyFields(model, { state: () => state }),
    )
    const readContext = vi.fn((model: Parent) => ({
      offset: model.offset,
      allow: model.allow,
    }))
    const folded = fold({ machine, read, write, context: readContext })
    const parent = { state: State.Idle({ value: 2 }), offset: 5, allow: true }
    const result = folded(Message.ClickedStart())(parent)

    expect(result.model.state).toEqual(State.Ready({ value: 7 }))
    expect(readContext).toHaveBeenCalledTimes(1)

    type MaybeParent = Readonly<{ state?: State } & ContextValue>
    const absentRead = vi.fn((_: MaybeParent) => Option.none<State>())
    const absentWrite = vi.fn((model: MaybeParent) => model)
    const absentContext = vi.fn(() => {
      throw new Error('context should not be read')
    })
    const foldAbsent = fold({
      machine,
      read: absentRead,
      write: absentWrite,
      context: absentContext,
    })
    const absentParent: MaybeParent = { offset: 1, allow: true }
    const absentResult = foldAbsent(Message.ClickedStart())(absentParent)

    expect(absentResult.model).toBe(absentParent)
    expect(absentContext).not.toHaveBeenCalled()
    expect(absentWrite).not.toHaveBeenCalled()
  })

  it('forwards nested Machine Commands through an outer transition', () => {
    const InnerState = defineTaggedUnion({
      Waiting: {},
      Finished: {},
    })
    type InnerState = typeof InnerState.Type
    const OuterState = defineTaggedUnion({
      Nested: { inner: InnerState },
    })
    type OuterState = typeof OuterState.Type
    const InnerDefinition = makeDefinition({ State: InnerState, Message })
    const innerMachine = InnerDefinition.makeMachine({
      initial: InnerState.Waiting(),
      states: {
        Waiting: {
          on: {
            ClickedStart: InnerDefinition.to('Finished', () => ({
              model: InnerState.Finished(),
              commands: [Work()],
            })),
          },
        },
      },
    })
    const OuterDefinition = makeDefinition({ State: OuterState, Message })
    const outerMachine = OuterDefinition.makeMachine({
      initial: OuterState.Nested({ inner: innerMachine.initial }),
      states: {
        Nested: {
          on: {
            ClickedStart: OuterDefinition.to('Nested', ({ state, message }) => {
              const nestedTransition = innerMachine.transition(
                state.inner,
                message,
              )
              return {
                model: OuterState.Nested({ inner: nestedTransition.model }),
                commands: nestedTransition.commands,
              }
            }),
          },
        },
      },
    })

    const result = outerMachine.transition(
      OuterState.Nested({ inner: InnerState.Waiting() }),
      Message.ClickedStart(),
    )
    expect(result.model).toEqual(
      OuterState.Nested({ inner: InnerState.Finished() }),
    )
    expect(result.commands?.map(command => command.name)).toEqual(['Work'])
    expectTypeOf<
      Update.RequirementsOf<() => typeof result>
    >().toEqualTypeOf<WorkRequirements>()
  })
})
