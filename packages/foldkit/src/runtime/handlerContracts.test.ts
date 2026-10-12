import { Context, Effect, Layer, Schema, pipe } from 'effect'
import { expectTypeOf, it } from 'vitest'

import * as Command from '../command/index.js'
import type { Handler as ManagedResourceHandler } from '../managedResource/handler.js'
import { defineMessageUnion } from '../message/index.js'
import type { Handler as MountHandler } from '../mount/handler.js'
import type { Handler as SubscriptionHandler } from '../subscription/handler.js'
import * as Application from './application.js'
import type { ValidHandlerContracts } from './handlerContracts.js'
import { run } from './start.js'

const Message = defineMessageUnion({
  ClickedSend: {},
  CompletedSend: { text: Schema.String },
})
type Message = typeof Message.Type

const Send = Command.define('Send', {
  args: { text: Schema.String },
  messages: [Message.CompletedSend],
  handler: function* () {
    return ({ text }) => Effect.succeed(Message.CompletedSend({ text }))
  },
})

const SendWithOptionalText = Command.define('Send', {
  args: { text: Schema.optional(Schema.String) },
  messages: [Message.CompletedSend],
  handler: function* () {
    return ({ text }) =>
      Effect.succeed(Message.CompletedSend({ text: text ?? '' }))
  },
})

class Cache extends Context.Service<Cache, Readonly<{ value: string }>>()(
  'HandlerContractsTestCache',
) {}

const CacheLayer = Layer.succeed(Cache, { value: 'cached' })

it('groups exact handler contracts by primitive and name', () => {
  expectTypeOf<
    ValidHandlerContracts<
      | Command.Handler<'Read', string, string>
      | Command.Handler<'Read', number, string>
    >
  >().toEqualTypeOf<
    Readonly<{ 'Conflicting Foldkit handler contracts': 'Command/Read' }>
  >()
  expectTypeOf<
    ValidHandlerContracts<
      | SubscriptionHandler<'Ticks', string, string>
      | SubscriptionHandler<'Ticks', string, number>
    >
  >().toEqualTypeOf<
    Readonly<{ 'Conflicting Foldkit handler contracts': 'Subscription/Ticks' }>
  >()
  expectTypeOf<
    ValidHandlerContracts<
      | MountHandler<'Focus', string, string>
      | MountHandler<'Focus', number, string>
    >
  >().toEqualTypeOf<
    Readonly<{ 'Conflicting Foldkit handler contracts': 'Mount/Focus' }>
  >()
  expectTypeOf<
    ValidHandlerContracts<
      | ManagedResourceHandler<'Session', string, string>
      | ManagedResourceHandler<'Session', string, number>
    >
  >().toEqualTypeOf<
    Readonly<{
      'Conflicting Foldkit handler contracts': 'ManagedResource/Session'
    }>
  >()
  expectTypeOf<
    ValidHandlerContracts<
      | Cache
      | Command.Handler<'Read', string, string>
      | Command.Handler<'Write', string, string>
      | SubscriptionHandler<'Read', number, string>
      | MountHandler<'Read', number, string>
      | ManagedResourceHandler<'Read', number, string>
    >
  >().toEqualTypeOf<unknown>()
})

const checkAssemblyTypes = (): void => {
  const Model = Schema.Struct({ text: Schema.String })

  const application = Application.make({
    Model,
    init: () => ({
      model: Model.make({ text: '' }),
      commands: [Send({ text: 'hello' })],
    }),
    update: (model: typeof Model.Type, _message: Message) => ({ model }),
    view: (model, h) => ({ title: 'Handlers', body: h.div([], [model.text]) }),
    container: document.createElement('div'),
  })

  const independentLayers = Layer.mergeAll(Send.layer, CacheLayer)
  Application.provide(application, Layer.empty)
  pipe(application, Application.provide(Layer.empty))
  run(Application.provide(application, independentLayers))
  pipe(application, Application.provide(independentLayers), run)
  pipe(
    application,
    Application.provide(Send.layer),
    Application.provide(CacheLayer),
    run,
  )

  const conflictingLayers = Layer.mergeAll(
    Send.layer,
    SendWithOptionalText.layer,
  )

  // @ts-expect-error Two contracts cannot occupy the same Command Context key.
  Application.provide(application, conflictingLayers)

  // @ts-expect-error A conflicting Layer bundle cannot enter an application pipe.
  Application.provide(conflictingLayers)

  // @ts-expect-error The provider conflicts with the required Command contract.
  Application.provide(application, SendWithOptionalText.layer)

  // @ts-expect-error Conflicting data-last provision cannot produce a runnable app.
  pipe(application, Application.provide(SendWithOptionalText.layer), run)

  const provided = Application.provide(application, Send.layer)

  // @ts-expect-error Subsequent providers cannot overwrite a different contract.
  Application.provide(provided, SendWithOptionalText.layer)

  // @ts-expect-error A pipeline retains contracts supplied by earlier providers.
  pipe(provided, Application.provide(SendWithOptionalText.layer), run)

  const requiresOtherContract = Layer.effect(
    Cache,
    Effect.gen(function* () {
      yield* SendWithOptionalText({ text: 'hello' }).effect
      return { value: 'cached' }
    }),
  )

  const outputAndInputConflict = Layer.mergeAll(
    Send.layer,
    requiresOtherContract,
  )

  // @ts-expect-error Layer dependencies also cannot use a conflicting handler contract.
  Application.provide(application, outputAndInputConflict)
}

void checkAssemblyTypes
