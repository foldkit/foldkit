import type * as Update from '../update/index.js'
import type { RegistrationEvidenceTypeId } from '../update/update.js'
import type { OutMessageFoldStep } from './outMessageFold.js'
import type { OutMessageHelperEvidence } from './outMessageHelperEvidence.js'

type Exact<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false

type ModelRefinement<Model, Actual> =
  Exact<Model, Actual> extends true ? readonly [] : readonly [Actual]

type ReadModel<Model, Refinement> = Refinement extends readonly [infer Actual]
  ? Actual
  : Model

type ReadonlyProperty<Value, Key extends keyof Value> =
  Exact<
    { [Field in Key]: Value[Field] },
    { -readonly [Field in Key]: Value[Field] }
  > extends true
    ? false
    : true

type RegistrationData<Value> =
  typeof RegistrationEvidenceTypeId extends keyof Value
    ? readonly [
        Required<Value>[typeof RegistrationEvidenceTypeId],
        {} extends Pick<Value, typeof RegistrationEvidenceTypeId>
          ? true
          : false,
        ReadonlyProperty<Value, typeof RegistrationEvidenceTypeId>,
      ]
    : readonly []

/** @internal Retains an optional readonly registration property by name. */
export interface FoldOptionalReadonlyRegistration<Value> {
  readonly [RegistrationEvidenceTypeId]?: Value
}

/** @internal Retains an optional mutable registration property by name. */
export interface FoldOptionalMutableRegistration<Value> {
  [RegistrationEvidenceTypeId]?: Value
}

/** @internal Retains a required readonly registration property by name. */
export interface FoldRequiredReadonlyRegistration<Value> {
  readonly [RegistrationEvidenceTypeId]: Value
}

/** @internal Retains a required mutable registration property by name. */
export interface FoldRequiredMutableRegistration<Value> {
  [RegistrationEvidenceTypeId]: Value
}

type RegistrationFacet<Data> = Data extends readonly [
  infer Value,
  infer IsOptional,
  infer IsReadonly,
]
  ? IsOptional extends true
    ? IsReadonly extends true
      ? FoldOptionalReadonlyRegistration<Value>
      : FoldOptionalMutableRegistration<Value>
    : IsReadonly extends true
      ? FoldRequiredReadonlyRegistration<Value>
      : FoldRequiredMutableRegistration<Value>
  : unknown

type ArrayBase<Value extends ReadonlyArray<unknown>> =
  Value extends Array<unknown> ? [...Value] : readonly [...Value]

type CommandData<Value> =
  Value extends ReadonlyArray<unknown>
    ? typeof RegistrationEvidenceTypeId extends keyof Value
      ? ArrayBase<Value> extends infer Base extends ReadonlyArray<unknown>
        ? Exact<
            Value,
            Base & RegistrationFacet<RegistrationData<Value>>
          > extends true
          ? readonly ['Registered', Base, RegistrationData<Value>]
          : readonly ['Raw', Value]
        : never
      : readonly ['Raw', Value]
    : readonly ['Raw', Value]

type RestoredCommands<Data> = Data extends readonly [
  'Registered',
  infer Base,
  infer Registration,
]
  ? Base & RegistrationFacet<Registration>
  : Data extends readonly ['Raw', infer Value]
    ? Value
    : never

type Residual<Output> = {
  [
    Key in keyof Output as Key extends
      | 'model'
      | typeof RegistrationEvidenceTypeId
      ? never
      : Key
  ]: Key extends 'commands' ? CommandData<Required<Output>[Key]> : Output[Key]
}

type RecipeResidual<Output> = {
  [
    Key in keyof Output as Key extends
      | keyof Update.AnyResultRecipe
      | typeof RegistrationEvidenceTypeId
      ? never
      : Key
  ]: Key extends 'commands' ? CommandData<Required<Output>[Key]> : Output[Key]
}

type RestoredResidual<Value> = {
  [Key in keyof Value]: Key extends 'commands'
    ? RestoredCommands<Required<Value>[Key]>
    : Value[Key]
}

type OutputData<Model, Output> = Output extends unknown
  ? Output extends Update.ResultRecipe<
      infer Actual,
      infer Message,
      infer OutMessage,
      infer Requirements,
      infer Evidence
    >
    ? readonly [
        'Recipe',
        ModelRefinement<Model, Actual>,
        Message,
        OutMessage,
        Requirements,
        Evidence,
        RecipeResidual<Output>,
        RegistrationData<Output>,
      ]
    : Output extends Readonly<{ model: infer Actual }>
      ? readonly [
          'Plain',
          ModelRefinement<Model, Actual>,
          ReadonlyProperty<Output, 'model'>,
          Residual<Output>,
          RegistrationData<Output>,
        ]
      : readonly ['Other', Output]
  : never

