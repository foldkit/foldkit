import { Effect, Schema } from 'effect'
import { describe, expect, test } from 'vitest'

import * as Command from '../command/index.js'
import type { Html, HtmlBuilder } from '../html/index.js'
import { defineMessageUnion } from '../message/index.js'
import { modifyFields } from '../struct/index.js'
import type * as Update from '../update/index.js'
import * as Scene from './scene.js'
import * as Story from './story.js'

const Model = Schema.Struct({
  notes: Schema.Number,
  saves: Schema.Number,
  activity: Schema.Number,
})
type Model = typeof Model.Type

const Message = defineMessageUnion({
  ClickedSave: {},
  ClickedSaveTwice: {},
  ClickedNote: {},
  CompletedSave: { id: Schema.String },
  ReceivedActivity: {},
})
type Message = typeof Message.Type

const Save = Command.define('Save', {
  args: { id: Schema.String },
  messages: [Message.CompletedSave],
  handler: function* () {
    return ({ id }) => Effect.succeed(Message.CompletedSave({ id }))
  },
})

type UpdateReturn = Update.Return<
  Model,
  Message,
  Command.HandlerOf<typeof Save>
>

const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    ClickedSave: () => ({ model, commands: [Save({ id: 'second' })] }),
    ClickedSaveTwice: () => ({
      model,
      commands: [Save({ id: 'first' }), Save({ id: 'second' })],
    }),
    ClickedNote: () => ({
      model: modifyFields(model, { notes: count => count + 1 }),
    }),
    CompletedSave: () => ({
      model: modifyFields(model, { saves: count => count + 1 }),
    }),
    ReceivedActivity: () => ({
      model: modifyFields(model, { activity: count => count + 1 }),
    }),
  })

const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [],
    [
      h.button([h.OnClick(Message.ClickedSave())], ['Save']),
      h.button([h.OnClick(Message.ClickedSaveTwice())], ['Save twice']),
      h.button([h.OnClick(Message.ClickedNote())], ['Note']),
      h.output([], [`${model.notes}/${model.saves}`]),
      h.output([h.AriaLabel('Activity count')], [`${model.activity}`]),
    ],
  )

const sceneConfig = { update, view }

const initialModel = Model.make({ notes: 0, saves: 0, activity: 0 })

const secondSave = Save({ id: 'second' })

describe('Scene.Command.keepPending', () => {
  test('retains one invocation through an interaction and an external delivery', () => {
    Scene.scene(
      sceneConfig,
      Scene.given(initialModel),
      Scene.click(Scene.role('button', { name: 'Save' })),
      Scene.Command.keepPending(secondSave),
      Scene.Command.expectExact(secondSave),
      Scene.click(Scene.role('button', { name: 'Note' })),
      Scene.deliver(Message.ReceivedActivity()),
      Scene.expect(Scene.label('Activity count')).toHaveText('1'),
      Scene.Command.resolve(
        secondSave,
        Message.CompletedSave({ id: 'second' }),
      ),
      Scene.expect(Scene.nth(Scene.all.selector('output'), 0)).toHaveText(
        '1/1',
      ),
    )
  })

  test('requires one exact pending invocation', () => {
    expect(() =>
      Scene.scene(
        sceneConfig,
        Scene.given(initialModel),
        Scene.click(Scene.role('button', { name: 'Save twice' })),
        Scene.Command.keepPending(Save),
      ),
    ).toThrow('multiple pending Commands match')
  })

  test('resolveAllExact and final completeness still include a kept Command', () => {
    const steps = [
      Scene.given(initialModel),
      Scene.click(Scene.role('button', { name: 'Save' })),
      Scene.Command.keepPending(secondSave),
    ] as const

    expect(() =>
      Scene.scene(sceneConfig, ...steps, Scene.Command.resolveAllExact()),
    ).toThrow('I found Commands without resolvers')
    expect(() => Scene.scene(sceneConfig, ...steps)).toThrow(
      'I found Commands without resolvers',
    )
  })
})

const StoryModel = Schema.Struct({ generation: Schema.Number })
type StoryModel = typeof StoryModel.Type
const StoryMessage = defineMessageUnion({
  Advanced: {},
  ReceivedGeneration: { generation: Schema.Number },
})
type StoryMessage = typeof StoryMessage.Type
const storyUpdate = (model: StoryModel, message: StoryMessage) =>
  StoryMessage.match<Readonly<{ model: StoryModel }>>(message, {
    Advanced: () => ({
      model: modifyFields(model, { generation: count => count + 1 }),
    }),
    ReceivedGeneration: ({ generation }) => ({
      model: StoryModel.make({ generation }),
    }),
  })

describe('Story.messageWith', () => {
  test('reads the Model held when an inline or extracted step runs', () => {
    const receiveCurrentGeneration = Story.steps(
      Story.messageWith((model: StoryModel) =>
        StoryMessage.ReceivedGeneration({ generation: model.generation }),
      ),
    )

    Story.story(
      storyUpdate,
      Story.given(StoryModel.make({ generation: 1 })),
      Story.message(StoryMessage.Advanced()),
      Story.messageWith(model =>
        StoryMessage.ReceivedGeneration({ generation: model.generation + 1 }),
      ),
      receiveCurrentGeneration,
      Story.model(model => {
        expect(model.generation).toBe(3)
      }),
    )
  })
})
