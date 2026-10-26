import type { Inspectable, Option, Pipeable } from 'effect'

import type { VNode } from '../vdom.js'
import type { ChildAttribute } from './childAttribute.js'

type AnyFunction = (...args: ReadonlyArray<any>) => any
type Primitive = bigint | boolean | null | number | string | symbol | undefined

type IsAny<Value> = 0 extends 1 & Value ? true : false

type IsEqual<Left, Right> = [Left] extends [Right]
  ? [Right] extends [Left]
    ? true
    : false
  : false

type Includes<
  Values extends ReadonlyArray<unknown>,
  Value,
> = Values extends readonly [infer Head, ...infer Tail]
  ? IsEqual<Head, Value> extends true
    ? true
    : Includes<Tail, Value>
  : false

type ObjectKey<Value> = Exclude<
  keyof Value,
  | symbol
  | (Value extends Inspectable.Inspectable
      ? keyof Inspectable.Inspectable
      : never)
  | (Value extends Pipeable.Pipeable ? keyof Pipeable.Pipeable : never)
  | (Value extends Date ? keyof Date : never)
>

type NestedFunctionInFields<
  Value extends object,
  Seen extends ReadonlyArray<unknown>,
> = true extends {
  [Key in ObjectKey<Value>]-?: NestedFunction<Value[Key], Seen>
}[ObjectKey<Value>]
  ? true
  : false

type NestedFunctionMember<Value, Seen extends ReadonlyArray<unknown>> =
  Includes<Seen, Value> extends true
    ? false
    : Value extends AnyFunction
      ? true
      : Value extends VNode | ChildAttribute<unknown>
        ? false
        : Value extends Option.Option<infer Item>
          ? NestedFunction<Item, readonly [...Seen, Value]>
          : Value extends ReadonlyArray<infer Item>
            ? NestedFunction<Item, readonly [...Seen, Value]>
            : Value extends object
              ? NestedFunctionInFields<Value, readonly [...Seen, Value]>
              : false

type NestedFunction<Value, Seen extends ReadonlyArray<unknown>> =
  IsAny<Value> extends true
    ? false
    : [Value] extends [Primitive]
      ? false
      : [Value] extends [Option.Option<Primitive>]
        ? false
        : [Value] extends [ReadonlyArray<Primitive>]
          ? false
          : Value extends unknown
            ? NestedFunctionMember<Value, Seen>
            : never

type NestedFunctionInViewInputField<Value> = [Value] extends [Primitive]
  ? false
  : Value extends AnyFunction
    ? false
    : NestedFunction<Value, readonly []>

type HasNestedFunction<ViewInputs> = ViewInputs extends
  | AnyFunction
  | VNode
  | ChildAttribute<unknown>
  ? false
  : [ViewInputs] extends [Option.Option<Primitive>]
    ? false
    : [ViewInputs] extends [ReadonlyArray<Primitive>]
      ? false
      : ViewInputs extends Option.Option<infer Item>
        ? NestedFunction<Item, readonly [ViewInputs]>
        : ViewInputs extends ReadonlyArray<infer Item>
          ? NestedFunction<Item, readonly [ViewInputs]>
          : ViewInputs extends object
            ? true extends {
                [
                  Key in Exclude<keyof ViewInputs, symbol>
                ]-?: NestedFunctionInViewInputField<ViewInputs[Key]>
              }[Exclude<keyof ViewInputs, symbol>]
              ? true
              : false
            : false

/** @internal Rejects unusable or statically visible nested callback ViewInputs. */
export type ValidViewInputs<ViewInputs> =
  IsAny<ViewInputs> extends true
    ? never
    : [ViewInputs] extends [never]
      ? never
      : [ViewInputs] extends [void]
        ? never
        : true extends HasNestedFunction<ViewInputs>
          ? never
          : ViewInputs

type CallbackDiagnosticDepthLimit = 6

type NestedCallbackPath<
  Value,
  Path extends string,
  Seen extends ReadonlyArray<unknown>,
> =
  IsAny<Value> extends true
    ? never
    : Seen['length'] extends CallbackDiagnosticDepthLimit
      ? never
      : Includes<Seen, Value> extends true
        ? never
        : Value extends AnyFunction
          ? Path
          : Value extends Primitive | VNode | ChildAttribute<unknown>
            ? never
            : Value extends Option.Option<infer Item>
              ? NestedCallbackPath<
                  Item,
                  `${Path}.value`,
                  readonly [...Seen, Value]
                >
              : Value extends ReadonlyArray<infer Item>
                ? NestedCallbackPath<
                    Item,
                    `${Path}[number]`,
                    readonly [...Seen, Value]
                  >
                : Value extends object
                  ? {
                      [Key in ObjectKey<Value>]-?: Key extends string | number
                        ? NestedCallbackPath<
                            Value[Key],
                            `${Path}.${Key}`,
                            readonly [...Seen, Value]
                          >
                        : never
                    }[ObjectKey<Value>]
                  : never

type ViewInputFieldCallbackPath<
  Value,
  Path extends string,
> = Value extends AnyFunction
  ? never
  : NestedCallbackPath<Value, Path, readonly []>

type ViewInputCallbackPath<ViewInputs> = ViewInputs extends
  | AnyFunction
  | VNode
  | ChildAttribute<unknown>
  ? never
  : ViewInputs extends Option.Option<infer Item>
    ? NestedCallbackPath<Item, 'viewInputs.value', readonly [ViewInputs]>
    : ViewInputs extends ReadonlyArray<infer Item>
      ? NestedCallbackPath<Item, 'viewInputs[number]', readonly [ViewInputs]>
      : ViewInputs extends object
        ? {
            [Key in ObjectKey<ViewInputs>]-?: Key extends string | number
              ? ViewInputFieldCallbackPath<ViewInputs[Key], `viewInputs.${Key}`>
              : never
          }[ObjectKey<ViewInputs>]
        : never

/** @internal Describes invalid callback placement without weakening validation. */
export type InvalidViewInputsDiagnostic<ViewInputs> = [
  ViewInputCallbackPath<ViewInputs>,
] extends [never]
  ? Readonly<{
      'Invalid ViewInputs: nested callbacks must be top-level fields': never
    }>
  : Readonly<{
      [
        Path in ViewInputCallbackPath<ViewInputs> as `Nested callback at ${Path}: move it to a top-level ViewInputs field`
      ]: never
    }>
