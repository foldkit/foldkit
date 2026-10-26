import { Array, Struct } from 'effect'

import type { FieldTransforms } from '../struct/index.js'
import type {
  ContextualMessageProducer,
  ContextualModelMessageProducer,
  FocusedMessageOf,
  FocusedStepValidation,
  ValidateMessageProducer,
  ValidateModelMessageProducer,
} from './focusedStep.js'

type ModelOnlyReturn<Model> = Readonly<{
  model: Model
  commands?: never
  outMessage?: never
}>

type KeysOfUnion<Value> = Value extends unknown ? keyof Value : never

type IsAny<Value> = 0 extends 1 & Value ? true : false

type FieldStepModel<
  Model extends object,
  Transforms extends FieldTransforms<Model>,
> = ReturnType<typeof Struct.evolve<Model, Transforms>>

type ValidateTransforms<
  Model extends object,
  Transforms extends FieldTransforms<Model>,
> = ([Exclude<keyof Transforms, KeysOfUnion<Model>>] extends [never]
  ? unknown
  : Readonly<Record<Exclude<keyof Transforms, KeysOfUnion<Model>>, never>>) &
  ([FieldStepModel<Model, Transforms>] extends [Model]
    ? unknown
    : Readonly<{
        'Field transformations must preserve the owning Model': never
      }>)

type ValidateFieldOutput<
  Model extends object,
  Transforms extends FieldTransforms<Model>,
> =
  IsAny<Transforms> extends true
    ? Readonly<{ 'Field transformation callbacks cannot return any': never }>
    : [Transforms] extends [never]
      ? Readonly<{
          'Field transformation callbacks cannot return never': never
        }>
      : ValidateTransforms<Model, Transforms>

type FieldEvolve<Model extends object> = (
  ...args: ReadonlyArray<never>
) => FieldTransforms<Model>

type FieldHandler<
  Model extends object,
  Message,
  Evolve extends FieldEvolve<Model>,
> = (
  model: Model,
  message: Message,
) => ModelOnlyReturn<FieldStepModel<Model, ReturnType<Evolve>>>

type FocusedFieldStep<
  Model extends object,
  OwnerMessage,
  ExactMessage,
  Evolve extends FieldEvolve<Model>,
> = [OwnerMessage] extends [never]
  ? (model: Model) => ModelOnlyReturn<FieldStepModel<Model, ReturnType<Evolve>>>
  : Parameters<NoInfer<Evolve>>['length'] extends 0 | 1
    ? (
        model: Model,
      ) => ModelOnlyReturn<FieldStepModel<Model, ReturnType<Evolve>>>
    : FieldHandler<
        Model,
        FocusedMessageOf<OwnerMessage, ExactMessage, Evolve, 1>,
        Evolve
      >

type MessageOnlyFieldHandler<
  Model extends object,
  OwnerMessage,
  ExactMessage,
  Evolve extends FieldEvolve<Model>,
> = FieldHandler<
  Model,
  Parameters<Evolve>['length'] extends 0
    ? ExactMessage
    : FocusedMessageOf<OwnerMessage, ExactMessage, Evolve, 0>,
  Evolve
>

interface FocusedObjectStepFields<Model extends object, Message> {
  <
    ExactMessage extends Message,
    const Evolve extends ContextualModelMessageProducer<
      Model,
      ExactMessage,
      FieldTransforms<Model>
    >,
  >(
    evolve: Evolve,
    ...validation: FocusedStepValidation<
      ValidateFieldOutput<Model, ReturnType<NoInfer<Evolve>>> &
        ValidateModelMessageProducer<
          Model,
          Message,
          ExactMessage,
          NoInfer<Evolve>
        >
    >
  ): FocusedFieldStep<Model, Message, ExactMessage, Evolve>

  readonly fromMessage: <
    ExactMessage extends Message,
    const Evolve extends ContextualMessageProducer<
      ExactMessage,
      FieldTransforms<Model>
    >,
  >(
    evolve: Evolve,
    ...validation: FocusedStepValidation<
      ValidateFieldOutput<Model, ReturnType<NoInfer<Evolve>>> &
        ValidateMessageProducer<Message, ExactMessage, NoInfer<Evolve>>
    >
  ) => MessageOnlyFieldHandler<Model, Message, ExactMessage, Evolve>
}

interface MessageFreeObjectStepFields<Model extends object> {
  <
    const Evolve extends (model: Model) => FieldTransforms<Model>,
    const Validation extends ValidateFieldStep<Model, NoInfer<Evolve>> =
      ValidateFieldStep<Model, NoInfer<Evolve>>,
  >(
    evolve: Evolve,
    ...validation: Validation
  ): NoInfer<
    (model: Model) => ModelOnlyReturn<FieldStepModel<Model, ReturnType<Evolve>>>
  >

  readonly fromMessage: FocusedObjectStepFields<Model, never>['fromMessage']
}

type ValidateFieldStep<
  Model extends object,
  Evolve extends FieldEvolve<Model>,
> =
  unknown extends ValidateFieldOutput<Model, ReturnType<Evolve>>
    ? readonly []
    : readonly [error: ValidateFieldOutput<Model, ReturnType<Evolve>>]

/**
 * Authors a Model-only Step from field transformations. The callback receives
 * the current Model and, in a `makeUpdate` handler, that entry's exact Message.
 * `.fromMessage` omits the Model parameter. Zero-argument and Model-only
 * callbacks produce reusable unary Steps. Each transformer receives its current
 * field value and must preserve that field's type and the Model's variant
 * constraints. Unknown fields are rejected. An empty transformation record
 * returns the identical incoming Model.
 *
 * Use Binding operations for child Block transitions. This helper authors
 * changes to the owning Block's fields and returns no Commands or OutMessage.
 */
export type DefineStepFields<Model, Message> = [Model] extends [
  ReadonlyArray<unknown>,
]
  ? never
  : [Model] extends [object]
    ? [Message] extends [never]
      ? MessageFreeObjectStepFields<Extract<Model, object>>
      : FocusedObjectStepFields<Extract<Model, object>, Message>
    : never

/** @internal Creates the field Step authoring helper without running its callback. */
export function makeStepFields<Model extends object, Message>(): [
  Message,
] extends [never]
  ? MessageFreeObjectStepFields<Model>
  : FocusedObjectStepFields<Model, Message>
export function makeStepFields(): unknown {
  function stepFields(
    evolve: (model: object, message: unknown) => FieldTransforms<object>,
  ): unknown {
    return (model: object, message: unknown) => {
      const transforms = evolve(model, message)
      return {
        model: Array.isArrayEmpty(Reflect.ownKeys(transforms))
          ? model
          : Struct.evolve(model, transforms),
      }
    }
  }

  const fromMessage =
    (evolve: (message: unknown) => FieldTransforms<object>) =>
    (model: object, message: unknown) => {
      const transforms = evolve(message)
      return {
        model: Array.isArrayEmpty(Reflect.ownKeys(transforms))
          ? model
          : Struct.evolve(model, transforms),
      }
    }

  return Object.assign(stepFields, { fromMessage })
}

/**
 * Creates a Step that returns the identical incoming Model and no Commands or
 * OutMessage. In an OutMessage policy it acknowledges the named child fact
 * without undoing the child transition or suppressing its Message.
 */
export interface DefineStepNoop<Model> {
  (): <Current extends Model>(model: Current) => ModelOnlyReturn<Current>
}

/** @internal Creates the Model-preserving Step without an execution mechanism. */
export const makeStepNoop =
  <Model>(): ReturnType<DefineStepNoop<Model>> =>
  model => ({ model })
