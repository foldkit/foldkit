import { Context, Effect, Layer, Schema } from 'effect'
import { expect, expectTypeOf, it } from 'vitest'

import { defineMessageUnion } from '../message/index.js'
import * as Command from './index.js'

const Message = defineMessageUnion({
  ClickedSendMessage: { text: Schema.String },
  CompletedSendMessage: { text: Schema.String },
})
type Message = typeof Message.Type

const Model = Schema.Struct({ text: Schema.String })
type Model = typeof Model.Type

class Prefix extends Context.Service<Prefix, { readonly value: string }>()(
  'CommandHandlerTestPrefix',
) {}

class Suffix extends Context.Service<Suffix, { readonly value: string }>()(
  'CommandHandlerTestSuffix',
) {}

const SendMessage = Command.define('SendMessage', {
  args: { text: Schema.String },
  messages: [Message.CompletedSendMessage],
})

const SendMessageLayer = SendMessage.toLayer(({ text }) =>
  Effect.map(Prefix, ({ value }) =>
    Message.CompletedSendMessage({ text: value + text }),
  ),
)

const ReadPrefix = Command.define('ReadPrefix', {
  messages: [Message.CompletedSendMessage],
  interrupt: true,
})

const update = (model: Model, message: Message) =>
  Message.match(message, {
    ClickedSendMessage: ({ text }) => ({
      model,
      commands: [SendMessage({ text })],
    }),
    CompletedSendMessage: ({ text }) => ({ model: Model.make({ text }) }),
  })

type CommandRequirements<UpdateResult> = UpdateResult extends {
  commands: ReadonlyArray<Command.Command<any, any, infer R>>
}
  ? R
  : never

it('carries the handler requirement and its implementation dependencies', () => {
  expectTypeOf(SendMessage({ text: 'hello' })).toMatchTypeOf<
    Command.Command<Message, never, Command.Handler<'SendMessage'>>
  >()
  expectTypeOf<Command.HandlerOf<typeof SendMessage>>().toEqualTypeOf<
    Command.Handler<'SendMessage'>
  >()
  expectTypeOf(SendMessageLayer).toEqualTypeOf<
    Layer.Layer<Command.Handler<'SendMessage'>, never, Prefix>
  >()

  const constructedLayer = SendMessage.toLayer(
    Effect.map(
      Suffix,
      () =>
        ({ text }: { readonly text: string }) =>
          Effect.map(Prefix, ({ value }) =>
            Message.CompletedSendMessage({ text: value + text }),
          ),
    ),
  )
  expectTypeOf(constructedLayer).toEqualTypeOf<
    Layer.Layer<Command.Handler<'SendMessage'>, never, Prefix | Suffix>
  >()
  expectTypeOf<CommandRequirements<ReturnType<typeof update>>>().toEqualTypeOf<
    Command.Handler<'SendMessage'>
  >()

  const lifted = Command.mapMessage(
    SendMessage({ text: 'hello' }),
    message => message,
  )
  expectTypeOf(lifted).toMatchTypeOf<
    Command.Command<Message, never, Command.Handler<'SendMessage'>>
  >()
  expect(lifted.name).toBe('SendMessage')
  expect(lifted.args).toEqual({ text: 'hello' })
})

it('uses invocation context over the context captured by the handler Layer', async () => {
  const handlerLayer = SendMessageLayer.pipe(
    Layer.provideMerge(Layer.succeed(Prefix, { value: 'construction:' })),
  )
  const result = await Effect.runPromise(
    SendMessage({ text: 'hello' }).effect.pipe(
      Effect.provideService(Prefix, { value: 'invocation:' }),
      Effect.provide(handlerLayer),
    ),
  )

  expect(result).toEqual(
    Message.CompletedSendMessage({ text: 'invocation:hello' }),
  )
})

it('retains constructor captures while execution lookups use invocation services', async () => {
  const handlerLayer = SendMessage.toLayer(
    Effect.gen(function* () {
      const prefix = yield* Prefix

      return ({ text }) =>
        Effect.map(Suffix, suffix =>
          Message.CompletedSendMessage({
            text: prefix.value + text + suffix.value,
          }),
        )
    }),
  ).pipe(
    Layer.provide(
      Layer.mergeAll(
        Layer.succeed(Prefix, { value: 'construction:' }),
        Layer.succeed(Suffix, { value: ':construction' }),
      ),
    ),
  )

  const result = await Effect.runPromise(
    SendMessage({ text: 'hello' }).effect.pipe(
      Effect.provideService(Prefix, { value: 'invocation:' }),
      Effect.provideService(Suffix, { value: ':invocation' }),
      Effect.provide(handlerLayer),
    ),
  )

  expect(result).toEqual(
    Message.CompletedSendMessage({ text: 'construction:hello:invocation' }),
  )
})

it('defers the handler body until the Command runs', async () => {
  let executions = 0
  const layer = SendMessage.toLayer(({ text }) => {
    executions += 1
    return Effect.succeed(Message.CompletedSendMessage({ text }))
  })
  const command = SendMessage({ text: 'hello' })
  const execution = Effect.provide(command.effect, layer)

  expect(executions).toBe(0)

  await Effect.runPromise(execution)

  expect(executions).toBe(1)
})

it('builds an Effect supplied handler once for multiple Command executions', async () => {
  let builds = 0
  const layer = SendMessage.toLayer(
    Effect.sync(() => {
      builds += 1
      return ({ text }: { readonly text: string }) =>
        Effect.succeed(Message.CompletedSendMessage({ text }))
    }),
  )

  const results = await Effect.runPromise(
    Effect.all([
      SendMessage({ text: 'first' }).effect,
      SendMessage({ text: 'second' }).effect,
    ]).pipe(Effect.provide(layer)),
  )

  expect(builds).toBe(1)
  expect(results).toEqual([
    Message.CompletedSendMessage({ text: 'first' }),
    Message.CompletedSendMessage({ text: 'second' }),
  ])
})

it('keeps interruptible Command identity with a Layer-backed handler', async () => {
  const layer = ReadPrefix.toLayer(() =>
    Effect.map(Prefix, ({ value }) =>
      Message.CompletedSendMessage({ text: value }),
    ),
  )

  const command = ReadPrefix()
  const handlerLayer = layer.pipe(
    Layer.provideMerge(Layer.succeed(Prefix, { value: 'ready' })),
  )
  const result = await Effect.runPromise(
    command.effect.pipe(Effect.provide(handlerLayer)),
  )

  expect(command.name).toBe('ReadPrefix')
  expect(command.key).toBe('ReadPrefix')
  expect(
    ReadPrefix.Interrupt(() =>
      Message.CompletedSendMessage({ text: 'stopped' }),
    ).name,
  ).toBe('ReadPrefix.Interrupt')
  expect(result).toEqual(Message.CompletedSendMessage({ text: 'ready' }))
})

it('rejects a handler Layer from another Command definition with the same name', async () => {
  const otherSendMessage = Command.define('SendMessage', {
    args: { text: Schema.String },
    messages: [Message.CompletedSendMessage],
  })
  const otherLayer = otherSendMessage.toLayer(({ text }) =>
    Effect.succeed(Message.CompletedSendMessage({ text })),
  )

  await expect(
    Effect.runPromise(
      SendMessage({ text: 'hello' }).effect.pipe(Effect.provide(otherLayer)),
    ),
  ).rejects.toThrow('belongs to another definition with the same name')
})
