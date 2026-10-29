import { Context, Effect, Layer, Schema } from 'effect'
import { expectTypeOf, it } from 'vitest'

import type { Scoped } from '../block/scope.js'
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

type ScaleKey =
  | '01'
  | '02'
  | '03'
  | '04'
  | '05'
  | '06'
  | '07'
  | '08'
  | '09'
  | '10'
  | '11'
  | '12'
  | '13'
  | '14'
  | '15'
  | '16'
  | '17'
  | '18'
  | '19'
  | '20'
  | '21'
  | '22'
  | '23'
  | '24'
  | '25'
  | '26'
  | '27'
  | '28'
  | '29'
  | '30'
  | '31'
  | '32'

type ScaledHandlerContracts = {
  readonly [Key in ScaleKey]:
    | Scoped<
        `child-${Key}`,
        Command.Handler<'Load', Readonly<{ id: Key }>, Message>
      >
    | Scoped<
        `child-${Key}`,
        SubscriptionHandler<'Observe', Readonly<{ id: Key }>, Message>
      >
    | Scoped<
        `child-${Key}`,
        MountHandler<'Attach', Readonly<{ id: Key }>, Message>
      >
    | Scoped<
        `child-${Key}`,
        ManagedResourceHandler<'Open', Readonly<{ id: Key }>, Key>
      >
}[ScaleKey]

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
  expectTypeOf<
    ValidHandlerContracts<ScaledHandlerContracts>
  >().toEqualTypeOf<unknown>()
})

it('retains exact collision checks within literal and generic handler keys', () => {
  expectTypeOf<
    ValidHandlerContracts<
      | Command.Handler<'Read', string | number, string>
      | Command.Handler<'Read', string, string>
    >
  >().toEqualTypeOf<
    Readonly<{ 'Conflicting Foldkit handler contracts': 'Command/Read' }>
  >()
  expectTypeOf<
    ValidHandlerContracts<
      | Command.Handler<string, string, string>
      | Command.Handler<string, number, string>
    >
  >().toEqualTypeOf<
    Readonly<{ 'Conflicting Foldkit handler contracts': `Command/${string}` }>
  >()
  expectTypeOf<
    ValidHandlerContracts<
      | Command.Handler<'Read' | 'Write', string, string>
      | Command.Handler<'Read' | 'Write', number, string>
    >
  >().toEqualTypeOf<
    Readonly<{
      'Conflicting Foldkit handler contracts': 'Command/Read' | 'Command/Write'
    }>
  >()
  expectTypeOf<
    ValidHandlerContracts<
      | Command.Handler<'Read', string, string>
      | Command.Handler<'Read', number, string>
      | Command.Handler<string, string, string>
    >
  >().toEqualTypeOf<
    Readonly<{ 'Conflicting Foldkit handler contracts': 'Command/Read' }>
  >()
  expectTypeOf<
    ValidHandlerContracts<
      | Command.Handler<'Read', Readonly<{ text: string }>, string>
      | Command.Handler<'Read', { text: string }, string>
      | Command.Handler<'Write', number, string>
    >
  >().toEqualTypeOf<
    Readonly<{ 'Conflicting Foldkit handler contracts': 'Command/Read' }>
  >()
  expectTypeOf<
    ValidHandlerContracts<
      | Scoped<'First', Command.Handler<'Read', string, string>>
      | Scoped<'Second', Command.Handler<'Read', number, string>>
    >
  >().toEqualTypeOf<unknown>()
  expectTypeOf<
    ValidHandlerContracts<
      | Scoped<'First', Command.Handler<'Read', string, string>>
      | Scoped<'First', Command.Handler<'Read', number, string>>
    >
  >().toEqualTypeOf<
    Readonly<{ 'Conflicting Foldkit handler contracts': 'First/Command/Read' }>
  >()
})

const checkAssemblyTypes = (): void => {
  const Model = Schema.Struct({ text: Schema.String })
  type Model = typeof Model.Type

  const application = Application.__makeFromConfig({
    Model,
    init: () => ({
      model: Model.make({ text: '' }),
      commands: [Send({ text: 'hello' })],
    }),
    update: (model: Model, _message: Message) => ({ model }),
    view: (model, h) => ({ title: 'Handlers', body: h.div([], [model.text]) }),
    container: document.createElement('div'),
  })

  const independentLayers = Layer.mergeAll(Send.layer, CacheLayer)
  application.provide(Layer.empty)
  run(application.provide(independentLayers))
  run(application.provide(Send.layer).provide(CacheLayer))

  const conflictingLayers = Layer.mergeAll(
    Send.layer,
    SendWithOptionalText.layer,
  )

  // @ts-expect-error Two contracts cannot occupy the same Command Context key.
  application.provide(conflictingLayers)

  // @ts-expect-error The provider conflicts with the required Command contract.
  application.provide(SendWithOptionalText.layer)

  const provided = application.provide(Send.layer)

  // @ts-expect-error Subsequent providers cannot overwrite a different contract.
  provided.provide(SendWithOptionalText.layer)

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
  application.provide(outputAndInputConflict)
}

void checkAssemblyTypes

const checkGenericHandlerContracts = <Item extends string>(): void => {
  type ExactHandler = Command.Handler<
    'Echo',
    Readonly<{ value: Item }>,
    Readonly<{ value: Item }>
  >
  type StringHandler = Command.Handler<
    'Echo',
    Readonly<{ value: string }>,
    Readonly<{ value: string }>
  >

  const exact: ValidHandlerContracts<ExactHandler> = {}
  // @ts-expect-error A possible same-name generic contract conflict cannot count as validated.
  const conflicting: ValidHandlerContracts<ExactHandler | StringHandler> = {}

  void exact
  void conflicting
}

void checkGenericHandlerContracts
