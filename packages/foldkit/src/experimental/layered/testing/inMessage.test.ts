import { Effect, Schema } from 'effect'
import { expect, expectTypeOf, test } from 'vitest'

import { it } from '@effect/vitest'

import * as Block from '../../../block/public.js'
import * as Command from '../../../command/index.js'
import type { HtmlBuilder } from '../../../html/index.js'
import {
  defineInMessageUnion,
  defineMessageUnion,
} from '../../../message/index.js'
import { modifyFields } from '../../../struct/index.js'
import * as CoreScene from '../../../test/scene.js'
import * as CoreStory from '../../../test/story.js'
import type * as Update from '../../../update/index.js'
import { inMessage, resolveInMessageSteps } from './inMessage.js'
import * as Scene from './scene.js'
import * as Story from './story.js'
import { subjectInMessageUpdate } from './subject.js'
import { withBlock } from './withBlock.js'

const Model = Schema.Struct({ value: Schema.Number })
type Model = typeof Model.Type
const Message = defineMessageUnion({
  CompletedRecordValue: { value: Schema.Number },
})
type Message = typeof Message.Type
const InMessage = defineInMessageUnion({
  RequestedRecordValue: { value: Schema.Number },
  InformedOfValue: { value: Schema.Number },
  InformedOfClear: {},
})
type InMessage = typeof InMessage.Type
const OutMessage = defineMessageUnion({ Applied: { value: Schema.Number } })
type OutMessage = typeof OutMessage.Type

const RecordValue = Command.define('InputCause/RecordValue', {
  args: { value: Schema.Number },
  messages: [Message.CompletedRecordValue],
  handler: function* () {
    return ({ value }) =>
      Effect.succeed(Message.CompletedRecordValue({ value }))
  },
})

const initialModel = Model.make({ value: 0 })
const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    CompletedRecordValue: ({ value }) => ({
      model: modifyFields(model, { value: () => value }),
    }),
  })
const inMessageUpdate = (model: Model, input: InMessage) =>
  InMessage.match<
    Update.ReturnWithOutMessage<
      Model,
      Message,
      OutMessage,
      Command.HandlerOf<typeof RecordValue>
    >
  >(input, {
    RequestedRecordValue: ({ value }) => ({
      model,
      commands: [RecordValue({ value })],
    }),
    InformedOfValue: ({ value }) => ({
      model: modifyFields(model, { value: () => value }),
      outMessage: OutMessage.Applied({ value }),
    }),
    InformedOfClear: () => ({ model: modifyFields(model, { value: () => 0 }) }),
  })
const view = (model: Model, h: HtmlBuilder<Message>) =>
  h.div(
    [h.Role('group'), h.AriaLabel('Value')],
    [globalThis.String(model.value)],
  )
const resolve = (steps: ReadonlyArray<unknown>) =>
  resolveInMessageSteps(steps, (model, input) => {
    if (!Schema.is(Model)(model) || !Schema.is(InMessage)(input)) {
      throw new Error('Invalid input cause fixture')
    }

    return inMessageUpdate(model, input)
  })
const runStory = (...steps: ReadonlyArray<unknown>) =>
  Reflect.apply(CoreStory.story, undefined, [
    update,
    CoreStory.given(initialModel),
    ...resolve(steps),
  ])
const runScene = (...steps: ReadonlyArray<unknown>) =>
  Reflect.apply(CoreScene.scene, undefined, [
    { update, view },
    CoreScene.given(initialModel),
    ...resolve(steps),
  ])

test('input causes append pending Commands whose results still enter local update', () => {
  runStory(
    inMessage(InMessage.RequestedRecordValue({ value: 2 })),
    inMessage(InMessage.RequestedRecordValue({ value: 3 })),
    CoreStory.Command.expectExact(
      RecordValue({ value: 2 }),
      RecordValue({ value: 3 }),
    ),
    CoreStory.model((model: Model) => expect(model.value).toBe(0)),
    CoreStory.Command.resolve(
      RecordValue({ value: 2 }),
      Message.CompletedRecordValue({ value: 2 }),
    ),
    CoreStory.model((model: Model) => expect(model.value).toBe(2)),
    CoreStory.Command.resolve(
      RecordValue({ value: 3 }),
      Message.CompletedRecordValue({ value: 3 }),
    ),
    CoreStory.model((model: Model) => expect(model.value).toBe(3)),
  )
})

