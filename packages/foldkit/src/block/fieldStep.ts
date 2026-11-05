import { Array, type Schema, Struct } from 'effect'

import type { FieldTransforms } from '../struct/index.js'
import { makeResultRecipe } from '../update/operationRecipe.js'
import type {
  ContextualMessageProducer,
  ContextualModelMessageProducer,
  FocusedMessageOf,
  FocusedStepValidation,
  ValidateMessageProducer,
  ValidateModelMessageProducer,
} from './focusedStep.js'
import { instanceFieldsOf } from './instanceSchema.js'
import type { InstanceEvidence } from './instanceSchema.js'
import type {
  CreationFieldTransforms,
  CreationFieldsReturn,
  CreationsInTransforms,
  CreationsInValue,
  ValidateCreationTransforms,
} from './occurrence.js'
import {
  hasOccurrenceCreations,
  resolveOccurrenceFields,
} from './occurrenceRuntime.js'

type ModelOnlyReturn<Model> = Readonly<{
  model: Model
  commands?: never
  outMessage?: never
}>

type KeysOfUnion<Value> = Value extends unknown ? keyof Value : never

type IsAny<Value> = 0 extends 1 & Value ? true : false

type FieldStepModel<Model extends object, Transforms> = {
  [Field in keyof Model]: Field extends keyof Transforms
    ? Transforms[Field] extends (...args: ReadonlyArray<never>) => infer Value
      ? Model[Field] extends ReadonlyArray<InstanceEvidence<unknown>>
        ? [CreationsInValue<Value>] extends [never]
          ? Value
          : Model[Field]
        : Value
      : Model[Field]
    : Model[Field]
}

type FieldStepReturn<Model extends object, Transforms> = [Transforms] extends [
  Partial<{ [Field in keyof Model]: (value: Model[Field]) => Model[Field] }>,
]
  ? ModelOnlyReturn<FieldStepModel<Model, Transforms>>
  : [CreationsInTransforms<Model, Transforms>] extends [never]
    ? ModelOnlyReturn<FieldStepModel<Model, Transforms>>
    : CreationFieldsReturn<Model, CreationsInTransforms<Model, Transforms>>

type ValidateTransforms<Model extends object, Transforms> = ([
  Exclude<keyof Transforms, KeysOfUnion<Model>>,
] extends [never]
  ? unknown
  : Readonly<Record<Exclude<keyof Transforms, KeysOfUnion<Model>>, never>>) &
  ([FieldStepModel<Model, Transforms>] extends [Model]
    ? unknown
    : Readonly<{
        'Field transformations must preserve the owning Model': never
      }>)

type ValidateFieldOutput<Model extends object, Transforms, ParentOwner> =
  IsAny<Transforms> extends true
    ? Readonly<{ 'Field transformation callbacks cannot return any': never }>
    : [Transforms] extends [never]
      ? Readonly<{
          'Field transformation callbacks cannot return never': never
        }>
      : ValidateTransforms<Model, Transforms> &
          ValidateCreationTransforms<Model, Transforms> &
          ([Transforms] extends [CreationFieldTransforms<Model, ParentOwner>]
            ? unknown
            : Readonly<{
                'Field transformations must preserve their field or create its declared child': never
              }>)

type FieldEvolve<Model extends object> = (
  ...args: ReadonlyArray<never>
) => Partial<{ [Field in keyof Model]: (value: Model[Field]) => unknown }>

type FieldHandler<
  Model extends object,
  Message,
  Evolve extends FieldEvolve<Model>,
> = (
  model: Model,
  message: Message,
) => FieldStepReturn<Model, ReturnType<Evolve>>

type FocusedFieldStep<
  Model extends object,
  OwnerMessage,
  ExactMessage,
  Evolve extends FieldEvolve<Model>,
> = [OwnerMessage] extends [never]
  ? (model: Model) => FieldStepReturn<Model, ReturnType<Evolve>>
  : Parameters<NoInfer<Evolve>>['length'] extends 0 | 1
    ? (model: Model) => FieldStepReturn<Model, ReturnType<Evolve>>
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

/** @internal Names focused field helpers in inferred consumer declarations. */
export interface FocusedObjectStepFields<
  Model extends object,
  Message,
  ParentOwner = unknown,