/** @internal Retains each case's output and graph without repeating its Model. */
export type NormalizedFoldCaseData<Model, Cases> = {
  [Tag in keyof Cases]: Cases[Tag] extends (
    ...args: ReadonlyArray<any>
  ) => infer Step
    ? Step extends infer FunctionValue extends (
        ...args: ReadonlyArray<any>
      ) => unknown
      ? OutputData<Model, ReturnType<FunctionValue>> extends infer Value extends
          ReadonlyArray<unknown>
        ? [Tag, Update.GraphRequirementOf<FunctionValue>, ...Value]
        : never
      : never
    : never
}[keyof Cases]

type ModelField<Model, IsReadonly> = IsReadonly extends true
  ? Readonly<{ model: Model }>
  : { model: Model }

type RestoredOutput<Model, Data> = Data extends readonly [
  'Recipe',
  infer Refinement,
  infer Message,
  infer OutMessage,
  infer Requirements,
  infer Evidence,
  infer Value,
  infer Registration,
]
  ? Update.ResultRecipe<
      ReadModel<Model, Refinement>,
      Message,
      OutMessage,
      Requirements,
      Evidence
    > &
      RestoredResidual<Value> &
      RegistrationFacet<Registration>
  : Data extends readonly [
        'Plain',
        infer Refinement,
        infer IsReadonly,
        infer Value,
        infer Registration,
      ]
    ? ModelField<ReadModel<Model, Refinement>, IsReadonly> &
        RestoredResidual<Value> &
        RegistrationFacet<Registration>
    : Data extends readonly ['Other', infer Output]
      ? Output
      : never

type CaseTags<Data> = Data extends readonly [
  infer Tag extends PropertyKey,
  ...ReadonlyArray<unknown>,
]
  ? Tag
  : never

type CaseData<Data, Tag> = Extract<
  Data,
  readonly [Tag, unknown, ...ReadonlyArray<unknown>]
>

type CaseOutput<Data> = Data extends readonly [
  unknown,
  unknown,
  ...infer Output,
]
  ? Output
  : never

type CaseGraph<Data> = Data extends readonly [
  unknown,
  infer Graph,
  ...ReadonlyArray<unknown>,
]
  ? Graph
  : never

/** @internal Reconstructs one callable Step per original case. */
export type NormalizedFoldStep<Model, Data> = {
  [Tag in CaseTags<Data>]: OutMessageFoldStep<
    Model,
    RestoredOutput<Model, CaseOutput<CaseData<Data, Tag>>>,
    CaseGraph<CaseData<Data, Tag>>
  >
}[CaseTags<Data>]

declare const NormalizedFoldTypeId: unique symbol

/** @internal Identifies an authored helper's exact portable result contract. */
export interface NormalizedFoldEvidence<ChildOutMessage, ContextData, Data> {
  readonly [NormalizedFoldTypeId]: readonly [
    childOutMessage: () => ChildOutMessage,
    context: () => ContextData,
    data: () => Data,
  ]
}

/** @internal Separates the shared Model from a helper's standard FoldContext. */
export type NormalizedFoldContextData<
  Model,
  Context extends ReadonlyArray<unknown>,
> = Context extends readonly []
  ? readonly []
  : Context extends readonly [
        Update.FoldContext<infer ChildMessage, infer ParentMessage, Model>,
      ]
    ? readonly ['Fold', ChildMessage, ParentMessage]
    : readonly ['Raw', Context]

/** @internal Restores an authored helper's exact optional or required context. */
export type RestoredFoldContext<Model, Data> = Data extends readonly [
  'Fold',
  infer ChildMessage,
  infer ParentMessage,
]
  ? readonly [Update.FoldContext<ChildMessage, ParentMessage, Model>]
  : Data extends readonly ['Raw', infer Context extends ReadonlyArray<unknown>]
    ? Context
    : readonly []

/** @internal A named exhaustive fold with a portable per-case result contract. */
export interface NormalizedOutMessageFold<
  Model,
  ChildOutMessage,
  Context extends ReadonlyArray<unknown>,
  Data,
  ChildMessage = Context extends readonly [
    Update.FoldContext<infer ContextChildMessage, infer _ParentMessage, Model>,
  ]
    ? ContextChildMessage
    : never,
>
  extends
    OutMessageHelperEvidence<ChildOutMessage, 'fold', ChildMessage>,
    NormalizedFoldEvidence<
      ChildOutMessage,
      NormalizedFoldContextData<Model, Context>,
      Data
    > {
  (
    outMessage: ChildOutMessage,
    ...context: Context
  ): NormalizedFoldStep<Model, Data>
}
