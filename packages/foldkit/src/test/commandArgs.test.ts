import { Array, Context, Effect, Option, Schema } from 'effect'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'

import * as Block from '../block/public.js'
import { qualifyCommand } from '../block/scope.js'
import * as Command from '../command/index.js'
import { defineMessageUnion } from '../message/index.js'
import * as Scene from '../scene/public.js'
import * as Story from '../story/public.js'

const Model = Schema.Struct({ generation: Schema.Number })
type Model = typeof Model.Type
const Message = defineMessageUnion({
  RequestedPaint: {},
  CompletedPaint: { generation: Schema.Number },
})
type Message = typeof Message.Type
const ChildDefinition = Block.makeDefinition('CommandArgsChild', {
  Model,
  Message,
})
const Paint = ChildDefinition.makeCommand('Paint', {
  args: { generation: Schema.Number },
  messages: [Message.CompletedPaint],
  handler: function* () {
    return ({ generation }) =>
      Effect.succeed(Message.CompletedPaint({ generation }))
  },
})
const ChildComposition = ChildDefinition.makeComposition()
const prepare = () =>
  ChildComposition.prepareBlock({
    init: ChildComposition.makeInit(() => ({ model: { generation: 1 } })),
    update: ChildComposition.makeUpdate({
      RequestedPaint: model => ({
        model,
        commands: [Paint({ generation: model.generation })],
      }),
      CompletedPaint: model => ({ model }),
    }),
    EffectsLayer: Paint.layer,
    operations: { requestPaint: Message.RequestedPaint },
  })
const ChildBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof Model,
  typeof prepare
> = Block.assemble(prepare)

const ParentMessage = defineMessageUnion({ ClickedPaint: {} })
type ParentMessage = typeof ParentMessage.Type
const ParentDefinition = Block.makeDefinition('CommandArgsParent', {
  Model: Schema.Struct({ child: Model }),
  Message: ParentMessage,
})
const ChildBinding = ParentDefinition.makeBinding(ChildBlock, {
  field: 'child',
})
const ParentComposition = ParentDefinition.makeComposition({
  bindings: [ChildBinding],
})
const update = ParentComposition.makeUpdate({
  ClickedPaint: model => ChildBinding.requestPaint()(model),
})
const view = ParentComposition.makeView((_model, h) =>
  h.button([h.OnClick(ParentMessage.ClickedPaint())], ['Paint']),
)