> {
  <
    ExactMessage extends Message,
    const Evolve extends ContextualModelMessageProducer<
      Model,
      ExactMessage,
      CreationFieldTransforms<Model, ParentOwner>
    >,
  >(
    evolve: Evolve,
    ...validation: FocusedStepValidation<
      ValidateFieldOutput<Model, ReturnType<NoInfer<Evolve>>, ParentOwner> &
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
      CreationFieldTransforms<Model, ParentOwner>
    >,
  >(
    evolve: Evolve,
    ...validation: FocusedStepValidation<
      ValidateFieldOutput<Model, ReturnType<NoInfer<Evolve>>, ParentOwner> &
        ValidateMessageProducer<Message, ExactMessage, NoInfer<Evolve>>
    >
  ) => MessageOnlyFieldHandler<Model, Message, ExactMessage, Evolve>
}

/** @internal Keeps exported field helpers nameable when their Block has no local Messages. */
export interface MessageFreeObjectStepFields<
  Model extends object,
  ParentOwner,
> {
  <
    const Evolve extends (
      model: Model,
    ) => CreationFieldTransforms<Model, ParentOwner>,
    const Validation extends ValidateFieldStep<
      Model,
      NoInfer<Evolve>,
      ParentOwner
    > = ValidateFieldStep<Model, NoInfer<Evolve>, ParentOwner>,
  >(
    evolve: Evolve,
    ...validation: Validation
  ): NoInfer<(model: Model) => FieldStepReturn<Model, ReturnType<Evolve>>>

  readonly fromMessage: FocusedObjectStepFields<
    Model,
    never,
    ParentOwner
  >['fromMessage']
}

type ValidateFieldStep<
  Model extends object,
  Evolve extends FieldEvolve<Model>,
  ParentOwner,
> =
  unknown extends ValidateFieldOutput<Model, ReturnType<Evolve>, ParentOwner>
    ? readonly []
    : readonly [
        error: ValidateFieldOutput<Model, ReturnType<Evolve>, ParentOwner>,
      ]

/**
 * Authors a Step from field transformations. The callback receives
 * the current Model and, in a `makeUpdate` handler, that entry's exact Message.
 * `.fromMessage` omits the Model parameter. Zero-argument and Model-only
 * callbacks produce reusable unary Steps. Each transformer receives its current
 * field value and must preserve that field's type and the Model's variant
 * constraints. Unknown fields are rejected. An empty transformation record
 * returns the identical incoming Model.
 *
 * `InputMessage` defaults to `Message` and may describe a separate input union.
 *
 * Plain field changes return only a Model. A standard Instance
 * array may also receive `Binding.create({ key, args })` requests. Their exact
 * registered Composition initializes the children before the following Step
 * and retains every child init Command and its requirements. Creation-bearing
 * results are opaque connected recipes; ordinary selectors always read ready
 * Instances. This helper does not emit an OutMessage.
 *
 * Use Binding operations for transitions within existing child Blocks.
 */
export type DefineStepFields<
  Model,
  Message,
  InputMessage = Message,
  ParentOwner = unknown,
> = [Model] extends [ReadonlyArray<unknown>]
  ? never
  : [Model] extends [object]
    ? [InputMessage] extends [never]
      ? MessageFreeObjectStepFields<Extract<Model, object>, ParentOwner>
      : FocusedObjectStepFields<
          Extract<Model, object>,
          InputMessage,
          ParentOwner
        >
    : never

/** @internal Creates the field Step authoring helper without running its callback. */
export function makeStepFields<
  Model extends object,
  Message,
  InputMessage = Message,
  ParentOwner = unknown,
>(
  ModelSchema?: Schema.Top,
): [InputMessage] extends [never]
  ? MessageFreeObjectStepFields<Model, ParentOwner>
  : FocusedObjectStepFields<Model, InputMessage, ParentOwner>
export function makeStepFields(ModelSchema?: Schema.Top): unknown {
  const instanceFields = instanceFieldsOf(ModelSchema)
  function fieldResult(
    model: object,
    transforms: FieldTransforms<object>,
  ): unknown {
    const fields = Reflect.ownKeys(transforms)
    const nextModel = Array.isArrayEmpty(fields)
      ? model
      : Struct.evolve(model, transforms)

    if (instanceFields.size === 0) {
      return { model: nextModel }
    }

    const changedInstanceFields = Array.filter(fields, field =>
      instanceFields.has(field),
    )

    return hasOccurrenceCreations(nextModel, changedInstanceFields)
      ? makeResultRecipe((_model, environment) =>
          resolveOccurrenceFields(
            nextModel,
            model,
            environment,
            changedInstanceFields,
          ),
        )
      : { model: nextModel }
  }

  function stepFields(
    evolve: (model: object, message: unknown) => FieldTransforms<object>,
  ): unknown {
    return (model: object, message: unknown) => {
      const transforms = evolve(model, message)
      return fieldResult(model, transforms)
    }
  }

  const fromMessage =
    (evolve: (message: unknown) => FieldTransforms<object>) =>
    (model: object, message: unknown) => {
      const transforms = evolve(message)
      return fieldResult(model, transforms)
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
