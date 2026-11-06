import { Predicate, Schema, SchemaAST } from 'effect'

import type { AnyBinding } from '../../block/binding.js'
import {
  type CompiledOperation,
  makeCompiledOperation,
} from '../../block/compiledOperation.js'
import { makeCompositionInputUpdate } from '../../block/delivery.js'
import type {
  AuthoredMessageArguments,
  AuthoredMessageTag,
  AuthoredUpdateCases,
  CaseOutputChannels,
  ContextualUpdateCases,
  ContextualUpdateCasesFactory,
  ContextualUpdateOutputs,
  ResolvedAuthoredOutput,
  ValidateAnnotatedContext,
  ValidatedContextualUpdateCases,
} from '../../block/delivery.js'
import { runtimeMessageSchemaContract } from '../../block/messageSchemaContract.js'
import {
  type OperationMessageConstructor,
  type OperationParameters,
  isOperationMessageConstructor,
  prepareOperation,
} from '../../block/operation.js'
import { makeOperationMessageValidator } from '../../block/operationMessage.js'
import type { OperationOutputs } from '../../block/operationOutputs.js'
import {
  type InputOperationName,
  inputOperationName,
} from '../../message/inMessageOperation.js'
import * as Update from '../../update/index.js'
import type { OperationEnvironment } from '../../update/operationRecipe.js'
import type { AuthoringSource, Plan } from '../hybrid/authoring.js'
import { makeComposablePlanFactory } from '../hybrid/planComposer.js'
import type {
  ComposableUpdates,
  InMessageAuthoringSource,
} from '../hybrid/updateComposition.js'

type AnyFunction = (...args: ReadonlyArray<any>) => any
type AnySchema = Schema.Codec<any, any, any, any>
type IsAny<Value> = 0 extends 1 & Value ? true : false
type InputTag<SchemaValue extends AnySchema> = AuthoredMessageTag<
  SchemaValue['Type']
>
type InputConstructor<
  SchemaValue extends AnySchema,
  Tag extends PropertyKey,
> = Tag extends keyof SchemaValue
  ? Extract<SchemaValue[Tag], OperationMessageConstructor>
  : never

type InvalidConstructors<SchemaValue extends AnySchema> = {
  readonly [Tag in InputTag<SchemaValue>]: [InputOperationName<Tag>] extends [
    never,
  ]
    ? Tag
    : [InputConstructor<SchemaValue, Tag>] extends [never]
      ? Tag
      : [ReturnType<InputConstructor<SchemaValue, Tag>>] extends [
            Extract<SchemaValue['Type'], Readonly<{ _tag: Tag }>>,
          ]
        ? never
        : Tag
}[InputTag<SchemaValue>]

export { inputOperationName }
export type { InputOperationName }

/** @internal A generated input API requires finite, owned callable variants. */
export type ValidateInMessageSchema<SchemaValue extends AnySchema> =
  IsAny<SchemaValue['Type']> extends true
    ? Readonly<{ 'InMessage must preserve exact Schema contracts': never }>
    : AuthoredMessageArguments<SchemaValue['Type']> extends readonly []
      ? [InvalidConstructors<SchemaValue>] extends [never]
        ? unknown
        : Readonly<{
            'InMessage requires its union-owned callable variant constructors': InvalidConstructors<SchemaValue>
          }>
      : Readonly<{ 'InMessage requires finite tagged variants': never }>

type OutOf<Output> =
  Output extends Readonly<{ outMessage?: infer Out }>
    ? Exclude<Out, undefined>
    : never

type InMessageUpdateResult<
  Model,
  Message,
  Output,
  Bindings extends ReadonlyArray<AnyBinding>,
> =
  ResolvedAuthoredOutput<Output, Bindings> extends infer Resolved
    ? Update.WithRegistrationEvidence<
        [OutOf<Resolved>] extends [never]
          ? Update.Return<Model, Message, Update.RequirementsOfResult<Resolved>>
          : Update.ReturnWithOutMessage<
              Model,
              Message,
              OutOf<Resolved>,
              Update.RequirementsOfResult<Resolved>
            >,
        Update.RegistrationEvidenceOf<Resolved>
      >
    : never

