import { Context, Effect, Layer, Schema } from 'effect'
import type { ExecutableOf, FactsOf } from 'foldkit/block'
import * as Block from 'foldkit/block'
import { defineMessageUnion } from 'foldkit/message'

const Startup = Schema.Struct({ initialValue: Schema.String })
type Startup = typeof Startup.Type

export class StartupConfiguration extends Context.Service<
  StartupConfiguration,
  Startup
>()('OpaqueCapability/StartupConfiguration') {}

export class AuditLog extends Context.Service<AuditLog, string>()(
  'OpaqueCapability/AuditLog',
) {}

const Model = Schema.Struct({ value: Schema.String })
type Model = typeof Model.Type
const Message = defineMessageUnion({
  RequestedReadConfiguration: {},
  CompletedReadConfiguration: { value: Schema.String },
})
type Message = typeof Message.Type
export const ConfigurationKey = Symbol('OpaqueConstructionServices')

const Definition = Block.makeDefinition('OpaqueConstructionServices', {
  key: ConfigurationKey,
  Model,
  Message,
  Init: Schema.Tuple([]),
  effects: { services: [AuditLog] },
})
const ReadConfiguration = Definition.makeCommand('ReadConfiguration', {
  messages: [Message.CompletedReadConfiguration],
  handler: function* () {
    const audit = yield* AuditLog

    return () =>
      Effect.succeed(Message.CompletedReadConfiguration({ value: audit }))
  },
})
const Composition = Definition.makeComposition()
const update = Composition.makeUpdate({
  RequestedReadConfiguration: Definition.makeCommandsStep(() => [
    ReadConfiguration(),
  ]),
  CompletedReadConfiguration: Definition.makeFieldsStep.fromMessage(
    ({ value }) => ({ value: () => value }),
  ),
})
export const ConfiguredBlock = Definition.makeBlock(
  Effect.gen(function* () {
    const startup = yield* StartupConfiguration

    return {
      children: [],
      init: Composition.makeInit(() => ({
        model: Model.make({ value: startup.initialValue }),
      })),
      update,
      EffectsLayer: ReadConfiguration.layer,
    }
  }),
)

type Equal<Left, Right> = [Left, Right] extends [Right, Left] ? true : false
type Expect<Value extends true> = Value
export type ConstructorServiceIsExact = Expect<
  Equal<Layer.Services<typeof ConfiguredBlock.layer>, StartupConfiguration>
>
export type HandlerServiceIsExact = Expect<
  Equal<
    Layer.Services<ExecutableOf<typeof ConfiguredBlock>['EffectsLayer']>,
    AuditLog
  >
>
export type ProgramServiceIsExact = Expect<
  Equal<FactsOf<typeof ConfiguredBlock>['programRequirements'], AuditLog>
>
export const missingConfiguration = Effect.scoped(
  Layer.build(ConfiguredBlock.layer),
)

if (false) {
  const missingConstructor = missingConfiguration.pipe(
    Effect.provideService(AuditLog, 'Audit'),
  )
  // @ts-expect-error Runtime handler Services cannot supply the independent graph constructor's Service.
  Effect.runPromise(missingConstructor)
}
