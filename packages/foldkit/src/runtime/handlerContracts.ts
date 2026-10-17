import type { Scoped } from '../block/scope.js'
import type { Handler as CommandHandler } from '../command/handler.js'
import type { Handler as ManagedResourceHandler } from '../managedResource/handler.js'
import type { Handler as MountHandler } from '../mount/handler.js'
import type { Handler as SubscriptionHandler } from '../subscription/handler.js'

type HandlerName<Name extends string, OwnerId extends string | never> = [
  OwnerId,
] extends [never]
  ? Name
  : Name extends `${string}/${infer LocalName}`
    ? LocalName
    : Name

type LocalHandlerEntry<Requirements, OwnerId extends string | never> =
  Requirements extends CommandHandler<infer Name, infer _Args, infer _Message>
    ? Readonly<{
        key: `Command/${HandlerName<Name, OwnerId>}`
        contract: Requirements
      }>
    : Requirements extends SubscriptionHandler<
          infer Name,
          infer _Dependencies,
          infer _Message
        >
      ? Readonly<{
          key: `Subscription/${HandlerName<Name, OwnerId>}`
          contract: Requirements
        }>
      : Requirements extends MountHandler<
            infer Name,
            infer _Input,
            infer _Message
          >
        ? Readonly<{
            key: `Mount/${HandlerName<Name, OwnerId>}`
            contract: Requirements
          }>
        : Requirements extends ManagedResourceHandler<
              infer Name,
              infer _Params,
              infer _Value
            >
          ? Readonly<{
              key: `ManagedResource/${HandlerName<Name, OwnerId>}`
              contract: Requirements
            }>
          : never

type HandlerEntry<Requirements, OwnerId extends string | never> =
  Requirements extends Scoped<infer Path, infer Contract>
    ? LocalHandlerEntry<Contract, OwnerId> extends infer Entry extends
        Readonly<{
          key: string
          contract: unknown
        }>
      ? Readonly<{
          key: `${Path}/${Entry['key']}`
          contract: Requirements
        }>
      : never
    : LocalHandlerEntry<Requirements, OwnerId>

type CommandRequirements<Requirements> = Requirements extends unknown
  ? Requirements extends Scoped<infer _Path, infer Contract>
    ? Contract extends CommandHandler<any, any, any>
      ? Requirements
      : never
    : Requirements extends CommandHandler<any, any, any>
      ? Requirements
      : never
  : never

type SubscriptionRequirements<Requirements> = Requirements extends unknown
  ? Requirements extends Scoped<infer _Path, infer Contract>
    ? Contract extends SubscriptionHandler<any, any, any>
      ? Requirements
      : never
    : Requirements extends SubscriptionHandler<any, any, any>
      ? Requirements
      : never
  : never

type MountRequirements<Requirements> = Requirements extends unknown
  ? Requirements extends Scoped<infer _Path, infer Contract>
    ? Contract extends MountHandler<any, any, any>
      ? Requirements
      : never
    : Requirements extends MountHandler<any, any, any>
      ? Requirements
      : never
  : never

type ManagedResourceRequirements<Requirements> = Requirements extends unknown
  ? Requirements extends Scoped<infer _Path, infer Contract>
    ? Contract extends ManagedResourceHandler<any, any, any>
      ? Requirements
      : never
    : Requirements extends ManagedResourceHandler<any, any, any>
      ? Requirements
      : never
  : never

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

type ContractsDiffer<Left, Right> =
  Equal<Left, Right> extends true ? false : true

type ConflictingPairKey<
  Left extends Readonly<{ key: string; contract: unknown }>,
  Right extends Readonly<{ key: string; contract: unknown }>,
> =
  Equal<Left['key'], Right['key']> extends true
    ? ContractsDiffer<Left['contract'], Right['contract']> extends true
      ? Left['key']
      : never
    : never

type ConflictingKeysForEntry<
  Left extends Readonly<{ key: string; contract: unknown }>,
  Entries extends Readonly<{ key: string; contract: unknown }>,
> = Entries extends infer Right extends Readonly<{
  key: string
  contract: unknown
}>
  ? ConflictingPairKey<Left, Right>
  : never

type HandlerEntryShape = Readonly<{ key: string; contract: unknown }>

type EntriesByKey<Entries extends HandlerEntryShape> = {
  [Entry in Entries as Entry['key']]: Entry
}

type ConflictingIndexedKeys<
  Entries extends HandlerEntryShape,
  Index,
> = Entries extends infer Left extends HandlerEntryShape
  ? Left['key'] extends keyof Index
    ? ConflictingKeysForEntry<
        Left,
        Extract<Index[Left['key']], HandlerEntryShape>
      >
    : never
  : never

type ConflictingKeys<Entries extends HandlerEntryShape> =
  ConflictingIndexedKeys<Entries, EntriesByKey<Entries>>

type ValidHandlerKindContracts<
  Requirements,
  OwnerId extends string | never = never,
> = [ConflictingKeys<HandlerEntry<Requirements, OwnerId>>] extends [never]
  ? unknown
  : Readonly<{
      'Conflicting Foldkit handler contracts': ConflictingKeys<
        HandlerEntry<Requirements, OwnerId>
      >
    }>

/** @internal Rejects incompatible handler contracts sharing one Context key. */
export type ValidHandlerContracts<
  Requirements,
  OwnerId extends string | never = never,
> = ValidHandlerKindContracts<CommandRequirements<Requirements>, OwnerId> &
  ValidHandlerKindContracts<SubscriptionRequirements<Requirements>, OwnerId> &
  ValidHandlerKindContracts<MountRequirements<Requirements>, OwnerId> &
  ValidHandlerKindContracts<ManagedResourceRequirements<Requirements>, OwnerId>