test('the same grouped input cause resolves independently for each test graph', () => {
  const reusable = CoreStory.steps(
    inMessage(InMessage.InformedOfValue({ value: 7 })),
  )

  for (const value of [10, 20]) {
    const steps = resolveInMessageSteps([reusable], () => ({
      model: Model.make({ value }),
    }))
    Reflect.apply(CoreStory.story, undefined, [
      update,
      CoreStory.given(initialModel),
      ...steps,
      CoreStory.model((model: Model) => expect(model.value).toBe(value)),
    ])
  }
})

test('nested Scene input causes render and clear the previous OutMessage sequence', () => {
  runScene(
    CoreScene.inside(
      CoreScene.role('group', { name: 'Value' }),
      inMessage(InMessage.InformedOfValue({ value: 8 })),
      CoreScene.expectOutMessage(OutMessage.Applied({ value: 8 })),
      inMessage(InMessage.InformedOfClear()),
      CoreScene.expectNoOutMessage(),
    ),
    CoreScene.expect(CoreScene.role('group', { name: 'Value' })).toHaveText(
      '0',
    ),
  )
})

test('Scene input causes preserve pending-Command boundaries and keepPending', () => {
  expect(() =>
    runScene(
      inMessage(InMessage.RequestedRecordValue({ value: 4 })),
      inMessage(InMessage.InformedOfClear()),
    ),
  ).toThrow('when a Block received an InMessage')

  runScene(
    inMessage(InMessage.RequestedRecordValue({ value: 4 })),
    CoreScene.Command.keepPending(RecordValue({ value: 4 })),
    inMessage(InMessage.InformedOfClear()),
    CoreScene.Command.resolve(
      RecordValue({ value: 4 }),
      Message.CompletedRecordValue({ value: 4 }),
    ),
    CoreScene.expect(CoreScene.role('group', { name: 'Value' })).toHaveText(
      '4',
    ),
  )
})

test('native runners reject unresolved input causes, including grouped causes', () => {
  const input = inMessage(InMessage.InformedOfClear())
  expect(() =>
    Reflect.apply(CoreStory.story, undefined, [
      update,
      CoreStory.given(initialModel),
      input,
    ]),
  ).toThrow('Block-aware Story or Scene')
  expect(() =>
    Reflect.apply(CoreStory.story, undefined, [
      update,
      CoreStory.given(initialModel),
      CoreStory.steps(input),
    ]),
  ).toThrow('Block-aware Story or Scene')
  expect(() =>
    Reflect.apply(CoreScene.scene, undefined, [
      { update, view },
      CoreScene.given(initialModel),
      input,
    ]),
  ).toThrow('Block-aware Story or Scene')
  const nestedInput = CoreScene.inside(
    CoreScene.role('group', { name: 'Value' }),
    input,
  )
  expect(() =>
    Reflect.apply(CoreScene.scene, undefined, [
      { update, view },
      CoreScene.given(initialModel),
      nestedInput,
    ]),
  ).toThrow('Block-aware Story or Scene')

  if (false) {
    // @ts-expect-error Native Story has no acquired input receiver.
    CoreStory.story(update, CoreStory.given(initialModel), input)
    CoreStory.story(
      update,
      CoreStory.given(initialModel),
      // @ts-expect-error Grouping does not remove the input receiver requirement.
      CoreStory.steps(input),
    )
    // @ts-expect-error Native Scene has no acquired input receiver.
    CoreScene.scene({ update, view }, CoreScene.given(initialModel), input)
    CoreScene.scene(
      { update, view },
      CoreScene.given(initialModel),
      // @ts-expect-error Nested causes retain their acquired receiver requirement.
      nestedInput,
    )
  }
})

