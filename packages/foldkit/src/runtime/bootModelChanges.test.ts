import { Effect, Fiber, Schema, Stream } from 'effect'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { __htmlBuilder } from '../html/index.js'
import { defineMessageUnion } from '../message/index.js'
import * as Mount from '../mount/index.js'
import { modifyFields } from '../struct/index.js'
import * as Update from '../update/index.js'
import * as Application from './application.js'

const Message = defineMessageUnion({
  ActivatedApplication: {},
  ReceivedBootPulse: {},
})
type Message = typeof Message.Type

const Model = Schema.Struct({
  activation: Schema.Literals(['Inactive', 'Active']),
  pulseStatus: Schema.Literals(['Waiting', 'Received']),
})
type Model = typeof Model.Type

const subscriptions = {
  bootPulse: {
    dependenciesSchema: Schema.Struct({
      activation: Schema.Literals(['Inactive', 'Active']),
    }),
    modelToDependencies: (model: Model) => ({ activation: model.activation }),
    dependenciesToStream: ({
      activation,
    }: Readonly<{ activation: Model['activation'] }>) =>
      activation === 'Active'
        ? Stream.make(Message.ReceivedBootPulse())
        : Stream.empty,
  },
}

const ActivateApplication = Mount.define('ActivateApplication', {
  messages: [Message.ActivatedApplication],
})

const ActivateApplicationLayer = ActivateApplication.toLayer(
  Effect.succeed(() => Effect.succeed(Message.ActivatedApplication())),
)

const update = (model: Model, message: Message) =>
  Message.match(message, {
    ActivatedApplication: () => ({
      model: modifyFields(model, { activation: () => 'Active' }),
    }),
    ReceivedBootPulse: () => ({
      model: modifyFields(model, { pulseStatus: () => 'Received' }),
    }),
  })

const h = __htmlBuilder<Message, Mount.AnyMountHandler>()

const view = (model: Model) =>
  h.div(
    [],
    [
      h.div([h.OnMount(ActivateApplication())]),
      h.div([], [`${model.activation}:${model.pulseStatus}`]),
    ],
  )

let container: HTMLElement

beforeEach(() => {
  container = document.createElement('div')
  container.id = 'boot-model-changes-app'
  document.body.appendChild(container)
})

afterEach(() => {
  document.body.innerHTML = ''
})

describe('boot Model changes', () => {
  it('reaches Subscription fibers when an OnMount Message changes the Model during the init render', async () => {
    const element = Application.__makeElementFromConfig({
      Model,
      init: (): Update.Return<Model, Message> => ({
        model: {
          activation: 'Inactive',
          pulseStatus: 'Waiting',
        },
      }),
      update,
      view,
      container,
      subscriptions,
      mounts: [ActivateApplication],
    }).provide(ActivateApplicationLayer)
    const fiber = Effect.runFork(element.start())

    try {
      await vi.waitFor(() => {
        expect(document.body.textContent).toContain('Active:Received')
      })
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })
})
