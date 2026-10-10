import { Effect, Fiber, Layer, Option, Schema, Stream } from 'effect'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { __htmlBuilder } from '../html/index.js'
import * as ManagedResource from '../managedResource/index.js'
import { defineMessageUnion } from '../message/index.js'
import * as Mount from '../mount/index.js'
import { modifyFields } from '../struct/index.js'
import * as Subscription from '../subscription/subscription.js'
import * as Update from '../update/index.js'
import * as Application from './application.js'

const Message = defineMessageUnion({
  ActivatedApplication: {},
  AcquiredBootResource: {},
  ReleasedBootResource: {},
  FailedBootResource: {},
  ReceivedBootPulse: {},
})
type Message = typeof Message.Type

const Model = Schema.Struct({
  activation: Schema.Literals(['Inactive', 'Active']),
  resourceStatus: Schema.Literals(['Idle', 'Acquired']),
  pulseStatus: Schema.Literals(['Waiting', 'Received']),
})
type Model = typeof Model.Type

const BootResource = ManagedResource.tag<string>()('BootResource')

const managedResources = ManagedResource.make<Model, Message>()(entry => ({
  bootResource: entry(
    'ManageBootResource',
    Schema.Option(Schema.Struct({ activation: Schema.Literals(['Active']) })),
    {
      resource: BootResource,
      modelToMaybeRequirements: model =>
        model.activation === 'Active'
          ? Option.some({ activation: model.activation })
          : Option.none(),
      onAcquired: () => Message.AcquiredBootResource(),
      onReleased: () => Message.ReleasedBootResource(),
      onAcquireError: () => Message.FailedBootResource(),
    },
  ),
}))

const BootResourceLayer = managedResources.bootResource.toLayer(
  Effect.succeed({
    acquire: () => Effect.succeed('ready'),
    release: () => Effect.void,
  }),
)

const subscriptions = Subscription.make<Model, Message>()(entry => ({
  bootPulse: entry(
    'BootPulse',
    { activation: Schema.Literals(['Inactive', 'Active']) },
    {
      modelToDependencies: model => ({ activation: model.activation }),
      messages: [
        Message.ActivatedApplication,
        Message.AcquiredBootResource,
        Message.ReleasedBootResource,
        Message.FailedBootResource,
        Message.ReceivedBootPulse,
      ],
    },
  ),
}))

const BootPulseLayer = subscriptions.bootPulse.toLayer(
  Effect.succeed(({ activation }) =>
    activation === 'Active'
      ? Stream.make(Message.ReceivedBootPulse())
      : Stream.empty,
  ),
)

const ActivateApplication = Mount.define('ActivateApplication', {
  messages: [Message.ActivatedApplication],
})

const ActivateApplicationLayer = ActivateApplication.toLayer(
  Effect.succeed(() => Effect.succeed(Message.ActivatedApplication())),
)

const update = Update.make((model: Model, message: Message) =>
  Message.match(message, {
    ActivatedApplication: () => ({
      model: modifyFields(model, { activation: () => 'Active' }),
    }),
    AcquiredBootResource: () => ({
      model: modifyFields(model, { resourceStatus: () => 'Acquired' }),
    }),
    ReleasedBootResource: () => ({ model }),
    FailedBootResource: () => ({ model }),
    ReceivedBootPulse: () => ({
      model: modifyFields(model, { pulseStatus: () => 'Received' }),
    }),
  }),
)

const h = __htmlBuilder<Message>()

const view = (model: Model) =>
  h.div(
    [],
    [
      h.div([h.OnMount(ActivateApplication())]),
      h.div(
        [],
        [`${model.activation}:${model.resourceStatus}:${model.pulseStatus}`],
      ),
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
  it('reaches Subscription and ManagedResource fibers when an OnMount Message changes the Model during the init render', async () => {
    const element = Application.provide(
      Application.makeElement({
        Model,
        init: (): Update.Return<Model, Message> => ({
          model: {
            activation: 'Inactive',
            resourceStatus: 'Idle',
            pulseStatus: 'Waiting',
          },
        }),
        update,
        view,
        container,
        managedResources,
        subscriptions,
        mounts: [ActivateApplication],
      }),
      Layer.mergeAll(
        BootResourceLayer,
        BootPulseLayer,
        ActivateApplicationLayer,
      ),
    )
    const fiber = Effect.runFork(element.start())

    try {
      await vi.waitFor(() => {
        expect(document.body.textContent).toContain('Active:Acquired:Received')
      })
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })
})