/** The pure inMessageUpdate function, with separate input and Command-result contracts. */
export interface InMessageUpdateHandler<
  Model,
  InMessage,
  Message,
  Context extends ReadonlyArray<unknown>,
  Output,
  Bindings extends ReadonlyArray<AnyBinding>,
> {
  (
    inMessage: InMessage,
  ): (
    model: Model,
    ...context: Context
  ) => InMessageUpdateResult<Model, Message, Output, Bindings>
  (
    model: Model,
    inMessage: InMessage,
    ...context: Context
  ): InMessageUpdateResult<Model, Message, Output, Bindings>
}

type InMessageUpdatePlan<
  Model,
  InMessage,
  Message,
  Context extends ReadonlyArray<unknown>,
  Outputs,
  Bindings extends ReadonlyArray<AnyBinding>,
  Source,
> = Plan<
  InMessageUpdateHandler<
    Model,
    InMessage,
    Message,
    Context,
    Outputs[keyof Outputs],
    Bindings
  > &
    OperationOutputs<CaseOutputChannels<Bindings, Outputs>>,
  'InMessageUpdate',
  Source
>

/** Authors exhaustive parent requests independently from local Message handlers. */
interface ExhaustiveInMessageUpdatePlan<
  Model,
  InMessage,
  Message,
  OutMessage,
  Bindings extends ReadonlyArray<AnyBinding>,
  Source extends AuthoringSource,
  ContextConstraint extends ReadonlyArray<unknown> = readonly [],
> {
  <
    const Outputs extends Readonly<
      Record<AuthoredMessageTag<InMessage>, unknown>
    >,
  >(
    cases: AuthoredUpdateCases<
      Model,
      InMessage,
      Bindings,
      Outputs,
      Message,
      OutMessage
    > &
      Readonly<
        Record<Exclude<keyof Outputs, AuthoredMessageTag<InMessage>>, never>
      >,
    ...invalidInputContract: AuthoredMessageArguments<InMessage>
  ): InMessageUpdatePlan<
    Model,
    InMessage,
    Message,
    readonly [],
    Outputs,
    Bindings,
    Source
  >

  readonly withContext: <const Context extends ContextConstraint, const Cases>(
    createCases: ContextualUpdateCasesFactory<
      Context,
      Cases &
        ContextualUpdateCases<Model, InMessage, Bindings, Message, OutMessage> &
        ValidatedContextualUpdateCases<
          Model,
          InMessage,
          Bindings,
          ContextualUpdateOutputs<Model, InMessage, Bindings, NoInfer<Cases>>,
          Message,
          OutMessage
        > &
        Readonly<
          Record<
            Exclude<keyof NoInfer<Cases>, AuthoredMessageTag<InMessage>>,
            never
          >
        >
    > &
      ValidateAnnotatedContext<NoInfer<Context>>,
    ...invalidInputContract: AuthoredMessageArguments<InMessage>
  ) => InMessageUpdatePlan<
    Model,
    InMessage,
    Message,
    Context,
    ContextualUpdateOutputs<Model, InMessage, Bindings, Cases>,
    Bindings,
    Source
  >
}

type ResultFromChannels<Model, Message, Channels> = Channels extends readonly [
  unknown,
  infer OutMessage,
  infer Requirements,
  infer Registration,
]
  ? Update.WithRegistrationEvidence<
      [OutMessage] extends [never]
        ? Update.Return<Model, Message, Requirements>
        : Update.ReturnWithOutMessage<Model, Message, OutMessage, Requirements>,
      Registration
    >
  : never

/** @internal Selects an inMessageUpdate result without treating its input as a Command result. */
export type InMessageUpdateOutputOf<
  InputUpdate extends AnyFunction,
  Message,
  InMessage,
> =
  InputUpdate extends OperationOutputs<infer Channels>
    ? InMessage extends Readonly<{ _tag: infer Tag }>
      ? ResultFromChannels<
          Parameters<InputUpdate>[0],
          Message,
          Extract<Channels, readonly [Tag, unknown, unknown, unknown]>
        >
      : never
    : never

