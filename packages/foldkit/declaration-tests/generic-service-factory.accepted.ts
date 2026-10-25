import { Context, Effect, Layer, Option, Schema } from 'effect'
import * as Block from 'foldkit/block'
import { defineMessageUnion } from 'foldkit/message'

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
type Assert<Value extends true> = Value

export const makeLoaderParts = <
  Value extends string,
  Id,
  Client extends Readonly<{ load: Effect.Effect<Value> }>,
>(
  Value: Schema.Codec<Value, string>,
  Client: Context.Key<Id, Client>,
) => {
  const Message = defineMessageUnion({
    RequestedLoad: {},
    CompletedLoad: { value: Value },
  })
  const Definition = Block.makeDefinition('GenericServiceLoader', {
    Model: Schema.Struct({ value: Schema.Option(Value) }),
    Message,
  })
  const Load = Definition.makeCommand('Load', {
    messages: [Message.CompletedLoad],
  })
  const composition = Definition.makeComposition()
  const init = composition.makeInit(() => ({
    model: { value: Option.none() },
  }))
  const update = composition.makeUpdate({
    RequestedLoad: model => ({ model, commands: [Load()] }),
    CompletedLoad: (_model, { value }) => ({
      model: { value: Option.some(value) },
    }),
  })
  const view = composition.makeView((model, h) =>
    h.p(
      [],
      [
        Option.match(model.value, {
          onNone: () => 'Waiting',
          onSome: value => value,
        }),
      ],
    ),
  )

  return { Client, Message, Load, composition, init, update, view }
}

export const Status = Schema.Literals(['Ready', 'Pending'])

class StatusClient extends Context.Service<
  StatusClient,
  Readonly<{ load: Effect.Effect<typeof Status.Type> }>
>()('DeclarationGenericStatusClient') {}

export const loader = makeLoaderParts(Status, StatusClient)

export const StatusClientLayer = Layer.succeed(StatusClient, {
  load: Effect.succeed(Status.make('Ready')),
})

const EffectsLayer = loader.Load.toLayer(
  Effect.gen(function* () {
    const client = yield* loader.Client

    return () =>
      Effect.map(client.load, value => loader.Message.CompletedLoad({ value }))
  }),
)

const prepare = () =>
  loader.composition.prepareBlock({
    init: loader.init,
    update: loader.update,
    view: loader.view,
    EffectsLayer,
  })

export const LoaderBlock: Block.FromAssemblyWithView<
  typeof loader.composition.Model,
  typeof prepare
> = Block.assemble(prepare)

export type ValueRemainsExact = Assert<
  Equal<
    Extract<
      typeof LoaderBlock.Message.Type,
      { _tag: 'CompletedLoad' }
    >['value'],
    typeof Status.Type
  >
>
export type RequirementRemainsExact = Assert<
  Equal<Layer.Services<typeof LoaderBlock.EffectsLayer>, StatusClient>
>
