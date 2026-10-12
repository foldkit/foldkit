import type { Types } from 'effect'

import type { Handler as CommandHandler } from '../command/handler.js'
import type { Handler as ManagedResourceHandler } from '../managedResource/handler.js'
import type { Handler as MountHandler } from '../mount/handler.js'
import type { Handler as SubscriptionHandler } from '../subscription/handler.js'

type HandlerEntry<Requirements> =
  Requirements extends CommandHandler<infer Name, infer _Args, infer _Message>
    ? Readonly<{ key: `Command/${Name}`; contract: Requirements }>
    : Requirements extends SubscriptionHandler<
          infer Name,
          infer _Dependencies,
          infer _Message
        >
      ? Readonly<{ key: `Subscription/${Name}`; contract: Requirements }>
      : Requirements extends MountHandler<
            infer Name,
            infer _Input,
            infer _Message
          >
        ? Readonly<{ key: `Mount/${Name}`; contract: Requirements }>
        : Requirements extends ManagedResourceHandler<
              infer Name,
              infer _Params,
              infer _Value
            >
          ? Readonly<{ key: `ManagedResource/${Name}`; contract: Requirements }>
          : never

type ConflictingKeys<
  Entries extends Readonly<{ key: string; contract: unknown }>,
> = {
  [Key in Entries['key']]: Types.IsUnion<
    Extract<Entries, Readonly<{ key: Key }>>['contract']
  > extends true
    ? Key
    : never
}[Entries['key']]

/** @internal Rejects incompatible handler contracts sharing one Context key. */
export type ValidHandlerContracts<Requirements> = [
  ConflictingKeys<HandlerEntry<Requirements>>,
] extends [never]
  ? unknown
  : Readonly<{
      'Conflicting Foldkit handler contracts': ConflictingKeys<
        HandlerEntry<Requirements>
      >
    }>