test('the scoped inMessageUpdate adapter validates schema and uses separate input context', () => {
  const calls: Array<ReadonlyArray<unknown>> = []
  const acquired = {
    InMessage,
    inMessageUpdate: (...args: ReadonlyArray<unknown>) => {
      calls.push(args)
      return { model: initialModel }
    },
  }
  const adapted = Reflect.apply(subjectInMessageUpdate, undefined, [
    { block: {}, updateContext: ['local'], inMessageContext: ['input', 2] },
    acquired,
  ])
  Reflect.apply(adapted, undefined, [initialModel, InMessage.InformedOfClear()])
  expect(calls).toEqual([
    [initialModel, InMessage.InformedOfClear(), 'input', 2],
  ])
  expect(() =>
    Reflect.apply(adapted, undefined, [
      initialModel,
      Message.CompletedRecordValue({ value: 1 }),
    ]),
  ).toThrow('InMessage Schema')
  expect(calls).toHaveLength(1)
  const missing = Reflect.apply(subjectInMessageUpdate, undefined, [
    { block: {} },
    { inMessageUpdate },
  ])
  expect(() =>
    Reflect.apply(missing, undefined, [
      initialModel,
      InMessage.InformedOfClear(),
    ]),
  ).toThrow('InMessage Schema and inMessageUpdate')

  if (false) {
    const InputContextTestKey = Symbol('InputContextTest')
    const ContextDefinition = Block.makeDefinition('InputContextTest', {
      key: InputContextTestKey,
      Model,
      Message,
      InMessage,
      InitArgs: Schema.Tuple([]),
      Context: Schema.Tuple([Schema.Number]),
      InMessageContext: Schema.Tuple([Schema.String]),
      view: { kind: 'Element' },
    })
    const block = ContextDefinition.contract
    expect(
      Effect.isEffect(
        Story.story(
          {
            block,
            updateContext: [1],
            inMessageContext: ['remote'],
          },
          Story.init(),
          Story.inMessage(InMessage.InformedOfValue({ value: 1 })),
        ),
      ),
    ).toBe(true)
    expect(
      Effect.isEffect(
        Scene.scene(
          {
            block,
            updateContext: [1],
            inMessageContext: ['remote'],
          },
          Scene.init(),
          Scene.inMessage(InMessage.InformedOfClear()),
        ),
      ),
    ).toBe(true)
    expect(
      Effect.isEffect(
        Story.story<typeof block>(
          // @ts-expect-error Input context is required independently of update context.
          { block, updateContext: [1] },
          Story.init(),
        ),
      ),
    ).toBe(true)
    expect(
      Effect.isEffect(
        Story.story<typeof block>(
          { block, updateContext: [1], inMessageContext: ['remote'] },
          Story.init(),
          // @ts-expect-error Compared groups retain the separate InMessage payload contract.
          Story.models(
            Story.steps(
              Story.inMessage(Message.CompletedRecordValue({ value: 1 })),
            ),
            (before, after) => {
              expect(after).toBe(before)
            },
          ),
        ),
      ),
    ).toBe(true)
    expect(
      Effect.isEffect(
        Scene.scene<typeof block>(
          // @ts-expect-error Update context does not provide the InMessage context.
          { block, updateContext: [1], inMessageContext: [1] },
          Scene.init(),
        ),
      ),
    ).toBe(true)
    expect(
      Effect.isEffect(
        Story.story<typeof block>(
          { block, updateContext: [1], inMessageContext: ['remote'] },
          Story.init(),
          // @ts-expect-error Local Command results are not InMessages.
          Story.inMessage(Message.CompletedRecordValue({ value: 1 })),
        ),
      ),
    ).toBe(true)
    expect(
      Effect.isEffect(
        Scene.scene<typeof block>(
          { block, updateContext: [1], inMessageContext: ['remote'] },
          Scene.init(),
          // @ts-expect-error Grouping retains the separate InMessage payload contract.
          Scene.inside(
            Scene.role('group'),
            Scene.inMessage(Message.CompletedRecordValue({ value: 1 })),
          ),
        ),
      ),
    ).toBe(true)
  }
})

