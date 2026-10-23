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

interface HandlerEntryShape {
  readonly key: string
  readonly contract: unknown
}

interface HandlerEntryValue<Key extends string, Contract> {
  readonly key: Key
  readonly contract: Contract
}

type LocalHandlerEntry<Requirements, OwnerId extends string | never> =
  Requirements extends CommandHandler<infer Name, infer _Args, infer _Message>
    ? HandlerEntryValue<`Command/${HandlerName<Name, OwnerId>}`, Requirements>
    : Requirements extends SubscriptionHandler<
          infer Name,
          infer _Dependencies,
          infer _Message
        >
      ? HandlerEntryValue<
          `Subscription/${HandlerName<Name, OwnerId>}`,
          Requirements
        >
      : Requirements extends MountHandler<
            infer Name,
            infer _Input,
            infer _Message
          >
        ? HandlerEntryValue<`Mount/${HandlerName<Name, OwnerId>}`, Requirements>
        : Requirements extends ManagedResourceHandler<
              infer Name,
              infer _Params,
              infer _Value
            >
          ? HandlerEntryValue<
              `ManagedResource/${HandlerName<Name, OwnerId>}`,
              Requirements
            >
          : never

type HandlerEntry<Requirements, OwnerId extends string | never> =
  Requirements extends Scoped<infer Path, infer Contract>
    ? LocalHandlerEntry<Contract, OwnerId> extends infer Entry extends
        HandlerEntryShape
      ? HandlerEntryValue<`${Path}/${Entry['key']}`, Requirements>
      : never
    : LocalHandlerEntry<Requirements, OwnerId>

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

type HasConflictingEntry<
  Left extends HandlerEntryShape,
  Group extends HandlerEntryShape,
> = Group extends infer Right extends HandlerEntryShape
  ? Equal<Left['key'], Right['key']> extends true
    ? Equal<Left['contract'], Right['contract']> extends false
      ? true
      : never
    : never
  : never

type OpenKeyConflicts<
  Entries extends HandlerEntryShape,
  Index,
  Keys extends keyof Index = keyof Index,
> = Entries extends infer Left extends HandlerEntryShape
  ? Left['key'] extends Keys
    ? Equal<Index[Left['key']], Left> extends true
      ? never
      : true extends HasConflictingEntry<
            Left,
            Extract<Index[Left['key']], HandlerEntryShape>
          >
        ? Left['key']
        : never
    : never
  : never

type IsOpenHandlerKey<Key extends string> = Key extends unknown
  ? {} extends Record<Key, unknown>
    ? true
    : false
  : never

type HasOpenHandlerKey<Entries extends HandlerEntryShape> =
  Entries extends unknown ? IsOpenHandlerKey<Entries['key']> : never

type ConflictsWithinGroup<
  Entries extends HandlerEntryShape,
  Whole = Entries,
> = Entries extends infer Left extends HandlerEntryShape
  ? ConflictingKeysForEntry<Left, Extract<Whole, HandlerEntryShape>>
  : never

type ConflictingIndexedKeys<Entries extends HandlerEntryShape, Index> =
  true extends HasOpenHandlerKey<Entries>
    ? OpenKeyConflicts<Entries, Index>
    : {
        [Key in keyof Index]: ConflictsWithinGroup<
          Extract<Index[Key], HandlerEntryShape>
        >
      }[keyof Index]

type ValidHandlerKindContracts<
  Requirements,
  OwnerId extends string | never = never,
> = [Requirements] extends [never]
  ? unknown
  : HandlerEntry<Requirements, OwnerId> extends infer Entries
    ? [Entries] extends [HandlerEntryShape]
      ? ConflictingIndexedKeys<
          Entries,
          {
            [Entry in Entries as Entry['key']]: Entry
          }
        > extends infer Conflicts
        ? [Conflicts] extends [never]
          ? unknown
          : Readonly<{
              'Conflicting Foldkit handler contracts': Conflicts
            }>
        : never
      : unknown
    : unknown

/** @internal Rejects incompatible handler contracts sharing one Context key. */
export type ValidHandlerContracts<
  Requirements,
  OwnerId extends string | never = never,
> = ValidHandlerKindContracts<Requirements, OwnerId>