describe('Command.argsOf', () => {
  it('projects a real Story capture through qualified child delivery', () => {
    const inspectAndResolve = <RootModel, RootMessage, OutMessage>(
      simulation: Story.StorySimulation<RootModel, RootMessage, OutMessage>,
    ) => {
      const pending = Option.getOrThrow(Array.head(simulation.commands))
      const args = Option.getOrThrow(Story.Command.argsOf(Paint)(pending))

      expect(args.generation).toBe(7)
      expect(pending.name).toBe('child/Paint')
      expectTypeOf(args.generation).toEqualTypeOf<number>()
      expectTypeOf(pending.name).toEqualTypeOf<string>()

      return Story.Command.resolve(
        Paint(args),
        Message.CompletedPaint({ generation: args.generation }),
      )(simulation)
    }

    Story.story(
      update,
      Story.given({ child: { generation: 7 } }),
      Story.message(ParentMessage.ClickedPaint()),
      inspectAndResolve,
    )
  })

  it('projects a real Scene capture without exposing a child-local Effect', () => {
    Scene.scene(
      { update, view },
      Scene.given({ child: { generation: 9 } }),
      Scene.click(Scene.role('button', { name: 'Paint' })),
      Scene.tap(simulation => {
        const pending = Option.getOrThrow(Array.head(simulation.commands))
        const args = Option.getOrThrow(Scene.Command.argsOf(Paint)(pending))

        expect(args.generation).toBe(9)
        expect(pending.name).not.toBe(Paint.name)

        if (false) {
          // @ts-expect-error Captured metadata does not gain an executable child Effect.
          pending.effect
          // @ts-expect-error Projecting args does not narrow the pending metadata.
          const generation: number = pending.args.generation
          void generation
        }
      }),
      Scene.Command.resolve(Paint, Message.CompletedPaint({ generation: 9 })),
    )
  })

  it('rejects another Definition with the same name and name-only metadata', () => {
    const foreign = Command.define(Paint.name, {
      args: { generation: Schema.String },
      messages: [Message.CompletedPaint],
    })
    const impostor = { name: Paint.name, args: { generation: 'wrong' } }

    expect(
      Story.Command.argsOf(Paint)(foreign({ generation: 'wrong' })),
    ).toEqual(Option.none())
    expect(Scene.Command.argsOf(Paint)(impostor)).toEqual(Option.none())
    expect(Story.Command.argsOf(Paint)(Paint({ generation: 2 }))).toEqual(
      Option.some({ generation: 2 }),
    )
  })

  it('keeps both matching and unmatched pending values unchanged across repeated lookups', () => {
    const ping = Command.define('ArgsPing', {
      messages: [Message.CompletedPaint],
    })
    const foreign = Command.define(Paint.name, {
      args: { generation: Schema.Number },
      messages: [Message.CompletedPaint],
    })
    const pending: Story.AnyCommand = foreign({ generation: 5 })

    expect(Story.Command.argsOf(ping)(pending)).toEqual(Option.none())
    expect(Scene.Command.argsOf(Paint)(pending)).toEqual(Option.none())
    expect(Story.Command.argsOf(foreign)(pending)).toEqual(
      Option.some({ generation: 5 }),
    )
    expect(Story.Command.argsOf(Paint)(pending)).toEqual(Option.none())
    expectTypeOf(pending.name).toEqualTypeOf<string>()
    expectTypeOf(pending.args).toEqualTypeOf<
      Record<string, unknown> | undefined
    >()
    expect(pending.name).toBe(foreign.name)
  })

  it('projects every source occurrence while leaving absence and ambiguity policy to the caller', () => {
    const first = qualifyCommand('First', Paint({ generation: 1 }))
    const second = qualifyCommand('Second', Paint({ generation: 2 }))
    const pending = [first, second]
    const matching = Array.getSomes(
      Array.map(pending, Scene.Command.argsOf(Paint)),
    )

    expect(matching).toEqual([{ generation: 1 }, { generation: 2 }])
    expect(Array.getSomes(Array.map([], Story.Command.argsOf(Paint)))).toEqual(
      [],
    )
    expect(first.name).toBe('First/Paint')
    expect(second.name).toBe('Second/Paint')

    expect(() =>
      Story.story(
        (_model: number, _message: ParentMessage) => ({
          model: 0,
          commands: pending,
        }),
        Story.given(0),
        Story.message(ParentMessage.ClickedPaint()),
        Story.Command.resolve(Paint, Message.CompletedPaint({ generation: 1 })),
      ),
    ).toThrow('multiple pending Commands match')
  })

  it('distinguishes keyed invocations from their Interrupt without changing either', () => {
    const work = Command.define('KeyedArgsWork', {
      args: { entryId: Schema.String, generation: Schema.Number },
      messages: [Message.CompletedPaint],
      interrupt: { keyFields: ['entryId'], toKey: ({ entryId }) => entryId },
    })
    const first = qualifyCommand(
      'Left',
      work({ entryId: 'first', generation: 1 }),
    )
    const second = qualifyCommand(
      'Right',
      work({ entryId: 'second', generation: 2 }),
    )
    const interrupt: Story.AnyCommand = qualifyCommand(
      'Left',
      work.Interrupt({ entryId: 'first' }, () => ParentMessage.ClickedPaint()),
    )
    const pending = [first, second, interrupt]
    const matching = Array.getSomes(
      Array.map(pending, Story.Command.argsOf(work)),
    )
    const interrupts = Array.getSomes(
      Array.map(pending, Scene.Command.argsOf(work.Interrupt)),
    )

    expect(matching).toEqual([
      { entryId: 'first', generation: 1 },
      { entryId: 'second', generation: 2 },
    ])
    expect(interrupts).toEqual([{ entryId: 'first' }])
    expect(first.key).toBe('Left/KeyedArgsWork:first')
    expect(second.key).toBe('Right/KeyedArgsWork:second')
    expect(interrupt.interruptsKey).toBe(first.key)
  })

  it('preserves defaulted args and distinguishes an argless match from absence', () => {
    const Args = Schema.Struct({
      generation: Schema.Number.pipe(
        Schema.withConstructorDefault(Effect.succeed(3)),
      ),
      label: Schema.optionalKey(Schema.String),
    })
    type Args = typeof Args.Type
    const defaulted = Command.define('DefaultedArgsWork', {
      args: Args.fields,
      messages: [Message.CompletedPaint],
    })
    const ping = Command.define('ArgsPing', {
      messages: [ParentMessage.ClickedPaint],
      interrupt: true,
    })
    const pending: Story.AnyCommand = defaulted(Args.make({}))
    const argless: Scene.AnyCommand = ping()
    const args = Option.getOrThrow(Story.Command.argsOf(defaulted)(pending))
    const maybeArgs = Scene.Command.argsOf(ping)(argless)

    expect(args.generation).toBe(3)
    expectTypeOf(args.generation).toEqualTypeOf<number>()
    expectTypeOf(args.label).toEqualTypeOf<string | undefined>()
    expectTypeOf(maybeArgs).toEqualTypeOf<Option.Option<undefined>>()
    expect(maybeArgs).toEqual(Option.some(undefined))
    expect(Scene.Command.argsOf(ping)(pending)).toEqual(Option.none())

    const interrupt = ping.Interrupt(() => ParentMessage.ClickedPaint())
    const maybeInterruptArgs = Story.Command.argsOf(ping.Interrupt)(interrupt)

    expectTypeOf(maybeInterruptArgs).toEqualTypeOf<Option.Option<undefined>>()
    expect(maybeInterruptArgs).toEqual(Option.some(undefined))
    expect(Story.Command.argsOf(ping.Interrupt)(argless)).toEqual(Option.none())
  })

  it('returns the original args without executing Effects or mutating pending values', () => {
    const execute = vi.fn(() => ParentMessage.ClickedPaint())
    const work = Command.define('PassiveArgsWork', {
      args: { generation: Schema.Number },
      messages: [ParentMessage.ClickedPaint],
      handler: function* () {
        return () => Effect.sync(execute)
      },
    })
    const pending = Object.freeze({
      ...work({ generation: 4 }),
      detail: 'kept',
    })
    const effect = pending.effect
    const args = pending.args
    const projected = Option.getOrThrow(Story.Command.argsOf(work)(pending))

    expect(projected).toBe(args)
    expect(pending.args).toBe(args)
    expect(pending.effect).toBe(effect)
    expect(pending.detail).toBe('kept')
    expect(execute).not.toHaveBeenCalled()
    expect(Object.isFrozen(pending)).toBe(true)
    expectTypeOf(pending.effect).toEqualTypeOf<typeof effect>()
  })
})