it.effect(
  'scoped inMessageUpdate supports optional, default, and rest Context without changing update Context',
  () =>
    Effect.gen(function* () {
      const OptionalContextKey = Symbol('OptionalInputContext')
      const Definition = Block.makeDefinition('OptionalInputContext', {
        key: OptionalContextKey,
        Model,
        Message,
        InMessage,
        InitArgs: Schema.Tuple([]),
        InMessageContext:
          Block.makeInputContract<
            readonly [label?: string, ...parts: ReadonlyArray<string>]
          >(),
        view: { kind: 'Element' },
      })
      const Composition = Definition.makeComposition({})
      const inMessageUpdate = Composition.makeInMessageUpdate.withContext(
        (label = 'Default', ...parts: ReadonlyArray<string>) => ({
          RequestedRecordValue: (model, { value }) => ({
            model: modifyFields(model, {
              value: () => value + label.length + parts.length,
            }),
          }),
          InformedOfValue: (model, { value }) => ({
            model: modifyFields(model, { value: () => value }),
          }),
          InformedOfClear: model => ({
            model: modifyFields(model, { value: () => 0 }),
          }),
        }),
      )
      const ReceiverBlock = Definition.makeBlock(
        Effect.succeed({
          children: [],
          init: Composition.makeInit(() => ({ model: initialModel })),
          update: Composition.makeUpdate({
            CompletedRecordValue: (model, { value }) => ({
              model: modifyFields(model, { value: () => value }),
            }),
          }),
          inMessageUpdate,
          view: Composition.makeView(view),
        }),
      )
      const requested = InMessage.RequestedRecordValue({ value: 1 })

      yield* withBlock(ReceiverBlock, block => {
        expect(block.inMessageUpdate(initialModel, requested).model.value).toBe(
          8,
        )
        expect(block.inMessageUpdate(requested)(initialModel).model.value).toBe(
          8,
        )
        expect(
          block.inMessageUpdate(initialModel, requested, 'Remote', 'A', 'B')
            .model.value,
        ).toBe(9)
        expect(
          block.inMessageUpdate(requested)(initialModel, 'Remote', 'A', 'B')
            .model.value,
        ).toBe(9)
      })
      const storyModel = yield* Story.story(
        ReceiverBlock,
        Story.init(),
        Story.models(
          Story.steps(Story.inMessage(requested)),
          (before, after) => {
            expectTypeOf(before).toEqualTypeOf<Model>()
            expectTypeOf(after).toEqualTypeOf<Model>()
            expect(before.value).toBe(0)
            expect(after.value).toBe(8)
          },
        ),
      )
      expectTypeOf(storyModel).toEqualTypeOf<Model>()
      expect(storyModel.value).toBe(8)
      yield* Scene.scene(
        { block: ReceiverBlock, inMessageContext: ['Remote', 'A', 'B'] },
        Scene.init(),
        Scene.inMessage(requested),
        Scene.expect(Scene.role('group', { name: 'Value' })).toHaveText('9'),
      )

      if (false) {
        expect(
          Effect.isEffect(
            Story.story<typeof ReceiverBlock>(
              // @ts-expect-error Optional and rest Context values retain their declared type.
              { block: ReceiverBlock, inMessageContext: ['Remote', 1] },
              Story.init(),
            ),
          ),
        ).toBe(true)
        expect(
          Effect.isEffect(
            Story.story<typeof ReceiverBlock>(
              // @ts-expect-error InMessage Context does not add an update Context parameter.
              { block: ReceiverBlock, updateContext: ['Remote'] },
              Story.init(),
            ),
          ),
        ).toBe(true)
      }
    }),
)
