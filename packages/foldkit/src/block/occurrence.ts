import type * as Update from '../update/index.js'
import type { InstanceEvidence } from './instanceSchema.js'

declare const CreationSlotTypeId: unique symbol

/** @internal A pending write for one exact parent, child contract, and Model field. */
export interface CreationSlot<ChildOwner, ParentOwner, Field> {
  readonly [CreationSlotTypeId]: readonly [
    child: () => ChildOwner,
    parent: () => ParentOwner,
    field: () => Field,
  ]
}

/** @internal Retains the initialization channels of an inert creation request. */
export interface OccurrenceCreation<
  ChildOwner,
  ParentOwner,
  Field,
  Model,
  Message,
  Requirements,
  Registration,
>
  extends
    CreationSlot<ChildOwner, ParentOwner, Field>,
    Update.DeferredUpdateEvidence<Model, Message, Requirements, Registration> {}

/** @internal Creation is writable only in a field of standard ready Instances. */
export type CreationFieldInput<Value, ParentOwner, Field> =
  | Value
  | (Value extends ReadonlyArray<infer Item>
      ? [Item] extends [InstanceEvidence<infer ChildOwner>]
        ? ReadonlyArray<
            | Item
            | (CreationSlot<ChildOwner, ParentOwner, Field> &
                Update.DeferredUpdateEvidence<
                  unknown,
                  unknown,
                  unknown,
                  unknown
                >)
          >
        : never
      : never)

/** @internal Field inputs remain ready while outputs may request child initialization. */
export type CreationFieldTransforms<Model, ParentOwner> = Partial<{
  [Field in keyof Model]: (
    value: Model[Field],
  ) => CreationFieldInput<Model[Field], ParentOwner, Field>
}>

/** @internal Extracts creation evidence without recursively traversing domain objects. */
export type CreationsInValue<Value> =
  Value extends ReadonlyArray<infer Item>
    ? Extract<Item, CreationSlot<unknown, unknown, unknown>>
    : never

/** @internal Extracts the exact creation requests retained by field producers. */
export type CreationsInTransforms<Model, Transforms> = Exclude<
  {
    [Field in keyof Transforms]: Field extends keyof Model
      ? Model[Field] extends ReadonlyArray<InstanceEvidence<unknown>>
        ? NonNullable<Transforms[Field]> extends (
            ...args: ReadonlyArray<never>
          ) => infer Value
          ? CreationsInValue<Value>
          : never
        : never
      : never
  }[keyof Transforms],
  undefined
>

/** @internal Preserves initialization channels on the checked field result. */
export type CreationFieldsReturn<Model, Creation> =
  Creation extends Update.DeferredUpdateEvidence<
    any,
    infer Message,
    infer Requirements,
    infer Registration
  >
    ? Update.ResultRecipe<Model, Message, never, Requirements, Registration>
    : never

/** @internal Rejects widened creation slots whose initialization channels were discarded. */
export type ValidateCreationTransforms<Model, Transforms> = [
  Exclude<
    CreationsInTransforms<Model, Transforms>,
    Update.DeferredUpdateEvidence<any, any, any, any>
  >,
] extends [never]
  ? unknown
  : Readonly<{
      'Creation requests must retain their exact initialization contract': never
    }>