class Store extends Context.Service<Store, {}>()('CommandArgs/Store') {}
type ParentResult = Readonly<{ _tag: 'GotPaint'; message: Message }>
type QualifiedPending = Command.Command<ParentResult, 'Failed', Store> &
  Readonly<{
    name: `Parent/${string}`
    key: 'retained-key'
    interruptsKey: 'retained-interrupt-key'
    detail: 'retained-detail'
  }>

const checkParentChannels = (pending: QualifiedPending) => {
  const maybeArgs = Scene.Command.argsOf(Paint)(pending)
  if (Option.isSome(maybeArgs)) {
    expectTypeOf(maybeArgs.value.generation).toEqualTypeOf<number>()
    expectTypeOf(pending.effect).toEqualTypeOf<
      Effect.Effect<ParentResult, 'Failed', Store>
    >()
    expectTypeOf(pending.name).toEqualTypeOf<`Parent/${string}`>()
    expectTypeOf(pending.key).toEqualTypeOf<'retained-key'>()
    expectTypeOf(
      pending.interruptsKey,
    ).toEqualTypeOf<'retained-interrupt-key'>()
    expectTypeOf(pending.detail).toEqualTypeOf<'retained-detail'>()

    // @ts-expect-error Args projection does not replace a parent Effect with its child result.
    const local: ReturnType<typeof Paint> = pending
    void local
  } else {
    expectTypeOf(pending.name).toEqualTypeOf<`Parent/${string}`>()
  }
}

if (false) {
  checkParentChannels
  // @ts-expect-error argsOf takes a Definition, not an invocation.
  Story.Command.argsOf(Paint({ generation: 1 }))
  // @ts-expect-error A same-named unbranded function is not a Command Definition.
  Scene.Command.argsOf(() => ({ name: Paint.name, effect: Effect.void }))
}