/** @internal The independent optional/default/rest context of one receiver. */
export type InMessageUpdateContext<InputUpdate extends AnyFunction> =
  Parameters<InputUpdate> extends readonly [unknown, unknown, ...infer Context]
    ? Context
    : never

/**
 * @internal Model-first input functions compiled for native Binding lowering.
 * Binding methods are generated from the InMessage union, with constructor
 * payload arguments and the declared InMessage context. Parent authors call
 * those generated methods directly; no manual operation mapping is required.
 */
export type CompiledInputs<
  SchemaValue extends AnySchema,
  InputUpdate extends AnyFunction,
  Message,
  Source extends object,
> = {
  readonly [
    Tag in InputTag<SchemaValue> as InputOperationName<Tag>
  ]: CompiledOperation<
    (
      model: Parameters<InputUpdate>[0],
      ...args: readonly [
        ...OperationParameters<InputConstructor<SchemaValue, Tag>>,
        ...InMessageUpdateContext<InputUpdate>,
      ]
    ) => InMessageUpdateOutputOf<
      InputUpdate,
      Message,
      Extract<SchemaValue['Type'], Readonly<{ _tag: Tag }>>
    >,
    Source
  >
}

/**
 * Authors a portable, exhaustive handler record for parent InMessages.
 *
 * Declare parent inputs once in the Block's InMessage union. A variant named
 * `RequestedOpen` generates `Binding.requestOpen()`, while
 * `InformedOfRouteChanged` generates `Binding.informOfRouteChanged(payload)`.
 * Those calls return connected parent Steps and retain the child's declared
 * output and requirement channels. Keep UI facts and Command results in the
 * separate local Message update.
 *
 * The focused composition helpers and withContext follow the local update
 * authoring API. InMessage context remains separate from local update context.
 */
export interface MakeInMessageUpdatePlan<
  Model,
  InMessage,
  Message,
  OutMessage,
  Bindings extends ReadonlyArray<AnyBinding>,
  Source extends AuthoringSource,
  Context extends ReadonlyArray<unknown> = readonly [],
>
  extends
    ExhaustiveInMessageUpdatePlan<
      Model,
      InMessage,
      Message,
      OutMessage,
      Bindings,
      Source,
      Context
    >,
    ComposableUpdates<
      InMessageAuthoringSource<Source, InMessage, Message>,
      Context
    > {}

/** @internal Creates passive input plans through the shared composer adapter. */
export const makeInMessageUpdatePlan = (source: AuthoringSource) =>
  makeComposablePlanFactory(source, 'InMessageUpdate', 'makeInMessageUpdate')

/** @internal Validates and names the declared input constructors without invoking them. */
export const inputConstructors = (schema: Schema.Top) => {
  const visited = new Set<SchemaAST.AST>()
  const assertTagged = (source: SchemaAST.AST): void => {
    const ast = SchemaAST.toType(source)

    if (visited.has(ast) || SchemaAST.isNever(ast)) {
      return
    }

    visited.add(ast)

    if (SchemaAST.isSuspend(ast)) {
      assertTagged(ast.thunk())
      return
    }

    if (SchemaAST.isUnion(ast)) {
      ast.types.forEach(assertTagged)
      return
    }

    if (SchemaAST.isObjects(ast)) {
      const tag = ast.propertySignatures.find(
        property => property.name === '_tag',
      )
      const tagAst = tag === undefined ? undefined : SchemaAST.toType(tag.type)

      if (
        tag !== undefined &&
        !SchemaAST.isOptional(tag.type) &&
        tagAst !== undefined &&
        SchemaAST.isLiteral(tagAst) &&
        Predicate.isString(tagAst.literal)
      ) {
        return
      }
    }

    throw new Error('[foldkit] InMessage requires finite tagged variants.')
  }

  assertTagged(schema.ast)

  const validateConstructor = makeOperationMessageValidator(schema)
  const constructors = new Map<string, OperationMessageConstructor>()

  for (const tag of runtimeMessageSchemaContract(schema).tags) {
    const constructor = Reflect.get(schema, tag)

    if (!isOperationMessageConstructor(constructor)) {
      throw new Error(
        '[foldkit] InMessage requires union-owned callable constructors.',
      )
    }

    validateConstructor(constructor)

    const name = inputOperationName(tag)

    if (constructors.has(name)) {
      throw new Error(
        `[foldkit] InMessage variants produce duplicate input method "${name}".`,
      )
    }

    constructors.set(name, constructor)
  }

  return constructors
}

