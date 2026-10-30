import type { Handler as CommandHandler } from '../command/handler.js'
import type { Handler as MountHandler } from '../mount/handler.js'

interface HandlerEntryShape {
  readonly key: string
  readonly contract: unknown
}

interface HandlerEntryValue<Key extends string, Contract> {
  readonly key: Key
  readonly contract: Contract
}

type HandlerEntry<Requirements> =
  Requirements extends CommandHandler<infer Name, infer _Args, infer _Message>
    ? HandlerEntryValue<`Command/${Name}`, Requirements>
    : Requirements extends MountHandler<
          infer Name,
          infer _Input,
          infer _Message
        >
      ? HandlerEntryValue<`Mount/${Name}`, Requirements>
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

type ConflictingIndexedKeys<
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

/** @internal Rejects incompatible handler contracts sharing one Context key. */
export type ValidHandlerContracts<Requirements> = [Requirements] extends [never]
  ? unknown
  : HandlerEntry<Requirements> extends infer Entries
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
