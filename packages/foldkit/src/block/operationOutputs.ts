import type * as Update from '../update/index.js'

type AnyFunction = (...args: ReadonlyArray<any>) => any

type OperationChannels = readonly [
  tag: PropertyKey,
  outMessage: unknown,
  requirements: unknown,
  registration: unknown,
]

declare const OperationOutputsTypeId: unique symbol

/** @internal Retains exact local Message result channels for completed operations. */
export interface OperationOutputs<Channels extends OperationChannels> {
  readonly [OperationOutputsTypeId]: (channels: Channels) => Channels
}

type OperationReturnFromChannels<Model, Message, Channels> =
  Channels extends readonly [
    tag: unknown,
    outMessage: infer OutMessage,
    requirements: infer Requirements,
    registration: infer Registration,
  ]
    ? Update.WithRegistrationEvidence<
        [OutMessage] extends [never]
          ? Update.Return<Model, Message, Requirements>
          : Update.ReturnWithOutMessage<
              Model,
              Message,
              OutMessage,
              Requirements
            >,
        Registration
      >
    : never

/** @internal Selects the exact result of a locally handled operation Message. */
export type OperationOutputOf<
  UpdateFunction extends AnyFunction,
  OperationMessage,
> = typeof OperationOutputsTypeId extends keyof UpdateFunction
  ? UpdateFunction extends OperationOutputs<infer Channels>
    ? OperationMessage extends Readonly<{ _tag: infer Tag }>
      ? Extract<
          Channels,
          readonly [Tag, unknown, unknown, unknown]
        > extends infer CaseChannels
        ? [CaseChannels] extends [never]
          ? ReturnType<UpdateFunction>
          : OperationReturnFromChannels<
              Parameters<UpdateFunction>[0],
              Parameters<UpdateFunction>[1],
              CaseChannels
            >
        : never
      : ReturnType<UpdateFunction>
    : ReturnType<UpdateFunction>
  : ReturnType<UpdateFunction>
