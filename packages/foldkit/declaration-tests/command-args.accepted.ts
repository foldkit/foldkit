import { Array, Context, Effect, Option, Schema } from 'effect'
import * as Command from 'foldkit/command'
import { defineMessageUnion } from 'foldkit/message'
import * as Scene from 'foldkit/scene'
import * as Story from 'foldkit/story'

export const Message = defineMessageUnion({
  CompletedPaint: { generation: Schema.Number },
})
export const ParentMessage = defineMessageUnion({
  GotPaint: { message: Message },
})
export const Paint = Command.define('ArgsPaint', {
  args: { generation: Schema.Number },
  messages: [Message.CompletedPaint],
})
export const Ping = Command.define('ArgsPing', {
  messages: [Message.CompletedPaint],
  interrupt: true,
})
export const DefaultArgs = Schema.Struct({
  generation: Schema.Number.pipe(
    Schema.withConstructorDefault(Effect.succeed(3)),
  ),
  label: Schema.optionalKey(Schema.String),
})
export const Defaulted = Command.define('ArgsDefaulted', {
  args: DefaultArgs.fields,
  messages: [Message.CompletedPaint],
})
export const makeChoose = <Value extends string>(Value: Schema.Codec<Value>) =>
  Command.define('ArgsChoose', {
    args: { value: Value },
    messages: [Message.CompletedPaint],
  })
export const Choose = makeChoose(Schema.Literals(['Alpha', 'Beta']))

export class Store extends Context.Service<Store, {}>()('Args/Store') {}
export type QualifiedPending = Command.Command<
  typeof ParentMessage.Type,
  'Failed',
  Store
> &
  Readonly<{
    name: `Parent/${string}`
    key: 'retained-key'
    interruptsKey: 'retained-interrupt-key'
    detail: 'retained-detail'
  }>
export declare const parentPending: QualifiedPending
export type ErasedDefinition = Extract<
  Story.CommandMatcher,
  Readonly<{
    [Command.CommandDefinitionTypeId]: typeof Command.CommandDefinitionTypeId
  }>
>

export const inspectScene = (pending: QualifiedPending) =>
  Scene.Command.argsOf(Paint)(pending)
export const inspectStory = (pending: QualifiedPending) =>
  Story.Command.argsOf(Paint)(pending)
export const inspectDefaulted = (pending: Story.AnyCommand) =>
  Story.Command.argsOf(Defaulted)(pending)
export const inspectArgless = (pending: Scene.AnyCommand) =>
  Scene.Command.argsOf(Ping)(pending)
export const inspectArglessInterrupt = (pending: Story.AnyCommand) =>
  Story.Command.argsOf(Ping.Interrupt)(pending)
export const inspectGeneric = <Value extends string>(
  definition: ReturnType<typeof makeChoose<Value>>,
  pending: Story.AnyCommand,
) => Story.Command.argsOf(definition)(pending)
export const inspectChoose = (pending: Scene.AnyCommand) =>
  Scene.Command.argsOf(Choose)(pending)
export const inspectErased = (
  definition: ErasedDefinition,
  pending: Story.AnyCommand,
) => Story.Command.argsOf(definition)(pending)
export const inspectUnion = (
  definition: typeof Paint | typeof Ping,
  pending: Scene.AnyCommand,
) => Scene.Command.argsOf(definition)(pending)
export const allPaintArgs = (pending: ReadonlyArray<Story.AnyCommand>) =>
  Array.getSomes(Array.map(pending, Story.Command.argsOf(Paint)))
export const inspectParentChannels = (pending: QualifiedPending) => {
  const maybeArgs = Story.Command.argsOf(Paint)(pending)
  if (Option.isSome(maybeArgs)) {
    return {
      args: maybeArgs.value,
      effect: pending.effect,
      name: pending.name,
      key: pending.key,
      interruptsKey: pending.interruptsKey,
      detail: pending.detail,
    }
  }
  return undefined
}

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Expect<Value extends true> = Value

export type ExactGeneration = Expect<
  Equal<
    Option.Option.Value<ReturnType<typeof inspectScene>>,
    Readonly<{ generation: number }>
  >
>
export type ExactParentEffect = Expect<
  Equal<
    NonNullable<ReturnType<typeof inspectParentChannels>>['effect'],
    QualifiedPending['effect']
  >
>
export type ExactQualifiedName = Expect<
  Equal<
    NonNullable<ReturnType<typeof inspectParentChannels>>['name'],
    `Parent/${string}`
  >
>
export type ExactKey = Expect<
  Equal<
    NonNullable<ReturnType<typeof inspectParentChannels>>['key'],
    'retained-key'
  >
>
export type ExactInterruptKey = Expect<
  Equal<
    NonNullable<ReturnType<typeof inspectParentChannels>>['interruptsKey'],
    'retained-interrupt-key'
  >
>
export type DefaultedGeneration = Expect<
  Equal<
    Option.Option.Value<ReturnType<typeof inspectDefaulted>>['generation'],
    number
  >
>
export type OptionalLabel = Expect<
  Equal<
    Option.Option.Value<ReturnType<typeof inspectDefaulted>>['label'],
    string | undefined
  >
>
export type ArglessProjectsUndefined = Expect<
  Equal<ReturnType<typeof inspectArgless>, Option.Option<undefined>>
>
export type ArglessInterruptProjectsUndefined = Expect<
  Equal<ReturnType<typeof inspectArglessInterrupt>, Option.Option<undefined>>
>
export type RefinedValue = Expect<
  Equal<
    Option.Option.Value<ReturnType<typeof inspectChoose>>['value'],
    'Alpha' | 'Beta'
  >
>
export type GenericValue = Expect<
  Equal<
    Option.Option.Value<ReturnType<typeof inspectGeneric<'Gamma'>>>['value'],
    'Gamma'
  >
>
export type ErasedStaysUnknown = Expect<
  Equal<
    ReturnType<typeof inspectErased>,
    Option.Option<Record<string, unknown> | undefined>
  >
>
export type UnionArgsDistribute = Expect<
  Equal<
    ReturnType<typeof inspectUnion>,
    Option.Option<Readonly<{ generation: number }> | undefined>
  >
>