/** @internal Validates the separate input protocol before any implementation is constructed. */
export const assertInMessageConfiguration = (
  config: Readonly<{
    Message: AnySchema
    InMessage?: AnySchema
    InMessageContext?: unknown
    inMessageOutputs?: object
    operations?: object
  }>,
): void => {
  if (config.InMessage === undefined) {
    if (
      Object.hasOwn(config, 'inMessageOutputs') ||
      Object.hasOwn(config, 'InMessageContext')
    ) {
      throw new Error(
        '[foldkit] InMessage outputs and Context require an InMessage Schema.',
      )
    }

    return
  }

  if (!Schema.isSchema(config.InMessage)) {
    throw new Error('[foldkit] InMessage requires an owned tagged Schema.')
  }

  const constructors = inputConstructors(config.InMessage)
  const inputTags = runtimeMessageSchemaContract(config.InMessage).tags
  const localTags = runtimeMessageSchemaContract(config.Message).tags

  for (const tag of inputTags) {
    if (localTags.has(tag)) {
      throw new Error(
        '[foldkit] Local Message and InMessage tags must be distinct.',
      )
    }
  }

  for (const name of constructors.keys()) {
    if (
      config.operations !== undefined &&
      Object.hasOwn(config.operations, name)
    ) {
      throw new Error(
        `[foldkit] InMessage operation "${name}" conflicts with an explicit operation.`,
      )
    }
  }

  if (config.inMessageOutputs !== undefined) {
    if (
      !Predicate.isObject(config.inMessageOutputs) ||
      globalThis.Array.isArray(config.inMessageOutputs)
    ) {
      throw new Error(
        '[foldkit] inMessageOutputs requires a per-input result contract record.',
      )
    }

    for (const tag of Reflect.ownKeys(config.inMessageOutputs)) {
      if (!Predicate.isString(tag) || !inputTags.has(tag)) {
        throw new Error(
          '[foldkit] inMessageOutputs contains an undeclared input variant.',
        )
      }

      const output: unknown = Reflect.get(config.inMessageOutputs, tag)

      if (!Predicate.isObject(output) || globalThis.Array.isArray(output)) {
        throw new Error(
          '[foldkit] Each InMessage output contract must be a record.',
        )
      }

      for (const key of Reflect.ownKeys(output)) {
        if (
          key !== 'outMessage' &&
          key !== 'services' &&
          key !== 'managedResources'
        ) {
          throw new Error(
            '[foldkit] InMessage output contracts support only outMessage, services, and managedResources.',
          )
        }
      }

      if (
        Object.hasOwn(output, 'outMessage') &&
        !Schema.isSchema(Reflect.get(output, 'outMessage'))
      ) {
        throw new Error(
          '[foldkit] InMessage output contracts require an OutMessage Schema.',
        )
      }
    }
  }
}

/** @internal Reuses the native composer without child routing for input dispatch. */
export const makeInMessageUpdateDispatcher = (
  schema: Schema.Top,
  bindings: ReadonlyArray<any>,
  environment: OperationEnvironment,
) => makeCompositionInputUpdate(schema, bindings, environment)

/** @internal Compiles generated input functions without evaluating any producer. */
export const compileInputs = (
  schema: Schema.Top,
  inMessageUpdate: AnyFunction,
  source: object,
) =>
  Object.fromEntries(
    [...inputConstructors(schema)].map(([name, constructor]) => {
      const prepare = prepareOperation(constructor)

      return [
        name,
        makeCompiledOperation(
          source,
          (model: unknown, ...args: ReadonlyArray<unknown>) =>
            inMessageUpdate(model, ...prepare(...args)),
        ),
      ]
    }),
  )
